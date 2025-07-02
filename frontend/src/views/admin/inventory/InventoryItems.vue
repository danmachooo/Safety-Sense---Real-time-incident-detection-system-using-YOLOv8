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
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  X,
  Truck,
  Package,
  TrendingUp,
  AlertTriangle,
  ChartBarStackedIcon,
  ArrowLeft,
  Save,
  MapPin,
  Calendar,
  FileText,
  Settings,
  Info,
  Hash,
  Tag,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-vue-next";
import api from "../../../utils/axios";

// Reactive state
const items = ref([]);
const categories = ref([]);
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const showDeployModal = ref(false);
const showUploadModal = ref(false);
const notification = ref({ show: false, type: "", message: "" });
const searchQuery = ref("");
const categoryFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = ref(10);
const totalItems = ref(0);
const totalPages = ref(0);
const sortField = ref("name");
const sortOrder = ref("asc");

// Excel upload state
const uploadLoading = ref(false);
const uploadProgress = ref(0);
const uploadResults = ref(null);
const selectedFile = ref(null);
const fileInput = ref(null);
const uploadError = ref(null);

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

// Updated deployment state
const deploymentDetails = ref({
  inventory_item_id: null,
  deployment_type: "EMERGENCY",
  quantity_deployed: 1,
  deployment_location: "",
  deployment_date: new Date().toISOString().split("T")[0],
  expected_return_date: null,
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

// Fetch initial data
onMounted(async () => {
  await Promise.all([fetchItems(), fetchCategories()]);
});

// Data fetching
const fetchCategories = async () => {
  try {
    const response = await api.get("inventory/categories");
    categories.value = response.data.data;
  } catch (err) {
    showNotification("Failed to fetch categories", "error");
  }
};

const fetchItems = async () => {
  try {
    loading.value = true;
    const response = await api.get("inventory/items", {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        search: searchQuery.value,
        category:
          categoryFilter.value !== "all" ? categoryFilter.value : undefined,
        sortBy: sortField.value,
        sortOrder: sortOrder.value,
      },
    });
    items.value = response.data.data;
    totalItems.value = response.data.meta.total;
    totalPages.value = response.data.meta.pages;
    currentPage.value = response.data.meta.currentPage;
  } catch (err) {
    showNotification("Failed to fetch items", "error");
  } finally {
    loading.value = false;
  }
};

// Excel Upload Functions
const openUploadModal = () => {
  showUploadModal.value = true;
  resetUploadState();
};

const resetUploadState = () => {
  selectedFile.value = null;
  uploadResults.value = null;
  uploadError.value = null;
  uploadProgress.value = 0;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      uploadError.value =
        "Please select a valid Excel file (.xlsx, .xls) or CSV file";
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      uploadError.value = "File size must be less than 10MB";
      return;
    }

    selectedFile.value = file;
    uploadError.value = null;
  }
};

