<script setup>
import { ref, onMounted, computed } from 'vue';
import { Eye, ChevronLeft, ChevronRight, Search, Filter, X, Check, AlertTriangle } from 'lucide-vue-next';
import api from '../../../utils/axios';

const deployments = ref([]);
const loading = ref(true);
const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(10);
const searchQuery = ref('');
const statusFilter = ref('');
const showModal = ref(false);
const currentDeployment = ref(null);

const fetchDeployments = async () => {
  try {
    loading.value = true;
    const response = await api.get('inventory/deployment', {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        status: statusFilter.value,
        search: searchQuery.value,
      }
    });
    deployments.value = response.data.data;
    totalPages.value = response.data.meta.pages;
  } catch (error) {
    console.error('Error fetching deployments:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchDeployments);

const viewDeployment = async (id) => {
  try {
    const response = await api.get(`inventory/deployment/${id}`);
    currentDeployment.value = response.data.data;
    showModal.value = true;
  } catch (error) {
    console.error('Error fetching deployment details:', error);
  }
};

const updateDeploymentStatus = async (newStatus) => {
  try {
    const response = await api.put(`inventory/deployment/${currentDeployment.value.id}/status`, {
      status: newStatus,
      actual_return_date: newStatus === 'RETURNED' ? new Date().toISOString() : null,
      notes: `Status updated to ${newStatus}`
    });
    currentDeployment.value = response.data.data;
    showNotification(`Deployment status updated to ${newStatus}`, 'success');
    fetchDeployments();
  } catch (error) {
    console.error('Error updating deployment status:', error);
    showNotification('Failed to update deployment status', 'error');
  }
};

const statusColor = computed(() => (status) => {
  switch (status) {
    case 'DEPLOYED': return 'bg-blue-100 text-blue-800';
    case 'RETURNED': return 'bg-green-100 text-green-800';
    case 'LOST': return 'bg-red-100 text-red-800';
    case 'DAMAGED': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
});

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const showNotification = (message, type) => {
  // Implement your notification logic here
  console.log(`${type}: ${message}`);
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Deployment Management</h1>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap gap-4">
      <div class="flex-1 min-w-[200px]">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            @input="fetchDeployments"
            type="text"
            placeholder="Search deployments..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div class="w-48">
        <div class="relative">
          <Filter class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            v-model="statusFilter"
            @change="fetchDeployments"
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
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

    <!-- Deployments Table -->
    <div class="bg-white shadow-lg rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="deployment in deployments" :key="deployment.id" class="hover:bg-gray-50 transition-colors duration-200">
              <td class="px-6 py-4 whitespace-nowrap">{{ deployment.inventoryDeploymentItem.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ deployment.deployment_location }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ deployment.quantity_deployed }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2 py-1 text-xs font-medium rounded-full', statusColor(deployment.status)]">
                  {{ deployment.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(deployment.expected_return_date) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="viewDeployment(deployment.id)" class="text-blue-600 hover:text-blue-900">
                  <Eye class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div class="mt-6 flex items-center justify-between">
      <p class="text-sm text-gray-700">
        Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, deployments.length) }} of {{ deployments.length }} results
      </p>
      <div class="flex items-center space-x-2">
        <button
          @click="currentPage--; fetchDeployments()"
          :disabled="currentPage === 1"
          class="px-3 py-1 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50 transition duration-300"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <span class="text-sm text-gray-600">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          @click="currentPage++; fetchDeployments()"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50 transition duration-300"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Deployment Details Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Deployment Details</h2>
            <button @click="showModal = false" class="text-gray-500 hover:text-gray-700">
              <X class="w-6 h-6" />
            </button>
          </div>
          <div v-if="currentDeployment" class="space-y-4">
            <div>
              <p class="text-sm font-medium text-gray-500">Item Name</p>
              <p class="mt-1 text-sm text-gray-900">{{ currentDeployment.inventoryDeploymentItem.name }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Location</p>
              <p class="mt-1 text-sm text-gray-900">{{ currentDeployment.deployment_location }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Quantity</p>
              <p class="mt-1 text-sm text-gray-900">{{ currentDeployment.quantity_deployed }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Status</p>
              <p class="mt-1 text-sm">
                <span :class="['px-2 py-1 text-xs font-medium rounded-full', statusColor(currentDeployment.status)]">
                  {{ currentDeployment.status }}
                </span>
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Deployment Date</p>
              <p class="mt-1 text-sm text-gray-900">{{ formatDate(currentDeployment.deployment_date) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Expected Return Date</p>
              <p class="mt-1 text-sm text-gray-900">{{ formatDate(currentDeployment.expected_return_date) }}</p>
            </div>
            <div v-if="currentDeployment.notes">
              <p class="text-sm font-medium text-gray-500">Notes</p>
              <p class="mt-1 text-sm text-gray-900">{{ currentDeployment.notes }}</p>
            </div>
            
            <!-- New Status Update Section -->
            <div>
              <p class="text-sm font-medium text-gray-500">Update Status</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-if="currentDeployment.status !== 'RETURNED'"
                  @click="updateDeploymentStatus('RETURNED')"
                  class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
                >
                  <Check class="w-4 h-4 inline-block mr-1" />
                  Mark as Returned
                </button>
                <button
                  v-if="currentDeployment.status !== 'LOST'"
                  @click="updateDeploymentStatus('LOST')"
                  class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  <AlertTriangle class="w-4 h-4 inline-block mr-1" />
                  Mark as Lost
                </button>
                <button
                  v-if="currentDeployment.status !== 'DAMAGED'"
                  @click="updateDeploymentStatus('DAMAGED')"
                  class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
                >
                  <AlertTriangle class="w-4 h-4 inline-block mr-1" />
                  Mark as Damaged
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any additional styles here */
</style>

