<script setup lang="ts">
import { ref, nextTick, computed, onBeforeUnmount, watch } from "vue";
import logo from "@/assets/logo.svg";
import { useBookmarkStore } from "@/stores/bookmarks";
import ConfirmModal from "@/components/common/ConfirmModal.vue";
const emit = defineEmits<{ (e: "open-settings"): void }>();

const store = useBookmarkStore();
const localWidth = ref(store.sidebarWidth); // Local state for smooth dragging
const isCreatingFolder = ref(false);
const newFolderName = ref("");
const newFolderInput = ref<HTMLInputElement | null>(null);

// Dialog State
const showConfirm = ref(false);
const confirmConfig = ref({
  title: "",
  message: "",
  type: "warning" as "warning" | "error",
  onConfirm: () => {},
});

const openConfirm = (
  title: string,
  message: string,
  type: "warning" | "error",
  callback: () => void,
) => {
  confirmConfig.value = { title, message, type, onConfirm: callback };
  showConfirm.value = true;
};

const handleConfirmAction = () => {
  confirmConfig.value.onConfirm();
};

const startCreatingFolder = () => {
  isCreatingFolder.value = true;
  newFolderName.value = "";
  nextTick(() => {
    newFolderInput.value?.focus();
  });
};

const confirmCreateFolder = async () => {
  if (newFolderName.value.trim()) {
    await store.addFolder(newFolderName.value.trim());
    isCreatingFolder.value = false;
    newFolderName.value = "";
  } else {
    cancelCreateFolder();
  }
};

const cancelCreateFolder = () => {
  isCreatingFolder.value = false;
  newFolderName.value = "";
};

const editingFolderId = ref<string | null>(null);
const editingFolderName = ref("");

const startEditingFolder = (id: string, name: string) => {
  editingFolderId.value = id;
  editingFolderName.value = name;
  nextTick(() => {
    // Need to target specifically which input is active
    // Simplest way is wait for render and find focused element or use v-if
    // But with v-for and ref array it's tricky.
    // Let's rely on autofocus attribute or manual v-if check
    document.getElementById(`folder-edit-${id}`)?.focus();
  });
};

const confirmEditFolder = async (id: string) => {
  if (
    editingFolderName.value.trim() &&
    editingFolderName.value.trim() !== store.folders.find((f) => f.id === id)?.name
  ) {
    await store.updateFolder(id, editingFolderName.value.trim());
  }
  cancelEditFolder();
};

const cancelEditFolder = () => {
  editingFolderId.value = null;
  editingFolderName.value = "";
};

const deleteFolder = (id: string, event: Event) => {
  event.stopPropagation();
  openConfirm("删除文件夹", "确定要删除这个文件夹吗？其中的书签将变为“未分类”。", "error", () =>
    store.removeFolder(id),
  );
};

// 已移除拖拽相关逻辑（不支持拖拽操作）

const handleFolderClick = (id: string, event: MouseEvent) => {
  if (event.ctrlKey || event.metaKey) {
    store.toggleFolderFilter(id);
  } else {
    // Toggle off if clicking the only selected one, or select just this one
    if (store.selectedFolderIds.length === 1 && store.selectedFolderIds[0] === id) {
      store.setFolderFilter(null);
    } else {
      store.setFolderFilter(id);
    }
  }
};

// Counts
const allCount = computed(() => store.bookmarks.filter((b) => !b.deleted).length);
const uncategorizedCount = computed(
  () => store.bookmarks.filter((b) => !b.deleted && !b.folderId).length,
);
const trashCount = computed(() => store.bookmarks.filter((b) => b.deleted).length);
const getFolderCount = (id: string) =>
  store.bookmarks.filter((b) => !b.deleted && b.folderId === id).length;

// Resizable width
let startX = 0;
let startWidth = 0;
const dragging = ref(false);

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value) return;
  const delta = e.clientX - startX;
  const next = Math.min(400, Math.max(200, startWidth + delta));
  localWidth.value = next;
};

const onMouseUp = () => {
  dragging.value = false;
  // Commit only on drag end
  store.sidebarWidth = localWidth.value;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
};

const startResize = (e: MouseEvent) => {
  startX = e.clientX;
  startWidth = localWidth.value;
  dragging.value = true;
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};

