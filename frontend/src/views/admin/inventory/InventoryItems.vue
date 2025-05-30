<script setup>
import { ref, computed, watch } from "vue";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  X,
  Truck,
  Package,
  AlertTriangle,
  ChartBarStackedIcon,
} from "lucide-vue-next";

// Composables
import { useItems } from "../../../utils/composables/inventory/useItems";
import { useDeployment } from "../../../utils/composables/inventory/useDeployments";
import { useCategories } from "../../../utils/composables/inventory/useCategories";
import { usePagination } from "../../../utils/composables/inventory/usePagination";
import { useNotifications } from "../../../utils/composables/inventory/useNotifications";
// Reactive state for filters and pagination
const searchQuery = ref("");
const categoryFilter = ref("all");
const currentPageRef = ref(1);
const itemsPerPage = ref(10);
const sortField = ref("name");
const sortOrder = ref("asc");

// Use composables
const { categories } = useCategories();

// Create reactive params object for the items query
const itemsParams = computed(() => ({
  page: currentPageRef.value,
  limit: itemsPerPage.value,
  search: searchQuery.value,
  category: categoryFilter.value,
  sortBy: sortField.value,
  sortOrder: sortOrder.value,
}));

const {
  items,
  totalItems,
  totalPages,
  currentPage,
  loading,
  error,
  createItem,
  updateItem,
  deleteItem,
  isCreating,
  isUpdating,
  isDeleting,
} = useItems(itemsParams);

const { deployItem, isDeploying } = useDeployment();
const { notification, showNotification, hideNotification } = useNotifications();
const { visiblePages } = usePagination(totalPages, currentPage);

// Modal state
const showModal = ref(false);
const showDeployModal = ref(false);

// Form state
const newItem = ref({
  id: null,
  name: "",
  description: "",
  category_id: "",
  quantity_in_stock: 0,
  min_stock_level: 0,
  unit_of_measure: "",
  condition: "",
  location: "",
  is_deployable: false,
  notes: "",
});

const deploymentDetails = ref({
  inventory_item_id: null,
  deployment_type: "EMERGENCY",
  quantity_deployed: 1,
  deployment_location: "",
  deployment_date: new Date().toISOString().split("T")[0],
  expected_return_date: "",
  incident_type: "",
  notes: "",
});

// Table configuration
const columns = [
  { key: "name", label: "Item Name", sortable: true, width: "20%" },
  { key: "category.name", label: "Category", sortable: true, width: "15%" },
  { key: "quantity_in_stock", label: "Stock", sortable: true, width: "10%" },
  { key: "condition", label: "Condition", sortable: true, width: "12%" },
  { key: "location", label: "Location", sortable: true, width: "15%" },
  { key: "actions", label: "Actions", sortable: false, width: "18%" },
];

// Watch for filter changes and reset to first page
watch([searchQuery, categoryFilter, itemsPerPage], () => {
  currentPageRef.value = 1;
});

// Computed values
const lowStockItems = computed(
  () =>
    items.value.filter((item) => item.quantity_in_stock <= item.min_stock_level)
      .length
);

// Sorting
const handleSort = (column) => {
  if (!column.sortable) return;
  sortOrder.value =
    sortField.value === column.key
      ? sortOrder.value === "asc"
        ? "desc"
        : "asc"
      : "asc";
  sortField.value = column.key;
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;
  if (sortField.value !== column.key) return ArrowUpDown;
  return sortOrder.value === "asc" ? ArrowUp : ArrowDown;
};

// CRUD Operations
const openEditModal = (item = null) => {
  newItem.value = item
    ? { ...item }
    : {
        id: null,
        name: "",
        description: "",
        category_id: "",
        quantity_in_stock: 0,
        min_stock_level: 0,
        unit_of_measure: "",
        condition: "",
        location: "",
        is_deployable: false,
        notes: "",
      };
  showModal.value = true;
};

const saveItem = async () => {
  try {
    if (newItem.value.id) {
      await updateItem(newItem.value);
      showNotification("Item updated successfully", "success");
    } else {
      await createItem(newItem.value);
      showNotification("Item added successfully", "success");
    }
    showModal.value = false;
  } catch (err) {
    showNotification(
      err.response?.data?.message || "Operation failed",
      "error"
    );
  }
};

const handleDeleteItem = async (id) => {
  if (!confirm("Are you sure you want to delete this item?")) return;
  try {
    await deleteItem(id);
    showNotification("Item deleted successfully", "success");
  } catch (err) {
    showNotification("Deletion failed", "error");
  }
};

