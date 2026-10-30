<script setup lang="ts">
// Browser View Component
import { useRoute, useRouter } from "vue-router";
import {
    ref,
    onBeforeUnmount,
    computed,
    watch,
} from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useBookmarkStore } from "@/stores/bookmarks";

const route = useRoute();
const router = useRouter();
const url = ref("");
const loadedTabIds = ref(new Set<string>());

const store = useBookmarkStore();

const routeTabId = computed(() => {
    const t = route.query.tab;
    return typeof t === "string" && t.trim() ? t.trim() : null;
});

const tabById = (id: string | null) => {
    if (!id) return null;
    return store.browserTabs.find((t) => t.id === id) ?? null;
};

const primaryTab = computed(() => {
    return (
        tabById(store.primaryBrowserTabId) ??
        tabById(routeTabId.value) ??
        tabById(store.activeBrowserTabId) ??
        store.browserTabs[0] ??
        null
    );
});

const secondaryTab = computed(() => {
    const explicit = tabById(store.secondaryBrowserTabId);
    if (explicit && explicit.id !== primaryTab.value?.id) return explicit;
    return store.browserTabs.find((t) => t.id !== primaryTab.value?.id) ?? null;
});

const primaryUrl = computed(() => primaryTab.value?.url || url.value);
const isLoading = computed(
    () => !!primaryTab.value && !loadedTabIds.value.has(primaryTab.value.id),
);
const secondaryUrl = computed(() => secondaryTab.value?.url || "");
const hasSecondaryPage = computed(
    () => store.browserLayout !== "single" && !!secondaryUrl.value,
);

const setTabAsPrimary = (id: string) => {
    store.setPrimaryBrowserTab(id);
    router.push({ path: "/browser", query: { tab: id } });
};

const setTabAsSecondary = (id: string) => {
    store.setSecondaryBrowserTab(id);
};

const floatingWindow = ref({
    x: 0,
    y: 0,
    width: 520,
    height: 420,
});
const isFloatingInteracting = ref(false);
let floatingInitialized = false;
let floatingAction: {
    type: "move" | "resize";
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
} | null = null;

const clampFloatingWindow = () => {
    const margin = 16;
    const maxWidth = Math.max(320, window.innerWidth - margin * 2);
    const maxHeight = Math.max(240, window.innerHeight - margin * 2);
    floatingWindow.value.width = Math.min(
        maxWidth,
        Math.max(320, floatingWindow.value.width),
    );
    floatingWindow.value.height = Math.min(
        maxHeight,
        Math.max(240, floatingWindow.value.height),
    );
    floatingWindow.value.x = Math.min(
        window.innerWidth - floatingWindow.value.width - margin,
        Math.max(margin, floatingWindow.value.x),
    );
    floatingWindow.value.y = Math.min(
        window.innerHeight - floatingWindow.value.height - margin,
        Math.max(margin, floatingWindow.value.y),
    );
};

const initFloatingWindow = () => {
    if (floatingInitialized) {
        clampFloatingWindow();
        return;
    }
    const margin = 16;
    floatingWindow.value.width = Math.min(
        520,
        Math.max(320, window.innerWidth * 0.45),
    );
    floatingWindow.value.height = Math.min(
        420,
        Math.max(240, window.innerHeight * 0.45),
    );
    floatingWindow.value.x = Math.max(
        margin,
        window.innerWidth - floatingWindow.value.width - margin,
    );
    floatingWindow.value.y = Math.max(
        margin,
        window.innerHeight - floatingWindow.value.height - margin,
    );
    floatingInitialized = true;
};

const floatingWindowStyle = computed(() => ({
    left: `${floatingWindow.value.x}px`,
    top: `${floatingWindow.value.y}px`,
    width: `${floatingWindow.value.width}px`,
    height: `${floatingWindow.value.height}px`,
}));

const startFloatingMove = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    floatingAction = {
        type: "move",
        startX: event.clientX,
        startY: event.clientY,
        startLeft: floatingWindow.value.x,
        startTop: floatingWindow.value.y,
        startWidth: floatingWindow.value.width,
        startHeight: floatingWindow.value.height,
    };
    isFloatingInteracting.value = true;
    window.addEventListener("pointermove", onFloatingPointerMove);
    window.addEventListener("pointerup", stopFloatingInteraction, {
        once: true,
    });
};

