<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import api from "../../../utils/axios";
import { useRouter } from "vue-router";
import { 
  Camera,
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-vue-next';

const cameras = ref([]);
const searchQuery = ref('');
const statusFilter = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const totalCameras = ref(0);
const itemsPerPage = ref(10);

const loadingActions = ref(new Set());
const isRefreshing = ref(false);
const isModalOpen = ref(false);

const router = useRouter();

const statuses = ['Online', 'Offline'];

// Sorting state
const sortField = ref('name');
const sortOrder = ref('asc');

const columns = [
  { key: 'name', label: 'Camera Name', sortable: true },
  { key: 'ipAddress', label: 'IP Address', sortable: true },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'lastOnlineAt', label: 'Last Online', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false }
];

// Modal form data
const cameraName = ref('');
const ipAddress = ref('');
const model = ref('');
const rtspUrl = ref('');
const location = ref('');
const description = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const handleSort = (column) => {
  if (!column.sortable) return;
  
  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = column.key;
    sortOrder.value = 'asc';
  }
  
  fetchCameras();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;
  
  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown;
};

const fetchCameras = async () => {
  isRefreshing.value = true;
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value
    });

    if (statusFilter.value !== 'all') {
      queryParams.append("status", statusFilter.value);
    }

    const response = await api.get(`camera/get-all?${queryParams.toString()}`);
    
    cameras.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalCameras.value = response.data.totalCameras;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error('Error fetching cameras:', error);
    showNotification('error', 'Failed to fetch cameras');
  } finally {
    isRefreshing.value = false;
  }
};

const pollInterval = ref(null);

const startPolling = () => {
  pollInterval.value = setInterval(() => {
    fetchCameras();
  }, 30000); // Poll every 30 seconds
};

const stopPolling = () => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value);
  }
};

onMounted(() => {
  fetchCameras();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});

watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  fetchCameras();
});

const filteredCameras = computed(() => {
  return cameras.value;
});

const viewCameraDetails = (cameraId) => {
  router.push(`/admin/camera/detail/${cameraId}`);
};

const archiveCamera = async (cameraId) => {
  if (loadingActions.value.has(cameraId)) return;
  
  loadingActions.value.add(cameraId);
  try {
    await api.delete(`camera/delete/${cameraId}`);
    cameras.value = cameras.value.filter(c => c.id !== cameraId);
    totalCameras.value--;
    showNotification('success', 'Camera archived successfully');
  } catch (error) {
    console.error('Error archiving camera:', error);
    showNotification('error', 'Failed to archive camera');
  } finally {
    loadingActions.value.delete(cameraId);
  }
};

const notification = ref({ show: false, type: '', message: '' });

const showNotification = (type, message) => {
  notification.value = {
    show: true,
    type,
    message
  };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchCameras();
  }
};

const addNewCamera = () => {
  isModalOpen.value = true;
};

const handleModalClose = () => {
  isModalOpen.value = false;
  resetForm();
};

const resetForm = () => {
  cameraName.value = '';
  ipAddress.value = '';
  model.value = '';
  rtspUrl.value = '';
  location.value = '';
  description.value = '';
  errorMessage.value = '';
};

