<script setup lang="ts">
import MainLayout from "@/layouts/MainLayout.vue";
import { useBookmarkStore } from "@/stores/bookmarks";
import { onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const store = useBookmarkStore();
const route = useRoute();
const router = useRouter();

const applyTheme = (theme: string) => {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
};

let mq: MediaQueryList | null = null;
const onSystemThemeChange = () => applyTheme(store.theme);

onBeforeUnmount(() => {
  mq?.removeEventListener("change", onSystemThemeChange);
});

onMounted(async () => {
  await store.init();

  mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onSystemThemeChange);

  watch(
    () => store.theme,
    (t) => applyTheme(t),
    { immediate: true },
  );

  // Read initial state from route query (optional)
  const q = route.query.q as string | undefined;
  const f = route.query.f as string | undefined; // CSV of folder ids
  const v = route.query.v as ("grid" | "list") | undefined;
  if (typeof q === "string") {
    store.searchQuery = q;
  }
  if (typeof f === "string" && f.length > 0) {
    const ids = f.split(",").filter(Boolean);
    store.selectedFolderIds = ids;
  }
  if (v === "grid" || v === "list") {
    await store.setViewMode(v);
  }

  // Sync store changes back to the route to enable shareable state
  watch(
    () => store.searchQuery,
    (val) => {
      router.replace({ query: { ...route.query, q: val || undefined } });
    },
  );
  watch(
    () => store.selectedFolderIds.slice(),
    (ids) => {
      const fval = ids.length ? ids.join(",") : undefined;
      router.replace({ query: { ...route.query, f: fval } });
    },
    { deep: true },
  );
  watch(
    () => store.viewMode,
    (mode) => {
      router.replace({ query: { ...route.query, v: mode } });
    },
  );
});
</script>

<template>
  <MainLayout />
</template>
