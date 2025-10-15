<script setup>
import { ref, onMounted, computed } from "vue";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertCircle,
  CheckCircle,
  Package2,
  Calendar,
  Clock,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  RefreshCcw, // Added for the retry button icon
} from "lucide-vue-next";
import api from "../../../utils/axios";

// Reactive state
const batches = ref([]);
const categories = ref([]);
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const notification = ref({ show: false, type: "", message: "" });
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(10);
const totalItems = ref(0);
const totalPages = ref(0);
const filters = ref({
  supplier: "",
  isActive: true,
});

// Form state
const currentBatch = ref({
  id: null,
  inventory_item_id: "",
  quantity: 0,
  supplier: "",
  funding_source: "",
  cost: 0,
  notes: "",
  is_active: true,
  batch_number: "", // This field is for display in the title, not for input in the form
});

// Fetch data
onMounted(async () => {
  await Promise.all([fetchBatches(), fetchInventoryItems()]);
});

const fetchInventoryItems = async () => {
  try {
    const response = await api.get("inventory/items");
    categories.value = response.data.data;
  } catch (err) {
    showNotification("Failed to fetch inventory items", "error");
  }
};

const fetchBatches = async () => {
  try {
    loading.value = true;
    error.value = null; // Clear previous errors
    const response = await api.get("inventory/batches", {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        search: searchQuery.value,
        supplier: filters.value.supplier,
        is_active: filters.value.isActive,
      },
    });
    batches.value = response.data.data;
    totalItems.value = response.data.meta.total;
    totalPages.value = response.data.meta.pages;
  } catch (err) {
    error.value =
      err.response?.data?.message || "An unexpected error occurred.";
    showNotification("Failed to fetch batches", "error");
  } finally {
    loading.value = false;
  }
};

// CRUD Operations
const openBatchModal = (batch = null) => {
  currentBatch.value = batch
    ? { ...batch }
    : {
        id: null,
        inventory_item_id: "",
        quantity: 0,
        supplier: "",
        funding_source: "",
        cost: 0,
        notes: "",
        is_active: true,
        batch_number: "", // Ensure it's reset for new batches
      };
  showModal.value = true;
};

const saveBatch = async () => {
  try {
    const method = currentBatch.value.id ? "put" : "post";
    const url = currentBatch.value.id
      ? `inventory/batches/${currentBatch.value.id}`
      : "inventory/batches";
    await api[method](url, currentBatch.value);
    showNotification(
      `Batch ${currentBatch.value.id ? "updated" : "created"} successfully`,
      "success"
    );
    showModal.value = false;
    await fetchBatches();
  } catch (err) {
    showNotification(
      err.response?.data?.message || "Operation failed",
      "error"
    );
  }
};

const deleteBatch = async (id) => {
  if (!confirm("Are you sure you want to delete this batch?")) return;
  try {
    await api.delete(`inventory/batches/${id}`);
    showNotification("Batch deleted successfully", "success");
    await fetchBatches();
  } catch (err) {
    showNotification("Deletion failed", "error");
  }
};

// Helpers
const showNotification = (message, type) => {
  notification.value = { show: true, type, message };
  setTimeout(() => (notification.value.show = false), 3000);
};

const statusBadge = (batch) => {
  const status = batch?.item?.status;

  switch (status) {
    case "FUNCTIONAL":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    case "UNSERVICEABLE":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      };
  }
};

const getStatusText = (batch) => {
  console.log("Batch :", batch.item);
  const status = batch?.item?.status;
  if (status === "FUNCTIONAL") return "Functional";
  if (status === "UNSERVICEABLE") return "Unserviceable";
  return "Unknown";
};

const totalValue = computed(() => {
  const val = batches.value.reduce((sum, batch) => {
    const cost = parseFloat(batch.cost) || 0;
    const quantity = parseFloat(batch.quantity) || 0;
    const batchValue = cost * quantity;
    console.log(`Cost: ${cost}, Quantity: ${quantity}, Value: ${batchValue}`);
    return sum + batchValue;
  }, 0);
  console.log("Total Inventory Value:", val);
  return val.toFixed(2);
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

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchBatches();
  }
};

// Computed properties for empty state messages
const emptyStateTitle = computed(() => {
  if (!filters.value.isActive && totalItems.value > 0) {
    // Only show if there are batches but none are inactive
    return "No inactive batches found";
  }
  if (searchQuery.value || filters.value.supplier) {
    return "No batches found";
  }
  return "No inventory batches yet";
});

