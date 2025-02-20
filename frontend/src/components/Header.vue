<script setup>
import { ref, onMounted, computed } from 'vue';

import { 
  Bell, 
  User,
  Settings,
  LogOut,
  ChevronDown,
  X
} from 'lucide-vue-next';
import { useAuthStore } from "../stores/authStore"; 
import { useRouter } from 'vue-router';

const loggedInUser = ref(JSON.parse(localStorage.getItem('authUser')) || {});
const authStore = useAuthStore();
const router = useRouter();

const showUserDropdown = ref(false);    
const showNotifications = ref(false);
const notifications = ref([
  {
    id: 1,
    type: 'info',
    message: 'Welcome to the admin panel!',
    time: '1 min ago',
    read: false
  },
  {
    id: 2,
    type: 'success',
    message: 'New user registered: John Doe',
    time: '5 mins ago',
    read: false
  },
  {
    id: 3,
    type: 'warning',
    message: 'System update scheduled for tomorrow',
    time: '1 hour ago',
    read: true
  }
]);

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length;
});

const user = ref({
  firstname: '',
  lastname: '',
  contact: '',
  role: ''
});

const fetchUser = async () => {
    try {

        // Assign default values if fields are null
        user.value = {
            firstname: loggedInUser.value.firstname || '',
            lastname: loggedInUser.value.lastname || '',
            contact: loggedInUser.value.contact || '', // Ensure contact is always a string
            email: loggedInUser.value.email || '',
            role: loggedInUser.value.role || '',
            createdAt: loggedInUser.value.createdAt || '',
            isVerified: loggedInUser.value.isVerified ?? false, // Boolean safety
            isBlocked: loggedInUser.value.isBlocked ?? false
        };

    } catch (error) {
        console.error('Error fetching user data:', error);
    }
};

const handleLogout = () => {
    authStore.logout();

    if (!authStore.isAuthenticated) {
        console.log("Redirecting to login page...");
        router.push("/"); 
    }
}

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
  }
};

const markAsRead = (notificationId) => {
  const notification = notifications.value.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
};

const clearAllNotifications = () => {
  notifications.value = [];
};
    
onMounted(() => {
    fetchUser();
});


// Close dropdowns when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target.closest('.user-dropdown') && !target.closest('.user-button')) {
      showUserDropdown.value = false;
    }
    if (!target.closest('.notifications-dropdown') && !target.closest('.notifications-button')) {
      showNotifications.value = false;
    }
  });
});
</script>

<template>
  <header class="bg-white px-6 py-4 rounded-t-lg border-b flex items-center justify-between">
    <!-- Left side - Breadcrumb or Page Title could go here -->
    <div>
      <h1 class="text-xl font-semibold text-gray-800">Admin Panel</h1>
    </div>

    <!-- Right side - Notifications and User Profile -->
    <div class="flex items-center space-x-4">
      <!-- Notifications -->
      <div class="relative">
        <button 
          @click.stop="toggleNotifications"
          class="notifications-button relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200"
        >
          <Bell class="w-6 h-6" />
          <span 
            v-if="unreadCount > 0"
            class="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {{ unreadCount }}
          </span>
        </button>

        <!-- Notifications Dropdown -->
        <div 
          v-if="showNotifications"
          class="notifications-dropdown absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
        >
          <div class="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 class="font-semibold text-gray-800">Notifications</h3>
            <button 
              @click="clearAllNotifications"
              class="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear all
            </button>
          </div>
          <div class="max-h-96 overflow-y-auto">
            <template v-if="notifications.length > 0">
              <div 
                v-for="notification in notifications" 
                :key="notification.id"
                class="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                :class="{ 'bg-blue-50/50': !notification.read }"
              >
                <div class="flex justify-between items-start">
                  <p class="text-sm text-gray-800">{{ notification.message }}</p>
                  <button 
                    v-if="!notification.read"
                    @click="markAsRead(notification.id)"
                    class="text-gray-400 hover:text-gray-600"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ notification.time }}</p>
              </div>
            </template>
            <div v-else class="p-4 text-center text-gray-500">
              No notifications
            </div>
          </div>
        </div>
      </div>

      <!-- User Profile -->
      <div class="relative">
        <button 
          @click.stop="toggleUserDropdown"
          class="user-button flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        >
          <div class="flex items-center space-x-3">
            <!-- Avatar -->
            <div 
              v-if="user.avatar"
              class="w-8 h-8 rounded-full bg-cover bg-center"
              :style="{ backgroundImage: `url(${user.avatar})` }"
            ></div>
            <div 
              v-else
              class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold"
            >
            {{ user.firstname[0] }} {{ user.lastname[0] }}
        </div>
            
            <!-- User Info -->
            <div class="hidden md:block text-left">
              <p class="text-sm font-medium text-gray-800">{{ user.firstname }} </p>
              <p class="text-xs text-gray-500">{{ user.role }}</p>
            </div>
          </div>
          <ChevronDown 
            class="w-4 h-4 text-gray-600 transition-transform duration-200"
            :class="{ 'transform rotate-180': showUserDropdown }"
          />
        </button>

        <!-- User Dropdown -->
        <div 
          v-if="showUserDropdown"
          class="user-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
        >
          <div class="p-3 border-b border-gray-200">
            <p class="text-sm font-medium text-gray-800">{{ user.name }}</p>
            <p class="text-xs text-gray-500">{{ user.email }}</p>
          </div>
          <div class="p-2">
            <button 
              class="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <User class="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button  @click="handleLogout"
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
/* Add any component-specific styles here if needed */
</style>