<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-gray-900 px-4"
  >
    <div
      class="flex w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden"
    >
      <!-- Left Section: Logo -->
      <div
        class="w-1/2 flex flex-col items-center justify-center p-8"
        style="background-color: #0077b6"
      >
        <img
          :src="logo"
          alt="SafetySense Logo"
          class="h-50 w-auto mb-4 rounded-lg"
        />
      </div>

      <!-- Right Section: Login Form -->
      <div class="w-1/2 bg-gray-900 p-8 flex flex-col justify-center">
        <h2 class="text-4xl font-semibold text-white text-center">
          Welcome back
        </h2>
        <p class="text-gray-400 text-center text-sm mb-6">
          Sign in to your account
        </p>

        <!-- Success Message -->
        <div
          v-if="showSuccessMessage"
          class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center"
        >
          <CheckCircle class="w-5 h-5 mr-2" />
          <span class="text-sm">Login successful! Redirecting...</span>
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center"
        >
          <AlertCircle class="w-5 h-5 mr-2" />
          <span class="text-sm">{{ errorMessage }}</span>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin">
          <div class="mb-4">
            <label class="block text-gray-300 text-sm font-medium mb-1"
              >Email</label
            >
            <input
              type="email"
              v-model="email"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              :class="{ 'border-red-500': errorMessage && !email }"
              placeholder="Enter your email"
              :disabled="isLoading"
              required
            />
          </div>
          <div class="mb-4">
            <label class="block text-gray-300 text-sm font-medium mb-1"
              >Password</label
            >
            <input
              type="password"
              v-model="password"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              :class="{ 'border-red-500': errorMessage && !password }"
              placeholder="Enter your password"
              :disabled="isLoading"
              required
            />
          </div>

          <!-- Forgot Password -->
          <div class="text-right mb-4">
            <a
              href="#"
              class="text-blue-400 text-sm hover:text-blue-300 transition"
              >Forgot password?</a
            >
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            class="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-500 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            :disabled="isLoading"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
            <span>{{ isLoading ? "Signing In..." : "Sign In" }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { storeToRefs } from "pinia";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-vue-next";
import logo from "../assets/final.png";

const router = useRouter();
const route = useRoute();
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const showSuccessMessage = ref(false);
const isLoading = ref(false);

const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);

// Check if user is already authenticated on component mount
onMounted(() => {
  if (isAuthenticated.value) {
    router.push("/admin/dashboard");
  }
});

const clearMessages = () => {
  errorMessage.value = "";
  showSuccessMessage.value = false;
};

const handleLogin = async () => {
  try {
    // Clear previous messages
    clearMessages();
    isLoading.value = true;

    console.log("Logging in...");

    // Validate form inputs
    if (!email.value || !password.value) {
      errorMessage.value = "Please fill in all required fields.";
      return;
    }

    // Attempt login
    const success = await authStore.login(email.value, password.value);
    await nextTick();

    if (success && isAuthenticated.value) {
      console.log("Login successful, redirecting...");
      showSuccessMessage.value = true;

      // Get redirect path from query parameter or default to dashboard
      const redirectPath = route.query.redirect || "/admin/dashboard";

      // Add a small delay to show success message before redirect
      setTimeout(async () => {
        await router.push(redirectPath);
      }, 1500);
    } else {
      errorMessage.value = "Invalid email or password. Please try again.";
    }
  } catch (error) {
    console.error("Login error:", error);

    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 401:
          errorMessage.value = "Invalid email or password.";
          break;
        case 403:
          errorMessage.value =
            "Account access denied. Please contact administrator.";
          break;
        case 429:
          errorMessage.value =
            "Too many login attempts. Please try again later.";
          break;
        case 500:
          errorMessage.value = "Server error. Please try again later.";
          break;
        default:
          errorMessage.value =
            error.response.data?.message || "Login failed. Please try again.";
      }
    } else if (error.request) {
      // Network error
      errorMessage.value =
        "Network error. Please check your connection and try again.";
    } else {
      // Other errors
      errorMessage.value =
        error.message || "An unexpected error occurred. Please try again.";
    }
  } finally {
    isLoading.value = false;
  }
};

// Clear error message when user starts typing
const clearErrorOnInput = () => {
  if (errorMessage.value) {
    errorMessage.value = "";
  }
};

// Watch for input changes to clear errors
import { watch } from "vue";
watch([email, password], clearErrorOnInput);
</script>
