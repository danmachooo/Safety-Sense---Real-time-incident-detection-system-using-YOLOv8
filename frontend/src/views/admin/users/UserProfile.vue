<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  ArrowLeft, 
  Mail, 
  User, 
  Phone, 
  Shield, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Edit3,
  X,
  UserCog,
  ShieldAlert
} from 'lucide-vue-next';

import api from '../../../utils/axios';

const router = useRouter();
const route = useRoute();
const showEditModal = ref(false);
const userId = route.params.id; 
const isLoading = ref(false);
const isRoleLoading = ref(false);
const isStatusLoading = ref(false); // Rename existing isLoading to isStatusLoading

const user = ref({
  firstname: '',
  lastname: '',
  contact: '',
  role: ''
});

const editForm = ref({
  firstname: '',
  lastname: '',
  contact: ''
});


const toggleRole = async () => {
  try {
    if(isRoleLoading.value) return;
    isRoleLoading.value = true;
    const newRole = user.value.role === 'admin' ? 'rescuer' : 'admin';
    const response = await api.patch(`authorization/change-role/${userId}`, {
      role: newRole
    });
    
    if(response.data.success) {
      user.value.role = newRole;
    }
  } catch (error) {
    console.error('Error toggling role:', error);
  } finally {
    isRoleLoading.value = false;
  }
};

const toggleStatus = async () => {
  try {
    if(isStatusLoading.value) return;
    isStatusLoading.value = true;

    const response = await api.patch(`authorization/change-access/${userId}`, {
      isBlocked: !user.value.isBlocked
    });
    
    if(response.data.success) {
      user.value.isBlocked = !user.value.isBlocked;
    }
  } catch (error) {
    console.error('Error toggling status:', error);
  } finally {
    isStatusLoading.value = false;  
  }
};


