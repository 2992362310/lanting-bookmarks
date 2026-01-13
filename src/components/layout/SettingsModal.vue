<script setup lang="ts">
import { ref } from "vue";
import { useBookmarkStore } from "@/stores/bookmarks";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const store = useBookmarkStore();
const importing = ref(false);
const importError = ref("");

const close = () => emit("close");

const clearSearchAndFilters = () => {
  store.setFolderFilter(null);
  store.searchQuery = "";
};

const exportToFile = async () => {
  importError.value = "";
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await save({
      defaultPath: `lanting-bookmarks-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!filePath) return;
    const data = JSON.stringify({ bookmarks: store.bookmarks, folders: store.folders }, null, 2);
    await writeTextFile(filePath, data);
  } catch (e) {
    importError.value = "导出失败";
    console.error("Export failed:", e);
  }
};

const importFromFile = async () => {
  importError.value = "";
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!filePath || Array.isArray(filePath)) return;
    const text = await readTextFile(filePath);
    const data = JSON.parse(text);
    if (Array.isArray(data.bookmarks) && Array.isArray(data.folders)) {
      // @ts-ignore
      store.bookmarks = data.bookmarks;
      // @ts-ignore
      store.folders = data.folders;
      await store.saveNow();
    } else {
      importError.value = "导入文件格式不正确";
    }
  } catch (e: any) {
    importError.value = e?.message || "导入失败";
  }
};

const importSampleData = async () => {
  importError.value = "";
  importing.value = true;
  try {
    const res = await fetch("/bookmarks.json");
    if (!res.ok) throw new Error("无法读取示例数据");
    const data = await res.json();
    if (Array.isArray(data.bookmarks) && Array.isArray(data.folders)) {
      // @ts-ignore
      store.bookmarks = data.bookmarks;
      // @ts-ignore
      store.folders = data.folders;
      await store.saveNow();
    } else {
      importError.value = "示例数据格式不正确";
    }
  } catch (e: any) {
    importError.value = e?.message || "导入示例数据失败";
  } finally {
    importing.value = false;
  }
};
</script>

<template>
  <dialog :open="props.show" class="modal">
    <div class="modal-box max-w-2xl p-0 overflow-hidden">
      <div class="px-5 pt-5 pb-3 bg-base-200/40 border-b border-base-300">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h3 class="font-bold text-lg tracking-tight">设置</h3>
          </div>
          <button class="btn btn-ghost btn-sm" @click="close">关闭</button>
        </div>
      </div>

      <div class="px-5 py-4 space-y-3">
        <details open class="collapse collapse-arrow rounded-xl border border-base-300 bg-base-100">
          <summary class="collapse-title text-sm font-semibold py-3 px-3">外观</summary>
          <div class="collapse-content px-3 pb-3 pt-0">
            <div class="grid grid-cols-1 gap-3 items-start">
              <label class="form-control w-full">
                <div class="label py-1">
                  <span class="label-text text-xs text-base-content/60">主题</span>
                </div>
                <select class="select select-bordered select-sm w-full" v-model="store.theme">
                  <option value="system">跟随系统</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="cupcake">纸杯蛋糕</option>
                  <option value="emerald">翡翠</option>
                  <option value="business">商务</option>
                </select>
              </label>

              <label class="form-control w-full">
                <div class="label py-1">
                  <span class="label-text text-xs text-base-content/60"
                    >内置浏览器工具栏自动隐藏</span
                  >
                </div>
                <select
                  class="select select-bordered select-sm w-full"
                  v-model.number="store.browserToolbarAutoHideMs"
                >
                  <option :value="0">不自动隐藏</option>
                  <option :value="400">0.4 秒</option>
                  <option :value="600">0.6 秒</option>
                  <option :value="800">0.8 秒（推荐）</option>
                  <option :value="1000">1.0 秒</option>
                  <option :value="1200">1.2 秒</option>
                  <option :value="1500">1.5 秒</option>
                </select>
                <div class="label py-1">
                  <span class="label-text-alt text-xs text-base-content/50"
                    >顶部热区或 Alt 呼出</span
                  >
                </div>
              </label>

              <label class="form-control w-full">
                <div class="label py-1">
                  <span class="label-text text-xs text-base-content/60">热区悬停呼出延迟</span>
                </div>
                <select
                  class="select select-bordered select-sm w-full"
                  v-model.number="store.browserToolbarHotzoneRevealDelayMs"
                >
                  <option :value="0">立即</option>
                  <option :value="120">0.12 秒</option>
                  <option :value="180">0.18 秒</option>
                  <option :value="220">0.22 秒（推荐）</option>
                  <option :value="300">0.30 秒</option>
                  <option :value="450">0.45 秒</option>
                  <option :value="600">0.60 秒</option>
                </select>
                <div class="label py-1">
                  <span class="label-text-alt text-xs text-base-content/50">避免误触发</span>
                </div>
              </label>
            </div>
          </div>
        </details>

        <details class="collapse collapse-arrow rounded-xl border border-base-300 bg-base-100">
          <summary class="collapse-title text-sm font-semibold py-3 px-3">数据</summary>
          <div class="collapse-content px-3 pb-3 pt-0">
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-sm btn-primary" @click="exportToFile">导出...</button>
              <button class="btn btn-sm" @click="importFromFile">导入...</button>
              <button class="btn btn-sm btn-ghost" :disabled="importing" @click="importSampleData">
                <span v-if="importing" class="loading loading-spinner loading-xs"></span>
                导入示例数据
              </button>
            </div>
            <div v-if="importError" class="alert alert-error mt-3">
              <span class="text-sm">{{ importError }}</span>
            </div>
          </div>
        </details>

        <details class="collapse collapse-arrow rounded-xl border border-base-300 bg-base-100">
          <summary class="collapse-title text-sm font-semibold py-3 px-3">快速操作</summary>
          <div class="collapse-content px-3 pb-3 pt-0">
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-sm btn-ghost" @click="clearSearchAndFilters">
                清空搜索与筛选
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="close">
      <button aria-label="close">close</button>
    </form>
  </dialog>
</template>
