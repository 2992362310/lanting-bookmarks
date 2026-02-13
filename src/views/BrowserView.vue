<script setup lang="ts">
// Browser View Component
import { useRoute, useRouter } from "vue-router";
import {
  ref,
  onBeforeUnmount,
  computed,
  onActivated,
  onDeactivated,
  watch,
} from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useBookmarkStore } from "@/stores/bookmarks";

const route = useRoute();
const router = useRouter();
const url = ref("");
const isLoading = ref(true);

const store = useBookmarkStore();

const routeTabId = computed(() => {
  const t = route.query.tab;
  return typeof t === "string" && t.trim() ? t.trim() : null;
});

// Auto-hide toolbar
const showToolbar = ref(true);
let hideTimer: number | null = null;
let hotzoneRevealTimer: number | null = null;

const autoHideMs = computed(() => {
  const v = store.browserToolbarAutoHideMs;
  if (typeof v !== "number" || !Number.isFinite(v)) return 800;
  return Math.min(5000, Math.max(0, Math.round(v)));
});

const interactHideMs = computed(() => {
  if (autoHideMs.value === 0) return 0;
  return Math.min(5000, autoHideMs.value + 500);
});

const tabTitle = (tabUrl: string, title?: string) => {
  if (typeof title === "string" && title.trim()) return title.trim();
  try {
    return new URL(tabUrl).hostname || tabUrl;
  } catch {
    return tabUrl;
  }
};

const hotzoneRevealDelayMs = computed(() => {
  const v = store.browserToolbarHotzoneRevealDelayMs;
  if (typeof v !== "number" || !Number.isFinite(v)) return 220;
  return Math.min(1000, Math.max(0, Math.round(v)));
});

const scheduleHide = (delayMs = autoHideMs.value) => {
  if (autoHideMs.value === 0) return;
  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    showToolbar.value = false;
  }, delayMs);
};

const revealToolbar = (delayMs = autoHideMs.value) => {
  showToolbar.value = true;
  scheduleHide(delayMs);
};

const onHotzoneEnter = () => {
  if (hotzoneRevealTimer) window.clearTimeout(hotzoneRevealTimer);
  hotzoneRevealTimer = window.setTimeout(() => {
    revealToolbar(interactHideMs.value);
  }, hotzoneRevealDelayMs.value);
};

const onHotzoneLeave = () => {
  if (hotzoneRevealTimer) window.clearTimeout(hotzoneRevealTimer);
  hotzoneRevealTimer = null;
};

const onKeyDown = (e: KeyboardEvent) => {
  // Alt key is easy to hit and doesn't conflict with typing inside iframe
  if (e.key === "Alt") {
    revealToolbar();
  }
};

const goHome = () => {
  router.push({ name: "Home" });
};

const switchTab = (id: string) => {
  if (!id || id === routeTabId.value) return;
  store.activateBrowserTab(id);
  router.push({ path: "/browser", query: { tab: id } });
};

const closeTab = (id: string) => {
  if (!id) return;
  if (typeof store.closeBrowserTab !== "function") return;
  if (store.browserTabs.length <= 1) return;

  const wasActive = id === routeTabId.value;
  store.closeBrowserTab(id);

  if (!wasActive) return;
  const nextId = store.activeBrowserTabId;
  if (nextId) {
    router.replace({ path: "/browser", query: { tab: nextId } });
  } else {
    goHome();
  }
};

const openExternal = async () => {
  try {
    await openUrl(url.value);
  } catch (e) {
    window.open(url.value, "_blank");
  }
};

const handleLoad = () => {
  isLoading.value = false;
};

const attachListeners = () => {
  window.addEventListener("keydown", onKeyDown);
};

const detachListeners = () => {
  window.removeEventListener("keydown", onKeyDown);
};

watch(
  [() => route.query.url, () => route.query.title, routeTabId],
  ([nextUrlRaw, nextTitleRaw, nextTabId]) => {
    // Preferred: tab id drives the current page.
    if (nextTabId) {
      const tab = store.browserTabs.find((t) => t.id === nextTabId) ?? null;
      if (tab) {
        if (tab.url !== url.value) {
          url.value = tab.url;
          isLoading.value = true;
          revealToolbar(interactHideMs.value);
        }
        store.activateBrowserTab(tab.id);
      }
      return;
    }

    // Backward compatibility: /browser?url=... creates/activates a tab.
    const legacyUrl = typeof nextUrlRaw === "string" ? nextUrlRaw.trim() : "";
    const legacyTitle = typeof nextTitleRaw === "string" ? nextTitleRaw.trim() : undefined;
    if (!legacyUrl) return;
    if (typeof store.createOrActivateBrowserTab !== "function") {
      if (legacyUrl !== url.value) {
        url.value = legacyUrl;
        isLoading.value = true;
        revealToolbar(interactHideMs.value);
      }
      return;
    }
    const tabId = store.createOrActivateBrowserTab(legacyUrl, legacyTitle);
    if (!tabId) return;
    router.replace({ path: "/browser", query: { tab: tabId } });
  },
  { immediate: true },
);

