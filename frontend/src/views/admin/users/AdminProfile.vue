<script setup>
import { ref, onMounted } from "vue";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-vue-next";
import api from "../../../utils/axios";
import { useAuthStore } from "../../../stores/authStore";
import { storeToRefs } from "pinia";

const authStore = useAuthStore();
const { authUser } = storeToRefs(authStore);

const user = ref({
  firstname: "",
  lastname: "",
  email: "",
  contact: "",
  role: "",
  createdAt: "",
});

const passwordForm = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);
const notification = ref({ show: false, type: "", message: "" });
const isEditMode = ref(false);
const editForm = ref({
  firstname: "",
  lastname: "",
  contact: "",
});

const fetchProfile = async () => {
  try {
    console.log("Auth User: ", authUser.data);
    if (!authUser?.id) {
      console.error("Auth user is not provided");
      return;
    }
    const response = await api.get(`manage-user/get/${authUser.id}`);
    user.value = {
      ...response.data.data,
      createdAt: new Date(response.data.data.createdAt).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      ),
    };

    // Initialize edit form
    editForm.value = {
      firstname: user.value.firstname,
      lastname: user.value.lastname,
      contact: user.value.contact || "",
    };
  } catch (error) {
    showNotification("error", "Failed to fetch profile data");
  }
};

const updateProfile = async () => {
  try {
    isLoading.value = true;
    const authUser = JSON.parse(localStorage.getItem("authUser"));

    const response = await api.put(
      `manage-user/update/${authUser.id}`,
      editForm.value
    );

    if (response.data.success) {
      user.value = {
        ...user.value,
        ...editForm.value,
      };
      isEditMode.value = false;
      showNotification("success", "Profile updated successfully");
    }
  } catch (error) {
    showNotification("error", "Failed to update profile");
  } finally {
    isLoading.value = false;
  }
};

const updatePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    showNotification("error", "New passwords do not match");
    return;
  }

  try {
    isLoading.value = true;

    const response = await api.patch(`auth/change-password`, {
      newPassword: passwordForm.value.newPassword,
    });

    if (response.data.success) {
      passwordForm.value = {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      };
      showNotification("success", "Password updated successfully");
    }
  } catch (error) {
    showNotification(
      "error",
      error.response?.data?.message || "Failed to update password"
    );
  } finally {
    isLoading.value = false;
  }
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

const toggleEditMode = () => {
  if (isEditMode.value) {
    // Reset form if canceling
    editForm.value = {
      firstname: user.value.firstname,
      lastname: user.value.lastname,
      contact: user.value.contact || "",
    };
  }
  isEditMode.value = !isEditMode.value;
};

onMounted(() => {
  fetchProfile();
});
</script>

<template>
  <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
    <!-- Notification -->
    <div
      v-if="notification.show"
      class="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2"
      :class="{
        'bg-green-50 text-green-800': notification.type === 'success',
        'bg-red-50 text-red-800': notification.type === 'error',
      }"
    >
      <CheckCircle v-if="notification.type === 'success'" class="w-5 h-5" />
      <AlertCircle v-else class="w-5 h-5" />
      <p class="text-sm font-medium">{{ notification.message }}</p>
    </div>

    <div class="max-w-4xl mx-auto space-y-8">
      <!-- Profile Header -->
      <div
        class="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-8 text-white"
      >
        <div class="flex items-center space-x-6">
          <div
            class="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold"
          >
            {{ user.firstname?.[0] }}{{ user.lastname?.[0] }}
          </div>
          <div>
            <h1 class="text-3xl font-bold">
              {{ isEditMode ? "Edit Profile" : "My Profile" }}
            </h1>
            <p class="mt-2 text-blue-100 flex items-center">
              <Shield class="w-5 h-5 mr-2" />
              {{ user.role?.charAt(0).toUpperCase() + user.role?.slice(1) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Profile Information -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            Personal Information
          </h2>
          <button
            @click="toggleEditMode"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            :class="
              isEditMode
                ? 'bg-gray-100 text-gray-600'
                : 'bg-blue-50 text-blue-600'
            "
          >
            {{ isEditMode ? "Cancel" : "Edit Profile" }}
          </button>
        </div>

        <div v-if="!isEditMode" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <User class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Full Name</p>
              <p class="mt-1 text-gray-900">
                {{ user.firstname }} {{ user.lastname }}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <Mail class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Email</p>
              <p class="mt-1 text-gray-900">{{ user.email }}</p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <Phone class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Contact Number</p>
              <p class="mt-1 text-gray-900">
                {{ user.contact || "Not provided" }}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <Calendar class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Member Since</p>
              <p class="mt-1 text-gray-900">{{ user.createdAt }}</p>
            </div>
          </div>
        </div>

        <!-- Edit Form -->
        <form v-else @submit.prevent="updateProfile" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="firstname"
                class="block text-sm font-medium text-gray-700"
                >First Name</label
              >
              <input
                id="firstname"
                v-model="editForm.firstname"
                type="text"
                required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                for="lastname"
                class="block text-sm font-medium text-gray-700"
                >Last Name</label
              >
              <input
                id="lastname"
                v-model="editForm.lastname"
                type="text"
                required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div class="md:col-span-2">
              <label
                for="contact"
                class="block text-sm font-medium text-gray-700"
                >Contact Number</label
              >
              <input
                id="contact"
                v-model="editForm.contact"
                type="tel"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              :disabled="isLoading"
            >
              <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
              {{ isLoading ? "Saving..." : "Save Changes" }}
            </button>
          </div>
        </form>
      </div>

      <!-- Password Update -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">
          Change Password
        </h2>

        <form @submit.prevent="updatePassword" class="space-y-4">
          <div class="space-y-4">
            <div class="relative">
              <label
                for="currentPassword"
                class="block text-sm font-medium text-gray-700"
              >
                Current Password
              </label>
              <div class="mt-1 relative">
                <input
                  id="currentPassword"
                  v-model="passwordForm.currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  required
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  @click="showCurrentPassword = !showCurrentPassword"
                  class="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  <Eye
                    v-if="!showCurrentPassword"
                    class="w-5 h-5 text-gray-400"
                  />
                  <EyeOff v-else class="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div class="relative">
              <label
                for="newPassword"
                class="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div class="mt-1 relative">
                <input
                  id="newPassword"
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  required
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  class="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  <Eye v-if="!showNewPassword" class="w-5 h-5 text-gray-400" />
                  <EyeOff v-else class="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div class="relative">
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-gray-700"
              >
                Confirm New Password
              </label>
              <div class="mt-1 relative">
                <input
                  id="confirmPassword"
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  <Eye
                    v-if="!showConfirmPassword"
                    class="w-5 h-5 text-gray-400"
                  />
                  <EyeOff v-else class="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              :disabled="isLoading"
            >
              <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
              {{ isLoading ? "Updating..." : "Update Password" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
