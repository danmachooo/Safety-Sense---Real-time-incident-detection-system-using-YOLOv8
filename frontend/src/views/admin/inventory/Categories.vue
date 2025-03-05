<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../../../utils/axios';
import { useRouter } from 'vue-router';
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
  RefreshCwIcon
} from 'lucide-vue-next';

const categories = ref([]);
const searchQuery = ref('');
const typeFilter = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const totalCategories = ref(0);
const itemsPerPage = ref(10);
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const newCategory = ref({ name: '', description: '', type: '' });

const router = useRouter();

const categoryTypes = [
  'EQUIPMENT',
  'SUPPLIES',
  'RELIEF_GOODS',
  'VEHICLES',
  'COMMUNICATION_DEVICES'
];

// Sorting state
const sortField = ref('name');
const sortOrder = ref('asc');

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'inventoryItems', label: 'Items', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false }
];

const handleSort = (column) => {
  if (!column.sortable) return;
  
  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = column.key;
    sortOrder.value = 'asc';
  }
  
  fetchCategories();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;
  
  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown;
};

const fetchCategories = async () => {
  try {
    loading.value = true;
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value
    });

    if (typeFilter.value !== 'all') {
      queryParams.append("type", typeFilter.value);
    }

    const response = await api.get(`/inventory/categories?${queryParams.toString()}`);
    categories.value = response.data.data;
    totalPages.value = response.data.meta.pages;
    totalCategories.value = response.data.meta.total;
    currentPage.value = response.data.meta.currentPage;
  } catch (err) {
    error.value = 'Failed to fetch categories. Please try again.';
    console.error('Error fetching categories:', err);
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
    await api.post('/inventory/categories', newCategory.value);
    showModal.value = false;
    newCategory.value = { name: '', description: '', type: '' };
    await fetchCategories();
    showNotification('Category added successfully', 'success');
  } catch (err) {
    showNotification(err.response?.data?.message || 'Failed to add category. Please try again.', 'error');
  }
};

const editCategory = (category) => {
  newCategory.value = { ...category };
  showModal.value = true;
};

const updateCategory = async () => {
  try {
    await api.put(`/inventory/categories/${newCategory.value.id}`, newCategory.value);
    showModal.value = false;
    await fetchCategories();
    showNotification('Category updated successfully', 'success');
  } catch (err) {
    showNotification(err.response?.data?.message || 'Failed to update category. Please try again.', 'error');
  }
};

const deleteCategory = async (id) => {
  if (confirm('Are you sure you want to delete this category?')) {
    try {
      await api.delete(`/inventory/categories/${id}`);
      await fetchCategories();
      showNotification('Category deleted successfully', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete category. Please try again.', 'error');
    }
  }
};

const restoreCategory = async (id) => {
  try {
    await api.patch(`/inventory/categories/${id}/restore`);
    await fetchCategories();
    showNotification('Category restored successfully', 'success');
  } catch (err) {
    showNotification(err.response?.data?.message || 'Failed to restore category. Please try again.', 'error');
  }
};

const notification = ref({ show: false, type: '', message: '' });

const showNotification = (message, type) => {
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
    fetchCategories();
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

    <h2 class="text-2xl font-bold text-gray-800 flex items-center">
      <Users class="w-6 h-6 mr-2 text-blue-600" />
      View Categories
    </h2>

    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search categories..."
          class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="relative">
        <Filter class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <select
          v-model="typeFilter"
          class="pl-10 w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
        >
          <option value="all">All Types</option>
          <option v-for="type in categoryTypes" :key="type" :value="type">{{ type }}</option>
        </select>
      </div>
      <button @click="showModal = true" 
              class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out flex items-center">
        <PlusIcon class="w-5 h-5 mr-2" />
        Add New Category
      </button>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow" role="alert">
      <p class="font-bold">Error</p>
      <p>{{ error }}</p>
    </div>

    <div v-else class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th v-for="column in columns" 
                :key="column.key"
                class="px-6 py-3 text-left text-xs font-medium tracking-wider"
                :class="[
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : '',
                  sortField === column.key ? 'text-blue-600' : 'text-gray-500'
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
          <tr v-for="category in categories" :key="category.id" class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ category.name }}</div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-500">{{ category.description }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                {{ category.type }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ category.inventoryItems ? category.inventoryItems.length : 0 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="editCategory(category)" 
                      class="text-indigo-600 hover:text-indigo-900 mr-3">
                <PencilIcon class="w-5 h-5" />
              </button>
              <button @click="deleteCategory(category.id)" 
                      class="text-red-600 hover:text-red-900 mr-3">
                <TrashIcon class="w-5 h-5" />
              </button>
              <button v-if="category.deletedAt" 
                      @click="restoreCategory(category.id)" 
                      class="text-green-600 hover:text-green-900">
                <RefreshCwIcon class="w-5 h-5" />
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
            <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, totalCategories) }}</span> of 
            <span class="font-medium">{{ totalCategories }}</span> results
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
                      page === currentPage ? 'relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 
                      'relative inline-flex items-center px-4 py-2 text-sm font-sem relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
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

    <!-- Modal for Add/Edit Category -->
    <div v-if="showModal" class="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-96 max-w-md">
        <h2 class="text-2xl font-bold mb-4">{{ newCategory.id ? 'Edit' : 'Add' }} Category</h2>
        <form @submit.prevent="newCategory.id ? updateCategory() : addCategory()">
          <div class="mb-4">
            <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
            <input v-model="newCategory.name" id="name" type="text" required
                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
          </div>
          <div class="mb-4">
            <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea v-model="newCategory.description" id="description" rows="3"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
          </div>
          <div class="mb-4">
            <label for="type" class="block text-sm font-medium text-gray-700">Type</label>
            <select v-model="newCategory.type" id="type" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
              <option value="" disabled>Select a type</option>
              <option v-for="type in categoryTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" @click="showModal = false" 
                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out">
              Cancel
            </button>
            <button type="submit" 
                    class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out">
              {{ newCategory.id ? 'Update' : 'Add' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any additional styles here */
</style>