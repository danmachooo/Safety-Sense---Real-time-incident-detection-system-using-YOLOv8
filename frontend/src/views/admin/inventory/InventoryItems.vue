<script setup>
import { ref, onMounted, computed } from 'vue';
import { PlusCircle, Pencil, Trash2, Eye, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, AlertCircle, X, Truck } from 'lucide-vue-next';
import api from '../../../utils/axios';

// Reactive state
const items = ref([]);
const categories = ref([]);
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const showDeployModal = ref(false);
const notification = ref({ show: false, type: '', message: '' });
const searchQuery = ref('');
const categoryFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const totalItems = ref(0);
const totalPages = ref(0);
const sortField = ref('name');
const sortOrder = ref('asc');

// Form state
const newItem = ref({
  id: null,
  name: '',
  description: '',
  category_id: '',
  quantity_in_stock: 0,
  min_stock_level: 0,
  unit_of_measure: '',
  condition: '',
  location: '',
  is_deployable: false,
  notes: ''
});

// Updated deployment state
const deploymentDetails = ref({
  inventory_item_id: null,
  deployment_type: 'EMERGENCY',
  quantity_deployed: 1,
  deployment_location: '',
  deployment_date: new Date().toISOString().split('T')[0],
  expected_return_date: '',
  incident_type: '',
  notes: ''
});

// Table configuration
const columns = [
  { key: 'name', label: 'Item Name', sortable: true, width: '20%' },
  { key: 'category.name', label: 'Category', sortable: true, width: '15%' },
  { key: 'quantity_in_stock', label: 'Stock', sortable: true, width: '10%' },
  { key: 'condition', label: 'Condition', sortable: true, width: '12%' },
  { key: 'location', label: 'Location', sortable: true, width: '15%' },
  { key: 'actions', label: 'Actions', sortable: false, width: '18%' }
];

// Fetch initial data
onMounted(async () => {
  await Promise.all([fetchItems(), fetchCategories()]);
});

// Data fetching
const fetchCategories = async () => {
  try {
    const response = await api.get('inventory/categories');
    categories.value = response.data.data;
  } catch (err) {
    showNotification('Failed to fetch categories', 'error');
  }
};

const fetchItems = async () => {
  try {
    loading.value = true;
    const response = await api.get('inventory/items', {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        search: searchQuery.value,
        category: categoryFilter.value !== 'all' ? categoryFilter.value : undefined,
        sortBy: sortField.value,
        sortOrder: sortOrder.value
      }
    });
    
    items.value = response.data.data;
    totalItems.value = response.data.meta.total;
    totalPages.value = response.data.meta.pages;
    currentPage.value = response.data.meta.currentPage;
  } catch (err) {
    showNotification('Failed to fetch items', 'error');
  } finally {
    loading.value = false;
  }
};

// Sorting
const handleSort = (column) => {
  if (!column.sortable) return;
  sortOrder.value = sortField.value === column.key ? 
    (sortOrder.value === 'asc' ? 'desc' : 'asc') : 'asc';
  sortField.value = column.key;
  fetchItems();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;
  if (sortField.value !== column.key) return ArrowUpDown;
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown;
};

// CRUD Operations
const openEditModal = (item = null) => {
  newItem.value = item ? { ...item } : {
    id: null,
    name: '',
    description: '',
    category_id: '',
    quantity_in_stock: 0,
    min_stock_level: 0,
    unit_of_measure: '',
    condition: '',
    location: '',
    is_deployable: false,
    notes: ''
  };
  showModal.value = true;
};

const saveItem = async () => {
  try {
    const method = newItem.value.id ? 'put' : 'post';
    const url = newItem.value.id ? `inventory/items/${newItem.value.id}` : 'inventory/items';
    
    await api[method](url, newItem.value);
    showNotification(`Item ${newItem.value.id ? 'updated' : 'added'} successfully`, 'success');
    showModal.value = false;
    await fetchItems();
  } catch (err) {
    showNotification(err.response?.data?.message || 'Operation failed', 'error');
  }
};

const deleteItem = async (id) => {
  if (!confirm('Are you sure you want to delete this item?')) return;
  try {
    await api.delete(`inventory/items/${id}`);
    showNotification('Item deleted successfully', 'success');
    await fetchItems();
  } catch (err) {
    showNotification('Deletion failed', 'error');
  }
};

