<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import Sidebar from "@/components/layout/Sidebar.vue";
import Header from "@/components/layout/Header.vue";
import SettingsModal from "@/components/layout/SettingsModal.vue";

const route = useRoute();
const isFullScreen = computed(() => route.name === "Browser");
const showSettings = ref(false);
</script>

<template>
  <div class="flex h-screen w-full bg-base-100 text-base-content overflow-hidden">
    <Sidebar v-if="!isFullScreen" @open-settings="showSettings = true" />

    <div class="flex flex-col flex-1 h-full min-w-0">
      <Header v-if="!isFullScreen" @open-settings="showSettings = true" />

      <main class="flex-1 overflow-y-auto p-6 bg-base-100" :class="{ '!p-0': isFullScreen }">
        <router-view />
      </main>
    </div>

    <SettingsModal :show="showSettings" @close="showSettings = false" />
  </div>
</template>
