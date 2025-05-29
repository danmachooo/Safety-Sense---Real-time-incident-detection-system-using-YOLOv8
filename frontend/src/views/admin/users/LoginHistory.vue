<script setup>
import { ref, onMounted, watch, computed } from "vue";
import api from "../../../utils/axios";
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LogIn,
  LogOut,
  Clock,
  Users,
  Activity,
  Calendar,
  Mail,
  Crown,
  Shield,
  RefreshCw,
  Zap,
} from "lucide-vue-next";

const loginHistory = ref([]);
const searchQuery = ref("");
const currentPage = ref(1);
const totalPages = ref(1);
const totalEntries = ref(0);
const itemsPerPage = ref(10);
const isRefreshing = ref(false);

// Sorting state
const sortField = ref("login");
const sortOrder = ref("desc");

const columns = [
  {
    key: "firstname",
    label: "Name",
    sortable: true,
  },
  {
    key: "email",
    label: "Email",
    sortable: true,
  },
  {
    key: "role",
    label: "Role",
    sortable: true,
  },
  {
    key: "login",
    label: "Login Time",
    sortable: true,
  },
  {
    key: "logout",
    label: "Logout Time",
    sortable: true,
  },
];

const handleSort = (column) => {
  if (!column.sortable) return;

  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = column.key;
    sortOrder.value = "desc";
  }

  fetchLoginHistory();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;

  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === "asc" ? ArrowUp : ArrowDown;
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return "---";
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getSessionStatus = (entry) => {
  if (!entry.login) return "pending";
  if (!entry.logout) return "active";
  return "completed";
};

const fetchLoginHistory = async () => {
  isRefreshing.value = true;
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      sortBy: sortField.value,
      sortOrder: sortOrder.value,
    });

    const response = await api.get(
      `auth/login-history?${queryParams.toString()}`
    );

    loginHistory.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalEntries.value = response.data.totalEntries;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error("Error fetching login history:", error);
  } finally {
    isRefreshing.value = false;
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

// Computed stats
const activeSessions = computed(() => {
  return loginHistory.value.filter((entry) => entry.login && !entry.logout)
    .length;
});

const completedSessions = computed(() => {
  return loginHistory.value.filter((entry) => entry.login && entry.logout)
    .length;
});

const adminLogins = computed(() => {
  return loginHistory.value.filter((entry) => entry.role === "admin").length;
});

const rescuerLogins = computed(() => {
  return loginHistory.value.filter((entry) => entry.role === "rescuer").length;
});

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

// Get role color
const getRoleColor = (role) => {
  return role === "admin"
    ? {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      }
    : {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
};
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
  >
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
              <History class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              >
                Login History
              </h1>
              <p class="text-gray-600 mt-1 text-lg">
                Monitor user authentication and session activity
              </p>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <span
            class="px-4 py-2 bg-white/70 backdrop-blur-sm border border-white/20 rounded-xl text-gray-700 font-medium"
          >
            Total Entries: {{ totalEntries }}
          </span>
          <button
            @click="fetchLoginHistory"
            :disabled="isRefreshing"
            class="btn-refresh"
          >
            <RefreshCw
              class="w-5 h-5 mr-2"
              :class="{ 'animate-spin': isRefreshing }"
            />
            {{ isRefreshing ? "Refreshing..." : "Refresh" }}
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Sessions</p>
              <p class="text-3xl font-bold text-gray-900">{{ totalEntries }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Activity class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Active Sessions</p>
              <p class="text-3xl font-bold text-emerald-600">
                {{ activeSessions }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <Zap class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Admin Logins</p>
              <p class="text-3xl font-bold text-purple-600">
                {{ adminLogins }}
              </p>
            </div>
            <div class="p-3 bg-purple-100 rounded-xl">
              <Crown class="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Rescuer Logins</p>
              <p class="text-3xl font-bold text-blue-600">
                {{ rescuerLogins }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Shield class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8"
      >
        <div class="relative">
          <Search
            class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name or email..."
            class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
          />
        </div>
      </div>

      <!-- Table -->
      <div
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
                v-for="(entry, index) in loginHistory"
                :key="index"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold mr-4"
                    >
                      {{ entry.firstname[0] }}{{ entry.lastname[0] }}
                    </div>
                    <div class="font-semibold text-gray-900">
                      {{ entry.firstname }} {{ entry.lastname }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <Mail class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      entry.email
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'px-3 py-1 text-sm font-medium rounded-full border flex items-center w-fit',
                      getRoleColor(entry.role).bg,
                      getRoleColor(entry.role).text,
                      getRoleColor(entry.role).border,
                    ]"
                  >
                    <component
                      :is="entry.role === 'admin' ? Crown : Shield"
                      class="w-3 h-3 mr-1"
                    />
                    {{ entry.role }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <LogIn class="w-4 h-4 text-emerald-500 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      formatDateTime(entry.login)
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <LogOut
                      class="w-4 h-4 mr-2"
                      :class="entry.logout ? 'text-amber-500' : 'text-gray-300'"
                    />
                    <span
                      class="font-medium"
                      :class="entry.logout ? 'text-gray-900' : 'text-gray-400'"
                    >
                      {{ formatDateTime(entry.logout) }}
                    </span>
                    <span
                      v-if="!entry.logout && entry.login"
                      class="ml-3 px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center"
                    >
                      <Zap class="w-3 h-3 mr-1" />
                      Active Session
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="loginHistory.length === 0">
                <td colspan="5" class="px-6 py-12 text-center">
                  <div class="flex flex-col items-center">
                    <History class="w-12 h-12 text-gray-400 mb-4" />
                    <p class="text-gray-500 text-lg font-medium">
                      No login history found
                    </p>
                    <p class="text-gray-400 text-sm mt-1">
                      Try adjusting your search criteria
                    </p>
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
              {{ Math.min(currentPage * itemsPerPage, totalEntries) }} of
              {{ totalEntries }} results
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
  </div>
</template>

<style scoped>
.btn-refresh {
  @apply bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}
</style>
