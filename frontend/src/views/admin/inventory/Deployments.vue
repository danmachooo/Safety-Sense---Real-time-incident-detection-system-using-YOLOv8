<script setup>
import { ref, computed, watch, onMounted } from "vue";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  Check,
  AlertTriangle,
  Truck,
  MapPin,
  Calendar,
  Package,
  Clock,
  CheckCircle2,
  Ban,
  User,
  FileText,
  ArrowLeft,
} from "lucide-vue-next";
import api from "../../../utils/axios";

// Reactive state for filters, pagination and data
const deployments = ref([]);
const loading = ref(true);
const error = ref(null);
const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(10);
const searchQuery = ref("");
const statusFilter = ref("");
const showModal = ref(false);
const currentDeployment = ref(null);
const deploymentLoading = ref(false);
const isUpdating = ref(false);
const notification = ref({ show: false, type: "", message: "" });

// Define non-returnable item categories/keywords
const nonReturnableItems = [
  "alcohol",
  "gloves",
  "masks",
  "sanitizer",
  "wipes",
  "disposable",
  "single-use",
  "consumable",
  "bandages",
  "gauze",
  "tape",
  "syringe",
  "needle",
  "swab",
  "cotton",
  "tissue",
  "paper",
  "plastic",
];

// Helper function to check if an item is returnable
const isItemReturnable = (itemName) => {
  if (!itemName) return true;
  const lowerItemName = itemName.toLowerCase();
  return !nonReturnableItems.some((keyword) => lowerItemName.includes(keyword));
};

// Helper function to check if deployment should show return date
const shouldShowReturnDate = (deployment) => {
  const itemName = deployment.inventoryItem?.name || "";
  return isItemReturnable(itemName) && deployment.expected_return_date;
};

// Helper function to check if status update buttons should be enabled
const canUpdateStatus = (deployment) => {
  const itemName = deployment.inventoryItem?.name || "";
  return isItemReturnable(itemName) && deployment.status === "DEPLOYED";
};

// Fetch deployments from API
const fetchDeployments = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await api.get("inventory/deployment", {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        status: statusFilter.value || undefined,
        search: searchQuery.value || undefined,
      },
    });
    deployments.value = response.data.data;
    totalPages.value = response.data.meta.pages;
  } catch (err) {
    console.error("Error fetching deployments:", err);
    error.value = err;
    showNotification("Failed to fetch deployments", "error");
  } finally {
    loading.value = false;
  }
};

// Fetch a single deployment by ID
const fetchDeployment = async (id) => {
  try {
    deploymentLoading.value = true;
    const response = await api.get(`inventory/deployment/${id}`);
    currentDeployment.value = response.data.data;
  } catch (err) {
    console.error("Error fetching deployment details:", err);
    showNotification("Failed to fetch deployment details", "error");
  } finally {
    deploymentLoading.value = false;
  }
};

// Update deployment status
const updateDeploymentStatus = async (status) => {
  try {
    isUpdating.value = true;
    const response = await api.put(
      `inventory/deployment/${currentDeployment.value.id}/status`,
      {
        status,
        actual_return_date:
          status === "RETURNED" ? new Date().toISOString() : null,
        notes: `Status updated to ${status}`,
      }
    );
    currentDeployment.value = response.data.data;
    showNotification(`Deployment status updated to ${status}`, "success");
    closeModal();
    fetchDeployments();
  } catch (err) {
    console.error("Error updating deployment status:", err);
    showNotification("Failed to update deployment status", "error");
  } finally {
    isUpdating.value = false;
  }
};

// Status color utility
const statusColor = (status) => {
  switch (status) {
    case "DEPLOYED":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: "text-blue-600",
      };
    case "RETURNED":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: "text-emerald-600",
      };
    case "LOST":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      };
    case "DAMAGED":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "text-amber-600",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: "text-gray-600",
      };
  }
};