const startFloatingResize = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    floatingAction = {
        type: "resize",
        startX: event.clientX,
        startY: event.clientY,
        startLeft: floatingWindow.value.x,
        startTop: floatingWindow.value.y,
        startWidth: floatingWindow.value.width,
        startHeight: floatingWindow.value.height,
    };
    isFloatingInteracting.value = true;
    window.addEventListener("pointermove", onFloatingPointerMove);
    window.addEventListener("pointerup", stopFloatingInteraction, {
        once: true,
    });
};

const onFloatingPointerMove = (event: PointerEvent) => {
    if (!floatingAction) return;
    const dx = event.clientX - floatingAction.startX;
    const dy = event.clientY - floatingAction.startY;
    if (floatingAction.type === "move") {
        floatingWindow.value.x = floatingAction.startLeft + dx;
        floatingWindow.value.y = floatingAction.startTop + dy;
    } else {
        floatingWindow.value.width = floatingAction.startWidth + dx;
        floatingWindow.value.height = floatingAction.startHeight + dy;
    }
    clampFloatingWindow();
};

const stopFloatingInteraction = () => {
    floatingAction = null;
    isFloatingInteracting.value = false;
    window.removeEventListener("pointermove", onFloatingPointerMove);
};

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
    store.setPrimaryBrowserTab(id);
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
    const targetUrl = primaryUrl.value || url.value;
    try {
        await openUrl(targetUrl);
    } catch (e) {
        window.open(targetUrl, "_blank");
    }
};

const handleLoad = (id: string) => {
    loadedTabIds.value.add(id);
};

// Keep screen awake while browsing (useful for music/video playback in embedded pages).
// Wake Lock requires a user gesture on many platforms, so we request on interaction.
let wakeLockSentinel: any = null;
let wakeLockEnabled = false;

const canUseWakeLock = () => {
    return (
        typeof navigator !== "undefined" &&
        "wakeLock" in navigator &&
        typeof (navigator as any).wakeLock?.request === "function"
    );
};

const requestWakeLock = async () => {
    if (!wakeLockEnabled) return false;
    if (!canUseWakeLock()) return false;
    if (document.visibilityState !== "visible") return false;
    if (wakeLockSentinel) return true;
    try {
        wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        wakeLockSentinel?.addEventListener?.("release", () => {
            wakeLockSentinel = null;
        });
        return true;
    } catch {
        wakeLockSentinel = null;
        return false;
    }
};

const releaseWakeLock = async () => {
    try {
        await wakeLockSentinel?.release?.();
    } catch {
        // ignore
    } finally {
        wakeLockSentinel = null;
    }
};

const onVisibilityChange = () => {
    if (!wakeLockEnabled) return;
    if (document.visibilityState === "visible") {
        void requestWakeLock();
    } else {
        void releaseWakeLock();
    }
};

const onUserActivation = () => {
    void requestWakeLock();
};

const attachWakeLockListeners = () => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointerdown", onUserActivation, { passive: true });
    window.addEventListener("keydown", onUserActivation);
};

const detachWakeLockListeners = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pointerdown", onUserActivation as any);
    window.removeEventListener("keydown", onUserActivation);
};

const attachListeners = () => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", clampFloatingWindow);
};

const detachListeners = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", clampFloatingWindow);
    window.removeEventListener("pointermove", onFloatingPointerMove);
};

watch(
    () => store.browserLayout,
    (layout) => {
        if (layout === "floating") {
            initFloatingWindow();
        }
    },
);

