<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useBookmarkStore, type Bookmark } from "@/stores/bookmarks";
import AddBookmarkModal from "@/components/bookmarks/AddBookmarkModal.vue";
import ConfirmModal from "@/components/common/ConfirmModal.vue";

const router = useRouter();
const store = useBookmarkStore();

// UI State
const showEditModal = ref(false);
const editingBookmark = ref<Bookmark | null>(null);

// Confirm Dialog State
const showConfirm = ref(false);
const confirmConfig = ref({
  title: "",
  message: "",
  type: "warning" as "warning" | "error",
  onConfirm: async () => {},
});

const openConfirm = (
  title: string,
  message: string,
  type: "warning" | "error",
  onConfirm: () => Promise<void> | void,
) => {
  confirmConfig.value = {
    title,
    message,
    type,
    onConfirm: async () => {
      await onConfirm();
    },
  };
  showConfirm.value = true;
};

const handleConfirmAction = async () => {
  await confirmConfig.value.onConfirm();
};

// Use the pre-filtered bookmarks from the store
const displayBookmarks = computed(() => store.filteredBookmarks);

const selectedTitle = computed(() => {
  const ids = store.selectedFolderIds;
  if (ids.length === 0) return "全部书签";
  if (ids.length === 1) {
    const id = ids[0];
    if (id === "uncategorized") return "未分类";
    if (id === "trash") return "回收站";
    return store.folders.find((f) => f.id === id)?.name || "分类";
  }
  return "已选择分类";
});

const openUrl = (bookmark: Bookmark) => {
  if (bookmark.deleted) return;
  router.push({
    path: "/browser",
    query: {
      url: bookmark.url,
      title: bookmark.title,
    },
  });
};

const handleEdit = (bookmark: Bookmark, event: Event) => {
  event.stopPropagation();
  editingBookmark.value = bookmark;
  showEditModal.value = true;
};

const handleDelete = async (id: string, event: Event) => {
  event.stopPropagation();
  await store.removeBookmark(id);
};

const handlePermanentDelete = async (id: string, event: Event) => {
  event.stopPropagation();
  openConfirm("永久删除", "确定要永久删除这个书签吗？此操作不可恢复。", "error", () =>
    store.removeBookmarkPermanent(id),
  );
};

const handleRestore = async (id: string, event: Event) => {
  event.stopPropagation();
  await store.restoreBookmark(id);
};

// 已移除拖拽相关逻辑（不支持拖拽操作）

const closeEditModal = () => {
  showEditModal.value = false;
  editingBookmark.value = null; // Clear data
};
</script>