// Format date utility
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Check if deployment is overdue
const isOverdue = (deployment) => {
  if (deployment.status !== "DEPLOYED") return false;
  if (!deployment.expected_return_date) return false;
  return new Date(deployment.expected_return_date) < new Date();
};

// Get days until return
const getDaysUntilReturn = (deployment) => {
  if (deployment.status !== "DEPLOYED") return null;
  if (!deployment.expected_return_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const returnDate = new Date(deployment.expected_return_date);
  returnDate.setHours(0, 0, 0, 0);
  const diffTime = returnDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Show notification
const showNotification = (message, type) => {
  notification.value = { show: true, type, message };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

// View deployment details
const viewDeployment = (id) => {
  fetchDeployment(id);
  showModal.value = true;
};

// Close modal
const closeModal = () => {
  showModal.value = false;
  setTimeout(() => {
    currentDeployment.value = null;
  }, 300);
};

// Handle status update
const handleStatusUpdate = async (status) => {
  await updateDeploymentStatus(status);
};

// Computed stats
const deployedCount = computed(() => {
  return deployments.value.filter((d) => d.status === "DEPLOYED").length;
});

const returnedCount = computed(() => {
  return deployments.value.filter((d) => d.status === "RETURNED").length;
});

const overdueCount = computed(() => {
  return deployments.value.filter((d) => {
    if (d.status !== "DEPLOYED") return false;
    if (!d.expected_return_date) return false;
    return new Date(d.expected_return_date) < new Date();
  }).length;
});

const totalDeployments = computed(() => deployments.value.length);

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

// Watch for filter changes and reset to first page
watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  fetchDeployments();
});

// Pagination
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchDeployments();
  }
};