watch(
  () => store.sidebarWidth,
  (val: number) => {
    // Sync if updated externally or on load
    if (!dragging.value) localWidth.value = val;
  },
);

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
  <aside
    class="bg-base-200/50 h-full flex flex-col border-r border-base-300 backdrop-blur-sm relative shrink-0"
    :style="{ width: localWidth + 'px' }"
  >
    <router-link to="/" class="p-4 flex items-center gap-2">
      <div class="avatar">
        <div class="w-8 rounded-xl bg-base-100 p-1 shadow-sm">
          <img :src="logo" alt="兰亭书签" class="w-full h-full" />
        </div>
      </div>
      <span class="font-bold text-lg tracking-tight">兰亭书签</span>
    </router-link>

    <!-- Navigation Menu -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-2 py-2">
      <ul class="menu gap-1 w-full p-0">
        <li>
          <button
            class="flex items-center gap-2 w-full btn btn-ghost justify-start"
            :class="{
              'btn-active btn-primary/20 text-primary': store.selectedFolderIds.length === 0,
            }"
            @click="store.setFolderFilter(null)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span class="truncate">全部书签</span>
            <span class="ml-auto badge badge-outline badge-xs text-base-content/70">{{
              allCount
            }}</span>
          </button>
        </li>
        <li>
          <button
            class="flex items-center gap-2 w-full btn btn-ghost justify-start"
            :class="{
              'btn-active btn-primary/20 text-primary':
                store.selectedFolderIds.includes('uncategorized'),
            }"
            @click="handleFolderClick('uncategorized', $event)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="truncate">未分类</span>
            <span class="ml-auto badge badge-outline badge-xs text-base-content/70">{{
              uncategorizedCount
            }}</span>
          </button>
        </li>
        <li>
          <button
            class="flex items-center gap-2 w-full btn btn-ghost justify-start"
            :class="{
              'btn-active btn-primary/20 text-primary': store.selectedFolderIds.includes('trash'),
            }"
            @click="handleFolderClick('trash', $event)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
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
            <span class="truncate">回收站</span>
            <span class="ml-auto badge badge-outline badge-xs text-base-content/70">{{
              trashCount
            }}</span>
          </button>
        </li>
      </ul>

      <div class="flex justify-between items-center px-3 py-2 mt-2">
        <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider">文件夹</span>
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="新建文件夹"
          @click="startCreatingFolder"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <!-- Folder Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-1 p-1">
        <!-- New Folder Input -->
        <div v-if="isCreatingFolder" class="col-span-1 xl:col-span-2 px-1 mb-1">
          <div class="join w-full">
            <input
              ref="newFolderInput"
              v-model="newFolderName"
              type="text"
              class="input input-sm input-bordered join-item w-full min-w-0 px-2 text-xs"
              placeholder="文件夹名称..."
              @keydown.enter="confirmCreateFolder"
              @keydown.esc="cancelCreateFolder"
              @blur="confirmCreateFolder"
            />
          </div>
        </div>

        <!-- Folder List -->
        <div
          v-for="folder in store.folders"
          :key="folder.id"
          class="tooltip tooltip-right group"
          :data-tip="folder.name"
        >
          <!-- Edit Mode -->
          <div v-if="editingFolderId === folder.id" class="px-1">
            <input
              :id="`folder-edit-${folder.id}`"
              v-model="editingFolderName"
              type="text"
              class="input input-sm input-bordered w-full min-w-0 px-2 text-xs"
              @keydown.enter="confirmEditFolder(folder.id)"
              @keydown.esc="cancelEditFolder"
              @blur="confirmEditFolder(folder.id)"
            />
          </div>

          <!-- Normal Mode -->
          <div
            v-else
            class="btn btn-sm w-full justification-start px-2 font-normal flex-nowrap relative pr-10 cursor-pointer"
            role="button"
            tabindex="0"
            :class="{
              'btn-active btn-primary/20 text-primary': store.selectedFolderIds.includes(folder.id),
              'btn-ghost': !store.selectedFolderIds.includes(folder.id),
            }"
            @click="handleFolderClick(folder.id, $event)"
            @keydown.enter="handleFolderClick(folder.id, $event as any)"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 flex-shrink-0 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span class="truncate text-xs text-left">{{ folder.name }}</span>
              <span class="badge badge-outline badge-xs text-base-content/70 flex-shrink-0">{{
                getFolderCount(folder.id)
              }}</span>
            </div>
            <div
              class="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 hidden group-hover:flex bg-base-100/50 backdrop-blur rounded p-0.5 shadow-sm"
            >
              <span
                class="p-0.5 hover:text-primary cursor-pointer"
                @click.stop="startEditingFolder(folder.id, folder.name)"
                title="重命名"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3"
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
              </span>
              <span
                class="p-0.5 hover:text-error cursor-pointer"
                @click.stop="deleteFolder(folder.id, $event)"
                title="删除"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-2 border-t border-base-300">
      <ul class="menu">
        <li>
          <button
            class="flex items-center gap-2 btn btn-ghost justify-start"
            @click="emit('open-settings')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            设置
          </button>
        </li>
      </ul>
    </div>

    <div
      class="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-base-300/40"
      @mousedown.prevent="startResize"
    ></div>
  </aside>

  <!-- Confirm Modal -->
  <ConfirmModal
    v-model:show="showConfirm"
    :title="confirmConfig.title"
    :message="confirmConfig.message"
    :type="confirmConfig.type"
    @confirm="handleConfirmAction"
  />
</template>
