<script setup lang="ts">
import { ref } from "vue";
import AddBookmarkModal from "@/components/bookmarks/AddBookmarkModal.vue";
import { useBookmarkStore } from "@/stores/bookmarks";

const store = useBookmarkStore();
const showAddModal = ref(false);
</script>

<template>
  <header class="navbar bg-base-100 border-b border-base-300 px-4 h-16 flex-shrink-0">
    <div class="flex-1 flex items-center gap-2">
      <label for="main-drawer" class="btn btn-square btn-ghost lg:hidden drawer-button -ml-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="inline-block w-5 h-5 stroke-current"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </label>
      <div class="flex items-center gap-2 w-full max-w-md">
        <label class="input input-bordered flex items-center gap-2 w-full">
          <input
            type="text"
            class="grow"
            placeholder="搜索书签、所有..."
            v-model="store.searchQuery"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="w-4 h-4 opacity-70"
          >
            <path
              fill-rule="evenodd"
              d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
              clip-rule="evenodd"
            />
          </svg>
        </label>
      </div>
    </div>
    <div class="flex-none flex items-center gap-2">
      <div class="join">
        <button
          class="join-item btn btn-sm btn-ghost"
          :class="{ 'bg-primary/20 text-primary': store.viewMode === 'list' }"
          title="列表视图"
          @click="store.setViewMode('list')"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <button
          class="join-item btn btn-sm btn-ghost"
          :class="{ 'bg-primary/20 text-primary': store.viewMode === 'grid' }"
          title="网格视图"
          @click="store.setViewMode('grid')"
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
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </button>
      </div>

      <button class="btn btn-primary btn-sm gap-2" @click="showAddModal = true">
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
        新建书签
      </button>
    </div>

    <!-- Modals -->
    <AddBookmarkModal :show="showAddModal" @close="showAddModal = false" />
  </header>
</template>