const uploadExcelFile = async () => {
  if (!selectedFile.value) {
    uploadError.value = "Please select a file to upload";
    return;
  }

  try {
    uploadLoading.value = true;
    uploadProgress.value = 0;
    uploadError.value = null;

    const formData = new FormData();
    formData.append("file", selectedFile.value);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += Math.random() * 10;
      }
    }, 200);

    const response = await api.post("inventory/upload-excel", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        uploadProgress.value = percentCompleted;
      },
    });

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    // Debug: Log the actual response structure
    console.log("Upload response:", response.data);

    // Handle the response structure - adjust based on your actual API response
    const responseData = response.data.data || response.data;

    // Check different possible response structures
    let successItems = [];
    let errorItems = [];

    if (responseData.success && Array.isArray(responseData.success)) {
      successItems = responseData.success;
    } else if (
      responseData.successful &&
      Array.isArray(responseData.successful)
    ) {
      successItems = responseData.successful;
    } else if (
      responseData.successItems &&
      Array.isArray(responseData.successItems)
    ) {
      successItems = responseData.successItems;
    }

    if (responseData.errors && Array.isArray(responseData.errors)) {
      errorItems = responseData.errors;
    } else if (responseData.failed && Array.isArray(responseData.failed)) {
      errorItems = responseData.failed;
    } else if (
      responseData.errorItems &&
      Array.isArray(responseData.errorItems)
    ) {
      errorItems = responseData.errorItems;
    }

    uploadResults.value = {
      successful: successItems.length,
      failed: errorItems.length,
      total: successItems.length + errorItems.length,
      successItems: successItems,
      errors: errorItems,
    };

    // Show success notification
    const { successful, failed } = uploadResults.value;

    if (successful > 0 && failed === 0) {
      showNotification(
        `Upload completed successfully: ${successful} items processed`,
        "success"
      );
    } else if (successful > 0 && failed > 0) {
      showNotification(
        `Upload completed: ${successful} items successful, ${failed} failed`,
        "warning"
      );
    } else if (failed > 0 && successful === 0) {
      showNotification(
        `Upload failed: ${failed} items could not be processed`,
        "error"
      );
    } else {
      showNotification(
        "Upload completed but no items were processed",
        "warning"
      );
    }

    // Refresh the items list
    await fetchItems();
  } catch (err) {
    console.error("Upload error:", err);
    uploadError.value =
      err.response?.data?.message || "Upload failed. Please try again.";
    showNotification("Excel upload failed", "error");
  } finally {
    uploadLoading.value = false;
  }
};

const downloadTemplate = async () => {
  try {
    const response = await api.get("inventory/download-template", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showNotification("Template downloaded successfully", "success");
  } catch (err) {
    showNotification("Failed to download template", "error");
  }
};

const closeUploadModal = () => {
  showUploadModal.value = false;
  setTimeout(() => {
    resetUploadState();
  }, 300);
};

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
  fetchItems();
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
    const method = newItem.value.id ? "put" : "post";
    const url = newItem.value.id
      ? `inventory/items/${newItem.value.id}`
      : "inventory/items";
    await api[method](url, newItem.value);
    showNotification(
      `Item ${newItem.value.id ? "updated" : "added"} successfully`,
      "success"
    );
    showModal.value = false;
    await fetchItems();
  } catch (err) {
    showNotification(
      err.response?.data?.message || "Operation failed",
      "error"
    );
  }
};

const deleteItem = async (id) => {
  if (!confirm("Are you sure you want to delete this item?")) return;
  try {
    await api.delete(`inventory/items/${id}`);
    showNotification("Item deleted successfully", "success");
    await fetchItems();
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
    expected_return_date: null,
    incident_type: "",
    notes: "",
  };
  showDeployModal.value = true;
};

const deployItem = async () => {
  try {
    await api.post("inventory/deployment", deploymentDetails.value);
    showNotification("Item deployed successfully", "success");
    showDeployModal.value = false;
    await fetchItems();
  } catch (err) {
    showNotification(
      err.response?.data?.message || "Deployment failed",
      "error"
    );
  }
};

// Pagination
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
    fetchItems();
  }
};

// Notifications
const showNotification = (message, type) => {
  notification.value = { show: true, type, message };
  setTimeout(() => (notification.value.show = false), 3000);
};

