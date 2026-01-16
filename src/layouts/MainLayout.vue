<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import Sidebar from "@/components/layout/Sidebar.vue";
import Header from "@/components/layout/Header.vue";
import SettingsModal from "@/components/layout/SettingsModal.vue";

const route = useRoute();
const isFullScreen = computed(() => route.name === "Browser");
const showSettings = ref(false);
const drawerOpen = ref(false);
</script>

<template>
  <div v-if="isFullScreen" class="h-screen w-full bg-base-100 text-base-content overflow-hidden">
    <router-view />
    <SettingsModal :show="showSettings" @close="showSettings = false" />
  </div>

  <div
    v-else
    class="drawer lg:drawer-open h-screen w-full bg-base-100 text-base-content overflow-hidden"
  >
    <input id="main-drawer" type="checkbox" class="drawer-toggle" v-model="drawerOpen" />

    <div class="drawer-content flex flex-col h-full min-w-0 overflow-hidden">
      <Header @open-settings="showSettings = true" />

      <main class="flex-1 overflow-hidden relative flex flex-col bg-base-100">
        <router-view />
      </main>
    </div>

    <div class="drawer-side z-50 overflow-hidden">
      <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <Sidebar @open-settings="showSettings = true" @close-drawer="drawerOpen = false" />
    </div>

    <SettingsModal :show="showSettings" @close="showSettings = false" />
  </div>
</template>
