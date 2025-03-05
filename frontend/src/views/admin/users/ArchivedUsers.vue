<script setup>
import { ref, onMounted, watch } from 'vue';
import api from "../../../utils/axios";
import { 
  Archive, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-vue-next';

const users = ref([]);
const searchQuery = ref('');
const roleFilter = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const totalUsers = ref(0);
const itemsPerPage = ref(10);
const loadingRestore = ref(new Set());
const notification = ref({ show: false, type: '', message: '' });

const roles = ['Admin', 'Rescuer'];

// Sorting state
const sortField = ref('createdAt');
const sortOrder = ref('asc');

const columns = [
  { 
    key: 'firstname',
    label: 'Name',
    sortable: true,
    sortField: 'firstname'
  },
  { 
    key: 'email',
    label: 'Email',
    sortable: true 
  },
  { 
    key: 'role',
    label: 'Role',
    sortable: true 
  },
  { 
    key: 'deletedAt',
    label: 'Archived Date',
    sortable: true 
  },
  { 
    key: 'actions',
    label: 'Actions',
    sortable: false 
  }
];

const handleSort = (column) => {
  if (!column.sortable) return;
  
  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = column.key;
    sortOrder.value = 'asc';
  }
  
  fetchUsers();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;
  
  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown;
};

const showNotification = (type, message) => {
  notification.value = {
    show: true,
    type,
    message
  };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const fetchUsers = async () => {
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      showDeleted: 'true', // Changed to fetch archived users
      sortBy: sortField.value,
      sortOrder: sortOrder.value
    });

    if (roleFilter.value !== 'all') {
      queryParams.append("role", roleFilter.value);
    }

    const requestUrl = `manage-user/get-deleted?${queryParams.toString()}`;
    const response = await api.get(requestUrl);
    
    users.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalUsers.value = response.data.totalUsers;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error('Error fetching archived users:', error);
    showNotification('error', 'Failed to fetch archived users');
  }
};

const restoreUser = async (userId) => {
  if (loadingRestore.value.has(userId)) return;
  
  loadingRestore.value.add(userId);
  try {
    await api.patch(`manage-user/restore/${userId}`);
    users.value = users.value.filter(user => user.id !== userId);
    totalUsers.value--;
    showNotification('success', 'User restored successfully');
  } catch (error) {
    console.error('Error restoring user:', error);
    showNotification('error', 'Failed to restore user');
  } finally {
    loadingRestore.value.delete(userId);
  }
};

onMounted(() => {
  fetchUsers();
});

watch([searchQuery, roleFilter], () => {
  currentPage.value = 1;
  fetchUsers();
});

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchUsers();
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

    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-800 flex items-center">
        <Archive class="w-6 h-6 mr-2 text-blue-600" />
        Archived Users
      </h2>
      <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
        Total: {{ totalUsers }}
      </span>
    </div>

    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search archived users..."
          class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="relative">
        <Filter class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <select
          v-model="roleFilter"
          class="pl-10 w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
        >
          <option value="all">All Roles</option>
          <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-[#0F4C75]">
          <tr>
            <th v-for="column in columns" 
                :key="column.key"
                class="px-6 py-3 text-left text-xs font-medium tracking-wider"
                :class="[
                  column.sortable ? 'cursor-pointer hover:bg-[#3282B8]' : '',
                  sortField === column.key ? 'text-white' : 'text-white'
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
          <tr v-for="user in users" :key="user.id" 
              class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3">
                  {{ user.firstname[0] }}{{ user.lastname[0] }}
                </div>
                <div class="text-sm font-medium text-gray-900">
                  {{ user.firstname }} {{ user.lastname }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">{{ user.email }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'">
                {{ user.role }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(user.deletedAt).toLocaleDateString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button 
                @click="restoreUser(user.id)"
                :disabled="loadingRestore.has(user.id)"
                class="inline-flex items-center px-4 py-2 rounded-lg transition-all duration-200 ease-in-out relative"
                :class="[
                  loadingRestore.has(user.id) ? 'opacity-50 cursor-not-allowed' : '',
                  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                ]"
              >
                <span v-if="loadingRestore.has(user.id)" class="absolute left-1/2 -translate-x-1/2">
                  <svg class="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                <RefreshCw v-if="!loadingRestore.has(user.id)" class="w-4 h-4 mr-2" />
                <span :class="{ 'opacity-0': loadingRestore.has(user.id) }">
                  Restore User
                </span>
              </button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-500">
              No archived users found
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
            <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, totalUsers) }}</span> of 
            <span class="font-medium">{{ totalUsers }}</span> results
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
                      page === currentPage ? 'relative z-10 inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 
                      'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
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
  </div>
</template>