<template>
  <div class="container mx-auto max-w-7xl h-full flex flex-col">
    <div class="flex justify-between items-center mb-2 flex-shrink-0">
      <h2 class="text-2xl font-bold flex items-center gap-2">{{ selectedTitle }}</h2>
    </div>

    <div v-if="!store.isLoaded" class="flex justify-center p-10">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="displayBookmarks.length === 0"
      class="flex flex-col items-center justify-center flex-1 opacity-60 min-h-[50vh]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-24 w-24 mb-4 text-base-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <p class="text-lg">这里空空如也</p>
      <p class="text-sm mt-2">点击右上角添加您的第一个书签</p>
      <p class="text-sm mt-2">
        或去
        <span class="badge badge-primary badge-outline badge-sm">设置</span>
        导入
        <span class="text-primary font-semibold">示例数据</span>
      </p>
    </div>

    <!-- Grid View with Transition -->
    <TransitionGroup
      v-else
      name="list"
      tag="div"
      class="pb-20"
      :class="
        store.viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'flex flex-col gap-2'
      "
    >
      <div
        v-for="item in displayBookmarks"
        :key="item.id"
        class="shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group relative"
        :class="
          store.viewMode === 'grid'
            ? 'card bg-base-200 hover:-translate-y-1 hover:border-primary/20 pb-10 sm:pb-0 border border-transparent'
            : 'bg-base-100 border border-base-200 rounded-lg hover:bg-base-200 p-2'
        "
        @click="openUrl(item)"
      >
        <!-- Grid Layout -->
        <div v-if="store.viewMode === 'grid'" class="card-body p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 overflow-hidden flex-1">
              <div class="avatar placeholder">
                <div
                  class="w-10 h-10 rounded-xl bg-base-100 p-1 flex items-center justify-center overflow-hidden relative"
                >
                  <img
                    v-if="item.icon"
                    :src="item.icon"
                    :alt="item.title"
                    class="w-full h-full object-contain"
                    @error="item.icon = undefined"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 text-primary/40"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div class="flex flex-col overflow-hidden">
                <h3
                  class="card-title text-base font-bold truncate block w-full"
                  :title="item.title"
                >
                  {{ item.title }}
                </h3>
                <span class="text-xs text-base-content/60 truncate w-full">{{ item.url }}</span>
              </div>
            </div>
          </div>

          <!-- Actions (Absolute positioning for better hit target) -->
          <div
            class="absolute top-2 right-2 flex gap-1 bg-base-200/80 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <button
              v-if="!item.deleted"
              class="btn btn-ghost btn-xs btn-square"
              title="编辑"
              @click="handleEdit(item, $event)"
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <button
              v-if="!item.deleted"
              class="btn btn-ghost btn-xs btn-square text-error"
              title="移入回收站"
              @click="handleDelete(item.id, $event)"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <template v-else>
              <button
                class="btn btn-ghost btn-xs"
                title="恢复"
                @click="handleRestore(item.id, $event)"
              >
                恢复
              </button>
              <button
                class="btn btn-ghost btn-xs text-error"
                title="永久删除"
                @click="handlePermanentDelete(item.id, $event)"
              >
                永久删除
              </button>
            </template>
          </div>

          <p class="text-sm text-base-content/70 mt-3 line-clamp-2 h-10">{{ item.description }}</p>

          <div
            class="card-actions justify-between items-center mt-3 pt-3 border-t border-base-content/10"
          >
            <div class="flex gap-1 overflow-hidden">
              <div
                v-for="tag in item.tags.slice(0, 2)"
                :key="tag"
                class="badge badge-sm badge-outline"
              >
                {{ tag }}
              </div>
              <div v-if="item.tags.length > 2" class="badge badge-sm badge-ghost">
                +{{ item.tags.length - 2 }}
              </div>
            </div>
            <span class="text-xs text-base-content/50">{{ item.date }}</span>
          </div>
        </div>

        <!-- List Layout -->
        <div v-else class="flex items-center gap-4 w-full px-2">
          <div class="avatar placeholder flex-shrink-0">
            <div
              class="w-8 h-8 rounded-md bg-base-200 p-1 flex items-center justify-center overflow-hidden relative"
            >
              <img
                v-if="item.icon"
                :src="item.icon"
                :alt="item.title"
                class="w-full h-full object-contain"
                @error="item.icon = undefined"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 text-primary/40"
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
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-bold truncate" :title="item.title">{{ item.title }}</h3>
              <span
                class="text-xs text-base-content/50 hidden sm:inline-block truncate max-w-[200px]"
                >{{ item.url }}</span
              >
            </div>
            <p v-if="item.description" class="text-xs text-base-content/70 truncate">
              {{ item.description }}
            </p>
          </div>

          <div class="flex-none hidden md:flex gap-1">
            <div
              v-for="tag in item.tags.slice(0, 3)"
              :key="tag"
              class="badge badge-xs badge-outline"
            >
              {{ tag }}
            </div>
          </div>

          <div
            class="flex-none flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              v-if="!item.deleted"
              class="btn btn-ghost btn-xs btn-square"
              title="编辑"
              @click="handleEdit(item, $event)"
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <button
              v-if="!item.deleted"
              class="btn btn-ghost btn-xs btn-square text-error"
              title="移入回收站"
              @click="handleDelete(item.id, $event)"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <template v-else>
              <button
                class="btn btn-ghost btn-xs"
                title="恢复"
                @click="handleRestore(item.id, $event)"
              >
                恢复
              </button>
              <button
                class="btn btn-ghost btn-xs text-error"
                title="永久删除"
                @click="handlePermanentDelete(item.id, $event)"
              >
                永久删除
              </button>
            </template>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <AddBookmarkModal
      v-if="showEditModal"
      :show="showEditModal"
      :edit-mode="true"
      :initial-data="editingBookmark"
      @close="closeEditModal"
    />

    <ConfirmModal
      v-model:show="showConfirm"
      :title="confirmConfig.title"
      :message="confirmConfig.message"
      :type="confirmConfig.type"
      @confirm="handleConfirmAction"
    />
  </div>
</template>
