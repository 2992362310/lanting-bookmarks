<script setup lang="ts">
import { ref, reactive, watch, nextTick } from "vue";
import { useBookmarkStore, type Bookmark } from "@/stores/bookmarks";

const props = defineProps<{
  show: boolean;
  editMode?: boolean;
  initialData?: Bookmark | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const store = useBookmarkStore();
const isLoading = ref(false);
const showDetails = ref(false); // New: Toggle for extra fields

const isCreatingFolder = ref(false);
const newFolderName = ref("");
const newFolderInput = ref<HTMLInputElement | null>(null);

const form = reactive({
  id: "",
  url: "",
  title: "",
  description: "",
  tags: "",
  folderId: "",
});

// Watch for initialData changes
watch(
  () => props.initialData,
  (newVal) => {
    if (newVal && props.editMode) {
      form.id = newVal.id;
      form.url = newVal.url;
      form.title = newVal.title;
      form.description = newVal.description;
      form.tags = newVal.tags.join(", ");
      form.folderId = newVal.folderId || "";

      // Auto-expand if there is data in hidden fields
      if (form.tags || form.description) {
        showDetails.value = true;
      }
    } else {
      form.id = "";
      form.url = "";
      form.title = "";
      form.description = "";
      form.tags = "";
      form.folderId = "";
      showDetails.value = false;
    }
    isCreatingFolder.value = false;
    newFolderName.value = "";
  },
  { immediate: true },
);

const startCreatingFolder = () => {
  isCreatingFolder.value = true;
  newFolderName.value = "";
  nextTick(() => newFolderInput.value?.focus());
};

const cancelCreateFolder = () => {
  isCreatingFolder.value = false;
  newFolderName.value = "";
};

const confirmCreateFolder = async () => {
  const name = newFolderName.value.trim();
  if (!name) {
    cancelCreateFolder();
    return;
  }
  const id = await store.addFolder(name);
  if (typeof id === "string" && id) {
    form.folderId = id;
  }
  cancelCreateFolder();
};

// Simple regex to extract domain for title if empty
const guessTitle = () => {
  if (!form.title && form.url) {
    try {
      const urlObj = new URL(form.url);
      form.title = urlObj.hostname;
    } catch (e) {
      /* ignore */
    }
  }
};

const handleSubmit = async () => {
  if (!form.url) return;
  isLoading.value = true;

  try {
    const payload = {
      title: form.title || form.url,
      url: form.url,
      description: form.description,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      folderId: form.folderId || undefined,
    };

    if (props.editMode && form.id) {
      await store.updateBookmark(form.id, payload);
    } else {
      await store.addBookmark({
        ...payload,
        // Privacy-friendly icon fallback (DuckDuckGo)
        icon: `https://icons.duckduckgo.com/ip3/${new URL(form.url).hostname}.ico`,
      });
    }

    emit("close");
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <dialog class="modal" :class="{ 'modal-open': show }">
    <div class="modal-box w-full max-w-md bg-base-100 shadow-xl overflow-visible">
      <h3
        class="font-bold text-lg mb-4 flex items-center justify-between border-b pb-2 border-base-200"
      >
        <span class="flex items-center gap-2">
          <span v-if="editMode">✏️ 编辑书签</span>
          <span v-else>🔖 新建书签</span>
        </span>
        <button @click="$emit('close')" class="btn btn-sm btn-circle btn-ghost">✕</button>
      </h3>

      <div class="flex flex-col gap-3">
        <!-- URL Field -->
        <fieldset class="fieldset w-full">
          <legend class="fieldset-legend text-xs py-1">
            网址 URL <span class="text-error">*</span>
          </legend>
          <input
            type="url"
            v-model="form.url"
            placeholder="https://example.com"
            class="input input-sm input-bordered w-full"
            required
            autofocus
            @blur="guessTitle"
          />
        </fieldset>

        <!-- Title Field -->
        <fieldset class="fieldset w-full">
          <legend class="fieldset-legend text-xs py-1">标题</legend>
          <input
            type="text"
            v-model="form.title"
            placeholder="如果不填将自动抓取"
            class="input input-sm input-bordered w-full"
          />
        </fieldset>

        <!-- Folder Field -->
        <fieldset class="fieldset w-full">
          <legend class="fieldset-legend text-xs py-1">分类目录</legend>
          <div class="join w-full">
            <select
              class="select select-sm select-bordered join-item flex-1"
              v-model="form.folderId"
            >
              <option value="">📂 未分类</option>
              <option v-for="folder in store.folders" :key="folder.id" :value="folder.id">
                📁 {{ folder.name }}
              </option>
            </select>
            <button
              type="button"
              class="btn btn-sm btn-neutral join-item"
              @click="startCreatingFolder"
              title="新建分类"
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
        </fieldset>

        <div v-if="isCreatingFolder" class="-mt-1">
          <div class="join w-full">
            <input
              ref="newFolderInput"
              v-model="newFolderName"
              type="text"
              class="input input-sm input-bordered join-item flex-1"
              placeholder="输入新分类名称…"
              @keydown.enter.prevent="confirmCreateFolder"
              @keydown.esc.prevent="cancelCreateFolder"
              @blur="confirmCreateFolder"
            />
            <button type="button" class="btn btn-sm btn-primary join-item" @click="confirmCreateFolder">
              创建
            </button>
            <button type="button" class="btn btn-sm btn-ghost join-item" @click="cancelCreateFolder">
              取消
            </button>
          </div>
        </div>

        <!-- Toggle Advanced -->
        <div
          class="divider my-0 text-xs text-base-content/50 cursor-pointer hover:text-primary transition-colors"
          @click="showDetails = !showDetails"
        >
          <span class="flex items-center gap-1">
            {{ showDetails ? "收起详情" : "更多选项 (标签 / 描述)" }}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3 transition-transform"
              :class="{ 'rotate-180': showDetails }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </div>

        <!-- Tags Field (Hidden) -->
        <div
          v-show="showDetails"
          class="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs py-1">标签</legend>
            <input
              type="text"
              v-model="form.tags"
              placeholder="用逗号分隔，例如：工作, 设计, 待读"
              class="input input-sm input-bordered w-full"
            />
          </fieldset>

          <!-- Description Field (Hidden) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs py-1">描述 (可选)</legend>
            <textarea
              v-model="form.description"
              class="textarea textarea-sm textarea-bordered h-20 w-full"
              placeholder="添加备注..."
            ></textarea>
          </fieldset>
        </div>
      </div>

      <div class="modal-action mt-6">
        <button class="btn btn-sm btn-ghost" @click="$emit('close')">取消</button>
        <button
          class="btn btn-sm btn-primary px-6"
          @click="handleSubmit"
          :disabled="isLoading || !form.url"
        >
          <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
          {{ editMode ? "更新" : "保存" }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="$emit('close')">close</button>
    </form>
  </dialog>
</template>
