<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import {
  Bell,
  User,
  LogOut,
  ChevronDown,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  Loader2,
  MoreHorizontal,
} from "lucide-vue-next";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";

// Composables
import { useNotifications } from "../utils/composables/notification/useNotification";
import { useUser } from "../utils/composables/auth/useUser";
import { useTimeFormat } from "../utils/composables/utils/useTimeFormat";

// Stores and router
const authStore = useAuthStore();
const router = useRouter();

// UI state
const showUserDropdown = ref(false);
const showNotifications = ref(false);

// Use composables
const {
  currentTab,
  sortOrder,
  notifications,
  totalNotifications,
  hasMore,
  unreadCount,
  isLoading,
  markAsRead,
  loadMore,
  toggleSort,
  switchTab,
  refreshNotifications,
  isMarkingAsRead,
} = useNotifications();

const { user, userInitials, userFullName } = useUser();
const { formatTime } = useTimeFormat();

// User actions
const handleLogout = async () => {
  await authStore.logout();
  if (!authStore.isAuthenticated) {
    router.push("/");
  }
};

const goToProfile = () => {
  router.push("/admin/users/profile/me");
  showUserDropdown.value = false;
};

// UI handlers
const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value;
  if (showUserDropdown.value) {
    showNotifications.value = false;
  }
};

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) {
    showUserDropdown.value = false;
    refreshNotifications();
  }
};

const handleMarkAsRead = async (id) => {
  try {
    await markAsRead(id);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

const handleTabChange = (tab) => {
  switchTab(tab);
};

// Click outside handler
const handleClickOutside = (e) => {
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
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <header
    class="bg-[#1B262C] px-6 py-4 rounded-t-lg border-b flex items-center justify-between sticky top-0 z-10"
  >
    <!-- Left side - Page Title -->
    <div>
      <h1 class="text-xl font-semibold text-white">Admin Panel</h1>
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
            {{ unreadCount > 99 ? "99+" : unreadCount }}
          </span>
        </button>

        <!-- Enhanced Notifications Dropdown -->
        <div
          v-if="showNotifications"
          class="notifications-dropdown absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
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
                  :title="`Sort ${
                    sortOrder === 'asc' ? 'Descending' : 'Ascending'
                  }`"
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
                @click="handleTabChange(tab.id)"
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
                  {{ unreadCount > 9 ? "9+" : unreadCount }}
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
                  <div class="flex-1 pr-2">
                    <p class="text-sm text-gray-800 leading-relaxed">
                      {{ notification.description }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ formatTime(notification.createdAt) }}
                    </p>
                  </div>
                  <button
                    v-if="!notification.isRead"
                    @click="handleMarkAsRead(notification.id)"
                    :disabled="isMarkingAsRead"
                    class="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50"
                    title="Mark as read"
                  >
                    <Loader2
                      v-if="isMarkingAsRead"
                      class="w-4 h-4 animate-spin"
                    />
                    <Check v-else class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Load More -->
              <div v-if="hasMore" class="p-3 text-center border-t">
                <button
                  @click="loadMore"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center w-full space-x-2 disabled:opacity-50"
                  :disabled="isLoading"
                >
                  <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
                  <MoreHorizontal v-else class="w-4 h-4" />
                  <span>{{ isLoading ? "Loading..." : "Show More" }}</span>
                </button>
              </div>
            </template>

            <!-- Empty State -->
            <div v-else class="p-8 text-center text-gray-500">
              <Bell class="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p class="text-sm">
                No {{ currentTab === "unread" ? "unread" : "" }} notifications
              </p>
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
              class="w-8 h-8 rounded-full bg-cover bg-center border-2 border-gray-300"
              :style="{ backgroundImage: `url(${user.avatar})` }"
            ></div>
            <div
              v-else
              class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm"
            >
              {{ userInitials }}
            </div>

            <div class="hidden md:block text-left">
              <p class="text-sm font-medium text-white">{{ user.firstname }}</p>
              <p class="text-xs text-gray-300 capitalize">{{ user.role }}</p>
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
          class="user-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
        >
          <div class="p-3 border-b border-gray-200">
            <p class="text-sm font-medium text-gray-800 truncate">
              {{ userFullName }}
            </p>
            <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
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
              @click="handleLogout"
              class="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut class="w-4 h-4" />
              <span>Logout</span>
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
  width: 6px;
}

.max-h-96::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-96::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

.max-h-96::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
</style>
