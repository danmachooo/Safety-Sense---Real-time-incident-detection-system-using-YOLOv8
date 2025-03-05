<template>
  <div class="min-h-screen bg-gray-900">
    <LoginForm v-if="!authStore.isAuthenticated" @login-success="handleLoginSuccess" />
    <router-view v-else />
  </div>
</template>

<script setup>
import { useAuthStore } from "./stores/authStore";
import LoginForm from "./components/LoginForm.vue";

const authStore = useAuthStore(); // ✅ Use Pinia store

const handleLoginSuccess = () => {
  if (authStore.isAuthenticated) { // ✅ Check if store updated successfully
    console.log("User authenticated:", authStore.isAuthenticated);
  } else {
    console.error("Login failed: User does not exist.");
  }
};
</script>
