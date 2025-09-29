<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from "vue";
import {
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  Loader2,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import api from "../utils/axios";

import { useAuthStore } from "../stores/authStore";
import { storeToRefs } from "pinia";

const authStore = useAuthStore();
const { authUser } = storeToRefs(authStore);

const router = useRouter();
const showUserDropdown = ref(false);
const showNotifications = ref(false);
const loggedInUser = authUser.value;

// Add logout confirmation state
const showLogoutConfirmation = ref(false);
const isLoggingOut = ref(false);

// Notification State
const notifications = ref([]);
const currentTab = ref("unread");
const sortOrder = ref("desc");
const isLoading = ref(false);
const loadingMore = ref(false);
const totalNotifications = ref(0);
const hasMore = ref(false);
const limit = 5;
const offset = ref(0);

const user = ref({
  firstname: "",
  lastname: "",
  contact: "",
  role: "",
});

// Add new refs for tracking unread notifications
const totalUnreadCount = ref(0);
const pollingInterval = ref(null);

// Computed
const unreadCount = computed(() => totalUnreadCount.value);

// Notification Functions
const fetchNotifications = async (loadMore = false) => {
  try {
    if (!loadMore) {
      isLoading.value = true;
      offset.value = 0;
    } else {
      loadingMore.value = true;
    }

    const params = new URLSearchParams({
      isRead: currentTab.value === "read",
      limit,
      offset: offset.value,
      sortOrder: sortOrder.value,
    });

    const response = await api.get(`/system/notifications?${params}`);
    if (response.data.success) {
      if (loadMore) {
        notifications.value = [...notifications.value, ...response.data.data];
        console.log(notifications.value);
      } else {
        notifications.value = response.data.data;
      }
      hasMore.value = response.data.hasMore;
      totalNotifications.value = response.data.totalNotifications;
      // Update unread count if we're fetching unread notifications
      if (currentTab.value === "unread" && !loadMore) {
        totalUnreadCount.value = response.data.totalNotifications;
      }
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
  } finally {
    isLoading.value = false;
    loadingMore.value = false;
  }
};

// Add function to fetch only unread count
const fetchUnreadCount = async () => {
  try {
    const response = await api.get("/system/notifications/unread-count");
    if (response.data.success) {
      totalUnreadCount.value = response.data.count;
    }
  } catch (error) {
    console.error("Error fetching unread count:", error);
  }
};

// Modify markAsRead to update counts
const markAsRead = async (id) => {
  try {
    await api.patch(`/system/notifications/mark-as-read/${id}`);
    const notification = notifications.value.find((n) => n.id === id);
    if (notification) {
      notification.isRead = true;
      totalUnreadCount.value = Math.max(0, totalUnreadCount.value - 1);
      // If we're in unread tab, remove the notification
      if (currentTab.value === "unread") {
        notifications.value = notifications.value.filter((n) => n.id !== id);
        totalNotifications.value--;
      }
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

// Add polling function for real-time updates
const startPolling = () => {
  // Poll every 30 seconds
  pollingInterval.value = setInterval(async () => {
    await fetchUnreadCount();
    // If showing unread notifications, refresh the list
    if (currentTab.value === "unread" && showNotifications.value) {
      await fetchNotifications();
    }
  }, 3000);
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Existing Header Functions
const fetchUser = async () => {
  try {
    user.value = {
      firstname: loggedInUser.value.firstname || "",
      lastname: loggedInUser.value.lastname || "",
      contact: loggedInUser.value.contact || "",
      email: loggedInUser.value.email || "",
      role: loggedInUser.value.role || "",
      createdAt: loggedInUser.value.createdAt || "",
      isVerified: loggedInUser.value.isVerified ?? false,
      isBlocked: loggedInUser.value.isBlocked ?? false,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};

// Updated logout functions
const showLogoutDialog = () => {
  showLogoutConfirmation.value = true;
  showUserDropdown.value = false;
};

const cancelLogout = () => {
  showLogoutConfirmation.value = false;
};

const confirmLogout = async () => {
  try {
    isLoggingOut.value = true;
    await authStore.logout();

    if (!authStore.isAuthenticated) {
      showLogoutConfirmation.value = false;
      router.push("/");
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    isLoggingOut.value = false;
  }
};

const goToProfile = () => {
  router.push("/admin/users/profile/me");
};

const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value;
  if (showUserDropdown.value) {
    showNotifications.value = false;
  }
};

// Update toggleNotifications to refresh data when opening
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) {
    showUserDropdown.value = false;
    fetchNotifications();
    fetchUnreadCount();
  }
};

const toggleSort = () => {
  sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  fetchNotifications();
};

const loadMore = () => {
  offset.value += limit;
  fetchNotifications(true);
};

// Watch for tab changes
watch(currentTab, () => {
  fetchNotifications();
});

// Event Listeners
onMounted(() => {
  fetchUser();
  fetchNotifications();
  fetchUnreadCount();
  startPolling();

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target.closest(".user-dropdown") && !target.closest(".user-button")) {
      showUserDropdown.value = false;
    }
    if (
      !target.closest(".notifications-dropdown") &&
      !target.closest(".notifications-button")
    ) {
      showNotifications.value = false;
    }
  });
});

// Add cleanup on unmount
onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
  }
});
</script>