watch(
    [() => route.query.url, () => route.query.title, routeTabId, () => route.name],
    ([nextUrlRaw, nextTitleRaw, nextTabId]) => {
        if (route.name !== "Browser") return;
        // Preferred: tab id drives the current page.
        if (nextTabId) {
            const tab =
                store.browserTabs.find((t) => t.id === nextTabId) ?? null;
            if (tab) {
                if (tab.url !== url.value) {
                    url.value = tab.url;
                    revealToolbar(interactHideMs.value);
                }
                store.setPrimaryBrowserTab(tab.id);
            }
            return;
        }

        // Backward compatibility: /browser?url=... creates/activates a tab.
        const legacyUrl =
            typeof nextUrlRaw === "string" ? nextUrlRaw.trim() : "";
        const legacyTitle =
            typeof nextTitleRaw === "string" ? nextTitleRaw.trim() : undefined;
        if (!legacyUrl) return;
        if (typeof store.createOrActivateBrowserTab !== "function") {
            if (legacyUrl !== url.value) {
                url.value = legacyUrl;
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

const activateBrowser = () => {
    attachListeners();
    wakeLockEnabled = true;
    attachWakeLockListeners();
    // Try immediately (may fail until user gesture, then pointerdown/keydown retries).
    void requestWakeLock();
    // Give the user a moment to orient, then auto-hide.
    scheduleHide(autoHideMs.value);
    if (routeTabId.value) {
        store.activateBrowserTab(routeTabId.value);
    }
};

const deactivateBrowser = () => {
    detachListeners();
    wakeLockEnabled = false;
    detachWakeLockListeners();
    void releaseWakeLock();
    if (hideTimer) window.clearTimeout(hideTimer);
    if (hotzoneRevealTimer) window.clearTimeout(hotzoneRevealTimer);
    hideTimer = null;
    hotzoneRevealTimer = null;
};

watch(
    () => route.name === "Browser",
    (active) => {
        if (active) activateBrowser();
        else deactivateBrowser();
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    if (hideTimer) window.clearTimeout(hideTimer);
    if (hotzoneRevealTimer) window.clearTimeout(hotzoneRevealTimer);
    detachListeners();
    wakeLockEnabled = false;
    detachWakeLockListeners();
    void releaseWakeLock();
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

                <div
                    class="tabs tabs-boxed tabs-sm shrink-0 overflow-x-auto max-w-[50vw]"
                >
                    <div
                        v-for="t in store.browserTabs"
                        :key="t.id"
                        class="tab max-w-64 gap-1"
                        :class="{ 'tab-active': t.id === primaryTab?.id }"
                        :title="t.url"
                        role="tab"
                        tabindex="0"
                        @click="switchTab(t.id)"
                    >
                        <span class="truncate">{{
                            tabTitle(t.url, t.title)
                        }}</span>
                        <button
                            type="button"
                            class="btn btn-ghost btn-xs px-1"
                            title="设为主页面"
                            aria-label="设为主页面"
                            @click.stop="setTabAsPrimary(t.id)"
                        >
                            主
                        </button>
                        <button
                            v-if="store.browserTabs.length > 1"
                            type="button"
                            class="btn btn-ghost btn-xs px-1"
                            title="设为辅助页面"
                            aria-label="设为辅助页面"
                            @click.stop="setTabAsSecondary(t.id)"
                        >
                            辅
                        </button>
                        <button
                            v-if="store.browserTabs.length > 1"
                            type="button"
                            class="btn btn-ghost btn-xs px-1"
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

                <div class="join join-horizontal">
                    <button
                        class="btn btn-sm join-item"
                        :class="{
                            'btn-primary': store.browserLayout === 'single',
                        }"
                        title="单页"
                        @click="store.setBrowserLayout('single')"
                    >
                        单页
                    </button>
                    <button
                        class="btn btn-sm join-item"
                        :class="{
                            'btn-primary':
                                store.browserLayout === 'split-right',
                        }"
                        title="左右分屏"
                        :disabled="store.browserTabs.length < 2"
                        @click="store.setBrowserLayout('split-right')"
                    >
                        左右
                    </button>
                    <button
                        class="btn btn-sm join-item"
                        :class="{
                            'btn-primary':
                                store.browserLayout === 'split-bottom',
                        }"
                        title="上下分屏"
                        :disabled="store.browserTabs.length < 2"
                        @click="store.setBrowserLayout('split-bottom')"
                    >
                        上下
                    </button>
                    <button
                        class="btn btn-sm join-item"
                        :class="{
                            'btn-primary': store.browserLayout === 'floating',
                        }"
                        title="小窗"
                        :disabled="store.browserTabs.length < 2"
                        @click="store.setBrowserLayout('floating')"
                    >
                        小窗
                    </button>
                </div>

                <div
                    class="flex-1 flex items-center bg-base-200 rounded-md px-3 py-1.5 mx-2"
                >
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
                    <span class="text-xs truncate opacity-70 flex-1">{{
                        primaryUrl
                    }}</span>
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

            <div
                class="w-full h-full"
                :class="{
                    'grid grid-cols-[minmax(0,1fr)_minmax(280px,35vw)]':
                        store.browserLayout === 'split-right' &&
                        hasSecondaryPage,
                    'grid grid-rows-[minmax(0,1fr)_minmax(220px,35vh)]':
                        store.browserLayout === 'split-bottom' &&
                        hasSecondaryPage,
                }"
            >
                <div
                    v-for="tab in store.browserTabs"
                    :key="tab.id"
                    v-show="
                        tab.id === primaryTab?.id ||
                        (hasSecondaryPage && tab.id === secondaryTab?.id)
                    "
                    class="w-full h-full min-w-0 min-h-0 border-base-300 bg-white"
                    :class="{
                        'relative': tab.id === primaryTab?.id || store.browserLayout !== 'floating',
                        'col-start-1 row-start-1': tab.id === primaryTab?.id,
                        'col-start-2 row-start-1 border-l': tab.id === secondaryTab?.id && store.browserLayout === 'split-right',
                        'col-start-1 row-start-2 border-t': tab.id === secondaryTab?.id && store.browserLayout === 'split-bottom',
                        'absolute z-20 min-w-80 min-h-60 overflow-hidden rounded-xl border shadow-2xl': tab.id === secondaryTab?.id && store.browserLayout === 'floating',
                    }"
                    :style="tab.id === secondaryTab?.id && store.browserLayout === 'floating' ? floatingWindowStyle : undefined"
                >
                    <div
                        v-show="tab.id === secondaryTab?.id && hasSecondaryPage"
                        class="absolute z-10 flex items-center gap-2 bg-base-100/95 px-2 py-1 text-xs shadow"
                        :class="store.browserLayout === 'floating' ? 'top-0 left-0 right-0 h-8 cursor-move select-none' : 'top-2 left-2 right-2 rounded-lg'"
                        @pointerdown="store.browserLayout === 'floating' && startFloatingMove($event)"
                    >
                        <span class="truncate flex-1">{{
                            tabTitle(tab.url, tab.title)
                        }}</span>
                        <button
                            class="btn btn-ghost btn-xs"
                            @pointerdown.stop
                            @click="setTabAsPrimary(tab.id)"
                        >
                            设主
                        </button>
                        <button
                            class="btn btn-ghost btn-xs"
                            @pointerdown.stop
                            @click="store.setBrowserLayout('single')"
                        >
                            隐藏
                        </button>
                    </div>
                    <iframe
                        :src="tab.url"
                        class="w-full border-none bg-white"
                        :class="[
                            tab.id === secondaryTab?.id && store.browserLayout === 'floating' ? 'mt-8 h-[calc(100%-2rem)]' : 'h-full',
                            { 'pointer-events-none': isFloatingInteracting },
                        ]"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
                        referrerpolicy="no-referrer"
                        @load="handleLoad(tab.id)"
                    ></iframe>
                    <button
                        v-if="tab.id === secondaryTab?.id && store.browserLayout === 'floating'"
                        type="button"
                        class="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize bg-base-300/70 opacity-70 hover:opacity-100"
                        title="拖拽调整大小"
                        aria-label="拖拽调整大小"
                        @pointerdown="startFloatingResize"
                    >
                        <span
                            class="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-base-content/50"
                        ></span>
                    </button>
                </div>
            </div>

            <div
                class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -z-10 w-full px-4"
            >
                <p class="text-base-content/50">
                    如果是空白页面，说明该网站禁止嵌入加载。
                </p>
                <button class="btn btn-link btn-sm" @click="openExternal">
                    去浏览器打开
                </button>
            </div>
        </div>
    </div>
</template>
