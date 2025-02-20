<script setup>
import { ref, computed } from 'vue';
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
  AlertCircle
} from 'lucide-vue-next';

import api from '../../../utils/axios';

const newUser = ref({
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  contact: '',
});

const showPassword = ref(false);
const formStep = ref(1); // For multi-step form
const isSubmitting = ref(false);

// Password strength indicator
const passwordStrength = computed(() => {
  const password = newUser.value.password;
  if (!password) return { score: 0, text: '', color: 'bg-gray-200' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strengthMap = {
    0: { text: 'Weak', color: 'bg-red-500' },
    1: { text: 'Fair', color: 'bg-orange-500' },
    2: { text: 'Good', color: 'bg-yellow-500' },
    3: { text: 'Strong', color: 'bg-green-500' },
    4: { text: 'Very Strong', color: 'bg-green-600' }
  };

  return { score, ...strengthMap[score] };
});

const isValidEmail = computed(() => {
  return !newUser.value.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.value.email);
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const nextStep = () => {
  if (formStep.value === 1 && newUser.value.firstname && newUser.value.lastname) {
    formStep.value = 2;
  }
};

const prevStep = () => {
  if (formStep.value === 2) {
    formStep.value = 1;
  }
};

const createUser = async () => {
  if (isSubmitting.value) return;
  
  isSubmitting.value = true;
  
  try {
    console.log('Creating user:', newUser.value);

    // Make API request to create a user
    const response = await api.post("/manage-user/create", {
      firstname: newUser.value.firstname,
      lastname: newUser.value.lastname,
      email: newUser.value.email,
      password: newUser.value.password,
      contact: newUser.value.contact,
    });

    if(response.data.success) {
      console.log('User created successfully:', response.data);
  
      // Reset form after submission
      newUser.value = { 
        firstname: '', 
        lastname: '', 
        email: '', 
        password: '', 
        contact: '',
      };
  
      console.log("User created successfully!");
      formStep.value = 1;  
    } else {
      console.log('User has not been created.')
    }
  } catch (error) {
    console.error('Error creating user:', error.response?.data?.message || error.message);
    alert("Failed to create user: " + (error.response?.data?.message || error.message));
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h2 class="text-3xl font-extrabold text-gray-900">
           Create New User
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Add a new user to your organization
        </p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex items-center justify-center">
          <div class="flex items-center gap-x-16"> <!-- Increased space between steps -->
            
            <!-- Step 1: Personal Info -->
            <div class="flex flex-col items-center relative">
              <div 
                class="rounded-full transition duration-500 ease-in-out h-12 w-12 py-3 border-2 flex items-center justify-center"
                :class="formStep === 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-600 text-blue-600'"
              >
                <User class="w-6 h-6" />
              </div>
              <div class="text-center mt-4 w-32 text-xs font-medium uppercase text-blue-600">
                Personal Info
              </div>
            </div>

            <!-- Progress Line -->
            <div 
              class="flex-auto border-t-2 transition duration-500 ease-in-out w-20"
              :class="formStep === 2 ? 'border-blue-600' : 'border-gray-300'"
            ></div>

            <!-- Step 2: Account Details -->
            <div class="flex flex-col items-center relative">
              <div 
                class="rounded-full transition duration-500 ease-in-out h-12 w-12 py-3 border-2 flex items-center justify-center"
                :class="formStep === 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'"
              >
                <Lock class="w-6 h-6" />
              </div>
              <div class="text-center mt-4 w-32 text-xs font-medium uppercase"
                  :class="formStep === 2 ? 'text-blue-600' : 'text-gray-500'">
                Account Details
              </div>
            </div>

          </div>
        </div>
      </div>


      <!-- Form -->
      <div class="bg-white shadow-lg rounded-2xl p-8">
        <form @submit.prevent="createUser" class="space-y-6">
          <!-- Step 1: Personal Information -->
          <div v-if="formStep === 1" class="space-y-6">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="relative group">
                <label for="firstname" class="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <div class="relative">
                  <User class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500" />
                  <input
                    id="firstname"
                    v-model="newUser.firstname"
                    type="text"
                    required
                    class="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="John"
                  />
                </div>
              </div>

              <div class="relative group">
                <label for="lastname" class="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <div class="relative">
                  <User class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500" />
                  <input
                    id="lastname"
                    v-model="newUser.lastname"
                    type="text"
                    required
                    class="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div class="relative group">
              <label for="contact" class="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div class="relative">
                <Phone class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500" />
                <input
                  id="contact"
                  v-model="newUser.contact"
                  type="tel"
                  class="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div class="flex justify-end">
              <button
                type="button"
                @click="nextStep"
                class="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                :disabled="!newUser.firstname || !newUser.lastname"
              >
                Next Step
                <ArrowLeft class="w-4 h-4 ml-2 rotate-180" />
              </button>
            </div>
          </div>

          <!-- Step 2: Account Details -->
          <div v-if="formStep === 2" class="space-y-6">
            <div class="relative group">
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div class="relative">
                <Mail class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500" />
                <input
                  id="email"
                  v-model="newUser.email"
                  type="email"
                  required
                  :class="[
                    'pl-10 w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200',
                    !isValidEmail ? 'border-red-300' : 'border-gray-300'
                  ]"
                  placeholder="johndoe@example.com"
                />
                <div v-if="!isValidEmail && newUser.email" class="absolute right-0 top-1/2 transform -translate-y-1/2 mr-3">
                  <AlertCircle class="w-5 h-5 text-red-500" />
                </div>
              </div>
              <p v-if="!isValidEmail && newUser.email" class="mt-1 text-sm text-red-600">
                Please enter a valid email address
              </p>
            </div>

            <div class="relative group">
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div class="relative">
                <Lock class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-blue-500" />
                <input
                  id="password"
                  v-model="newUser.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  @click="togglePassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>

              <!-- Password Strength Indicator -->
              <div class="mt-2">
                <div class="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    class="h-full transition-all duration-300"
                    :class="passwordStrength.color"
                    :style="{ width: `${(passwordStrength.score / 4) * 100}%` }"
                  ></div>
                </div>
                <p class="mt-1 text-sm text-gray-600">
                  Password strength: {{ passwordStrength.text }}
                </p>
              </div>
            </div>


            <div class="flex justify-between">
              <button
                type="button"
                @click="prevStep"
                class="inline-flex items-center px-6 py-2.5 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <ArrowLeft class="w-4 h-4 mr-2" />
                Previous
              </button>

              <button
                type="submit"
                class="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isSubmitting || !isValidEmail"
              >
                <span v-if="isSubmitting" class="inline-flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
                <span v-else>
                  Create User
                  <CheckCircle class="w-4 h-4 ml-2" />
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>