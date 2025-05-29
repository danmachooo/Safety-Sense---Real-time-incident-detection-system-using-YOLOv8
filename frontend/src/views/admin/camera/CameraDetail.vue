<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../../utils/axios";
import {
  Camera,
  MapPin,
  Wifi,
  WifiOff,
  Globe,
  Clock,
  Monitor,
  Settings,
  ArrowLeft,
  Edit,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Activity,
  Calendar,
  Eye,
  RefreshCw,
  Signal,
  HardDrive,
  Zap,
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const camera = ref({
  id: "",
  name: "",
  location: "",
  ipAddress: "",
  rtspUrl: "",
  lastOnlineAt: "",
  status: "",
  model: "",
  description: "",
  createdAt: "",
  updatedAt: "",
});

const loading = ref(true);
const error = ref(null);
const showEditModal = ref(false);
const editedCamera = ref({});
const isSaving = ref(false);
const saveSuccess = ref(false);
const isRefreshing = ref(false);

const fetchCameraDetails = async () => {
  try {
    const response = await api.get(`/camera/get/${route.params.id}`);
    camera.value = { ...response.data.data };
    loading.value = false;
  } catch (err) {
    error.value = "Failed to load camera details";
    loading.value = false;
  }
};

const refreshCamera = async () => {
  isRefreshing.value = true;
  try {
    await fetchCameraDetails();
  } finally {
    isRefreshing.value = false;
  }
};

const goBack = () => {
  router.push("/admin/camera/manage");
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
    const response = await api.put(
      `/camera/update/${camera.value.id}`,
      editedCamera.value
    );
    camera.value = { ...response.data.data };
    saveSuccess.value = true;
    setTimeout(() => {
      showEditModal.value = false;
      saveSuccess.value = false;
    }, 2000);
  } catch (err) {
    error.value = "Failed to update camera details";
  } finally {
    isSaving.value = false;
  }
};