// Deployment
const openDeployModal = (item) => {
  deploymentDetails.value = {
    inventory_item_id: item.id,
    deployment_type: 'EMERGENCY',
    quantity_deployed: 1,
    deployment_location: '',
    deployment_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    incident_type: '',
    notes: ''
  };
  showDeployModal.value = true;
};

const deployItem = async () => {
  try {
    await api.post('inventory/deployment', deploymentDetails.value);
    showNotification('Item deployed successfully', 'success');
    showDeployModal.value = false;
    await fetchItems();
  } catch (err) {
    showNotification(err.response?.data?.message || 'Deployment failed', 'error');
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
  setTimeout(() => notification.value.show = false, 3000);
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <!-- Notification Toast -->
    <div v-if="notification.show" class="fixed top-4 right-4 z-50">
      <div :class="['flex items-center p-4 rounded-lg shadow-lg transform transition-all duration-300',
        notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800']">
        <component :is="notification.type === 'success' ? CheckCircle : AlertCircle" class="w-5 h-5 mr-2" />
        <span class="text-sm font-medium">{{ notification.message }}</span>
        <button @click="notification.show = false" class="ml-4">
          <X class="w-4 h-4 hover:opacity-75" />
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div class="mb-4 sm:mb-0">
          <h1 class="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p class="text-gray-500 mt-1">Manage your inventory items and stock levels</p>
        </div>
        <button @click="openEditModal()" class="btn-primary">
          <PlusCircle class="w-5 h-5 mr-2" />
          Add New Item
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="relative">
            <Search class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input v-model="searchQuery" @input="fetchItems" type="text" placeholder="Search items..."
              class="pl-10 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div class="relative">
            <Filter class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <select v-model="categoryFilter" @change="fetchItems"
              class="pl-10 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="all">All Categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="flex items-center justify-end md:justify-start">
            <span class="text-sm text-gray-500 mr-2">Items per page:</span>
            <select v-model="itemsPerPage" @change="fetchItems"
              class="px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 p-4 rounded-lg text-red-700">
        <p class="font-semibold">Error loading data:</p>
        <p>{{ error }}</p>
      </div>

      <!-- Table -->
      <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th v-for="col in columns" :key="col.key" 
                  :class="['px-6 py-3 text-left text-sm font-semibold text-gray-700', 
                    col.sortable ? 'cursor-pointer hover:bg-gray-100' : '']"
                  @click="col.sortable ? handleSort(col) : null">
                  <div class="flex items-center space-x-1">
                    <span>{{ col.label }}</span>
                    <component v-if="col.sortable" :is="getSortIcon(col)" 
                      :class="['w-4 h-4', sortField === col.key ? 'text-blue-600' : 'text-gray-400']" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="ml-4">
                      <div class="font-medium text-gray-900">{{ item.name }}</div>
                      <div class="text-gray-500 text-sm mt-1">{{ item.description }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2.5 py-0.5 rounded-full text-sm" 
                    :style="{ backgroundColor: item.category.color + '20', color: item.category.color }">
                    {{ item.category.name }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500" 
                        :style="{ width: Math.min((item.quantity_in_stock / item.min_stock_level) * 100, 100) + '%' }">
                      </div>
                    </div>
                    <span class="ml-2 font-medium">{{ item.quantity_in_stock }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="capitalize px-2 py-1 rounded-md text-sm font-medium"
                    :class="{
                      'bg-green-100 text-green-800': item.condition === 'NEW',
                      'bg-yellow-100 text-yellow-800': item.condition === 'USED',
                      'bg-red-100 text-red-800': item.condition === 'DAMAGED'
                    }">
                    {{ item.condition.toLowerCase() }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ item.location }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end space-x-3">
                    <button @click="openDeployModal(item)" class="text-green-600 hover:text-green-900" v-if="item.is_deployable">
                      <Truck class="w-5 h-5" />
                    </button>
                    <button @click="openEditModal(item)" class="text-blue-600 hover:text-blue-900">
                      <Pencil class="w-5 h-5" />
                    </button>
                    <button @click="deleteItem(item.id)" class="text-red-600 hover:text-red-900">
                      <Trash2 class="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-gray-200">
          <div class="flex flex-col md:flex-row items-center justify-between">
            <div class="mb-4 md:mb-0 text-sm text-gray-700">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to 
              {{ Math.min(currentPage * itemsPerPage, totalItems) }} of 
              {{ totalItems }} results
            </div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm">
              <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                class="btn-pagination rounded-l-md">
                <ChevronLeft class="w-5 h-5" />
              </button>
              <button v-for="page in visiblePages" :key="page" @click="goToPage(page)"
                :class="['btn-pagination', page === currentPage ? 'bg-blue-50 text-blue-600' : '']">
                {{ page }}
              </button>
              <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                class="btn-pagination rounded-r-md">
                <ChevronRight class="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold">{{ newItem.id ? 'Edit' : 'New' }} Inventory Item</h3>
          <button @click="showModal = false" class="text-gray-500 hover:text-gray-700">
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="saveItem" class="p-6 space-y-6">
          <!-- Inside the Item Modal form -->
<form @submit.prevent="saveItem" class="p-6 space-y-6">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Name -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
      <input v-model="newItem.name" type="text" required
             class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
    </div>

    <!-- Category -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
      <select v-model="newItem.category_id" required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
        <option value="" disabled>Select a category</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>
    </div>

    <!-- Quantity -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Quantity in Stock *</label>
      <input v-model.number="newItem.quantity_in_stock" type="number" min="0" required
             class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
    </div>

    <!-- Minimum Stock -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Minimum Stock Level *</label>
      <input v-model.number="newItem.min_stock_level" type="number" min="0" required
             class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
    </div>

    <!-- Unit of Measure -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Unit of Measure *</label>
      <select v-model="newItem.unit_of_measure" required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
        <option value="units">Units</option>
        <option value="liters">Liters</option>
        <option value="kilograms">Kilograms</option>
        <option value="pieces">Pieces</option>
      </select>
    </div>

    <!-- Condition -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Condition *</label>
      <select v-model="newItem.condition" required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
        <option value="NEW">New</option>
        <option value="USED">Used</option>
        <option value="DAMAGED">Damaged</option>
      </select>
    </div>

    <!-- Location -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Storage Location *</label>
      <input v-model="newItem.location" type="text" required
             class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
    </div>

    <!-- Deployable -->
    <div class="flex items-center">
      <input v-model="newItem.is_deployable" type="checkbox" 
             class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
      <label class="ml-2 text-sm text-gray-700">Is this item deployable?</label>
    </div>
  </div>

  <!-- Description -->
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
    <textarea v-model="newItem.description" rows="3"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
  </div>

  <!-- Notes -->
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
    <textarea v-model="newItem.notes" rows="2"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
  </div>
</form>
          <div class="flex justify-end space-x-3">
            <button type="button" @click="showModal = false"
              class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              {{ newItem.id ? 'Update' : 'Create' }} Item
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deployment Modal -->
    <div v-if="showDeployModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold">Deploy Item</h3>
          <button @click="showDeployModal = false" class="text-gray-500 hover:text-gray-700">
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="deployItem" class="p-6 space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Deployment Type</label>
            <select v-model="deploymentDetails.deployment_type" required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="EMERGENCY">Emergency</option>
              <option value="TRAINING">Training</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RELIEF_OPERATION">Relief Operation</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input v-model.number="deploymentDetails.quantity_deployed" type="number" min="1" required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div> 
            <label class="block text-sm font-medium text-gray-700 mb-2">Deployment Location</label>
            <input v-model="deploymentDetails.deployment_location" required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Deployment Date</label>
            <input v-model="deploymentDetails.deployment_date" type="date" required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Expected Return Date</label>
            <input v-model="deploymentDetails.expected_return_date" type="date"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Incident Type</label>
            <input v-model="deploymentDetails.incident_type"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea v-model="deploymentDetails.notes" rows="3"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="flex justify-end space-x-3">
            <button type="button" @click="showDeployModal = false" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Deploy Item
            </button>
          </div>
        </form>``
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200;
}

.btn-secondary {
  @apply bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-all duration-200;
}

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}
</style>