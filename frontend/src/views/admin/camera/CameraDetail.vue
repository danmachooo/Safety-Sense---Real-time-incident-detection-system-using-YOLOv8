<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../../utils/axios';
import {
  Camera,
  MapPin,
  Wifi,
  Globe,
  Clock,
  Battery,
  Settings,
  ArrowLeft,
  Edit,
  X,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const camera = ref({
  id: '',
  name: '',
  location: '',
  ipAddress: '',
  rtspUrl: '',
  lastOnlineAt: '',
  status: '',
  model: '',
  description: '',
});

const loading = ref(true);
const error = ref(null);
const showEditModal = ref(false);
const editedCamera = ref({});
const isSaving = ref(false);
const saveSuccess = ref(false);

const fetchCameraDetails = async () => {
  try {
    const response = await api.get(`/camera/get/${route.params.id}`);
    camera.value = { ...response.data.data };
    loading.value = false;
  } catch (err) {
    error.value = 'Failed to load camera details';
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/admin/camera/manage');
};

const openEditModal = () => {
  editedCamera.value = { ...camera.value };
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  saveSuccess.value = false;
};

const saveChanges = async () => {
  isSaving.value = true;
  try {
    const response = await api.put(`/camera/update/${camera.value.id}`, editedCamera.value);
    camera.value = { ...response.data.data };
    saveSuccess.value = true;
    setTimeout(() => {
      showEditModal.value = false;
      saveSuccess.value = false;
    }, 2000);
  } catch (err) {
    error.value = 'Failed to update camera details';
  } finally {
    isSaving.value = false;
  }
};

const statusColor = computed(() => {
  return camera.value.status === 'online' ? 'text-green-500' : 'text-red-500';
});

onMounted(fetchCameraDetails);
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div v-if="loading" class="flex justify-center items-center h-64">
      <Loader2 class="w-12 h-12 text-blue-500 animate-spin" />
    </div>

    <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm" role="alert">
      <p class="font-bold">Error</p>
      <p>{{ error }}</p>
    </div>

    <div v-else class="bg-white shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-4 md:space-y-0">
          <h1 class="text-3xl font-bold flex items-center">
            <Camera class="mr-2" />
            {{ camera.name }}
          </h1>
          <div class="flex space-x-2">
            <button @click="goBack" class="bg-white text-blue-600 px-4 py-2 rounded-full hover:bg-blue-50 transition duration-300 flex items-center shadow-md hover:shadow-lg">
              <ArrowLeft class="w-4 h-4 mr-2" />
              Back
            </button>
            <button @click="openEditModal" class="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-400 transition duration-300 flex items-center shadow-md hover:shadow-lg">
              <Edit class="w-4 h-4 mr-2" />
              Edit
            </button>
          </div>
        </div>
        <p class="text-blue-100 flex items-center">
          <Clock class="w-4 h-4 mr-2" />
          Last updated: {{ new Date(camera.updatedAt).toLocaleString() }}
        </p>
      </div>

      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div class="flex items-center p-4 bg-gray-50 rounded-xl transition-all duration-300 hover:bg-gray-100 hover:shadow-md">
            <MapPin class="w-6 h-6 text-blue-500 mr-4" />
            <div>
              <span class="text-gray-700 font-medium">Location</span>
              <p class="text-gray-600">{{ camera.location }}</p>
            </div>
          </div>
          <div class="flex items-center p-4 bg-gray-50 rounded-xl transition-all duration-300 hover:bg-gray-100 hover:shadow-md">
            <Wifi class="w-6 h-6 text-blue-500 mr-4" />
            <div>
              <span class="text-gray-700 font-medium">IP Address</span>
              <p class="text-gray-600">{{ camera.ipAddress }}</p>
            </div>
          </div>
          <div class="flex items-center p-4 bg-gray-50 rounded-xl transition-all duration-300 hover:bg-gray-100 hover:shadow-md">
            <Globe class="w-6 h-6 text-blue-500 mr-4" />
            <div>
              <span class="text-gray-700 font-medium">RTSP URL</span>
              <p class="text-gray-600 break-all">{{ camera.rtspUrl }}</p>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="flex items-center p-4 bg-gray-50 rounded-xl transition-all duration-300 hover:bg-gray-100 hover:shadow-md">
            <Battery class="w-6 h-6 text-blue-500 mr-4" />
            <div>
              <span class="text-gray-700 font-medium">Status</span>
              <p :class="statusColor" class="font-semibold">
                {{ camera.status.charAt(0).toUpperCase() + camera.status.slice(1) }}
              </p>
            </div>
          </div>
          <div class="flex items-center p-4 bg-gray-50 rounded-xl transition-all duration-300 hover:bg-gray-100 hover:shadow-md">
            <Settings class="w-6 h-6 text-blue-500 mr-4" />
            <div>
              <span class="text-gray-700 font-medium">Model</span>
              <p class="text-gray-600">{{ camera.model || 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-gray-200">
        <h2 class="text-xl font-semibold mb-4">Additional Information</h2>
        <p class="text-gray-600">{{ camera.description || 'No additional information available.' }}</p>
      </div>

      <div class="p-6 bg-gray-50 border-t border-gray-200">
        <h2 class="text-xl font-semibold mb-4">Live Preview</h2>
        <div class="aspect-w-16 aspect-h-9 bg-gray-200 rounded-xl overflow-hidden shadow-inner">
          <!-- Replace with actual live stream or snapshot -->
          <img :src="`https://picsum.photos/800/450?random=${camera.id}`" alt="Camera Preview" class="object-cover w-full h-full transition-opacity duration-300 hover:opacity-90" />
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all duration-300 scale-95 opacity-0 show-modal">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
          <h2 class="text-2xl font-bold">Edit Camera</h2>
          <button @click="closeEditModal" class="text-white hover:text-gray-200 transition duration-150">
            <X class="w-6 h-6" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="space-y-1">
            <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" id="name" v-model="editedCamera.name" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300">
          </div>
          <div class="space-y-1">
            <label for="location" class="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" id="location" v-model="editedCamera.location" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300">
          </div>
          <div class="space-y-1">
            <label for="ipAddress" class="block text-sm font-medium text-gray-700">IP Address</label>
            <input type="text" id="ipAddress" v-model="editedCamera.ipAddress" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300">
          </div>
          <div class="space-y-1">
            <label for="rtspUrl" class="block text-sm font-medium text-gray-700">RTSP URL</label>
            <input type="text" id="rtspUrl" v-model="editedCamera.rtspUrl" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300">
          </div>
          <div class="space-y-1">
            <label for="model" class="block text-sm font-medium text-gray-700">Model</label>
            <input type="text" id="model" v-model="editedCamera.model" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300">
          </div>
          <div class="space-y-1">
            <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="description" v-model="editedCamera.description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"></textarea>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button @click="saveChanges" :disabled="isSaving" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            <Loader2 v-if="isSaving" class="w-5 h-5 mr-2 animate-spin" />
            <Save v-else class="w-5 h-5 mr-2" />
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
          <button @click="closeEditModal" :disabled="isSaving" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="saveSuccess" class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2 animate-fade-in-up">
      <CheckCircle class="w-6 h-6" />
      <span>Changes saved successfully!</span>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out;
}

.show-modal {
  animation: show-modal 0.3s ease-out forwards;
}

@keyframes show-modal {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>