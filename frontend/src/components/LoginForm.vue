<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4">
    <div class="bg-gray-800 bg-opacity-80 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-md border border-gray-700">
      <!-- Logo -->
      <div class="flex justify-center mb-6">
        <img 
          src="C:\Users\PC07\Desktop\safetysense\frontend\src\assets\logo.jpg" 
          alt="Company Logo" 
          class="h-20 w-auto rounded-lg shadow-md"
        />
      </div>

      <!-- Title -->
      <h2 class="text-2xl font-semibold text-white text-center">Welcome Back, Admin!</h2>
      <p class="text-gray-400 text-center text-sm mb-6">Sign in to your account</p>

      <!-- Form -->
      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label class="block text-gray-300 text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            v-model="email" 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter your email" 
            required 
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-300 text-sm font-medium mb-1">Password</label>
          <input 
            type="password" 
            v-model="password" 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter your password" 
            required 
          />
        </div>

        <!-- Forgot Password -->
        <div class="text-right mb-4">
          <a href="#" class="text-blue-400 text-sm hover:text-blue-300 transition">Forgot password?</a>
        </div>

        <!-- Login Button -->
        <button 
          type="submit" 
          class="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-500 transition duration-300"
        >
          Sign In
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore"; // Import Pinia Store

const router = useRouter();
const email = ref("");
const password = ref("");
const authStore = useAuthStore();

const handleLogin = async () => {
  await authStore.login(email.value, password.value);

  if (authStore.isAuthenticated) {
    console.log("Redirecting to dashboard...");
    router.push("/admin/users/view"); // ✅ Proper route redirection
  }
};
</script>
