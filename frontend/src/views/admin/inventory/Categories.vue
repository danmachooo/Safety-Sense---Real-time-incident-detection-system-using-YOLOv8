<script setup>
import { ref, computed, onMounted, watch } from "vue";
import api from "../../../utils/axios";
import { useRouter } from "vue-router";
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Archive,
  CheckCircle,
  AlertCircle,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  RefreshCwIcon,
  X,
  Folder,
  FolderOpen,
  Tag,
  TrendingUp,
} from "lucide-vue-next";

const router = useRouter();

const categories = ref([]);
const searchQuery = ref("");
const typeFilter = ref("all");
const currentPage = ref(1);
const totalPages = ref(1);
const totalCategories = ref(0);
const itemsPerPage = ref(10);
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const newCategory = ref({ name: "", description: "", type: "" });

const categoryTypes = [
  "EQUIPMENT",
  "SUPPLIES",
  "RELIEF_GOODS",
  "VEHICLES",
  "COMMUNICATION_DEVICES",
];

// Sorting state
const sortField = ref("name");
const sortOrder = ref("asc");

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "description", label: "Description", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "inventoryItems", label: "Items", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];

const handleSort = (column) => {
  if (!column.sortable) return;

  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = column.key;
    sortOrder.value = "asc";
  }

  fetchCategories();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;

  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === "asc" ? ArrowUp : ArrowDown;
};

