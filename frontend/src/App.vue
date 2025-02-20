<template>
  <div class="min-h-screen bg-gray-900">
    <LoginForm v-if="!authStore.isAuthenticated" @login-success="handleLoginSuccess" />
    <router-view v-else />
  </div>
</template>

<script setup>
import { useAuthStore } from "./stores/authStore"; // Import Pinia store
import LoginForm from "./components/LoginForm.vue";

const authStore = useAuthStore(); // Use Pinia store

const handleLoginSuccess = () => {
  authStore.isAuthenticated = true; // Set authentication status
};
</script>
