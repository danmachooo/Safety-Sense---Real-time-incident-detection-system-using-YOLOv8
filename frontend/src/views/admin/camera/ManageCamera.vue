<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from "vue";
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
  X,
  Eye,
  Archive,
  Wifi,
  WifiOff,
  MapPin,
  Monitor,
  Activity,
  CheckCircle,
} from "lucide-vue-next";

const router = useRouter();

const cameras = ref([]);
const searchQuery = ref("");
const statusFilter = ref("all");
const currentPage = ref(1);
const totalPages = ref(1);
const totalCameras = ref(0);
const itemsPerPage = ref(10);

const loadingActions = ref(new Set());
const isRefreshing = ref(false);
const isModalOpen = ref(false);

const statuses = ["Online", "Offline"];

// Sorting state
const sortField = ref("name");
const sortOrder = ref("asc");

const columns = [
  { key: "name", label: "Camera Name", sortable: true },
  { key: "ipAddress", label: "IP Address", sortable: true },
  { key: "location", label: "Location", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "lastOnlineAt", label: "Last Online", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];

// Modal form data
const cameraName = ref("");
const ipAddress = ref("");
const model = ref("");
const rtspUrl = ref("");
const location = ref("");
const description = ref("");
const isLoading = ref(false);
const errorMessage = ref("");

const handleSort = (column) => {
  if (!column.sortable) return;

  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = column.key;
    sortOrder.value = "asc";
  }

  fetchCameras();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;

  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === "asc" ? ArrowUp : ArrowDown;
};

const fetchCameras = async () => {
  isRefreshing.value = true;
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value,
    });

    if (statusFilter.value !== "all") {
      queryParams.append("status", statusFilter.value);
    }

    const response = await api.get(`camera/get-all?${queryParams.toString()}`);

    cameras.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalCameras.value = response.data.totalCameras;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error("Error fetching cameras:", error);
    showNotification("error", "Failed to fetch cameras");
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
    cameras.value = cameras.value.filter((c) => c.id !== cameraId);
    totalCameras.value--;
    showNotification("success", "Camera archived successfully");
  } catch (error) {
    console.error("Error archiving camera:", error);
    showNotification("error", "Failed to archive camera");
  } finally {
    loadingActions.value.delete(cameraId);
  }
};

const notification = ref({ show: false, type: "", message: "" });

const showNotification = (type, message) => {
  notification.value = {
    show: true,
    type,
    message,
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
  cameraName.value = "";
  ipAddress.value = "";
  model.value = "";
  rtspUrl.value = "";
  location.value = "";
  description.value = "";
  errorMessage.value = "";
};

const handleCameraSubmit = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    await api.post("camera/register", {
      name: cameraName.value,
      ipAddress: ipAddress.value,
      rtspUrl: rtspUrl.value,
      location: location.value,
      description: description.value,
      model: model.value,
    });

    showNotification("success", "Camera added successfully");
    fetchCameras();
    isModalOpen.value = false;
    resetForm();
  } catch (error) {
    console.error("Error adding camera:", error);
    errorMessage.value = "Failed to add camera. Please try again.";
  } finally {
    isLoading.value = false;
  }
};

// Computed stats
const onlineCameras = computed(() => {
  return cameras.value.filter((c) => c.status === "online").length;
});

const offlineCameras = computed(() => {
  return cameras.value.filter((c) => c.status === "offline").length;
});

