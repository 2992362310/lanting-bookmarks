<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useBookmarkStore } from "@/stores/bookmarks";

const store = useBookmarkStore();
const router = useRouter();
// 返回主页
const goHome = () => {
  router.push({ name: "Home" });
};
const importing = ref(false);
const importError = ref("");

// 导出到文件（原生）
const exportToFile = async () => {
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

// 从文件导入（原生）
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

// 导入示例数据（从 public/bookmarks.json）
const importSampleData = async () => {
  importError.value = "";
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
  }
};

// 注：清空回收站与重置操作已移除，保留更克制的设置项
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">设置</h1>
      <button class="btn btn-ghost btn-sm" @click="goHome">返回主页</button>
    </div>

    <div class="space-y-6">
      <!-- 数据 -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">数据</h2>
          <p class="text-sm text-base-content/70">导出或导入书签与文件夹数据。</p>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <button class="btn btn-sm" @click="exportToFile">导出为文件...</button>
            <button class="btn btn-sm" @click="importFromFile">从文件导入...</button>
            <button class="btn btn-sm btn-ghost" @click="importSampleData">导入示例数据</button>
          </div>
          <p v-if="importing" class="text-xs mt-2">导入中...</p>
          <p v-if="importError" class="text-xs mt-2 text-error">{{ importError }}</p>
        </div>
      </div>

      <!-- 快捷操作（已收紧，暂不提供） -->
    </div>
  </div>
</template>