const handleCameraSubmit = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await api.post('camera/register', {
      name: cameraName.value,
      ipAddress: ipAddress.value,
      rtspUrl: rtspUrl.value,
      location: location.value,
      description: description.value,
      model: model.value
    });
    
    showNotification('success', 'Camera added successfully');
    fetchCameras();
    isModalOpen.value = false;
    resetForm();
  } catch (error) {
    console.error('Error adding camera:', error);
    errorMessage.value = 'Failed to add camera. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

</script>

<template>
  <div class="space-y-6">
    <!-- Notification -->
    <div
      v-if="notification.show"
      class="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2"
      :class="{
        'bg-green-50 text-green-800': notification.type === 'success',
        'bg-red-50 text-red-800': notification.type === 'error'
      }"
    >
      <AlertCircle v-if="notification.type === 'error'" class="w-5 h-5" />
      <p class="text-sm font-medium">{{ notification.message }}</p>
    </div>

    <h2 class="text-2xl font-bold text-gray-800 flex items-center">
      <Camera class="w-6 h-6 mr-2 text-blue-600" />
      Camera Management
    </h2>

    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search cameras..."
          class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="relative">

      </div>
      <button
        @click="addNewCamera"
        class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 flex items-center"
      >
        <PlusCircle class="w-5 h-5 mr-2" />
        Add New Camera
      </button>
      <button
        @click="fetchCameras"
        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition duration-300 flex items-center ml-2"
        :disabled="isRefreshing"
      >
        <RefreshCw class="w-5 h-5 mr-2" :class="{ 'animate-spin': isRefreshing }" />
        {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-[#0F4C75]">
          <tr>
            <th v-for="column in columns" 
                :key="column.key"
                class="px-6 py-3 text-left text-xs font-medium tracking-wider"
                :class="[
                  column.sortable ? 'cursor-pointer hover:bg-[#3282B8]' : '',
                  sortField === column.key ? 'text-white' : 'text-white'
                ]"
                @click="handleSort(column)"
            >
              <div class="flex items-center space-x-1">
                <span>{{ column.label }}</span>
                <component
                  v-if="column.sortable"
                  :is="getSortIcon(column)"
                  class="w-4 h-4"
                  :class="sortField === column.key ? 'text-blue-600' : 'text-gray-400'"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="camera in cameras" :key="camera.id" 
              class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="text-sm font-medium text-gray-900">
                  {{ camera.name }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">{{ camera.ipAddress }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">{{ camera.location }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="camera.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                {{ camera.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(camera.lastOnlineAt).toLocaleString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="viewCameraDetails(camera.id)" 
                        class="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1 rounded-full transition duration-300 ease-in-out mr-2">
                View Camera
                </button>
                <button @click="archiveCamera(camera.id)" 
                        :disabled="loadingActions.has(camera.id)"
                        :class="[
                        loadingActions.has(camera.id) ? 'opacity-50 cursor-not-allowed' : '',
                        'bg-red-100 text-red-600 hover:bg-red-200'
                        ]"
                        class="px-3 py-1 rounded-full transition duration-300 ease-in-out relative">
                <span v-if="loadingActions.has(camera.id)" class="absolute inset-0 flex items-center justify-center">
                    <svg class="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </span>
                <span :class="{ 'opacity-0': loadingActions.has(camera.id) }">
                    Archive
                </span>
                </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div class="flex flex-1 justify-between sm:hidden">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Previous
        </button>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Next
        </button>
      </div>
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Showing <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> to 
            <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, totalCameras) }}</span> of 
            <span class="font-medium">{{ totalCameras }}</span> results
          </p>
        </div>
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                    class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
              <span class="sr-only">Previous</span>
              <ChevronLeft class="h-5 w-5" aria-hidden="true" />
            </button>
            <button v-for="page in totalPages" :key="page" @click="goToPage(page)"
                    :class="[
                      page === currentPage ? 'relative z-10 inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    ]">
              {{ page }}
            </button>
            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                    class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
              <span class="sr-only">Next</span>
              <ChevronRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Camera Registration Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative animate-fade-in">
        <button @click="handleModalClose" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X class="w-6 h-6" />
        </button>

        <div class="flex items-center space-x-3">
          <Camera class="w-8 h-8 text-blue-600" />
          <h2 class="text-xl font-semibold text-gray-800">Register New Camera</h2>
        </div>

        <form @submit.prevent="handleCameraSubmit" class="mt-4 space-y-4">
          <input v-model="cameraName" placeholder="Camera Name" required class="input" />
          <input v-model="ipAddress" placeholder="IP Address" required class="input" />
          <input v-model="model" placeholder="Model" required class="input" />
          <input v-model="rtspUrl" placeholder="RTSP URL" required class="input" />
          <input v-model="location" placeholder="Location" required class="input" />
          <textarea v-model="description" placeholder="Description" class="input resize-none" rows="3"></textarea>

          <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

          <button type="submit" :disabled="isLoading" class="btn-primary w-full">
            {{ isLoading ? 'Registering...' : 'Register Camera' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.input {
  @apply w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm;
}
.btn-primary {
  @apply bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50;
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>