const fetchCategories = async () => {
  try {
    loading.value = true;
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value,
    });

    if (typeFilter.value !== "all") {
      queryParams.append("type", typeFilter.value);
    }

    const response = await api.get(
      `/inventory/categories?${queryParams.toString()}`
    );
    categories.value = response.data.data;
    totalPages.value = response.data.meta.pages;
    totalCategories.value = response.data.meta.total;
    currentPage.value = response.data.meta.currentPage;
  } catch (err) {
    error.value = "Failed to fetch categories. Please try again.";
    console.error("Error fetching categories:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchCategories);

watch([searchQuery, typeFilter], () => {
  currentPage.value = 1;
  fetchCategories();
});

const addCategory = async () => {
  try {
    await api.post("/inventory/categories", newCategory.value);
    showModal.value = false;
    newCategory.value = { name: "", description: "", type: "" };
    await fetchCategories();
    showNotification("Category added successfully", "success");
  } catch (err) {
    showNotification(
      err.response?.data?.message ||
        "Failed to add category. Please try again.",
      "error"
    );
  }
};

const editCategory = (category) => {
  newCategory.value = { ...category };
  showModal.value = true;
};

const updateCategory = async () => {
  try {
    await api.put(
      `/inventory/categories/${newCategory.value.id}`,
      newCategory.value
    );
    showModal.value = false;
    await fetchCategories();
    showNotification("Category updated successfully", "success");
  } catch (err) {
    showNotification(
      err.response?.data?.message ||
        "Failed to update category. Please try again.",
      "error"
    );
  }
};

const deleteCategory = async (id) => {
  if (confirm("Are you sure you want to delete this category?")) {
    try {
      await api.delete(`/inventory/categories/${id}`);
      await fetchCategories();
      showNotification("Category deleted successfully", "success");
    } catch (err) {
      showNotification(
        err.response?.data?.message ||
          "Failed to delete category. Please try again.",
        "error"
      );
    }
  }
};

const restoreCategory = async (id) => {
  try {
    await api.patch(`/inventory/categories/${id}/restore`);
    await fetchCategories();
    showNotification("Category restored successfully", "success");
  } catch (err) {
    showNotification(
      err.response?.data?.message ||
        "Failed to restore category. Please try again.",
      "error"
    );
  }
};

const notification = ref({ show: false, type: "", message: "" });

const showNotification = (message, type) => {
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
    fetchCategories();
  }
};

// Get color for category type
const getCategoryTypeColor = (type) => {
  const colors = {
    EQUIPMENT: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    SUPPLIES: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
    },
    RELIEF_GOODS: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    VEHICLES: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
    },
    COMMUNICATION_DEVICES: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
    },
  };

  return (
    colors[type] || {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    }
  );
};

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
              <Folder class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              >
                Categories Management
              </h1>
              <p class="text-gray-600 mt-1 text-lg">
                Organize and manage your inventory categories
              </p>
            </div>
          </div>
        </div>
        <button @click="showModal = true" class="btn-primary group">
          <PlusIcon
            class="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200"
          />
          Add New Category
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Categories</p>
              <p class="text-3xl font-bold text-gray-900">
                {{ totalCategories }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <FolderOpen class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Category Types</p>
              <p class="text-3xl font-bold text-gray-900">
                {{ categoryTypes.length }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <Tag class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Items Categorized</p>
              <p class="text-3xl font-bold text-gray-900">
                {{
                  categories.reduce(
                    (sum, cat) => sum + (cat.inventoryItems?.length || 0),
                    0
                  )
                }}
              </p>
            </div>
            <div class="p-3 bg-amber-100 rounded-xl">
              <TrendingUp class="w-6 h-6 text-amber-600" />
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
              placeholder="Search categories..."
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div class="relative">
            <Filter
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <select
              v-model="typeFilter"
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option value="all">All Types</option>
              <option v-for="type in categoryTypes" :key="type" :value="type">
                {{ type }}
              </option>
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
                v-for="category in categories"
                :key="category.id"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4"
                    >
                      <Tag class="w-5 h-5 text-white" />
                    </div>
                    <div class="font-semibold text-gray-900">
                      {{ category.name }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-600 line-clamp-2">
                    {{ category.description || "No description" }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'px-3 py-1 inline-flex text-sm font-medium rounded-full border',
                      getCategoryTypeColor(category.type).bg,
                      getCategoryTypeColor(category.type).text,
                      getCategoryTypeColor(category.type).border,
                    ]"
                  >
                    {{ category.type }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2"
                    >
                      <span class="text-sm font-semibold text-gray-700">{{
                        category.inventoryItems
                          ? category.inventoryItems.length
                          : 0
                      }}</span>
                    </div>
                    <span class="text-sm text-gray-600">items</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      @click="editCategory(category)"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <PencilIcon class="w-5 h-5" />
                    </button>
                    <button
                      @click="deleteCategory(category.id)"
                      class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <TrashIcon class="w-5 h-5" />
                    </button>
                    <button
                      v-if="category.deletedAt"
                      @click="restoreCategory(category.id)"
                      class="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                    >
                      <RefreshCwIcon class="w-5 h-5" />
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
              {{ Math.min(currentPage * itemsPerPage, totalCategories) }} of
              {{ totalCategories }} results
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

      <!-- Modal for Add/Edit Category -->
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
          <div
            class="p-8 border-b border-gray-100 flex justify-between items-center"
          >
            <div class="flex items-center">
              <div
                class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4"
              >
                <Tag class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-2xl font-bold text-gray-900">
                {{ newCategory.id ? "Edit" : "New" }} Category
              </h3>
            </div>
            <button
              @click="showModal = false"
              class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
          <form
            @submit.prevent="newCategory.id ? updateCategory() : addCategory()"
            class="p-8 space-y-6"
          >
            <div>
              <label
                for="name"
                class="block text-sm font-semibold text-gray-700 mb-3"
                >Name</label
              >
              <input
                v-model="newCategory.name"
                id="name"
                type="text"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <div>
              <label
                for="description"
                class="block text-sm font-semibold text-gray-700 mb-3"
                >Description</label
              >
              <textarea
                v-model="newCategory.description"
                id="description"
                rows="3"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              ></textarea>
            </div>
            <div>
              <label
                for="type"
                class="block text-sm font-semibold text-gray-700 mb-3"
                >Type</label
              >
              <select
                v-model="newCategory.type"
                id="type"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="" disabled>Select a type</option>
                <option v-for="type in categoryTypes" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </div>
            <div
              class="flex justify-end space-x-4 pt-6 border-t border-gray-100"
            >
              <button
                type="button"
                @click="showModal = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                {{ newCategory.id ? "Update" : "Create" }} Category
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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