// Visible pages for pagination
const visiblePages = computed(() => {
  const range = 2;
  let start = Math.max(1, currentPage.value - range);
  let end = Math.min(totalPages.value, currentPage.value + range);

  if (end - start < range * 2) {
    start = Math.max(1, end - range * 2);
    end = Math.min(totalPages.value, start + range * 2);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

// Get status color
const getStatusColor = (status) => {
  return status === "online"
    ? {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      }
    : { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
};

// Format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Header -->
      <div
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8"
      >
        <div class="mb-6 lg:mb-0">
          <div class="flex items-center mb-2">
            <div
              class="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4"
            >
              <Camera class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              >
                Camera Management
              </h1>
              <p class="text-gray-600 mt-1 text-lg">
                Monitor and manage security cameras
              </p>
            </div>
          </div>
        </div>
        <div class="flex space-x-3">
          <button
            @click="fetchCameras"
            :disabled="isRefreshing"
            class="btn-refresh"
          >
            <RefreshCw
              class="w-5 h-5 mr-2"
              :class="{ 'animate-spin': isRefreshing }"
            />
            {{ isRefreshing ? "Refreshing..." : "Refresh" }}
          </button>
          <button @click="addNewCamera" class="btn-primary group">
            <PlusCircle
              class="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200"
            />
            Add Camera
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Cameras</p>
              <p class="text-3xl font-bold text-gray-900">{{ totalCameras }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Camera class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Online</p>
              <p class="text-3xl font-bold text-emerald-600">
                {{ onlineCameras }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <Wifi class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Offline</p>
              <p class="text-3xl font-bold text-red-600">
                {{ offlineCameras }}
              </p>
            </div>
            <div class="p-3 bg-red-100 rounded-xl">
              <WifiOff class="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Uptime</p>
              <p class="text-3xl font-bold text-blue-600">
                {{ Math.round((onlineCameras / totalCameras) * 100) || 0 }}%
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Activity class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="relative">
            <Search
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search cameras..."
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div class="relative">
            <Filter
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <select
              v-model="statusFilter"
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="isRefreshing && cameras.length === 0"
        class="flex justify-center items-center h-64"
      >
        <div class="relative">
          <div
            class="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"
          ></div>
          <div
            class="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"
          ></div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!isRefreshing && cameras.length === 0"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center"
      >
        <Camera class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          {{
            searchQuery || statusFilter !== "all"
              ? "No cameras found"
              : "No security cameras yet"
          }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{
            searchQuery || statusFilter !== "all"
              ? "Try adjusting your search criteria or filters to find what you're looking for."
              : "Get started by registering your first security camera to begin monitoring your premises."
          }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            v-if="searchQuery || statusFilter !== 'all'"
            @click="
              () => {
                searchQuery = '';
                statusFilter = 'all';
                fetchCameras();
              }
            "
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Clear Filters
          </button>
          <button
            @click="addNewCamera"
            class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            <PlusCircle class="w-4 h-4 mr-2" />
            Register First Camera
          </button>
        </div>
      </div>

      <!-- Table -->
      <div
        v-else-if="cameras.length > 0"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  :class="[
                    'px-6 py-4 text-left text-sm font-semibold text-gray-700',
                    column.sortable
                      ? 'cursor-pointer hover:bg-gray-200/50 transition-colors duration-200'
                      : '',
                  ]"
                  @click="column.sortable ? handleSort(column) : null"
                >
                  <div class="flex items-center space-x-2">
                    <span>{{ column.label }}</span>
                    <component
                      v-if="column.sortable"
                      :is="getSortIcon(column)"
                      :class="[
                        'w-4 h-4 transition-colors duration-200',
                        sortField === column.key
                          ? 'text-blue-600'
                          : 'text-gray-400',
                      ]"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="camera in cameras"
                :key="camera.id"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4"
                    >
                      <Camera class="w-5 h-5 text-white" />
                    </div>
                    <div class="font-semibold text-gray-900">
                      {{ camera.name }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <Monitor class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      camera.ipAddress
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <MapPin class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      camera.location
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'px-3 py-1 text-sm font-medium rounded-full border flex items-center w-fit',
                      getStatusColor(camera.status).bg,
                      getStatusColor(camera.status).text,
                      getStatusColor(camera.status).border,
                    ]"
                  >
                    <component
                      :is="camera.status === 'online' ? Wifi : WifiOff"
                      class="w-3 h-3 mr-1"
                    />
                    {{ camera.status }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="text-gray-900 font-medium">{{
                    formatDate(camera.lastOnlineAt)
                  }}</span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      @click="viewCameraDetails(camera.id)"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <Eye class="w-5 h-5" />
                    </button>
                    <button
                      @click="archiveCamera(camera.id)"
                      :disabled="loadingActions.has(camera.id)"
                      class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 relative"
                    >
                      <div
                        v-if="loadingActions.has(camera.id)"
                        class="absolute inset-0 flex items-center justify-center"
                      >
                        <div
                          class="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"
                        ></div>
                      </div>
                      <Archive
                        class="w-5 h-5"
                        :class="{ 'opacity-0': loadingActions.has(camera.id) }"
                      />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div class="flex flex-col md:flex-row items-center justify-between">
            <div class="mb-4 md:mb-0 text-sm text-gray-600 font-medium">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
              {{ Math.min(currentPage * itemsPerPage, totalCameras) }} of
              {{ totalCameras }} results
            </div>
            <nav class="flex items-center space-x-1">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="btn-pagination rounded-l-xl"
              >
                <ChevronLeft class="w-5 h-5" />
              </button>
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'btn-pagination',
                  page === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : '',
                ]"
              >
                {{ page }}
              </button>
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="btn-pagination rounded-r-xl"
              >
                <ChevronRight class="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      <!-- Camera Registration Modal -->
      <div
        v-if="isModalOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <div
          class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div
            class="p-8 border-b border-gray-100 flex justify-between items-center"
          >
            <div class="flex items-center">
              <div
                class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4"
              >
                <Camera class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-2xl font-bold text-gray-900">
                Register New Camera
              </h3>
            </div>
            <button
              @click="handleModalClose"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>

          <form @submit.prevent="handleCameraSubmit" class="p-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Camera Name *</label
                >
                <input
                  v-model="cameraName"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >IP Address *</label
                >
                <input
                  v-model="ipAddress"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Model *</label
                >
                <input
                  v-model="model"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Location *</label
                >
                <input
                  v-model="location"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div class="lg:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >RTSP URL *</label
                >
                <input
                  v-model="rtspUrl"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div class="lg:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Description</label
                >
                <textarea
                  v-model="description"
                  rows="3"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                ></textarea>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <div class="flex items-center">
                <AlertCircle class="w-5 h-5 text-red-600 mr-2" />
                <p class="text-red-700 font-medium">{{ errorMessage }}</p>
              </div>
            </div>

            <div
              class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100"
            >
              <button
                type="button"
                @click="handleModalClose"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" :disabled="isLoading" class="btn-primary">
                {{ isLoading ? "Registering..." : "Register Camera" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

.btn-primary {
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none;
}

.btn-secondary {
  @apply bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200;
}

.btn-refresh {
  @apply bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}
</style>