const emptyStateDescription = computed(() => {
  if (!filters.value.isActive && totalItems.value > 0) {
    // Only show if there are batches but none are inactive
    return "There are currently no inactive batches. All batches are active.";
  }
  if (searchQuery.value || filters.value.supplier) {
    return "Try adjusting your search criteria or filters to find what you're looking for.";
  }
  return "Get started by creating your first inventory batch to track stock levels.";
});
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
        class="bg-white/80 mb-8 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-10"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 py-8"
          >
            <!-- Left: Icon + Title + Subtitle -->
            <div class="flex items-center space-x-4">
              <div
                class="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl"
              >
                <Package2 class="w-8 h-8 text-white" />
              </div>
              <div>
                <h1
                  class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
                >
                  Batch Management
                </h1>
                <p class="text-gray-600 mt-1 text-base font-medium">
                  Track inventory batches
                </p>
              </div>
            </div>
            <!-- Right: Action Button -->
            <button @click="openBatchModal" class="btn-primary group">
              <PlusCircle
                class="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200"
              />
              New Batch
            </button>
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
              <p class="text-sm font-medium text-gray-600">Total Batches</p>
              <p class="text-3xl font-bold text-gray-900">{{ totalItems }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Package2 class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Value</p>
              <p class="text-3xl font-bold text-emerald-600">
                {{
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "PHP",
                  }).format(totalValue)
                }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <DollarSign class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>
      <!-- Filters -->
      <div
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="relative">
            <Search
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              v-model="searchQuery"
              @input="fetchBatches"
              type="text"
              placeholder="Search batches..."
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div class="relative">
            <Filter
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <select
              v-model="filters.supplier"
              @change="fetchBatches"
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option value="">All Suppliers</option>
              <option
                v-for="supplier in [...new Set(batches.map((b) => b.supplier))]"
                :key="supplier"
                :value="supplier"
              >
                {{ supplier }}
              </option>
            </select>
          </div>
          <div class="flex items-center space-x-6">
            <label class="flex items-center space-x-2">
              <input
                v-model="filters.isActive"
                type="checkbox"
                @change="fetchBatches"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm font-medium text-gray-700">Active Only</span>
            </label>
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
        class="bg-red-50/80 backdrop-blur-sm border border-red-200 p-6 rounded-2xl text-red-700 flex flex-col items-center justify-center text-center"
      >
        <AlertCircle class="w-12 h-12 text-red-600 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Failed to Load Batches</h3>
        <p class="text-gray-700 mb-6">{{ error }}</p>
        <button
          @click="fetchBatches"
          class="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center"
        >
          <RefreshCcw class="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
      <!-- Empty State -->
      <div
        v-else-if="!loading && !error && batches.length === 0"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center"
      >
        <Package2 class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          {{ emptyStateTitle }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{ emptyStateDescription }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            v-if="searchQuery || filters.supplier || !filters.isActive"
            @click="
              () => {
                searchQuery = '';
                filters.supplier = '';
                filters.isActive = true; // Reset to default active only
                fetchBatches();
              }
            "
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Clear Filters
          </button>
          <button
            v-if="totalItems === 0"
            @click="openBatchModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            <PlusCircle class="w-4 h-4 mr-2" />
            Add First Batch
          </button>
        </div>
      </div>
      <!-- Table -->
      <div
        v-else-if="batches.length > 0"
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
                  Quantity
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Status
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
                v-for="batch in batches"
                :key="batch.id"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4"
                    >
                      <Package2 class="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div class="font-semibold text-gray-900">
                        {{ batch.item.name || "Unknown Item" }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ batch.supplier || "No supplier" }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <span class="font-semibold text-gray-900">{{
                      batch.quantity
                    }}</span>
                    <span class="text-sm text-gray-500 ml-1">{{
                      batch.item?.unit_of_measure || "units"
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'px-3 py-1 text-sm font-medium rounded-full border',
                      statusBadge(batch).bg,
                      statusBadge(batch).text,
                      statusBadge(batch).border,
                    ]"
                  >
                    {{ getStatusText(batch) }}
                  </span>
                </td>

                <td class="px-6 py-4">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      @click="openBatchModal(batch)"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <Pencil class="w-5 h-5" />
                    </button>
                    <button
                      @click="deleteBatch(batch.id)"
                      class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <Trash2 class="w-5 h-5" />
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
              {{ Math.min(currentPage * itemsPerPage, totalItems) }} of
              {{ totalItems }} results
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
      <!-- Batch Modal -->
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <div
          class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div
            class="p-8 border-b border-gray-100 flex justify-between items-center"
          >
            <div class="flex items-center">
              <div
                class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4"
              >
                <Package2 class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-2xl font-bold text-gray-900">
                {{ currentBatch.id ? "Edit" : "New" }} Batch
                <span
                  v-if="currentBatch.id && currentBatch.batch_number"
                  class="text-gray-500 text-xl font-normal ml-2"
                >
                  (#{{ currentBatch.batch_number }})
                </span>
              </h3>
            </div>
            <button
              @click="showModal = false"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="saveBatch" class="p-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Inventory Item *</label
                >
                <select
                  v-model="currentBatch.inventory_item_id"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="" disabled>Select an item</option>
                  <option
                    v-for="item in categories"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option>
                </select>
              </div>
              <!-- Removed Batch Number input field as requested -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Quantity *</label
                >
                <input
                  v-model.number="currentBatch.quantity"
                  type="number"
                  min="0"
                  required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Supplier</label
                >
                <input
                  v-model="currentBatch.supplier"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Funding Source</label
                >
                <input
                  v-model="currentBatch.funding_source"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Cost</label
                >
                <input
                  v-model.number="currentBatch.cost"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div class="lg:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-3"
                  >Notes</label
                >
                <textarea
                  v-model="currentBatch.notes"
                  rows="3"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                ></textarea>
              </div>
              <div class="flex items-center">
                <input
                  v-model="currentBatch.is_active"
                  type="checkbox"
                  class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                />
                <label class="text-sm font-semibold text-gray-700"
                  >Active Batch</label
                >
              </div>
            </div>
            <div
              class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100"
            >
              <button
                type="button"
                @click="showModal = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                {{ currentBatch.id ? "Update" : "Create" }} Batch
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
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5;
}
.btn-secondary {
  @apply bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200;
}
.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}
.btn-pagination:not(:last-child) {
  @apply border-r-0;
}
</style>