// Initialize data on component mount
onMounted(fetchDeployments);
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
            :is="notification.type === 'success' ? CheckCircle2 : AlertTriangle"
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
              <Truck class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              >
                Deployment Management
              </h1>
              <p class="text-gray-600 mt-1 text-lg">
                Track and manage inventory deployments with smart caching
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Deployments</p>
              <p class="text-3xl font-bold text-gray-900">
                {{ totalDeployments }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Package class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">
                Currently Deployed
              </p>
              <p class="text-3xl font-bold text-blue-600">
                {{ deployedCount }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Truck class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Returned</p>
              <p class="text-3xl font-bold text-emerald-600">
                {{ returnedCount }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle2 class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Overdue</p>
              <p class="text-3xl font-bold text-red-600">{{ overdueCount }}</p>
            </div>
            <div class="p-3 bg-red-100 rounded-xl">
              <Clock class="w-6 h-6 text-red-600" />
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
              placeholder="Search deployments..."
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
              <option value="">All Statuses</option>
              <option value="DEPLOYED">Deployed</option>
              <option value="RETURNED">Returned</option>
              <option value="LOST">Lost</option>
              <option value="DAMAGED">Damaged</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="relative">
          <div
            class="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"
          ></div>
          <div
            class="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"
          ></div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50/80 backdrop-blur-sm border border-red-200 p-6 rounded-2xl text-red-700"
      >
        <div class="flex items-center">
          <AlertTriangle class="w-6 h-6 mr-3" />
          <div>
            <p class="font-semibold">Error loading data:</p>
            <p>{{ error.message }}</p>
          </div>
        </div>
      </div>

      <!-- Deployments Table -->
      <div
        v-else-if="deployments && deployments.length > 0"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Item
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Location
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Quantity
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Status
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Return Date
                </th>
                <th
                  class="px-6 py-4 text-right text-sm font-semibold text-gray-700"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="deployment in deployments"
                :key="deployment.id"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      :class="[
                        'w-10 h-10 rounded-xl flex items-center justify-center mr-4',
                        isItemReturnable(deployment.inventoryItem?.name)
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-600',
                      ]"
                    >
                      <Package class="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div class="font-semibold text-gray-900">
                        {{ deployment.inventoryItem?.name || "Unknown Item" }}
                      </div>
                      <div
                        v-if="!isItemReturnable(deployment.inventoryItem?.name)"
                        class="text-xs text-gray-500 flex items-center mt-1"
                      >
                        <Ban class="w-3 h-3 mr-1" />
                        Non-returnable
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <MapPin class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      deployment.deployment_location
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-semibold text-gray-900">{{
                    deployment.quantity_deployed
                  }}</span>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'px-3 py-1 text-sm font-medium rounded-full border',
                      statusColor(deployment.status).bg,
                      statusColor(deployment.status).text,
                      statusColor(deployment.status).border,
                    ]"
                  >
                    {{ deployment.status }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div
                    v-if="shouldShowReturnDate(deployment)"
                    class="flex items-center"
                  >
                    <Calendar class="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div class="font-medium text-gray-900">
                        {{ formatDate(deployment.expected_return_date) }}
                      </div>
                      <div
                        v-if="deployment.status === 'DEPLOYED'"
                        class="text-sm"
                      >
                        <span
                          :class="
                            isOverdue(deployment)
                              ? 'text-red-600'
                              : getDaysUntilReturn(deployment) <= 7
                              ? 'text-amber-600'
                              : 'text-gray-500'
                          "
                        >
                          {{
                            isOverdue(deployment)
                              ? `${Math.abs(
                                  getDaysUntilReturn(deployment)
                                )} days overdue`
                              : getDaysUntilReturn(deployment) === 0
                              ? "Due today"
                              : getDaysUntilReturn(deployment) > 0
                              ? `${getDaysUntilReturn(deployment)} days left`
                              : ""
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div v-else class="flex items-center text-gray-500">
                    <Ban class="w-4 h-4 mr-2" />
                    <span class="text-sm">Permanent deployment</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end">
                    <button
                      @click="viewDeployment(deployment.id)"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <Eye class="w-5 h-5" />
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
              {{ Math.min(currentPage * itemsPerPage, totalDeployments) }} of
              {{ totalDeployments }} results
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

      <!-- Empty State -->
      <div
        v-else-if="!loading && (!deployments || deployments.length === 0)"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center"
      >
        <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          No deployments found
        </h3>
        <p class="text-gray-600 mb-6">
          There are no deployments matching your current filters.
        </p>
        <button
          @click="
            () => {
              searchQuery = '';
              statusFilter = '';
              currentPage = 1;
              fetchDeployments();
            }
          "
          class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      <!-- Enhanced Deployment Details Modal -->
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="closeModal"
      >
        <div
          class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden transform transition-all duration-300 scale-100"
        >
          <!-- Modal Header -->
          <div
            class="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-100"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <button
                  @click="closeModal"
                  class="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-200"
                >
                  <ArrowLeft class="w-5 h-5" />
                </button>
                <div
                  :class="[
                    'p-3 rounded-xl mr-4',
                    currentDeployment &&
                    isItemReturnable(currentDeployment.inventoryItem?.name)
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      : 'bg-gradient-to-r from-gray-400 to-gray-600',
                  ]"
                >
                  <Package class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 class="text-2xl font-bold text-gray-900">
                    Deployment Details
                  </h3>
                  <p class="text-gray-600 mt-1">
                    View and manage deployment information
                  </p>
                </div>
              </div>
              <button
                @click="closeModal"
                class="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-xl transition-all duration-200"
              >
                <X class="w-6 h-6" />
              </button>
            </div>
          </div>

          <!-- Modal Content -->
          <div class="overflow-y-auto max-h-[calc(95vh-120px)]">
            <!-- Loading state for deployment details -->
            <div
              v-if="deploymentLoading"
              class="p-12 flex flex-col items-center justify-center"
            >
              <div class="relative mb-4">
                <div
                  class="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"
                ></div>
                <div
                  class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"
                ></div>
              </div>
              <p class="text-gray-600 font-medium">
                Loading deployment details...
              </p>
            </div>

            <!-- Deployment details content -->
            <div v-else-if="currentDeployment" class="p-8">
              <!-- Status Banner -->
              <div
                v-if="
                  currentDeployment.status === 'DEPLOYED' &&
                  isOverdue(currentDeployment)
                "
                class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center"
              >
                <AlertTriangle class="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <p class="font-semibold text-red-800">Overdue Return</p>
                  <p class="text-sm text-red-600">
                    This deployment is
                    {{ Math.abs(getDaysUntilReturn(currentDeployment)) }} days
                    overdue for return.
                  </p>
                </div>
              </div>

              <!-- Main Information Cards -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Item Information Card -->
                <div
                  class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
                >
                  <div class="flex items-center mb-4">
                    <Package class="w-5 h-5 text-blue-600 mr-2" />
                    <h4 class="text-lg font-semibold text-gray-900">
                      Item Information
                    </h4>
                  </div>
                  <div class="space-y-4">
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Item Name
                      </p>
                      <p class="text-lg font-semibold text-gray-900">
                        {{
                          currentDeployment.inventoryItem?.name ||
                          "Unknown Item"
                        }}
                      </p>
                      <div
                        v-if="
                          !isItemReturnable(
                            currentDeployment.inventoryItem?.name
                          )
                        "
                        class="flex items-center mt-2 text-sm text-gray-600"
                      >
                        <Ban class="w-4 h-4 mr-1" />
                        Non-returnable item
                      </div>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Quantity Deployed
                      </p>
                      <p class="text-2xl font-bold text-blue-600">
                        {{ currentDeployment.quantity_deployed }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Deployment Information Card -->
                <div
                  class="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100"
                >
                  <div class="flex items-center mb-4">
                    <MapPin class="w-5 h-5 text-emerald-600 mr-2" />
                    <h4 class="text-lg font-semibold text-gray-900">
                      Deployment Information
                    </h4>
                  </div>
                  <div class="space-y-4">
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Location
                      </p>
                      <p class="text-lg font-semibold text-gray-900">
                        {{ currentDeployment.deployment_location }}
                      </p>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Current Status
                      </p>
                      <span
                        :class="[
                          'inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border',
                          statusColor(currentDeployment.status).bg,
                          statusColor(currentDeployment.status).text,
                          statusColor(currentDeployment.status).border,
                        ]"
                      >
                        <div
                          :class="[
                            'w-2 h-2 rounded-full mr-2',
                            statusColor(currentDeployment.status).icon.replace(
                              'text-',
                              'bg-'
                            ),
                          ]"
                        ></div>
                        {{ currentDeployment.status }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Timeline Card -->
              <div
                class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 mb-8"
              >
                <div class="flex items-center mb-4">
                  <Calendar class="w-5 h-5 text-amber-600 mr-2" />
                  <h4 class="text-lg font-semibold text-gray-900">Timeline</h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">
                      Deployment Date
                    </p>
                    <div class="flex items-center">
                      <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <p class="text-gray-900 font-medium">
                        {{ formatDate(currentDeployment.deployment_date) }}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">
                      Expected Return Date
                    </p>
                    <div
                      v-if="shouldShowReturnDate(currentDeployment)"
                      class="flex items-center"
                    >
                      <div
                        :class="[
                          'w-3 h-3 rounded-full mr-3',
                          isOverdue(currentDeployment)
                            ? 'bg-red-500'
                            : 'bg-emerald-500',
                        ]"
                      ></div>
                      <div>
                        <p class="text-gray-900 font-medium">
                          {{
                            formatDate(currentDeployment.expected_return_date)
                          }}
                        </p>
                        <p
                          v-if="currentDeployment.status === 'DEPLOYED'"
                          :class="[
                            'text-sm mt-1',
                            isOverdue(currentDeployment)
                              ? 'text-red-600'
                              : 'text-emerald-600',
                          ]"
                        >
                          {{
                            isOverdue(currentDeployment)
                              ? `${Math.abs(
                                  getDaysUntilReturn(currentDeployment)
                                )} days overdue`
                              : getDaysUntilReturn(currentDeployment) === 0
                              ? "Due today"
                              : `${getDaysUntilReturn(
                                  currentDeployment
                                )} days remaining`
                          }}
                        </p>
                      </div>
                    </div>
                    <div v-else class="flex items-center text-gray-500">
                      <div class="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                      <p class="text-sm">Permanent deployment</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notes Section -->
              <div
                v-if="currentDeployment.notes"
                class="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-8"
              >
                <div class="flex items-center mb-3">
                  <FileText class="w-5 h-5 text-gray-600 mr-2" />
                  <h4 class="text-lg font-semibold text-gray-900">Notes</h4>
                </div>
                <p class="text-gray-700 leading-relaxed">
                  {{ currentDeployment.notes }}
                </p>
              </div>

              <!-- Action Buttons Section -->
              <div class="border-t border-gray-200 pt-6">
                <div v-if="canUpdateStatus(currentDeployment)">
                  <h4
                    class="text-lg font-semibold text-gray-900 mb-4 flex items-center"
                  >
                    <CheckCircle2 class="w-5 h-5 text-green-600 mr-2" />
                    Update Status
                  </h4>
                  <p class="text-gray-600 mb-6">
                    Update the deployment status to reflect the current
                    situation.
                  </p>
                  <div class="flex flex-wrap gap-3">
                    <button
                      v-if="currentDeployment.status !== 'RETURNED'"
                      @click="handleStatusUpdate('RETURNED')"
                      :disabled="isUpdating"
                      class="btn-status-returned"
                    >
                      <Check class="w-4 h-4 mr-2" />
                      {{ isUpdating ? "Updating..." : "Mark as Returned" }}
                    </button>
                    <button
                      v-if="currentDeployment.status !== 'LOST'"
                      @click="handleStatusUpdate('LOST')"
                      :disabled="isUpdating"
                      class="btn-status-lost"
                    >
                      <AlertTriangle class="w-4 h-4 mr-2" />
                      {{ isUpdating ? "Updating..." : "Mark as Lost" }}
                    </button>
                    <button
                      v-if="currentDeployment.status !== 'DAMAGED'"
                      @click="handleStatusUpdate('DAMAGED')"
                      :disabled="isUpdating"
                      class="btn-status-damaged"
                    >
                      <AlertTriangle class="w-4 h-4 mr-2" />
                      {{ isUpdating ? "Updating..." : "Mark as Damaged" }}
                    </button>
                  </div>
                </div>

                <!-- Non-returnable item notice -->
                <div
                  v-else-if="
                    !isItemReturnable(currentDeployment.inventoryItem?.name)
                  "
                >
                  <div
                    class="bg-blue-50 rounded-2xl p-6 border border-blue-200"
                  >
                    <div class="flex items-start">
                      <Ban
                        class="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0"
                      />
                      <div>
                        <h4 class="text-lg font-semibold text-blue-900 mb-2">
                          Non-returnable Item
                        </h4>
                        <p class="text-blue-700 leading-relaxed">
                          This item is classified as non-returnable and will
                          remain permanently deployed at the specified location.
                          No return date tracking or status updates are required
                          for this deployment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Already processed status -->
                <div v-else>
                  <div
                    class="bg-gray-50 rounded-2xl p-6 border border-gray-200"
                  >
                    <div class="flex items-center">
                      <CheckCircle2 class="w-6 h-6 text-gray-600 mr-3" />
                      <div>
                        <h4 class="text-lg font-semibold text-gray-900 mb-1">
                          Status Finalized
                        </h4>
                        <p class="text-gray-600">
                          This deployment has been processed and no further
                          actions are available.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}

.btn-status-returned {
  @apply px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md;
}

.btn-status-lost {
  @apply px-6 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md;
}

.btn-status-damaged {
  @apply px-6 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md;
}
</style>
