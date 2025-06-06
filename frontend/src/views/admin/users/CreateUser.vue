<script setup>
import { ref, computed, reactive } from "vue";
import {
  UserPlus,
  Mail,
  User,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Shield,
  BadgeCheck,
  ChevronRight,
} from "lucide-vue-next";

import api from "../../../utils/axios";

const newUser = ref({
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  contact: "",
});

const showPassword = ref(false);
const formStep = ref(1); // For multi-step form
const isSubmitting = ref(false);
const notification = reactive({
  show: false,
  type: "",
  message: "",
});

// Password strength indicator
const passwordStrength = computed(() => {
  const password = newUser.value.password;
  if (!password) return { score: 0, text: "", color: "bg-gray-200" };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strengthMap = {
    0: { text: "Weak", color: "bg-red-500" },
    1: { text: "Fair", color: "bg-orange-500" },
    2: { text: "Good", color: "bg-yellow-500" },
    3: { text: "Strong", color: "bg-green-500" },
    4: { text: "Very Strong", color: "bg-green-600" },
  };

  return { score, ...strengthMap[score] };
});

const isValidEmail = computed(() => {
  return (
    !newUser.value.email ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.value.email)
  );
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const nextStep = () => {
  if (
    formStep.value === 1 &&
    newUser.value.firstname &&
    newUser.value.lastname
  ) {
    formStep.value = 2;
  }
};

const prevStep = () => {
  if (formStep.value === 2) {
    formStep.value = 1;
  }
};

const showNotification = (type, message) => {
  notification.type = type;
  notification.message = message;
  notification.show = true;

  setTimeout(() => {
    notification.show = false;
  }, 5000);
};

const createUser = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    // Make API request to create a user
    const response = await api.post("/manage-user/create", {
      firstname: newUser.value.firstname,
      lastname: newUser.value.lastname,
      email: newUser.value.email,
      password: newUser.value.password,
      contact: newUser.value.contact,
    });

    if (response.data.success) {
      // Reset form after submission
      newUser.value = {
        firstname: "",
        lastname: "",
        email: "",
        password: "",
        contact: "",
      };

      showNotification("success", "User created successfully!");
      formStep.value = 1;
    } else {
      showNotification("error", "Failed to create user.");
    }
  } catch (error) {
    console.error(
      "Error creating user:",
      error.response?.data?.message || error.message
    );
    showNotification(
      "error",
      "Failed to create user: " +
        (error.response?.data?.message || error.message)
    );
  } finally {
    isSubmitting.value = false;
  }
};

// Password requirements
const passwordRequirements = computed(() => [
  {
    text: "At least 8 characters",
    met: newUser.value.password.length >= 8,
  },
  {
    text: "At least one uppercase letter",
    met: /[A-Z]/.test(newUser.value.password),
  },
  {
    text: "At least one number",
    met: /[0-9]/.test(newUser.value.password),
  },
  {
    text: "At least one special character",
    met: /[^A-Za-z0-9]/.test(newUser.value.password),
  },
]);
</script>

