<script setup>
import { ref, computed, onMounted, watch } from 'vue';
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
  ArrowDown
} from 'lucide-vue-next';

const users = ref([]);
const searchQuery = ref('');
const roleFilter = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const totalUsers = ref(0);
const itemsPerPage = ref(10);
const loggedInUser = ref(JSON.parse(localStorage.getItem('authUser')) || {});
const isCurrentUser = (email) => email === loggedInUser.value.email;

const router = useRouter();

const roles = ['Admin', 'Rescuer'];

// Sorting state
const sortField = ref('createdAt');
const sortOrder = ref('asc');

const columns = [
  { 
    key: 'firstname', // Changed from 'name' to match backend
    label: 'Name',
    sortable: true,
    // Add custom sort handling for combined name
    sortField: 'firstname' // You might need to adjust this based on your backend
  },
  { 
    key: 'email',
    label: 'Email',
    sortable: true 
  },
  { 
    key: 'contact',
    label: 'Contact Number',
    sortable: true 
  },
  { 
    key: 'role',
    label: 'Role',
    sortable: true 
  },
  { 
    key: 'isBlocked', // Changed from 'status' to match backend
    label: 'Status',
    sortable: true 
  },
  { 
    key: 'createdAt',
    label: 'Join Date',
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
    // Toggle sort order if clicking the same column
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Set new sort field and default to ascending
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


const fetchUsers = async () => {
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      showDeleted: 'false',
      sortBy: sortField.value,
      sortOrder: sortOrder.value
    });

    if (roleFilter.value !== 'all') {
      queryParams.append("role", roleFilter.value);
    }

    const requestUrl = `manage-user/get-all?${queryParams.toString()}`;
    const response = await api.get(requestUrl);
    
    users.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalUsers.value = response.data.totalUsers;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

onMounted(() => {
  fetchUsers();
});

watch([searchQuery, roleFilter], () => {
  currentPage.value = 1;
  fetchUsers();
});

const filteredUsers = computed(() => {
  return users.value;
});

const viewProfile = (userId) => {
  router.push(`/admin/users/profile/${userId}`);
}

const switchRole = async (userId) => {
  const user = users.value.find(u => u.id === userId);
  if (user) {
    const newRole = user.role === 'admin' ? 'rescuer' : 'admin';
    try {
      await api.patch(`authorization/change-role/${userId}`, { role: newRole });
      user.role = newRole;
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  }
};

const toggleBlockStatus = async (userId) => {
  const user = users.value.find(u => u.id === userId);
  if (user) {
    const newStatus = !user.isBlocked;
    try {
      await api.patch(`authorization/change-access/${userId}`, { isBlocked: newStatus });
      user.isBlocked = newStatus;
    } catch (error) {
      console.error('Error toggling user block status:', error);
    }
  }
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchUsers();
  }
};

</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-gray-800 flex items-center">
      <Users class="w-6 h-6 mr-2 text-blue-600" />
      View Users
    </h2>

    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search users..."
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
              <div class="text-sm text-gray-500">{{ user.contact ?? 'No number provided.' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'">
                {{ user.role }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'">
                {{ user.isBlocked ? 'Blocked' : 'Active' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(user.createdAt).toLocaleDateString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <template v-if="!isCurrentUser(user.email)">
                <button @click="viewProfile(user.id)" 
                        class="bg-gray-100 text-gray-600 hover:text-gray-900 px-3 py-1 mr-2 rounded-full transition duration-300 ease-in-out">
                  View Profile
                </button>

                <button @click="switchRole(user.id)" 
                        :class="user.role === 'admin' ? 'bg-green-100 text-green-600 hover:text-green-900' : 'bg-purple-100 text-purple-600 hover:text-purple-900'"
                        class="mr-3 px-3 py-1 rounded-full transition duration-300 ease-in-out">
                  Switch to {{ user.role === 'admin' ? 'rescuer' : 'admin' }}
                </button>

                <button @click="toggleBlockStatus(user.id)" 
                        :class="user.isBlocked ? 'bg-blue-100 text-blue-600 hover:text-blue-900' : 'bg-red-100 text-red-600 hover:text-red-900'"
                        class="px-3 py-1 rounded-full transition duration-300 ease-in-out">
                  {{ user.isBlocked ? 'Unblock' : 'Block' }}
                </button>
              </template>
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
                      page === currentPage ? 'relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 
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