// Get current item for deployment modal
const currentDeployItem = computed(() => {
  return items.value.find(
    (item) => item.id === deploymentDetails.value.inventory_item_id
  );
});

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
  >
    <!-- Notification Toast -->
    <div
      v-if="notification.show"
      class="fixed top-6 right-6 z-[9999] animate-slide-in"
    >
      <div
        :class="[
          'flex items-center p-4 rounded-xl shadow-lg backdrop-blur-sm border transform transition-all duration-300',
          notification.type === 'success'
            ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200'
            : notification.type === 'warning'
            ? 'bg-amber-50/90 text-amber-800 border-amber-200'
            : 'bg-red-50/90 text-red-800 border-red-200',
        ]"
      >
        <component
          :is="
            notification.type === 'success'
              ? CheckCircle
              : notification.type === 'warning'
              ? AlertTriangle
              : AlertCircle
          "
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
                Manage your inventory items and stock levels
              </p>
            </div>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <button @click="openUploadModal()" class="btn-upload group">
            <Upload
              class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200"
            />
            Upload Excel
          </button>
          <button @click="openEditModal()" class="btn-primary group">
            <PlusCircle
              class="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200"
            />
            Add New Item
          </button>
        </div>
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
                {{ categories.length }}
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
                {{
                  items.filter(
                    (item) => item.quantity_in_stock <= item.min_stock_level
                  ).length
                }}
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
              @input="fetchItems"
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
              @change="fetchItems"
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
              @change="fetchItems"
              class="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
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
            <p>{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!loading && !error && items.length === 0"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center"
      >
        <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          {{
            searchQuery || categoryFilter !== "all"
              ? "No items found"
              : "No inventory items yet"
          }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{
            searchQuery || categoryFilter !== "all"
              ? "Try adjusting your search criteria or filters to find what you're looking for."
              : "Get started by adding your first inventory item to the system."
          }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            v-if="searchQuery || categoryFilter !== 'all'"
            @click="
              () => {
                searchQuery = '';
                categoryFilter = 'all';
                fetchItems();
              }
            "
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Clear Filters
          </button>
          <button
            @click="openUploadModal()"
            class="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center"
          >
            <Upload class="w-4 h-4 mr-2" />
            Upload Excel
          </button>
          <button
            @click="openEditModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            <PlusCircle class="w-4 h-4 mr-2" />
            Add First Item
          </button>
        </div>
      </div>

      <!-- Table -->
      <div
        v-else-if="items.length > 0"
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
                      class="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                    >
                      <Truck class="w-5 h-5" />
                    </button>
                    <button
                      @click="openEditModal(item)"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <Pencil class="w-5 h-5" />
                    </button>
                    <button
                      @click="deleteItem(item.id)"
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
    </div>

    <!-- Excel Upload Modal -->
    <div
      v-if="showUploadModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click.self="closeUploadModal"
    >
      <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden"
      >
        <!-- Modal Header -->
        <div
          class="bg-gradient-to-r from-emerald-50 to-green-50 px-8 py-6 border-b border-gray-100"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <button
                @click="closeUploadModal"
                class="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-200"
              >
                <ArrowLeft class="w-5 h-5" />
              </button>
              <div
                class="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl mr-4"
              >
                <FileSpreadsheet class="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 class="text-2xl font-bold text-gray-900">
                  Upload Excel File
                </h3>
                <p class="text-gray-600 mt-1">
                  Import inventory items from Excel or CSV file
                </p>
              </div>
            </div>
            <button
              @click="closeUploadModal"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="overflow-y-auto max-h-[calc(95vh-120px)]">
          <div class="p-8">
            <!-- Template Download Section -->
            <div class="mb-8">
              <div
                class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
              >
                <div class="flex items-center mb-4">
                  <Download class="w-5 h-5 text-blue-600 mr-2" />
                  <h4 class="text-lg font-semibold text-gray-900">
                    Download Template
                  </h4>
                </div>
                <p class="text-gray-600 mb-4">
                  Download the Excel template to ensure your data is formatted
                  correctly for import.
                </p>
                <button @click="downloadTemplate" class="btn-template">
                  <Download class="w-4 h-4 mr-2" />
                  Download Excel Template
                </button>
              </div>
            </div>

            <!-- File Upload Section -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <Upload class="w-5 h-5 text-emerald-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">Upload File</h4>
              </div>

              <!-- File Drop Zone -->
              <div
                class="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-emerald-400 transition-colors duration-200"
                :class="{ 'border-emerald-400 bg-emerald-50': selectedFile }"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  @change="handleFileSelect"
                  class="hidden"
                />

                <div v-if="!selectedFile">
                  <FileSpreadsheet
                    class="w-16 h-16 text-gray-400 mx-auto mb-4"
                  />
                  <h5 class="text-lg font-semibold text-gray-900 mb-2">
                    Choose a file to upload
                  </h5>
                  <p class="text-gray-600 mb-4">
                    Select an Excel (.xlsx, .xls) or CSV file containing your
                    inventory data
                  </p>
                  <button @click="fileInput.click()" class="btn-file-select">
                    <Upload class="w-4 h-4 mr-2" />
                    Select File
                  </button>
                </div>

                <div v-else class="flex items-center justify-center">
                  <FileSpreadsheet class="w-8 h-8 text-emerald-600 mr-3" />
                  <div class="text-left">
                    <p class="font-semibold text-gray-900">
                      {{ selectedFile.name }}
                    </p>
                    <p class="text-sm text-gray-600">
                      {{ formatFileSize(selectedFile.size) }}
                    </p>
                  </div>
                  <button
                    @click="resetUploadState"
                    class="ml-4 p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <X class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <!-- Error Display -->
              <div
                v-if="uploadError"
                class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl"
              >
                <div class="flex items-center">
                  <XCircle class="w-5 h-5 text-red-600 mr-2" />
                  <p class="text-red-800 font-medium">{{ uploadError }}</p>
                </div>
              </div>
            </div>

            <!-- Upload Progress -->
            <div v-if="uploadLoading" class="mb-8">
              <div
                class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100"
              >
                <div class="flex items-center mb-4">
                  <Clock class="w-5 h-5 text-amber-600 mr-2 animate-spin" />
                  <h4 class="text-lg font-semibold text-gray-900">
                    Uploading File...
                  </h4>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    class="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full transition-all duration-300"
                    :style="{ width: `${uploadProgress}%` }"
                  ></div>
                </div>
                <p class="text-gray-600 text-sm">
                  {{ uploadProgress }}% complete
                </p>
              </div>
            </div>

            <!-- Upload Results -->
            <div v-if="uploadResults" class="mb-8">
              <div
                class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100"
              >
                <div class="flex items-center mb-4">
                  <CheckCircle2 class="w-5 h-5 text-green-600 mr-2" />
                  <h4 class="text-lg font-semibold text-gray-900">
                    Upload Results
                  </h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="text-center">
                    <p class="text-2xl font-bold text-green-600">
                      {{ uploadResults.successful || 0 }}
                    </p>
                    <p class="text-sm text-gray-600">Items Added</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-bold text-red-600">
                      {{ uploadResults.failed || 0 }}
                    </p>
                    <p class="text-sm text-gray-600">Failed</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-bold text-gray-900">
                      {{ uploadResults.total || 0 }}
                    </p>
                    <p class="text-sm text-gray-600">Total Processed</p>
                  </div>
                </div>

                <!-- Error Details -->
                <div
                  v-if="uploadResults.errors && uploadResults.errors.length > 0"
                  class="mt-6"
                >
                  <h5 class="font-semibold text-gray-900 mb-3">Errors:</h5>
                  <div class="max-h-32 overflow-y-auto">
                    <div
                      v-for="(error, index) in uploadResults.errors"
                      :key="index"
                      class="text-sm text-red-700 bg-red-50 p-2 rounded mb-2"
                    >
                      Row {{ error.row }}: {{ error.message }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div
              class="flex justify-end space-x-4 pt-6 border-t border-gray-200"
            >
              <button
                @click="closeUploadModal"
                class="btn-secondary"
                :disabled="uploadLoading"
              >
                {{ uploadResults ? "Close" : "Cancel" }}
              </button>
              <button
                v-if="selectedFile && !uploadResults"
                @click="uploadExcelFile"
                :disabled="uploadLoading"
                class="btn-upload-action"
              >
                <component
                  :is="uploadLoading ? RefreshCw : Upload"
                  :class="['w-4 h-4 mr-2', { 'animate-spin': uploadLoading }]"
                />
                {{ uploadLoading ? "Uploading..." : "Upload File" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Item Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click.self="showModal = false"
    >
      <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden"
      >
        <!-- Modal Header -->
        <div
          class="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-100"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <button
                @click="showModal = false"
                class="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-200"
              >
                <ArrowLeft class="w-5 h-5" />
              </button>
              <div
                class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4"
              >
                <Package class="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 class="text-2xl font-bold text-gray-900">
                  {{
                    newItem.id
                      ? "Edit Inventory Item"
                      : "Add New Inventory Item"
                  }}
                </h3>
                <p class="text-gray-600 mt-1">
                  {{
                    newItem.id
                      ? "Update item information and settings"
                      : "Create a new inventory item with all necessary details"
                  }}
                </p>
              </div>
            </div>
            <button
              @click="showModal = false"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="overflow-y-auto max-h-[calc(95vh-120px)]">
          <form @submit.prevent="saveItem" class="p-8">
            <!-- Basic Information Section -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <Info class="w-5 h-5 text-blue-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">
                  Basic Information
                </h4>
              </div>
              <div
                class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
              >
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      <Package class="w-4 h-4 inline mr-1" />
                      Item Name *
                    </label>
                    <input
                      v-model="newItem.name"
                      type="text"
                      required
                      placeholder="Enter item name"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      <Tag class="w-4 h-4 inline mr-1" />
                      Category *
                    </label>
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
                </div>
                <div class="mt-6">
                  <label class="block text-sm font-semibold text-gray-700 mb-3">
                    <FileText class="w-4 h-4 inline mr-1" />
                    Description
                  </label>
                  <textarea
                    v-model="newItem.description"
                    rows="3"
                    placeholder="Describe the item..."
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Stock Management Section -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <Hash class="w-5 h-5 text-emerald-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">
                  Stock Management
                </h4>
              </div>
              <div
                class="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100"
              >
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Current Stock Quantity *
                    </label>
                    <input
                      v-model.number="newItem.quantity_in_stock"
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Minimum Stock Level *
                    </label>
                    <input
                      v-model.number="newItem.min_stock_level"
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Unit of Measure *
                    </label>
                    <select
                      v-model="newItem.unit_of_measure"
                      required
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    >
                      <option value="units">Units</option>
                      <option value="liters">Liters</option>
                      <option value="kilograms">Kilograms</option>
                      <option value="pieces">Pieces</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Item Details Section -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <Settings class="w-5 h-5 text-amber-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">
                  Item Details
                </h4>
              </div>
              <div
                class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100"
              >
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Condition *
                    </label>
                    <select
                      v-model="newItem.condition"
                      required
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                    >
                      <option value="NEW">New</option>
                      <option value="USED">Used</option>
                      <option value="DAMAGED">Damaged</option>
                    </select>
                  </div>
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      <MapPin class="w-4 h-4 inline mr-1" />
                      Storage Location *
                    </label>
                    <input
                      v-model="newItem.location"
                      type="text"
                      required
                      placeholder="e.g., Warehouse A, Shelf 3"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div class="mt-6">
                  <div
                    class="flex items-center p-4 bg-white/50 rounded-xl border border-amber-200"
                  >
                    <input
                      v-model="newItem.is_deployable"
                      type="checkbox"
                      class="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 mr-3"
                    />
                    <div>
                      <label class="text-sm font-semibold text-gray-700">
                        <Truck class="w-4 h-4 inline mr-1" />
                        Is this item deployable?
                      </label>
                      <p class="text-xs text-gray-600 mt-1">
                        Check this if the item can be deployed for emergency or
                        field operations
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Additional Notes Section -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <FileText class="w-5 h-5 text-gray-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">
                  Additional Notes
                </h4>
              </div>
              <div class="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <textarea
                  v-model="newItem.notes"
                  rows="4"
                  placeholder="Add any additional notes, special handling instructions, or other relevant information..."
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 resize-none"
                ></textarea>
              </div>
            </div>

            <!-- Action Buttons -->
            <div
              class="flex justify-end space-x-4 pt-6 border-t border-gray-200"
            >
              <button
                type="button"
                @click="showModal = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                <Save class="w-4 h-4 mr-2" />
                {{ newItem.id ? "Update Item" : "Create Item" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Enhanced Deployment Modal -->
    <div
      v-if="showDeployModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click.self="showDeployModal = false"
    >
      <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden"
      >
        <!-- Modal Header -->
        <div
          class="bg-gradient-to-r from-emerald-50 to-teal-50 px-8 py-6 border-b border-gray-100"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <button
                @click="showDeployModal = false"
                class="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-200"
              >
                <ArrowLeft class="w-5 h-5" />
              </button>
              <div
                class="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl mr-4"
              >
                <Truck class="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 class="text-2xl font-bold text-gray-900">Deploy Item</h3>
                <p class="text-gray-600 mt-1">
                  Deploy {{ currentDeployItem?.name }} for field operations
                </p>
              </div>
            </div>
            <button
              @click="showDeployModal = false"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="overflow-y-auto max-h-[calc(95vh-120px)]">
          <form @submit.prevent="deployItem" class="p-8">
            <!-- Item Summary -->
            <div class="mb-8">
              <div
                class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
              >
                <div class="flex items-center mb-4">
                  <Package class="w-5 h-5 text-blue-600 mr-2" />
                  <h4 class="text-lg font-semibold text-gray-900">
                    Item Being Deployed
                  </h4>
                </div>
                <div class="flex items-center">
                  <div
                    class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4"
                  >
                    <Package class="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h5 class="font-semibold text-gray-900">
                      {{ currentDeployItem?.name }}
                    </h5>
                    <p class="text-sm text-gray-600">
                      {{ currentDeployItem?.description }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      Available: {{ currentDeployItem?.quantity_in_stock }}
                      {{ currentDeployItem?.unit_of_measure }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Deployment Details -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <Settings class="w-5 h-5 text-emerald-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">
                  Deployment Details
                </h4>
              </div>
              <div
                class="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100"
              >
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Deployment Type *
                    </label>
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
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Quantity to Deploy *
                    </label>
                    <input
                      v-model.number="deploymentDetails.quantity_deployed"
                      type="number"
                      min="1"
                      :max="currentDeployItem?.quantity_in_stock"
                      required
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Location & Timeline -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <MapPin class="w-5 h-5 text-amber-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">
                  Location & Timeline
                </h4>
              </div>
              <div
                class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100"
              >
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      <MapPin class="w-4 h-4 inline mr-1" />
                      Deployment Location *
                    </label>
                    <input
                      v-model="deploymentDetails.deployment_location"
                      required
                      placeholder="e.g., Emergency Site Alpha, Training Facility B"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Incident Type
                    </label>
                    <input
                      v-model="deploymentDetails.incident_type"
                      placeholder="e.g., Flood Response, Fire Emergency"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      <Calendar class="w-4 h-4 inline mr-1" />
                      Deployment Date *
                    </label>
                    <input
                      v-model="deploymentDetails.deployment_date"
                      type="date"
                      required
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      <Calendar class="w-4 h-4 inline mr-1" />
                      Expected Return Date
                    </label>
                    <input
                      v-model="deploymentDetails.expected_return_date"
                      type="date"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Additional Notes -->
            <div class="mb-8">
              <div class="flex items-center mb-6">
                <FileText class="w-5 h-5 text-gray-600 mr-2" />
                <h4 class="text-lg font-semibold text-gray-900">
                  Additional Information
                </h4>
              </div>
              <div class="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <textarea
                  v-model="deploymentDetails.notes"
                  rows="4"
                  placeholder="Add deployment notes, special instructions, contact information, or other relevant details..."
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 resize-none"
                ></textarea>
              </div>
            </div>

            <!-- Action Buttons -->
            <div
              class="flex justify-end space-x-4 pt-6 border-t border-gray-200"
            >
              <button
                type="button"
                @click="showDeployModal = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" class="btn-deploy">
                <Truck class="w-4 h-4 mr-2" />
                Deploy Item
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

.btn-upload {
  @apply bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5;
}

.btn-deploy {
  @apply bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5;
}

.btn-template {
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center font-medium shadow-md hover:shadow-lg transition-all duration-200;
}

.btn-file-select {
  @apply bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center;
}

.btn-upload-action {
  @apply bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none;
}

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}
</style>
