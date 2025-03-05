<script setup>
import { ref, onMounted, computed } from 'vue';
import { PlusCircle, Pencil, Trash2, Eye, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, X, AlertCircle, CheckCircle } from 'lucide-vue-next';
import api from '../../../utils/axios';

// Reactive state
const batches = ref([]);
const categories = ref([]);
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const notification = ref({ show: false, type: '', message: '' });
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const totalItems = ref(0);
const totalPages = ref(0);
const filters = ref({
  supplier: '',
  expiringSoon: false,
  isActive: true
});

// Form state
const currentBatch = ref({
  id: null,
  inventory_item_id: '',
  quantity: 0,
  expiry_date: '',
  supplier: '',
  funding_source: '',
  cost: 0,
  notes: '',
  is_active: true
});

// Fetch data
onMounted(async () => {
  await Promise.all([fetchBatches(), fetchInventoryItems()]);
});

const fetchInventoryItems = async () => {
  try {
    const response = await api.get('inventory/items');
    categories.value = response.data.data;
  } catch (err) {
    showNotification('Failed to fetch inventory items', 'error');
  }
};

const fetchBatches = async () => {
  try {
    loading.value = true;
    const response = await api.get('inventory/batches', {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        search: searchQuery.value,
        supplier: filters.value.supplier,
        expiring_soon: filters.value.expiringSoon,
        is_active: filters.value.isActive
      }
    });
    
    batches.value = response.data.data;
    totalItems.value = response.data.meta.total;
    totalPages.value = response.data.meta.pages;
  } catch (err) {
    showNotification('Failed to fetch batches', 'error');
  } finally {
    loading.value = false;
  }
};

// CRUD Operations
const openBatchModal = (batch = null) => {
  currentBatch.value = batch ? { ...batch } : {
    id: null,
    inventory_item_id: '',
    quantity: 0,
    expiry_date: '',
    supplier: '',
    funding_source: '',
    cost: 0,
    notes: '',
    is_active: true
  };
  showModal.value = true;
};

const saveBatch = async () => {
  try {
    const method = currentBatch.value.id ? 'put' : 'post';
    const url = currentBatch.value.id ? `inventory/batches/${currentBatch.value.id}` : 'inventory/batches';
    
    await api[method](url, currentBatch.value);
    showNotification(`Batch ${currentBatch.value.id ? 'updated' : 'created'} successfully`, 'success');
    showModal.value = false;
    await fetchBatches();
  } catch (err) {
    showNotification(err.response?.data?.message || 'Operation failed', 'error');
  }
};

const deleteBatch = async (id) => {
  if (!confirm('Are you sure you want to delete this batch?')) return;
  try {
    await api.delete(`inventory/batches/${id}`);
    showNotification('Batch deleted successfully', 'success');
    await fetchBatches();
  } catch (err) {
    showNotification('Deletion failed', 'error');
  }
};

// Helpers
const showNotification = (message, type) => {
  notification.value = { show: true, type, message };
  setTimeout(() => notification.value.show = false, 3000);
};

const statusBadge = (batch) => {
  if (!batch.expiry_date) return 'bg-gray-100 text-gray-800';
  const expiryDate = new Date(batch.expiry_date);
  const today = new Date();
  const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'bg-red-100 text-red-800';
  if (diffDays <= 30) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const expiryProgress = (batch) => {
  if (!batch.expiry_date) return 0;
  const created = new Date(batch.received_date);
  const expiry = new Date(batch.expiry_date);
  const total = expiry - created;
  const elapsed = Date.now() - created;
  return Math.min((elapsed / total) * 100, 100);
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
    <!-- Notification -->
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
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div class="mb-4 sm:mb-0">
          <h1 class="text-3xl font-bold text-gray-900">Batch Management</h1>
          <p class="text-gray-500 mt-1">Manage inventory batches and expiration</p>
        </div>
        <button @click="openBatchModal" class="btn-primary">
          <PlusCircle class="w-5 h-5 mr-2" />
          New Batch
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="relative">
            <Search class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input v-model="searchQuery" @input="fetchBatches" type="text" placeholder="Search batches..."
              class="pl-10 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div class="relative">
            <Filter class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <select v-model="filters.supplier" @change="fetchBatches"
              class="pl-10 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Suppliers</option>
              <option v-for="supplier in [...new Set(batches.map(b => b.supplier))]" :key="supplier" :value="supplier">
                {{ supplier }}
              </option>
            </select>
          </div>
          <div class="flex items-center space-x-4">
            <label class="flex items-center space-x-2">
              <input v-model="filters.expiringSoon" type="checkbox" @change="fetchBatches"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span class="text-sm text-gray-700">Expiring Soon</span>
            </label>
            <label class="flex items-center space-x-2">
              <input v-model="filters.isActive" type="checkbox" @change="fetchBatches"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span class="text-sm text-gray-700">Active Only</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration Progress</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="batch in batches" :key="batch.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div>
                      <div class="font-medium text-gray-900">{{ batch.inventoryBatchItem?.name }}</div>
                      <div class="text-sm text-gray-500">{{ batch.supplier }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ batch.quantity }} {{ batch.inventoryBatchItem?.unit_of_measure }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500" :style="{ width: `${expiryProgress(batch)}%` }"></div>
                    </div>
                    <span class="ml-2 text-sm text-gray-500">
                      {{ batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'No expiry' }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="['px-2 py-1 text-xs font-medium rounded-full', statusBadge(batch)]">
                    {{ batch.expiry_date && new Date(batch.expiry_date) < new Date() ? 'Expired' : 
                       batch.expiry_date && (new Date(batch.expiry_date) - new Date()) / (1000 * 3600 * 24) <= 30 ? 'Expiring Soon' : 'Active' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end space-x-3">
                    <button @click="openBatchModal(batch)" class="text-blue-600 hover:text-blue-900">
                      <Pencil class="w-5 h-5" />
                    </button>
                    <button @click="deleteBatch(batch.id)" class="text-red-600 hover:text-red-900">
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
              <button @click="currentPage--; fetchBatches()" :disabled="currentPage === 1"
                class="btn-pagination rounded-l-md">
                <ChevronLeft class="w-5 h-5" />
              </button>
              <button v-for="page in totalPages" :key="page" @click="currentPage = page; fetchBatches()"
                :class="['btn-pagination', page === currentPage ? 'bg-blue-50 text-blue-600' : '']">
                {{ page }}
              </button>
              <button @click="currentPage++; fetchBatches()" :disabled="currentPage === totalPages"
                class="btn-pagination rounded-r-md">
                <ChevronRight class="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold">{{ currentBatch.id ? 'Edit' : 'New' }} Batch</h3>
          <button @click="showModal = false" class="text-gray-500 hover:text-gray-700">
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="saveBatch" class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Inventory Item</label>
              <select v-model="currentBatch.inventory_item_id" required
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option v-for="item in categories" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input v-model.number="currentBatch.quantity" type="number" min="0" required
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
              <input v-model="currentBatch.expiry_date" type="date"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <input v-model="currentBatch.supplier"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Funding Source</label>
              <input v-model="currentBatch.funding_source"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Cost</label>
              <input v-model.number="currentBatch.cost" type="number" step="0.01"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea v-model="currentBatch.notes" rows="3"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <div>
              <label class="flex items-center space-x-2">
                <input v-model="currentBatch.is_active" type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span class="text-sm text-gray-700">Active Batch</span>
              </label>
            </div>
          </div>
          <div class="flex justify-end space-x-3">
            <button type="button" @click="showModal = false" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              {{ currentBatch.id ? 'Update' : 'Create' }} Batch
            </button>
          </div>
        </form>
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

