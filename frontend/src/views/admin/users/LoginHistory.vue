<script setup>
import { ref, onMounted, watch } from 'vue';
import api from "../../../utils/axios";
import { 
  History, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LogIn,
  LogOut,
  Clock
} from 'lucide-vue-next';

const loginHistory = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalEntries = ref(0);
const itemsPerPage = ref(10);

// Sorting state
const sortField = ref('login');
const sortOrder = ref('desc');

const columns = [
  { 
    key: 'firstname',
    label: 'Name',
    sortable: true,
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
    key: 'login',
    label: 'Login Time',
    sortable: true 
  },
  { 
    key: 'logout',
    label: 'Logout Time',
    sortable: true 
  }
];

const handleSort = (column) => {
  if (!column.sortable) return;
  
  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = column.key;
    sortOrder.value = 'desc';
  }
  
  fetchLoginHistory();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;
  
  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown;
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return '---';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getSessionStatus = (entry) => {
  if (!entry.login) return 'pending';
  if (!entry.logout) return 'active';
  return 'completed';
};

const fetchLoginHistory = async () => {
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value
    });

    const response = await api.get(`authentication/login-history?${queryParams.toString()}`);
    
    loginHistory.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalEntries.value = response.data.totalEntries;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error('Error fetching login history:', error);
  }
};

onMounted(() => {
  fetchLoginHistory();
});

watch([searchQuery], () => {
  currentPage.value = 1;
  fetchLoginHistory();
});

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchLoginHistory();
  }
};
</script>

<template>
  <div class="space-y-6 ">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-800 flex items-center">
        <History class="w-6 h-6 mr-2 text-blue-600" />
        Login History
      </h2>
      <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
        Total Entries: {{ totalEntries }}
      </span>
    </div>

    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or email..."
          class="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
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
          <tr v-for="(entry, index) in loginHistory" :key="index" 
              class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3">
                  {{ entry.firstname[0] }}{{ entry.lastname[0] }}
                </div>
                <div class="text-sm font-medium text-gray-900">
                  {{ entry.firstname }} {{ entry.lastname }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">{{ entry.email }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="entry.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'">
                {{ entry.role }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center space-x-2">
                <LogIn class="w-4 h-4 text-emerald-500" />
                <span class="text-sm text-gray-900">{{ formatDateTime(entry.login) }}</span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center space-x-2">
                <LogOut class="w-4 h-4" :class="entry.logout ? 'text-amber-500' : 'text-gray-300'" />
                <span class="text-sm" :class="entry.logout ? 'text-gray-900' : 'text-gray-400'">
                  {{ formatDateTime(entry.logout) }}
                </span>
                <span v-if="!entry.logout && entry.login" 
                      class="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Active Session
                </span>
              </div>
            </td>
          </tr>
          <tr v-if="loginHistory.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-500">
              No login history found
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
            <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, totalEntries) }}</span> of 
            <span class="font-medium">{{ totalEntries }}</span> results
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

