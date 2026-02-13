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
  <div class="h-screen w-full bg-base-100 text-base-content overflow-hidden">
    <div
      :class="[
        isFullScreen ? '' : 'drawer lg:drawer-open',
        'h-full w-full overflow-hidden',
      ]"
    >
      <input
        v-if="!isFullScreen"
        id="main-drawer"
        type="checkbox"
        class="drawer-toggle"
        v-model="drawerOpen"
      />

      <div
        :class="[
          isFullScreen ? '' : 'drawer-content',
          'flex flex-col h-full min-w-0 overflow-hidden',
        ]"
      >
        <Header v-if="!isFullScreen" @open-settings="showSettings = true" />

        <main class="flex-1 overflow-hidden relative flex flex-col bg-base-100">
          <router-view v-slot="{ Component, route: r }">
            <KeepAlive v-if="r.meta?.keepAlive">
              <component :is="Component" :key="r.fullPath" />
            </KeepAlive>
            <component :is="Component" v-else :key="r.fullPath" />
          </router-view>
        </main>
      </div>

      <div v-if="!isFullScreen" class="drawer-side z-50 overflow-hidden">
        <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
        <Sidebar @open-settings="showSettings = true" @close-drawer="drawerOpen = false" />
      </div>
    </div>

    <SettingsModal :show="showSettings" @close="showSettings = false" />
  </div>
</template>
