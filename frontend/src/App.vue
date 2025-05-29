<template>
  <div>
    <LoginForm
      v-if="!authReady || !authStore.isAuthenticated"
      @login-success="onLoginSuccess"
    />
    <router-view v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "./stores/authStore";
import LoginForm from "./components/LoginForm.vue";

const authStore = useAuthStore();
const authReady = ref(false);

const onLoginSuccess = () => {
  authReady.value = true;
};

onMounted(() => {
  // Give Pinia time to hydrate token state from localStorage
  setTimeout(() => {
    authReady.value = true;
  }, 200);
});
</script>