const statusConfig = computed(() => {
  const status = camera.value.status?.toLowerCase();
  switch (status) {
    case "online":
      return {
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        icon: Wifi,
        label: "Online",
      };
    case "offline":
      return {
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        icon: WifiOff,
        label: "Offline",
      };
    default:
      return {
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: AlertCircle,
        label: "Unknown",
      };
  }
});

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUptime = () => {
  if (!camera.value.lastOnlineAt) return "N/A";
  const lastOnline = new Date(camera.value.lastOnlineAt);
  const now = new Date();
  const diffMs = now - lastOnline;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} days ago`;
  if (diffHours > 0) return `${diffHours} hours ago`;
  return "Recently";
};

onMounted(() => {
  fetchCameraDetails();
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
  >
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20"
        >
          <Loader2 class="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p class="text-gray-600 mt-4 text-center">
            Loading camera details...
          </p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 p-6 rounded-2xl shadow-lg"
        role="alert"
      >
        <div class="flex items-center">
          <AlertCircle class="w-6 h-6 mr-3" />
          <div>
            <p class="font-bold">Error Loading Camera</p>
            <p>{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Camera Details -->
      <div v-else class="space-y-8">
        <!-- Header -->
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
        >
          <div
            class="bg-gradient-to-r from-gray-800 to-indigo-800 p-8 text-white"
          >
            <div
              class="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0"
            >
              <div class="flex items-center">
                <div class="p-3 bg-white/20 rounded-xl mr-4">
                  <Camera class="w-8 h-8" />
                </div>
                <div>
                  <h1 class="text-4xl font-bold">{{ camera.name }}</h1>
                  <p class="text-blue-100 mt-2 flex items-center">
                    <MapPin class="w-4 h-4 mr-2" />
                    {{ camera.location }}
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-3">
                <div
                  :class="[
                    'px-4 py-2 rounded-xl border flex items-center',
                    statusConfig.bg,
                    statusConfig.color,
                    statusConfig.border,
                  ]"
                >
                  <component :is="statusConfig.icon" class="w-4 h-4 mr-2" />
                  {{ statusConfig.label }}
                </div>
                <button
                  @click="refreshCamera"
                  :disabled="isRefreshing"
                  class="btn-refresh"
                >
                  <RefreshCw
                    class="w-4 h-4 mr-2"
                    :class="{ 'animate-spin': isRefreshing }"
                  />
                  Refresh
                </button>
                <button @click="openEditModal" class="btn-edit">
                  <Edit class="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button @click="goBack" class="btn-back">
                  <ArrowLeft class="w-4 h-4 mr-2" />
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div
            class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Status</p>
                <p :class="['text-2xl font-bold', statusConfig.color]">
                  {{ statusConfig.label }}
                </p>
              </div>
              <div :class="['p-3 rounded-xl', statusConfig.bg]">
                <component
                  :is="statusConfig.icon"
                  :class="['w-6 h-6', statusConfig.color]"
                />
              </div>
            </div>
          </div>
          <div
            class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Last Online</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ getUptime() }}
                </p>
              </div>
              <div class="p-3 bg-blue-100 rounded-xl">
                <Clock class="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div
            class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Connection</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ camera.status === "online" ? "Active" : "Inactive" }}
                </p>
              </div>
              <div class="p-3 bg-purple-100 rounded-xl">
                <Signal class="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div
            class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Model</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ camera.model || "N/A" }}
                </p>
              </div>
              <div class="p-3 bg-green-100 rounded-xl">
                <HardDrive class="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Camera Information -->
          <div
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8"
          >
            <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Settings class="w-6 h-6 mr-3 text-blue-600" />
              Camera Information
            </h2>
            <div class="space-y-6">
              <div class="info-item">
                <div class="flex items-center mb-2">
                  <Monitor class="w-5 h-5 text-blue-600 mr-3" />
                  <span class="text-sm font-semibold text-gray-700"
                    >IP Address</span
                  >
                </div>
                <p class="text-gray-900 font-medium ml-8">
                  {{ camera.ipAddress }}
                </p>
              </div>
              <div class="info-item">
                <div class="flex items-center mb-2">
                  <Globe class="w-5 h-5 text-blue-600 mr-3" />
                  <span class="text-sm font-semibold text-gray-700"
                    >RTSP URL</span
                  >
                </div>
                <p class="text-gray-900 font-medium ml-8 break-all">
                  {{ camera.rtspUrl }}
                </p>
              </div>
              <div class="info-item">
                <div class="flex items-center mb-2">
                  <HardDrive class="w-5 h-5 text-blue-600 mr-3" />
                  <span class="text-sm font-semibold text-gray-700">Model</span>
                </div>
                <p class="text-gray-900 font-medium ml-8">
                  {{ camera.model || "Not specified" }}
                </p>
              </div>
              <div class="info-item">
                <div class="flex items-center mb-2">
                  <Calendar class="w-5 h-5 text-blue-600 mr-3" />
                  <span class="text-sm font-semibold text-gray-700"
                    >Created</span
                  >
                </div>
                <p class="text-gray-900 font-medium ml-8">
                  {{ formatDate(camera.createdAt) }}
                </p>
              </div>
              <div class="info-item">
                <div class="flex items-center mb-2">
                  <Clock class="w-5 h-5 text-blue-600 mr-3" />
                  <span class="text-sm font-semibold text-gray-700"
                    >Last Updated</span
                  >
                </div>
                <p class="text-gray-900 font-medium ml-8">
                  {{ formatDate(camera.updatedAt) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Live Preview -->
          <div
            class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8"
          >
            <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Eye class="w-6 h-6 mr-3 text-blue-600" />
              Live Preview
            </h2>
            <div
              class="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-inner relative"
            >
              <img
                :src="`https://picsum.photos/800/450?random=${camera.id}`"
                :alt="`${camera.name} Preview`"
                class="object-cover w-full h-full transition-opacity duration-300 hover:opacity-90"
              />
              <div
                class="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-medium"
              >
                Live Feed
              </div>
              <div
                v-if="camera.status !== 'online'"
                class="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
              >
                <div class="text-white text-center">
                  <WifiOff class="w-12 h-12 mx-auto mb-2 opacity-70" />
                  <p class="font-medium">Camera Offline</p>
                  <p class="text-sm opacity-70">No live feed available</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Description Section -->
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8"
        >
          <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Activity class="w-6 h-6 mr-3 text-blue-600" />
            Additional Information
          </h2>
          <div class="prose max-w-none">
            <p class="text-gray-700 leading-relaxed">
              {{
                camera.description ||
                "No additional information available for this camera."
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
                <Edit class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-2xl font-bold text-gray-900">
                Edit Camera Details
              </h3>
            </div>
            <button
              @click="closeEditModal"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>

          <form @submit.prevent="saveChanges" class="p-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Camera Name *</label
                >
                <input
                  v-model="editedCamera.name"
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
                  v-model="editedCamera.location"
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
                  v-model="editedCamera.ipAddress"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Model</label
                >
                <input
                  v-model="editedCamera.model"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div class="lg:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >RTSP URL *</label
                >
                <input
                  v-model="editedCamera.rtspUrl"
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
                  v-model="editedCamera.description"
                  rows="4"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                ></textarea>
              </div>
            </div>

            <div
              class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100"
            >
              <button
                type="button"
                @click="closeEditModal"
                :disabled="isSaving"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" :disabled="isSaving" class="btn-primary">
                <Loader2 v-if="isSaving" class="w-4 h-4 mr-2 animate-spin" />
                <Save v-else class="w-4 h-4 mr-2" />
                {{ isSaving ? "Saving..." : "Save Changes" }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Success Toast -->
      <div v-if="saveSuccess" class="fixed top-6 right-6 z-50 animate-slide-in">
        <div
          class="flex items-center p-4 rounded-xl shadow-lg backdrop-blur-sm border bg-emerald-50/90 text-emerald-800 border-emerald-200"
        >
          <CheckCircle class="w-5 h-5 mr-3" />
          <span class="text-sm font-medium"
            >Camera details updated successfully!</span
          >
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
  @apply bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-xl flex items-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-edit {
  @apply bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-xl flex items-center font-medium transition-all duration-200;
}

.btn-back {
  @apply bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center font-medium transition-all duration-200 shadow-lg hover:shadow-xl;
}

.info-item {
  @apply p-4 bg-gray-50/50 rounded-xl border border-gray-100 transition-all duration-200 hover:bg-gray-100/50;
}
</style>
