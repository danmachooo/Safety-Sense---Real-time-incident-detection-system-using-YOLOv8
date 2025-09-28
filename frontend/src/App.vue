<!-- src/App.vue -->
<template>
  <div
    v-if="authStore.isAuthLoading"
    class="flex items-center justify-center h-screen"
  >
    <p>Loading...</p>
  </div>
  <router-view v-else />
</template>

<script setup lang="ts">
import { useAuthStore } from "./stores/authStore";
const authStore = useAuthStore();
</script>