const fetchUser = async () => {
    try {
        const response = await api.get(`manage-user/get/${userId}`);
        console.log(response.data.data);

        // Assign default values if fields are null
        user.value = {
            firstname: response.data.data.firstname || '',
            lastname: response.data.data.lastname || '',
            contact: response.data.data.contact || '', // Ensure contact is always a string
            email: response.data.data.email || '',
            role: response.data.data.role || '',
            createdAt: response.data.data.createdAt || '',
            isVerified: response.data.data.isVerified ?? false, // Boolean safety
            isBlocked: response.data.data.isBlocked ?? false
        };

        // Update edit form after user data is fetched
        editForm.value = {
            firstname: user.value.firstname,
            lastname: user.value.lastname,
            contact: user.value.contact
        };
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
};

onMounted(() => {
    fetchUser();
});



const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const openEditModal = () => {
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
};

const updateUser = async () => {
  try {
    // Implement your update logic here
    const response = await api.put(`manage-user/update/${userId}`, {
        ...editForm.value
    })

    console.log(response.data)
    
    if(response.data.success) {
        user.value = {
            ...user.value, ...editForm.value
        }
        closeEditModal();
    }
  } catch (error) {
    console.error('Error updating user:', error);
  }
};

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="min-h-screen  py-8">
    <div class="max-w-10xl mx-auto">
      <!-- Back Button -->
      <button 
        @click="goBack"
        class="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
      >
        <ArrowLeft class="w-5 h-5 mr-2" />
        <span>Back to Users</span>
      </button>
      
      <!-- Profile Card -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <!-- Header -->
        <div class="relative bg-gradient-to-r from-gray-600 to-blue-800 px-6 py-8">
          <div class="flex justify-between items-start">
            <div class="flex items-center">
              <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                {{ user.firstname[0] }}{{ user.lastname[0] }}
              </div>
              <div class="ml-6 text-white">
                <h1 class="text-2xl font-bold">{{ user.firstname }} {{ user.lastname }}</h1>
                <p class="text-blue-100 flex items-center mt-1">
                  <Shield class="w-4 h-4 mr-1" />
                  {{ user.role.charAt(0).toUpperCase() + user.role.slice(1) }}
                </p>
              </div>
            </div>
            <button 
              @click="openEditModal"
              class="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 flex items-center transition-colors duration-200"
            >
              <Edit3 class="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          </div>
        </div>

        <!-- Profile Information -->
        <div class="px-6 py-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Email -->
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div class="p-2 bg-blue-50 rounded-lg">
                  <Mail class="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p class="text-sm text-gray-500">Email</p>
                <p class="mt-1 text-gray-900">{{ user.email }}</p>
                <span 
                  :class="user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1"
                >
                  <component :is="user.isVerified ? CheckCircle2 : XCircle" class="w-3 h-3 mr-1" />
                  {{ user.isVerified ? 'Verified' : 'Not Verified' }}
                </span>
              </div>
            </div>

            <!-- Contact -->
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div class="p-2 bg-blue-50 rounded-lg">
                  <Phone class="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p class="text-sm text-gray-500">Contact Number</p>
                <p class="mt-1 text-gray-900">{{ user.contact || 'Not provided' }}</p>
              </div>
            </div>

            <!-- Account Status -->
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div class="p-2 bg-blue-50 rounded-lg">
                  <Shield class="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p class="text-sm text-gray-500">Account Status</p>
                <span 
                  :class="!user.isBlocked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium mt-1"
                >
                  {{ user.isBlocked ? 'Blocked' : 'Active' }}
                </span>
              </div>
            </div>

            <!-- Created At -->
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div class="p-2 bg-blue-50 rounded-lg">
                  <Calendar class="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p class="text-sm text-gray-500">Member Since</p>
                <p class="mt-1 text-gray-900">{{ formatDate(user.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Actions -->
        <div class="px-6 py-6 border-t">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
            <div class="flex flex-wrap gap-4">
            <!-- Role Toggle Button -->
            <button
                @click="toggleRole"
                class="inline-flex items-center px-4 py-2 rounded-lg transition-all duration-200 ease-in-out relative"
                :disabled="isRoleLoading"
                :class="[
                    isRoleLoading ? 'cursor-not-allowed opacity-50' : '',
                    user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                ]"
            >
                <span v-if="isRoleLoading" class="absolute left-1 animate-spin">
                    <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 4v4m0 8v4m8-8h-4M4 12H0m19.07-7.07l-2.83 2.83M4.93 4.93l2.83 2.83m10.24 10.24l-2.83-2.83m-10.24 0l2.83 2.83">
                        </path>
                    </svg>
                </span>
                <UserCog v-if="!isRoleLoading" class="w-5 h-5 mr-2" />
                <span class="ml-2">
                    {{ isRoleLoading ? 'Processing...' : `Switch to ${user.role === 'admin' ? 'rescuer' : 'Admin'}` }}
                </span>
            </button>

            <!-- Status Toggle Button -->
            <button
                @click="toggleStatus"
                class="inline-flex items-center px-4 py-2 rounded-lg transition-all duration-200 ease-in-out relative"
                :disabled="isStatusLoading"
                :class="[
                    isStatusLoading ? 'cursor-not-allowed opacity-50' : '',
                    user.isBlocked
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                ]"
            >
                <span v-if="isStatusLoading" class="absolute left-1 animate-spin">
                    <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 4v4m0 8v4m8-8h-4M4 12H0m19.07-7.07l-2.83 2.83M4.93 4.93l2.83 2.83m10.24 10.24l-2.83-2.83m-10.24 0l2.83 2.83">
                        </path>
                    </svg>
                </span>
                <ShieldAlert v-if="!isStatusLoading" class="w-5 h-5 mr-2" />
                <span class="ml-2">
                    {{ isStatusLoading ? 'Processing...' : user.isBlocked ? 'Unblock User' : 'Block User' }}
                </span>
            </button>

            </div>
        </div>

        <!-- End Accoun action -->
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg w-full max-w-md mx-4">
        <div class="flex justify-between items-center px-6 py-4 border-b">
          <h3 class="text-lg font-semibold text-gray-900">Edit Profile</h3>
          <button @click="closeEditModal" class="text-gray-400 hover:text-gray-500">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="updateUser" class="p-6">
          <div class="space-y-4">
            <div>
              <label for="firstname" class="block text-sm font-medium text-gray-700">First Name</label>
              <input
                id="firstname"
                v-model="editForm.firstname"
                type="text"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label for="lastname" class="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                id="lastname"
                v-model="editForm.lastname"
                type="text"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label for="contact" class="block text-sm font-medium text-gray-700">Contact Number</label>
              <input
                id="contact"
                v-model="editForm.contact"
                type="tel"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              @click="closeEditModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

