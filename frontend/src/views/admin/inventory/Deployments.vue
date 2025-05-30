<script setup>
import { ref, computed, watch, reactive, watchEffect } from "vue";
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
} from "lucide-vue-next";

// Composables
import {
  useDeployments,
  useDeployment,
} from "../../../utils/composables/deployments/useDeployments";
import { useDeploymentUtils } from "../../../utils/composables/deployments/useDeploymentUtils";
import { useNotifications } from "../../../utils/composables/inventory/useNotifications";
import { usePagination } from "../../../utils/composables/inventory/usePagination";

// Reactive state for filters and pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);
const searchQuery = ref("");
const statusFilter = ref("");
const showModal = ref(false);
const currentDeploymentId = ref(null);

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
  if (!itemName) return true; // Default to returnable if no name

  const lowerItemName = itemName.toLowerCase();
  return !nonReturnableItems.some((keyword) => lowerItemName.includes(keyword));
};

// Helper function to check if deployment should show return date
const shouldShowReturnDate = (deployment) => {
  const itemName = deployment.inventoryDeploymentItem?.name || "";
  return isItemReturnable(itemName) && deployment.expected_return_date;
};

// Helper function to check if status update buttons should be enabled
const canUpdateStatus = (deployment) => {
  const itemName = deployment.inventoryDeploymentItem?.name || "";
  return isItemReturnable(itemName) && deployment.status === "DEPLOYED";
};

const computedParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value,
  status: statusFilter.value || undefined,
  search: searchQuery.value || undefined,
}));

const {
  deployments,
  totalPages,
  loading,
  error,
  deployedCount,
  returnedCount,
  overdueCount,
  totalDeployments,
  updateDeploymentStatus,
  isUpdating,
  refetchDeployments,
} = useDeployments(computedParams);

const { deployment: currentDeployment, loading: deploymentLoading } =
  useDeployment(currentDeploymentId);

const { statusColor, formatDate, isOverdue, getDaysUntilReturn } =
  useDeploymentUtils();
const { notification, showNotification } = useNotifications();
const { visiblePages } = usePagination(totalPages, currentPage);

// Watch for filter changes and reset to first page
watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
});

// View deployment details
const viewDeployment = (id) => {
  currentDeploymentId.value = id;
  showModal.value = true;
};

// Close modal and reset deployment ID
const closeModal = () => {
  showModal.value = false;
  setTimeout(() => {
    currentDeploymentId.value = null;
  }, 300); // Small delay to prevent UI flicker
};

// Handle status update
const handleStatusUpdate = async (status) => {
  try {
    await updateDeploymentStatus({
      id: currentDeploymentId.value,
      status,
    });
    showNotification(`Deployment status updated to ${status}`, "success");
    closeModal();
    refetchDeployments();
  } catch (error) {
    console.error("Error updating deployment status:", error);
    showNotification("Failed to update deployment status", "error");
  }
};

watchEffect(() => {
  console.log("Query key:", ["deployments", { ...computedParams.value }]);
});

