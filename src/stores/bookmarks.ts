import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { Store, load } from "@tauri-apps/plugin-store";

export interface Bookmark {
  id: string; // Changed from number to string for UUIDs usually
  title: string;
  url: string;
  description: string;
  tags: string[];
  folderId?: string;
  date: string;
  icon?: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
}

export const useBookmarkStore = defineStore("bookmarks", () => {
  const bookmarks = ref<Bookmark[]>([]);
  const folders = ref<Folder[]>([
    { id: "1", name: "工作" },
    { id: "2", name: "学习" },
    { id: "3", name: "娱乐" },
    { id: "4", name: "待阅读" },
  ]);
  const isLoaded = ref(false);
  const viewMode = ref<"grid" | "list">("grid");
  const sidebarWidth = ref(256);
  const theme = ref<"system" | string>("system");
  const browserToolbarAutoHideMs = ref(800);
  const browserToolbarHotzoneRevealDelayMs = ref(220);

  let store: Store | null = null;
  const STORE_PATH = "bookmarks.json";

  // Initialize store
  const init = async () => {
    if (isLoaded.value) return;

    try {
      store = await load(STORE_PATH, {
        autoSave: false,
        defaults: {
          bookmarks: [],
          folders: [],
          "ui.selectedFolderIds": [],
          "ui.searchQuery": "",
          "ui.viewMode": "grid",
          "ui.sidebarWidth": 256,
          "ui.theme": "system",
          "ui.browserToolbarAutoHideMs": 800,
          "ui.browserToolbarHotzoneRevealDelayMs": 220,
        },
      });

      const storedBookmarks = await store.get<Bookmark[]>("bookmarks");
      if (storedBookmarks) {
        bookmarks.value = storedBookmarks;
      } else {
        // No built-in seed data; start empty
        bookmarks.value = [];
        await save();
      }

      const storedFolders = await store.get<Folder[]>("folders");
      if (storedFolders) {
        folders.value = storedFolders;
      } else {
        await store.set("folders", folders.value);
        await store.save();
      }

      // Load UI state
      const uiSelected = await store.get<string[]>("ui.selectedFolderIds");
      if (uiSelected && Array.isArray(uiSelected)) {
        selectedFolderIds.value = uiSelected;
      }
      const uiSearch = await store.get<string>("ui.searchQuery");
      if (typeof uiSearch === "string") {
        searchQuery.value = uiSearch;
      }
      const uiView = await store.get<"grid" | "list">("ui.viewMode");
      if (uiView === "grid" || uiView === "list") {
        viewMode.value = uiView;
      }
      const uiSidebar = await store.get<number>("ui.sidebarWidth");
      if (typeof uiSidebar === "number") {
        const clamped = Math.min(400, Math.max(200, uiSidebar));
        sidebarWidth.value = clamped;
      }

      const uiTheme = await store.get<string>("ui.theme");
      if (typeof uiTheme === "string" && uiTheme.trim().length > 0) {
        theme.value = uiTheme.trim();
      }

      const uiBrowserToolbarAutoHideMs = await store.get<number>("ui.browserToolbarAutoHideMs");
      if (
        typeof uiBrowserToolbarAutoHideMs === "number" &&
        Number.isFinite(uiBrowserToolbarAutoHideMs)
      ) {
        // 0 disables auto-hide
        const clamped = Math.min(5000, Math.max(0, Math.round(uiBrowserToolbarAutoHideMs)));
        browserToolbarAutoHideMs.value = clamped;
      }

      const uiBrowserToolbarHotzoneRevealDelayMs = await store.get<number>(
        "ui.browserToolbarHotzoneRevealDelayMs",
      );
      if (
        typeof uiBrowserToolbarHotzoneRevealDelayMs === "number" &&
        Number.isFinite(uiBrowserToolbarHotzoneRevealDelayMs)
      ) {
        const clamped = Math.min(
          1000,
          Math.max(0, Math.round(uiBrowserToolbarHotzoneRevealDelayMs)),
        );
        browserToolbarHotzoneRevealDelayMs.value = clamped;
      }

      isLoaded.value = true;
    } catch (err) {
      console.error("Failed to load store:", err);
    }
  };

  const save = async () => {
    if (!store) return;
    await store.set("bookmarks", bookmarks.value);
    await store.set("folders", folders.value);
    await store.save();
  };
  const saveNow = async () => {
    await save();
  };

  // Persist UI state (declared after refs to avoid TDZ)

  const addBookmark = async (bookmark: Omit<Bookmark, "id" | "date">) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
    };
    bookmarks.value.unshift(newBookmark);
    await save();
  };

  // Soft delete: move to trash
  const removeBookmark = async (id: string) => {
    const idx = bookmarks.value.findIndex((b) => b.id === id);
    if (idx !== -1) {
      bookmarks.value[idx] = {
        ...bookmarks.value[idx],
        deleted: true,
        deletedAt: new Date().toISOString(),
      };
      await save();
    }
  };

  // Permanently delete
  const removeBookmarkPermanent = async (id: string) => {
    bookmarks.value = bookmarks.value.filter((b) => b.id !== id);
    await save();
  };

  const restoreBookmark = async (id: string) => {
    const idx = bookmarks.value.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const b = bookmarks.value[idx];
      bookmarks.value[idx] = { ...b, deleted: false, deletedAt: undefined };
      await save();
    }
  };

  const emptyTrash = async () => {
    bookmarks.value = bookmarks.value.filter((b) => !b.deleted);
    await save();
  };

  const currentFolderId = ref<string | null>(null); // Deprecated in logic but kept for type compatibility if needed, or better reused as "primary selected"
  const selectedFolderIds = ref<string[]>([]);

  const searchQuery = ref("");

  const setFolderFilter = (id: string | null) => {
    if (id === null) {
      selectedFolderIds.value = [];
    } else {
      selectedFolderIds.value = [id];
    }
  };

  const toggleFolderFilter = (id: string) => {
    const index = selectedFolderIds.value.indexOf(id);
    if (index >= 0) {
      selectedFolderIds.value.splice(index, 1);
    } else {
      selectedFolderIds.value.push(id);
    }
  };

  // Persist UI state
  watch(
    selectedFolderIds,
    async (val) => {
      if (!store) return;
      await store.set("ui.selectedFolderIds", val);
      await store.save();
    },
    { deep: true },
  );

  watch(searchQuery, async (val) => {
    if (!store) return;
    await store.set("ui.searchQuery", val);
    await store.save();
  });

  watch(viewMode, async (val) => {
    if (!store) return;
    await store.set("ui.viewMode", val);
    await store.save();
  });

  watch(sidebarWidth, async (val) => {
    if (!store) return;
    const clamped = Math.min(400, Math.max(200, val));
    if (clamped !== val) sidebarWidth.value = clamped;
    await store.set("ui.sidebarWidth", clamped);
    await store.save();
  });

  watch(theme, async (val) => {
    if (!store) return;
    await store.set("ui.theme", val);
    await store.save();
  });

  watch(browserToolbarAutoHideMs, async (val) => {
    if (!store) return;
    const clamped = Math.min(5000, Math.max(0, Math.round(val)));
    if (clamped !== val) browserToolbarAutoHideMs.value = clamped;
    await store.set("ui.browserToolbarAutoHideMs", clamped);
    await store.save();
  });

  watch(browserToolbarHotzoneRevealDelayMs, async (val) => {
    if (!store) return;
    const clamped = Math.min(1000, Math.max(0, Math.round(val)));
    if (clamped !== val) browserToolbarHotzoneRevealDelayMs.value = clamped;
    await store.set("ui.browserToolbarHotzoneRevealDelayMs", clamped);
    await store.save();
  });

  const filteredBookmarks = computed(() => {
    let result = bookmarks.value;

    const inTrashView = selectedFolderIds.value.includes("trash");

    // Default: never show deleted unless explicitly in Trash
    if (!inTrashView) {
      result = result.filter((b) => !b.deleted);
    }

    // 1. Filter by Folder
    if (selectedFolderIds.value.length > 0) {
      // Trash view: show only deleted
      if (inTrashView) {
        result = result.filter((b) => b.deleted);
      } else {
        result = result.filter((b) => {
          // 'uncategorized' case
          if (selectedFolderIds.value.includes("uncategorized") && !b.folderId) return true;
          // normal folders
          if (b.folderId && selectedFolderIds.value.includes(b.folderId)) return true;
          return false;
        });
      }
    }

    // 2. Filter by Search
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.url.toLowerCase().includes(query) ||
          b.description?.toLowerCase().includes(query) ||
          b.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    return result;
  });

  // --- Folder Actions ---
  const addFolder = async (name: string) => {
    folders.value.push({
      id: crypto.randomUUID(),
      name,
    });
    await save();
  };
  const setViewMode = async (mode: "grid" | "list") => {
    viewMode.value = mode;
    if (store) {
      await store.set("ui.viewMode", mode);
      await store.save();
    }
  };

  // Browser-based Export/Import removed; use Settings native actions instead

  const removeFolder = async (id: string) => {
    // Logic: Move bookmarks in this folder to Uncategorized? Or delete them?
    // Usually move to uncategorized.
    const bookmarksInFolder = bookmarks.value.filter((b) => b.folderId === id);
    bookmarksInFolder.forEach((b) => (b.folderId = undefined));

    folders.value = folders.value.filter((f) => f.id !== id);

    if (currentFolderId.value === id) {
      currentFolderId.value = null; // Reset view
    }
    await save();
  };

  const updateFolder = async (id: string, name: string) => {
    const folder = folders.value.find((f) => f.id === id);
    if (folder) {
      folder.name = name;
      await save();
    }
  };

  const reorderFolders = async (newOrderIds: string[]) => {
    // Sort existing folders based on the new ID array order
    const folderMap = new Map(folders.value.map((f) => [f.id, f]));
    const newFolders_ = newOrderIds
      .map((id) => folderMap.get(id))
      .filter((f) => f !== undefined) as Folder[];

    // If there are folders not in the new order (shouldn't happen but safe guard), append them
    const remaining = folders.value.filter((f) => !newOrderIds.includes(f.id));

    folders.value = [...newFolders_, ...remaining];
    await save();
  };

  // --- Bookmark Actions ---

  const updateBookmark = async (id: string, updates: Partial<Bookmark>) => {
    const index = bookmarks.value.findIndex((b) => b.id === id);
    if (index !== -1) {
      const merged = { ...bookmarks.value[index], ...updates };
      // If updating implies moving out of trash, ensure deleted flags cleared
      if (merged.deleted) {
        // keep as is
      }
      bookmarks.value[index] = merged;
      await save();
    }
  };

  return {
    bookmarks,
    folders,
    isLoaded,
    currentFolderId,
    searchQuery,
    filteredBookmarks,
    init,
    addBookmark,
    removeBookmark,
    removeBookmarkPermanent,
    restoreBookmark,
    emptyTrash,
    updateBookmark,
    saveNow,
    setViewMode,
    setFolderFilter,
    toggleFolderFilter,
    selectedFolderIds,
    sidebarWidth,
    theme,
    browserToolbarAutoHideMs,
    browserToolbarHotzoneRevealDelayMs,
    addFolder,
    removeFolder,
    updateFolder,
    reorderFolders,
    viewMode,
  };
});