<template>
  <div
    class="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50"
  >
    <div class="max-w-3xl mx-auto">
      <!-- Notification Toast -->
      <div
        v-if="notification.show"
        class="fixed top-6 right-6 z-50 animate-slide-in"
      >
        <div
          :class="[
            'flex items-center p-4 rounded-xl shadow-lg backdrop-blur-sm border transform transition-all duration-300',
            notification.type === 'success'
              ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200'
              : 'bg-red-50/90 text-red-800 border-red-200',
          ]"
        >
          <component
            :is="notification.type === 'success' ? CheckCircle : AlertCircle"
            class="w-5 h-5 mr-3"
          />
          <span class="text-sm font-medium">{{ notification.message }}</span>
          <button
            @click="notification.show = false"
            class="ml-4 hover:opacity-70 transition-opacity"
          >
            <EyeOff class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Header -->
      <div class="text-center mb-10">
        <div class="flex justify-center mb-4">
          <div
            class="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl"
          >
            <UserPlus class="w-8 h-8 text-white" />
          </div>
        </div>
        <h2
          class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
        >
          Create New User
        </h2>
        <p class="mt-3 text-lg text-gray-600">
          Add a new user to your organization with just a few steps
        </p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-10">
        <div class="flex items-center justify-center">
          <div class="flex items-center w-full max-w-md">
            <!-- Step 1: Personal Info -->
            <div class="flex flex-col items-center relative flex-1">
              <div
                class="rounded-full transition duration-500 ease-in-out h-14 w-14 flex items-center justify-center border-2 shadow-md"
                :class="
                  formStep === 1
                    ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'border-blue-600 bg-white text-blue-600'
                "
              >
                <User class="w-6 h-6" />
              </div>
              <div
                class="text-center mt-3 text-sm font-medium"
                :class="formStep === 1 ? 'text-blue-600' : 'text-blue-600'"
              >
                Personal Info
              </div>
            </div>

            <!-- Progress Line -->
            <div
              class="flex-auto border-t-2 transition duration-500 ease-in-out"
              :class="formStep === 2 ? 'border-blue-600' : 'border-gray-300'"
            ></div>

            <!-- Step 2: Account Details -->
            <div class="flex flex-col items-center relative flex-1">
              <div
                class="rounded-full transition duration-500 ease-in-out h-14 w-14 flex items-center justify-center border-2 shadow-md"
                :class="
                  formStep === 2
                    ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                "
              >
                <Shield class="w-6 h-6" />
              </div>
              <div
                class="text-center mt-3 text-sm font-medium"
                :class="formStep === 2 ? 'text-blue-600' : 'text-gray-500'"
              >
                Account Details
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <form @submit.prevent="createUser" class="space-y-6">
          <!-- Step 1: Personal Information -->
          <div v-if="formStep === 1" class="space-y-6 animate-fade-in">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="relative group">
                <label
                  for="firstname"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  First Name <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <User
                    class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500"
                  />
                  <input
                    id="firstname"
                    v-model="newUser.firstname"
                    type="text"
                    required
                    class="pl-10 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="John"
                  />
                </div>
              </div>

              <div class="relative group">
                <label
                  for="lastname"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Last Name <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <User
                    class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500"
                  />
                  <input
                    id="lastname"
                    v-model="newUser.lastname"
                    type="text"
                    required
                    class="pl-10 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div class="relative group">
              <label
                for="contact"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <div class="relative">
                <Phone
                  class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500"
                />
                <input
                  id="contact"
                  v-model="newUser.contact"
                  type="tel"
                  class="pl-10 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Optional, but recommended for account recovery
              </p>
            </div>

            <div class="flex justify-end pt-4">
              <button
                type="button"
                @click="nextStep"
                class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:-translate-y-0.5"
                :disabled="!newUser.firstname || !newUser.lastname"
                :class="{
                  'opacity-50 cursor-not-allowed':
                    !newUser.firstname || !newUser.lastname,
                }"
              >
                Next Step
                <ChevronRight class="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>

          <!-- Step 2: Account Details -->
          <div v-if="formStep === 2" class="space-y-6 animate-fade-in">
            <div class="relative group">
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <Mail
                  class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500"
                />
                <input
                  id="email"
                  v-model="newUser.email"
                  type="email"
                  required
                  :class="[
                    'pl-10 w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200',
                    !isValidEmail && newUser.email
                      ? 'border-red-300'
                      : 'border-gray-300',
                  ]"
                  placeholder="johndoe@example.com"
                />
                <div
                  v-if="!isValidEmail && newUser.email"
                  class="absolute right-0 top-1/2 transform -translate-y-1/2 mr-3"
                >
                  <AlertCircle class="w-5 h-5 text-red-500" />
                </div>
                <div
                  v-else-if="isValidEmail && newUser.email"
                  class="absolute right-0 top-1/2 transform -translate-y-1/2 mr-3"
                >
                  <CheckCircle class="w-5 h-5 text-green-500" />
                </div>
              </div>
              <p
                v-if="!isValidEmail && newUser.email"
                class="mt-1 text-sm text-red-600"
              >
                Please enter a valid email address
              </p>
            </div>

            <div class="relative group">
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <Lock
                  class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500"
                />
                <input
                  id="password"
                  v-model="newUser.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="pl-10 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  @click="togglePassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>

              <!-- Password Strength Indicator -->
              <div class="mt-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-gray-700"
                    >Password strength:</span
                  >
                  <span
                    class="text-sm font-medium"
                    :class="{
                      'text-red-600': passwordStrength.score < 2,
                      'text-yellow-600': passwordStrength.score === 2,
                      'text-green-600': passwordStrength.score > 2,
                    }"
                  >
                    {{ passwordStrength.text }}
                  </span>
                </div>
                <div
                  class="h-2 w-full bg-gray-200 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full transition-all duration-300"
                    :class="passwordStrength.color"
                    :style="{ width: `${(passwordStrength.score / 4) * 100}%` }"
                  ></div>
                </div>
              </div>

              <!-- Password Requirements -->
              <div
                class="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200"
              >
                <h4
                  class="text-sm font-medium text-gray-700 mb-2 flex items-center"
                >
                  <Shield class="w-4 h-4 mr-1 text-blue-500" />
                  Password Requirements
                </h4>
                <ul class="space-y-1">
                  <li
                    v-for="(req, index) in passwordRequirements"
                    :key="index"
                    class="flex items-center text-sm"
                    :class="req.met ? 'text-green-600' : 'text-gray-600'"
                  >
                    <BadgeCheck
                      class="w-4 h-4 mr-2"
                      :class="req.met ? 'text-green-500' : 'text-gray-400'"
                    />
                    {{ req.text }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="flex justify-between pt-4">
              <button
                type="button"
                @click="prevStep"
                class="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-xl shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <ArrowLeft class="w-5 h-5 mr-2" />
                Previous
              </button>

              <button
                type="submit"
                class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                :disabled="isSubmitting || !isValidEmail || !newUser.password"
              >
                <span v-if="isSubmitting" class="inline-flex items-center">
                  <svg
                    class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </span>
                <span v-else>
                  Create User
                  <CheckCircle class="w-5 h-5 ml-2" />
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
</style>
