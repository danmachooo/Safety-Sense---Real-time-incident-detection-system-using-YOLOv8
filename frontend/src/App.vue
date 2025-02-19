<template>
  <div class="min-h-screen bg-gray-900">
    <LoginForm v-if="isLoggedIn" @login-success="handleLoginSuccess" />
    <router-view v-else />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LoginForm from "./components/LoginForm.vue";

const isLoggedIn = ref(false);

const handleLoginSuccess = () => {
  isLoggedIn.value = true;
};
</script>