<template>
  <header
    class="bg-gray-900 px-6 py-4 rounded-t-lg border-b flex items-center justify-between sticky top-0 z-30"
  >
    <!-- Left side - Page Title -->
    <div>
      <h1 class="text-xl font-semibold text-white"></h1>
    </div>

    <!-- Right side - Notifications and User Profile -->
    <div class="flex items-center space-x-4">
      <!-- Notifications -->
      <div class="relative">
        <button
          @click.stop="toggleNotifications"
          class="notifications-button relative p-2 text-gray-300 hover:text-white hover:bg-[#263238] rounded-full transition-colors duration-200"
        >
          <Bell class="w-6 h-6" />
          <span
            v-if="unreadCount > 0"
            class="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse"
          >
            {{ unreadCount }}
          </span>
        </button>

        <!-- Enhanced Notifications Dropdown -->
        <!-- Notifications Dropdown -->
        <div
          v-if="showNotifications"
          class="notifications-dropdown absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999]"
        >
          <!-- Header with Tabs -->
          <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center space-x-2">
                <h3 class="font-semibold text-gray-800">Notifications</h3>
                <span class="text-sm text-gray-500"
                  >({{ totalNotifications }})</span
                >
              </div>
              <div class="flex items-center space-x-2">
                <button
                  @click="toggleSort"
                  class="p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors duration-200"
                >
                  <component
                    :is="sortOrder === 'asc' ? ArrowUp : ArrowDown"
                    class="w-4 h-4"
                  />
                </button>
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                v-for="tab in [
                  { id: 'unread', name: 'Unread' },
                  { id: 'read', name: 'Read' },
                ]"
                :key="tab.id"
                @click="currentTab = tab.id"
                class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 relative"
                :class="
                  currentTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                "
              >
                {{ tab.name }}
                <span
                  v-if="tab.id === 'unread' && unreadCount > 0"
                  class="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                >
                  {{ unreadCount }}
                </span>
              </button>
            </div>
          </div>

          <!-- Notifications List -->
          <div class="max-h-96 overflow-y-auto">
            <!-- Loading State -->
            <div v-if="isLoading" class="p-8 text-center">
              <Loader2 class="w-8 h-8 mx-auto text-gray-400 animate-spin" />
              <p class="mt-2 text-sm text-gray-500">Loading notifications...</p>
            </div>

            <!-- Notifications -->
            <template v-else-if="notifications.length > 0">
              <div
                v-for="notification in notifications"
                :key="notification.id"
                class="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 group"
                :class="{ 'bg-blue-50/50': !notification.isRead }"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <p class="text-sm text-gray-800">
                      {{ notification.description }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ formatTime(notification.createdAt) }}
                    </p>
                  </div>
                  <button
                    v-if="!notification.isRead"
                    @click="markAsRead(notification.id)"
                    class="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <Check class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Load More -->
              <div v-if="hasMore" class="p-3 text-center border-t">
                <button
                  @click="loadMore"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center w-full space-x-2"
                  :disabled="loadingMore"
                >
                  <Loader2 v-if="loadingMore" class="w-4 h-4 animate-spin" />
                  <MoreHorizontal v-else class="w-4 h-4" />
                  <span>{{ loadingMore ? "Loading..." : "Show More" }}</span>
                </button>
              </div>
            </template>

            <!-- Empty State -->
            <div v-else class="p-4 text-center text-gray-500">
              No {{ currentTab === "unread" ? "unread" : "" }} notifications
            </div>
          </div>
        </div>
      </div>

      <!-- User Profile -->
      <div class="relative">
        <button
          @click.stop="toggleUserDropdown"
          class="user-button flex items-center space-x-3 p-2 rounded-lg hover:bg-[#263238] transition-colors duration-200"
        >
          <div class="flex items-center space-x-3">
            <div
              v-if="user.avatar"
              class="w-8 h-8 rounded-full bg-cover bg-center"
              :style="{ backgroundImage: `url(${user.avatar})` }"
            ></div>
            <div
              v-else
              class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold"
            >
              {{ user.firstname[0] }}{{ user.lastname[0] }}
            </div>
            <div class="hidden md:block text-left">
              <p class="text-sm font-medium text-white">{{ user.firstname }}</p>
              <p class="text-xs text-gray-300">{{ user.role }}</p>
            </div>
          </div>
          <ChevronDown
            class="w-4 h-4 text-gray-300 transition-transform duration-200"
            :class="{ 'transform rotate-180': showUserDropdown }"
          />
        </button>

        <!-- User Dropdown -->
        <div
          v-if="showUserDropdown"
          class="user-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999]"
        >
          <div class="p-3 border-b border-gray-200">
            <p class="text-sm font-medium text-gray-800">
              {{ user.firstname }} {{ user.lastname }}
            </p>
            <p class="text-xs text-gray-500">{{ user.email }}</p>
          </div>
          <div class="p-2">
            <button
              @click="goToProfile"
              class="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <User class="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              @click="showLogoutDialog"
              class="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut class="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Logout Confirmation Modal -->
    <div
      v-if="showLogoutConfirmation"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]"
      @click.self="cancelLogout"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all"
      >
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center mb-4">
            <div class="flex-shrink-0">
              <AlertTriangle class="w-6 h-6 text-amber-500" />
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium text-gray-900">Confirm Logout</h3>
            </div>
          </div>

          <!-- Content -->
          <div class="mb-6">
            <p class="text-sm text-gray-600">
              Are you sure you want to logout? You will need to sign in again to
              access your account.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3">
            <button
              @click="cancelLogout"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              :disabled="isLoggingOut"
            >
              Cancel
            </button>
            <button
              @click="confirmLogout"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              :disabled="isLoggingOut"
            >
              <Loader2 v-if="isLoggingOut" class="w-4 h-4 animate-spin" />
              <LogOut v-else class="w-4 h-4" />
              <span>{{ isLoggingOut ? "Logging out..." : "Logout" }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.max-h-96 {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.max-h-96::-webkit-scrollbar {
  width: 2px;
}

.max-h-96::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-96::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

/* Modal backdrop animation */
.fixed.inset-0 {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Modal content animation */
.transform.transition-all {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