onActivated(() => {
  attachListeners();
  // Give the user a moment to orient, then auto-hide.
  scheduleHide(autoHideMs.value);
  if (routeTabId.value) {
    store.activateBrowserTab(routeTabId.value);
  }
});

onDeactivated(() => {
  detachListeners();
  if (hideTimer) window.clearTimeout(hideTimer);
  if (hotzoneRevealTimer) window.clearTimeout(hotzoneRevealTimer);
  hideTimer = null;
  hotzoneRevealTimer = null;
});

onBeforeUnmount(() => {
  if (hideTimer) window.clearTimeout(hideTimer);
  if (hotzoneRevealTimer) window.clearTimeout(hotzoneRevealTimer);
  detachListeners();
});
</script>

<template>
  <div class="h-full bg-base-100 relative">
    <!-- Browser Toolbar (overlay to avoid layout jump) -->
    <Transition
      enter-active-class="transition duration-300 ease-in-out"
      enter-from-class="-translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-300 ease-in-out"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-4 opacity-0"
    >
      <div
        v-if="showToolbar"
        class="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 p-2 bg-base-100/95 backdrop-blur border-b border-base-300 shadow-sm"
        @mouseenter="revealToolbar(interactHideMs)"
        @mousemove.stop="revealToolbar(interactHideMs)"
      >
        <button class="btn btn-sm btn-ghost gap-1" @click="goHome">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回主页
        </button>

        <div class="tabs tabs-boxed tabs-sm shrink-0 overflow-x-auto max-w-[50vw]">
          <div
            v-for="t in store.browserTabs"
            :key="t.id"
            class="tab max-w-52"
            :class="{ 'tab-active': t.id === routeTabId }"
            :title="t.url"
            role="tab"
            tabindex="0"
            @click="switchTab(t.id)"
          >
            <span class="truncate">{{ tabTitle(t.url, t.title) }}</span>
            <button
              v-if="store.browserTabs.length > 1"
              type="button"
              class="btn btn-ghost btn-xs ml-1 px-1"
              title="关闭"
              aria-label="关闭标签页"
              @click.stop="closeTab(t.id)"
            >
              ✕
            </button>
          </div>

          <a
            v-if="store.browserTabs.length === 0"
            class="tab tab-active max-w-40 truncate"
            title="空白页"
          >
            空白页
          </a>
        </div>

        <div class="flex-1 flex items-center bg-base-200 rounded-md px-3 py-1.5 mx-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3 opacity-50 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span class="text-xs truncate opacity-70 flex-1">{{ url }}</span>
        </div>

        <button
          class="btn btn-sm btn-ghost btn-square"
          title="在浏览器中打开"
          @click="openExternal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Top hotzone (subtle visible, does not affect layout) -->
    <div v-if="!showToolbar" class="absolute top-0 left-0 right-0 h-3 z-10">
      <button
        class="w-full h-full bg-gradient-to-b from-base-300/70 to-transparent opacity-60 hover:opacity-100 hover:from-base-300/90 transition-opacity cursor-pointer"
        title="移到顶部热区显示工具栏（Alt）"
        @mouseenter="onHotzoneEnter"
        @mouseleave="onHotzoneLeave"
        @click="revealToolbar(interactHideMs)"
      ></button>
    </div>

    <!-- Web Content -->
    <div class="relative w-full h-full bg-white">
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center z-10 bg-base-100/50"
      >
        <span class="loading loading-spinner loading-md"></span>
      </div>

      <!-- Note: Many sites (GitHub, Google, etc) block iframes via X-Frame-Options or CSP. -->
      <!-- For a real production app, you might need a Rust-based WebView child window or a custom protocol proxy. -->
      <iframe
        v-if="url"
        :src="url"
        class="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
        referrerpolicy="no-referrer"
        @load="handleLoad"
      ></iframe>

      <div
        class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -z-10 w-full px-4"
      >
        <p class="text-base-content/50">如果是空白页面，说明该网站禁止嵌入加载。</p>
        <button class="btn btn-link btn-sm" @click="openExternal">去浏览器打开</button>
      </div>
    </div>
  </div>
</template>