// Pagination
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
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
                        isItemReturnable(
                          deployment.inventoryDeploymentItem?.name
                        )
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-600',
                      ]"
                    >
                      <Package class="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div class="font-semibold text-gray-900">
                        {{
                          deployment.inventoryDeploymentItem?.name ||
                          "Unknown Item"
                        }}
                      </div>
                      <div
                        v-if="
                          !isItemReturnable(
                            deployment.inventoryDeploymentItem?.name
                          )
                        "
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
            }
          "
          class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      <!-- Deployment Details Modal -->
      <div
        v-if="showModal"
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
                :class="[
                  'p-3 rounded-xl mr-4',
                  currentDeployment &&
                  isItemReturnable(
                    currentDeployment.inventoryDeploymentItem?.name
                  )
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-r from-gray-400 to-gray-600',
                ]"
              >
                <Truck class="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 class="text-2xl font-bold text-gray-900">
                  Deployment Details
                </h3>
                <p
                  v-if="
                    currentDeployment &&
                    !isItemReturnable(
                      currentDeployment.inventoryDeploymentItem?.name
                    )
                  "
                  class="text-sm text-gray-500 flex items-center mt-1"
                >
                  <Ban class="w-4 h-4 mr-1" />
                  Non-returnable item
                </p>
              </div>
            </div>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>

          <!-- Loading state for deployment details -->
          <div
            v-if="deploymentLoading"
            class="p-8 flex justify-center items-center"
          >
            <div class="relative">
              <div
                class="animate-spin rounded-full h-8 w-8 border-2 border-blue-200"
              ></div>
              <div
                class="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent absolute top-0 left-0"
              ></div>
            </div>
          </div>

          <!-- Deployment details content -->
          <div v-else-if="currentDeployment" class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div class="space-y-4">
                <div>
                  <p class="text-sm font-semibold text-gray-500 mb-2">
                    Item Name
                  </p>
                  <p class="text-lg font-semibold text-gray-900">
                    {{
                      currentDeployment.inventoryDeploymentItem?.name ||
                      "Unknown Item"
                    }}
                  </p>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-500 mb-2">
                    Location
                  </p>
                  <div class="flex items-center">
                    <MapPin class="w-4 h-4 text-gray-400 mr-2" />
                    <p class="text-gray-900 font-medium">
                      {{ currentDeployment.deployment_location }}
                    </p>
                  </div>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-500 mb-2">
                    Quantity Deployed
                  </p>
                  <p class="text-lg font-semibold text-gray-900">
                    {{ currentDeployment.quantity_deployed }}
                  </p>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <p class="text-sm font-semibold text-gray-500 mb-2">
                    Current Status
                  </p>
                  <span
                    :class="[
                      'px-3 py-1 text-sm font-medium rounded-full border',
                      statusColor(currentDeployment.status).bg,
                      statusColor(currentDeployment.status).text,
                      statusColor(currentDeployment.status).border,
                    ]"
                  >
                    {{ currentDeployment.status }}
                  </span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-500 mb-2">
                    Deployment Date
                  </p>
                  <div class="flex items-center">
                    <Calendar class="w-4 h-4 text-gray-400 mr-2" />
                    <p class="text-gray-900 font-medium">
                      {{ formatDate(currentDeployment.deployment_date) }}
                    </p>
                  </div>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-500 mb-2">
                    Expected Return Date
                  </p>
                  <div
                    v-if="shouldShowReturnDate(currentDeployment)"
                    class="flex items-center"
                  >
                    <Calendar class="w-4 h-4 text-gray-400 mr-2" />
                    <p class="text-gray-900 font-medium">
                      {{ formatDate(currentDeployment.expected_return_date) }}
                    </p>
                  </div>
                  <div v-else class="flex items-center text-gray-500">
                    <Ban class="w-4 h-4 mr-2" />
                    <p class="text-sm">Permanent deployment</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="currentDeployment.notes" class="mb-8">
              <p class="text-sm font-semibold text-gray-500 mb-2">Notes</p>
              <div class="bg-gray-50 rounded-xl p-4">
                <p class="text-gray-900">{{ currentDeployment.notes }}</p>
              </div>
            </div>

            <!-- Status Update Section -->
            <div
              v-if="canUpdateStatus(currentDeployment)"
              class="border-t border-gray-100 pt-6"
            >
              <p class="text-lg font-semibold text-gray-900 mb-4">
                Update Status
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
                !isItemReturnable(
                  currentDeployment.inventoryDeploymentItem?.name
                )
              "
              class="border-t border-gray-100 pt-6"
            >
              <div class="bg-gray-50 rounded-xl p-4 flex items-center">
                <Ban class="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <p class="text-sm font-medium text-gray-700">
                    Non-returnable Item
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    This item is not expected to be returned and will remain
                    permanently deployed.
                  </p>
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
  @apply px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-status-lost {
  @apply px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-status-damaged {
  @apply px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
