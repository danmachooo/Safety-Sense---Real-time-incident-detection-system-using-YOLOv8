<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-gray-900 px-4">
    <div class="flex w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden">
      
      <!-- Left Section: Logo -->
      <div class="w-1/2 flex flex-col items-center justify-center p-8" style="background-color: #0077b6;">

        <img 
          :src="logo" 
          alt="SafetySense Logo" 
          class="h-50 w-auto mb-4 rounded-lg"
        />
      </div>

      <!-- Right Section: Login Form -->
      <div class="w-1/2 bg-gray-900 p-8 flex flex-col justify-center">
        
        <h2 class="text-4xl font-semibold text-white text-center">Welcome back, Admin!</h2>
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
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore"; // Import Pinia Store
import logo from "../assets/final.png"; // ✅ Correct Logo Import

const router = useRouter();
const email = ref("");
const password = ref("");
const authStore = useAuthStore();

const handleLogin = async () => {
  try {
    console.log("Logging in...");

    // Simulate login
    await authStore.login(email.value, password.value);

    await nextTick();

    if (authStore.isAuthenticated) {
      console.log("Redirecting to dashboard...");
      router.push("/admin/users/view");
    } else {
      console.error("Login failed: Invalid credentials.");
    }
  } catch (error) {
    console.error("Login error:", error);
  }
};
</script>
