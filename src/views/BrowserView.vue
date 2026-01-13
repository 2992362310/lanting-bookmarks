<script setup lang="ts">
// Browser View Component
import { useRoute, useRouter } from "vue-router";
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useBookmarkStore } from "@/stores/bookmarks";

const route = useRoute();
const router = useRouter();
const url = ref((route.query.url as string) || "");
const isLoading = ref(true);

const store = useBookmarkStore();

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

onMounted(() => {
  // Give the user a moment to orient, then auto-hide.
  scheduleHide(autoHideMs.value);
  window.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
  if (hideTimer) window.clearTimeout(hideTimer);
  if (hotzoneRevealTimer) window.clearTimeout(hotzoneRevealTimer);
  window.removeEventListener("keydown", onKeyDown);
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
