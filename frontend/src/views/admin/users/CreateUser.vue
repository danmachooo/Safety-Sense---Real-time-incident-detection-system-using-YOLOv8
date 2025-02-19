<script setup>
import { ref } from 'vue';
import { UserPlus, Mail, User, Lock, Phone } from 'lucide-vue-next';

const newUser = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: ''
});

const createUser = () => {
  // Implement user creation logic here
  console.log('Creating user:', newUser.value);
  // Reset form after submission
  newUser.value = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '' };
};
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
      <UserPlus class="w-6 h-6 mr-2 text-blue-600" />
      Create New User
    </h2>
    <form @submit.prevent="createUser" class="space-y-6">
      <div class="grid grid-cols-2 gap-6">
        <div>
          <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <div class="relative">
            <User class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              id="firstName"
              v-model="newUser.firstName"
              type="text"
              required
              class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="John"
            />
          </div>
        </div>
        <div>
          <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <div class="relative">
            <User class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              id="lastName"
              v-model="newUser.lastName"
              type="text"
              required
              class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Doe"
            />
          </div>
        </div>
      </div>
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <div class="relative">
          <Mail class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            id="email"
            v-model="newUser.email"
            type="email"
            required
            class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="johndoe@example.com"
          />
        </div>
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <div class="relative">
          <Lock class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            id="password"
            v-model="newUser.password"
            type="password"
            required
            class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
          />
        </div>
      </div>
      <div>
        <label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <div class="relative">
          <Phone class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            id="phoneNumber"
            v-model="newUser.phoneNumber"
            type="tel"
            class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>
      <div>
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
        >
          Create User
        </button>
      </div>
    </form>
  </div>
</template>