// Deployment
const openDeployModal = (item) => {
  deploymentDetails.value = {
    inventory_item_id: item.id,
    deployment_type: "EMERGENCY",
    quantity_deployed: 1,
    deployment_location: "",
    deployment_date: new Date().toISOString().split("T")[0],
    expected_return_date: "",
    incident_type: "",
    notes: "",
  };
  showDeployModal.value = true;
};

const handleDeployItem = async () => {
  try {
    await deployItem(deploymentDetails.value);
    showNotification("Item deployed successfully", "success");
    showDeployModal.value = false;
  } catch (err) {
    showNotification(
      err.response?.data?.message || "Deployment failed",
      "error"
    );
  }
};

// Pagination
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPageRef.value = page;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
  >
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
          @click="hideNotification"
          class="ml-4 hover:opacity-70 transition-opacity"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8"
      >
        <div class="mb-6 lg:mb-0">
          <div class="flex items-center mb-2">
            <div
              class="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4"
            >
              <Package class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              >
                Inventory Management
              </h1>
              <p class="text-gray-600 mt-1 text-lg">
                Manage your inventory items and stock levels with smart caching
              </p>
            </div>
          </div>
        </div>
        <button
          @click="openEditModal()"
          class="btn-primary group"
          :disabled="isCreating"
        >
          <PlusCircle
            class="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200"
          />
          {{ isCreating ? "Adding..." : "Add New Item" }}
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Items</p>
              <p class="text-3xl font-bold text-gray-900">{{ totalItems }}</p>
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
              <p class="text-sm font-medium text-gray-600">Categories</p>
              <p class="text-3xl font-bold text-gray-900">
                {{ categories?.length || 0 }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <ChartBarStackedIcon class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Low Stock</p>
              <p class="text-3xl font-bold text-gray-900">
                {{ lowStockItems }}
              </p>
            </div>
            <div class="p-3 bg-amber-100 rounded-xl">
              <AlertTriangle class="w-6 h-6 text-amber-600" />
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
              type="text"
              placeholder="Search items..."
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div class="relative">
            <Filter
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <select
              v-model="categoryFilter"
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option value="all">All Categories</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="flex items-center justify-end md:justify-start">
            <span class="text-sm font-medium text-gray-600 mr-3"
              >Items per page:</span
            >
            <select
              v-model="itemsPerPage"
              class="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
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
          <AlertCircle class="w-6 h-6 mr-3" />
          <div>
            <p class="font-semibold">Error loading data:</p>
            <p>{{ error.message }}</p>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div
        v-else
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  v-for="col in columns"
                  :key="col.key"
                  :class="[
                    'px-6 py-4 text-left text-sm font-semibold text-gray-700',
                    col.sortable
                      ? 'cursor-pointer hover:bg-gray-200/50 transition-colors duration-200'
                      : '',
                  ]"
                  @click="col.sortable ? handleSort(col) : null"
                >
                  <div class="flex items-center space-x-2">
                    <span>{{ col.label }}</span>
                    <component
                      v-if="col.sortable"
                      :is="getSortIcon(col)"
                      :class="[
                        'w-4 h-4 transition-colors duration-200',
                        sortField === col.key
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
                v-for="item in items"
                :key="item.id"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4"
                    >
                      <Package class="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div class="font-semibold text-gray-900">
                        {{ item.name }}
                      </div>
                      <div class="text-gray-500 text-sm mt-1">
                        {{ item.description }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :style="{
                      backgroundColor: item.category.color + '20',
                      color: item.category.color,
                      border: `1px solid ${item.category.color}30`,
                    }"
                  >
                    {{ item.category.name }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-24 h-3 bg-gray-200 rounded-full overflow-hidden mr-3"
                    >
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        :class="
                          item.quantity_in_stock <= item.min_stock_level
                            ? 'bg-red-500'
                            : 'bg-emerald-500'
                        "
                        :style="{
                          width:
                            Math.min(
                              (item.quantity_in_stock / item.min_stock_level) *
                                100,
                              100
                            ) + '%',
                        }"
                      ></div>
                    </div>
                    <span class="font-semibold text-gray-900">{{
                      item.quantity_in_stock
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="capitalize px-3 py-1 rounded-full text-sm font-medium border"
                    :class="{
                      'bg-emerald-50 text-emerald-700 border-emerald-200':
                        item.condition === 'NEW',
                      'bg-amber-50 text-amber-700 border-amber-200':
                        item.condition === 'USED',
                      'bg-red-50 text-red-700 border-red-200':
                        item.condition === 'DAMAGED',
                    }"
                  >
                    {{ item.condition.toLowerCase() }}
                  </span>
                </td>
                <td class="px-6 py-4 text-gray-600 font-medium">
                  {{ item.location }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      @click="openDeployModal(item)"
                      v-if="item.is_deployable"
                      :disabled="isDeploying"
                      class="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                    >
                      <Truck class="w-5 h-5" />
                    </button>
                    <button
                      @click="openEditModal(item)"
                      :disabled="isUpdating"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                    >
                      <Pencil class="w-5 h-5" />
                    </button>
                    <button
                      @click="handleDeleteItem(item.id)"
                      :disabled="isDeleting"
                      class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
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
    </div>

    <!-- Item Modal -->
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
              <Package class="w-6 h-6 text-white" />
            </div>
            <h3 class="text-2xl font-bold text-gray-900">
              {{ newItem.id ? "Edit" : "New" }} Inventory Item
            </h3>
          </div>
          <button
            @click="showModal = false"
            class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="saveItem" class="p-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Name -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3"
                >Item Name *</label
              >
              <input
                v-model="newItem.name"
                type="text"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <!-- Category -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3"
                >Category *</label
              >
              <select
                v-model="newItem.category_id"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="" disabled>Select a category</option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>

            <!-- Quantity -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3"
                >Quantity in Stock *</label
              >
              <input
                v-model.number="newItem.quantity_in_stock"
                type="number"
                min="0"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <!-- Minimum Stock -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3"
                >Minimum Stock Level *</label
              >
              <input
                v-model.number="newItem.min_stock_level"
                type="number"
                min="0"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <!-- Unit of Measure -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3"
                >Unit of Measure *</label
              >
              <select
                v-model="newItem.unit_of_measure"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="units">Units</option>
                <option value="liters">Liters</option>
                <option value="kilograms">Kilograms</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>

            <!-- Condition -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3"
                >Condition *</label
              >
              <select
                v-model="newItem.condition"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="NEW">New</option>
                <option value="USED">Used</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>

            <!-- Location -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3"
                >Storage Location *</label
              >
              <input
                v-model="newItem.location"
                type="text"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <!-- Deployable -->
            <div class="flex items-center">
              <input
                v-model="newItem.is_deployable"
                type="checkbox"
                class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
              />
              <label class="text-sm font-semibold text-gray-700"
                >Is this item deployable?</label
              >
            </div>
          </div>

          <!-- Description -->
          <div class="mt-8">
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Description</label
            >
            <textarea
              v-model="newItem.description"
              rows="3"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            ></textarea>
          </div>

          <!-- Notes -->
          <div class="mt-6">
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Additional Notes</label
            >
            <textarea
              v-model="newItem.notes"
              rows="2"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            ></textarea>
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
            <button
              type="submit"
              class="btn-primary"
              :disabled="isCreating || isUpdating"
            >
              {{
                isCreating || isUpdating
                  ? "Saving..."
                  : newItem.id
                  ? "Update"
                  : "Create"
              }}
              Item
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deployment Modal -->
    <div
      v-if="showDeployModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
        <div
          class="p-8 border-b border-gray-100 flex justify-between items-center"
        >
          <div class="flex items-center">
            <div
              class="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl mr-4"
            >
              <Truck class="w-6 h-6 text-white" />
            </div>
            <h3 class="text-2xl font-bold text-gray-900">Deploy Item</h3>
          </div>
          <button
            @click="showDeployModal = false"
            class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="handleDeployItem" class="p-8 space-y-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Deployment Type</label
            >
            <select
              v-model="deploymentDetails.deployment_type"
              required
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            >
              <option value="EMERGENCY">Emergency</option>
              <option value="TRAINING">Training</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RELIEF_OPERATION">Relief Operation</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Quantity</label
            >
            <input
              v-model.number="deploymentDetails.quantity_deployed"
              type="number"
              min="1"
              required
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Deployment Location</label
            >
            <input
              v-model="deploymentDetails.deployment_location"
              required
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Deployment Date</label
            >
            <input
              v-model="deploymentDetails.deployment_date"
              type="date"
              required
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Expected Return Date</label
            >
            <input
              v-model="deploymentDetails.expected_return_date"
              type="date"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Incident Type</label
            >
            <input
              v-model="deploymentDetails.incident_type"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-3"
              >Notes</label
            >
            <textarea
              v-model="deploymentDetails.notes"
              rows="3"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              @click="showDeployModal = false"
              class="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" class="btn-deploy" :disabled="isDeploying">
              {{ isDeploying ? "Deploying..." : "Deploy Item" }}
            </button>
          </div>
        </form>
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

.btn-deploy {
  @apply bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none;
}

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}
</style>
