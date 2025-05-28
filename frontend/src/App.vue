<template>
  <div class="min-h-screen bg-gray-900">
    <LoginForm v-if="!isAuthenticated" @login-success="handleLoginSuccess" />
    <router-view v-else />
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia"; // ✅ Missing import added
import { useAuthStore } from "./stores/authStore";
import LoginForm from "./components/LoginForm.vue";

const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);

const handleLoginSuccess = () => {
  if (isAuthenticated.value) {
    console.log("User authenticated:", authStore.isAuthenticated);
  } else {
    console.error("Login failed: User does not exist.");
  }
};
</script>
