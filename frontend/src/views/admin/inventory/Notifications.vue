<script setup>
import { ref, onMounted } from 'vue';
import { Bell, Eye, CheckCircle, Trash2 } from 'lucide-vue-next';

const notifications = ref([]);

onMounted(async () => {
  // Fetch notifications from API
  // This is a placeholder. Replace with actual API call.
  notifications.value = [
    { id: 1, message: 'Low stock alert: Safety Helmets', type: 'warning', isRead: false, createdAt: '2023-05-15T10:30:00Z' },
    { id: 2, message: 'Deployment overdue: First Aid Kits at Site B', type: 'alert', isRead: false, createdAt: '2023-05-14T14:45:00Z' },
    { id: 3, message: 'New safety regulation update', type: 'info', isRead: true, createdAt: '2023-05-13T09:15:00Z' },
    // ... more notifications
  ];
});

const viewNotification = (id) => {
  // Implement view notification details logic
};

const markAsRead = (id) => {
  // Implement mark notification as read logic
};

const deleteNotification = (id) => {
  // Implement delete notification logic
};

const markAllAsRead = () => {
  // Implement mark all notifications as read logic
};
</script>

<template>
  <div class="container mx-auto px-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Notifications</h1>
      <button @click="markAllAsRead" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center">
        <CheckCircle class="w-5 h-5 mr-2" />
        Mark All as Read
      </button>
    </div>

    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <ul class="divide-y divide-gray-200">
        <li v-for="notification in notifications" :key="notification.id" class="p-4 hover:bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <Bell :class="{
                'w-6 h-6 mr-3': true,
                'text-yellow-500': notification.type === 'warning',
                'text-red-500': notification.type === 'alert',
                'text-blue-500': notification.type === 'info'
              }" />
              <div>
                <p :class="{
                  'text-sm font-medium': true,
                  'text-gray-900': !notification.isRead,
                  'text-gray-500': notification.isRead
                }">
                  {{ notification.message }}
                </p>
                <p class="text-xs text-gray-500">{{ new Date(notification.createdAt).toLocaleString() }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button @click="viewNotification(notification.id)" class="text-blue-600 hover:text-blue-900">
                <Eye class="w-5 h-5" />
              </button>
              <button v-if="!notification.isRead" @click="markAsRead(notification.id)" class="text-green-600 hover:text-green-900">
                <CheckCircle class="w-5 h-5" />
              </button>
              <button @click="deleteNotification(notification.id)" class="text-red-600 hover:text-red-900">
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>