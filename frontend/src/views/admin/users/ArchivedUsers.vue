<script setup>
import { ref, onMounted, watch, computed } from "vue";
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
  AlertCircle,
  X,
  RotateCcw,
  Users,
  Crown,
  Shield,
  Calendar,
  Mail,
  UserCheck,
  UserX,
} from "lucide-vue-next";

const users = ref([]);
const searchQuery = ref("");
const roleFilter = ref("all");
const currentPage = ref(1);
const totalPages = ref(1);
const totalUsers = ref(0);
const itemsPerPage = ref(10);
const loadingRestore = ref(new Set());
const notification = ref({ show: false, type: "", message: "" });
const isRefreshing = ref(false);

const roles = ["Admin", "Rescuer"];

// Sorting state
const sortField = ref("deletedAt");
const sortOrder = ref("desc");

const columns = [
  {
    key: "firstname",
    label: "Name",
    sortable: true,
    sortField: "firstname",
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
    key: "deletedAt",
    label: "Archived Date",
    sortable: true,
  },
  {
    key: "actions",
    label: "Actions",
    sortable: false,
  },
];

const handleSort = (column) => {
  if (!column.sortable) return;

  if (sortField.value === column.key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = column.key;
    sortOrder.value = "asc";
  }

  fetchUsers();
};

const getSortIcon = (column) => {
  if (!column.sortable) return null;

  if (sortField.value !== column.key) {
    return ArrowUpDown;
  }
  return sortOrder.value === "asc" ? ArrowUp : ArrowDown;
};

const showNotification = (type, message) => {
  notification.value = {
    show: true,
    type,
    message,
  };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const fetchUsers = async () => {
  isRefreshing.value = true;
  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      search: searchQuery.value,
      showDeleted: "true",
      sortBy: sortField.value,
      sortOrder: sortOrder.value,
    });

    if (roleFilter.value !== "all") {
      queryParams.append("role", roleFilter.value);
    }

    const requestUrl = `manage-user/get-deleted?${queryParams.toString()}`;
    const response = await api.get(requestUrl);

    users.value = response.data.data;
    totalPages.value = response.data.totalPages;
    totalUsers.value = response.data.totalUsers;
    currentPage.value = response.data.currentPage;
  } catch (error) {
    console.error("Error fetching archived users:", error);
    showNotification("error", "Failed to fetch archived users");
  } finally {
    isRefreshing.value = false;
  }
};

const restoreUser = async (userId) => {
  if (loadingRestore.value.has(userId)) return;

  loadingRestore.value.add(userId);
  try {
    await api.patch(`manage-user/restore/${userId}`);
    users.value = users.value.filter((user) => user.id !== userId);
    totalUsers.value--;
    showNotification("success", "User restored successfully");
  } catch (error) {
    console.error("Error restoring user:", error);
    showNotification("error", "Failed to restore user");
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

// Computed stats
const archivedAdmins = computed(() => {
  return users.value.filter((u) => u.role === "admin").length;
});

const archivedRescuers = computed(() => {
  return users.value.filter((u) => u.role === "rescuer").length;
});

const recentlyArchived = computed(() => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return users.value.filter((u) => new Date(u.deletedAt) > oneWeekAgo).length;
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

// Format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Get days since archived
const getDaysSinceArchived = (dateString) => {
  const archivedDate = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - archivedDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
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
        class="bg-white/80 mb-8 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-10"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 py-8"
          >
            <!-- Left: Icon + Title + Subtitle -->
            <div class="flex items-center space-x-4">
              <div
                class="p-2 bg-gradient-to-r from-gray-500 to-gray-700 rounded-xl"
              >
                <Archive class="w-8 h-8 text-white" />
              </div>
              <div>
                <h1
                  class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
                >
                  Archived Users
                </h1>
                <p class="text-gray-600 mt-1 text-base font-medium">
                  Manage and restore archived user accounts
                </p>
              </div>
            </div>

            <!-- Right: Total + Refresh Button -->
            <div class="flex items-center gap-4">
              <span
                class="px-5 py-3 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl text-gray-700 font-medium text-sm"
              >
                Total: {{ totalUsers }}
              </span>
              <button
                @click="fetchUsers"
                :disabled="isRefreshing"
                class="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] font-medium"
              >
                <RefreshCw
                  class="w-4 h-4 mr-2"
                  :class="{ 'animate-spin': isRefreshing }"
                />
                {{ isRefreshing ? "Refreshing..." : "Refresh" }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Archived</p>
              <p class="text-3xl font-bold text-gray-900">{{ totalUsers }}</p>
            </div>
            <div class="p-3 bg-gray-100 rounded-xl">
              <Archive class="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Archived Admins</p>
              <p class="text-3xl font-bold text-purple-600">
                {{ archivedAdmins }}
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
              <p class="text-sm font-medium text-gray-600">Archived Rescuers</p>
              <p class="text-3xl font-bold text-emerald-600">
                {{ archivedRescuers }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <Shield class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Recently Archived</p>
              <p class="text-3xl font-bold text-amber-600">
                {{ recentlyArchived }}
              </p>
            </div>
            <div class="p-3 bg-amber-100 rounded-xl">
              <Calendar class="w-6 h-6 text-amber-600" />
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
              placeholder="Search archived users..."
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div class="relative">
            <Filter
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <select
              v-model="roleFilter"
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option value="all">All Roles</option>
              <option v-for="role in roles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </div>
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
                v-for="user in users"
                :key="user.id"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      class="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-700 rounded-xl flex items-center justify-center text-white font-semibold mr-4"
                    >
                      {{ user.firstname[0] }}{{ user.lastname[0] }}
                    </div>
                    <div>
                      <div class="font-semibold text-gray-900">
                        {{ user.firstname }} {{ user.lastname }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ getDaysSinceArchived(user.deletedAt) }} days ago
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <Mail class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      user.email
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'px-3 py-1 text-sm font-medium rounded-full border flex items-center w-fit',
                      getRoleColor(user.role).bg,
                      getRoleColor(user.role).text,
                      getRoleColor(user.role).border,
                    ]"
                  >
                    <component
                      :is="user.role === 'admin' ? Crown : Shield"
                      class="w-3 h-3 mr-1"
                    />
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <Calendar class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      formatDate(user.deletedAt)
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end">
                    <button
                      @click="restoreUser(user.id)"
                      :disabled="loadingRestore.has(user.id)"
                      class="btn-restore relative"
                    >
                      <div
                        v-if="loadingRestore.has(user.id)"
                        class="absolute inset-0 flex items-center justify-center"
                      >
                        <div
                          class="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"
                        ></div>
                      </div>
                      <RotateCcw
                        class="w-4 h-4 mr-2"
                        :class="{ 'opacity-0': loadingRestore.has(user.id) }"
                      />
                      <span
                        :class="{ 'opacity-0': loadingRestore.has(user.id) }"
                      >
                        Restore
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="5" class="px-6 py-12 text-center">
                  <div class="flex flex-col items-center">
                    <Archive class="w-12 h-12 text-gray-400 mb-4" />
                    <p class="text-gray-500 text-lg font-medium">
                      No archived users found
                    </p>
                    <p class="text-gray-400 text-sm mt-1">
                      All users are currently active
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
              {{ Math.min(currentPage * itemsPerPage, totalUsers) }} of
              {{ totalUsers }} results
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

.btn-refresh {
  @apply bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-restore {
  @apply px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}
</style>
