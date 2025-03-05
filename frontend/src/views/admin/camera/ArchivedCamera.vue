<script setup>
import { ref, onMounted, watch } from 'vue';
import api from "../../../utils/axios";
import { 
  Camera,
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-vue-next';

const cameras = ref([]);
const searchQuery = ref('');
const statusFilter = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalCameras = ref(0);
const itemsPerPage = ref(10);
const loadingRestore = ref(new Set());
const notification = ref({ show: false, type: '', message: '' });

const statuses = ['Online', 'Offline', 'Unknown'];

// Sorting state
const sortField = ref('deletedAt');
const sortOrder = ref('desc');

const columns = [
  { 
    key: 'name',
    label: 'Camera Name',
    sortable: true
  },
  { 
    key: 'location',
    label: 'Location',
    sortable: true 
  },
  { 
    key: 'status',
    label: 'Last Status',
    sortable: true 
  },
  { 
    key: 'deletedAt',
    label: 'Archived Date',
    sortable: true 
  },
  { 
    key: 'actions',
    label: 'Actions',
    sortable: false 
  }
];

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

const fetchCameras = async () => {
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value
    });

    if (statusFilter.value) {
      queryParams.append("status", statusFilter.value);
    }

    const requestUrl = `camera/get-deleted?${queryParams.toString()}`;
    const response = await api.get(requestUrl);
    
    cameras.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalCameras.value = response.data.totalCameras;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error('Error fetching deleted cameras:', error);
    showNotification('error', 'Failed to fetch deleted cameras');
  }
};

const restoreCamera = async (cameraId) => {
  if (loadingRestore.value.has(cameraId)) return;
  
  loadingRestore.value.add(cameraId);
  try {
    await api.patch(`camera/restore/${cameraId}`);
    cameras.value = cameras.value.filter(camera => camera.id !== cameraId);
    totalCameras.value--;
    showNotification('success', 'Camera restored successfully');
  } catch (error) {
    console.error('Error restoring camera:', error);
    showNotification('error', 'Failed to restore camera');
  } finally {
    loadingRestore.value.delete(cameraId);
  }
};

onMounted(() => {
  fetchCameras();
});

watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  fetchCameras();
});

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchCameras();
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
      <CheckCircle v-if="notification.type === 'success'" class="w-5 h-5" />
      <AlertCircle v-else class="w-5 h-5" />
      <p class="text-sm font-medium">{{ notification.message }}</p>
    </div>

    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-800 flex items-center">
        <Camera class="w-6 h-6 mr-2 text-blue-600" />
        Archived Cameras
      </h2>
      <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
        Total: {{ totalCameras }}
      </span>
    </div>

    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search archived cameras..."
          class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="relative">
        <Filter class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <select
          v-model="statusFilter"
          class="pl-10 w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
        >
          <option value="">All Statuses</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </div>
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
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-3">
                  <Camera class="w-4 h-4" />
                </div>
                <div class="text-sm font-medium text-gray-900">
                  {{ camera.name }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">{{ camera.location }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="{
                      'bg-green-100 text-green-800': camera.status === 'Online',
                      'bg-red-100 text-red-800': camera.status === 'Offline',
                      'bg-yellow-100 text-yellow-800': camera.status === 'Maintenance'
                    }">
                {{ camera.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(camera.deletedAt).toLocaleDateString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button 
                @click="restoreCamera(camera.id)"
                :disabled="loadingRestore.has(camera.id)"
                class="inline-flex items-center px-4 py-2 rounded-lg transition-all duration-200 ease-in-out relative"
                :class="[
                  loadingRestore.has(camera.id) ? 'opacity-50 cursor-not-allowed' : '',
                  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                ]"
              >
                <span v-if="loadingRestore.has(camera.id)" class="absolute left-1/2 -translate-x-1/2">
                  <svg class="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                <RefreshCw v-if="!loadingRestore.has(camera.id)" class="w-4 h-4 mr-2" />
                <span :class="{ 'opacity-0': loadingRestore.has(camera.id) }">
                  Restore Camera
                </span>
              </button>
            </td>
          </tr>
          <tr v-if="cameras.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-500">
              No archived cameras found
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
            Showing <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 || 0 }}</span> to 
            <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, totalCameras) || 0 }}</span> of 
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
                      page === currentPage ? 'relative z-10 inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 
                      'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
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
  </div>
</template>

<style scoped>
/* Add any component-specific styles here if needed */
</style>