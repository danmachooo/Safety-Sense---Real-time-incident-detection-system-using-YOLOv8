<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import thatLogo from "../assets/logo1.jpg";
import { 
  ChevronDown, CameraIcon, LogsIcon, ArchiveIcon, Users, ShoppingCart, Eye, 
  UserPlus, Package, PlusCircle, Edit, Boxes, Truck, MapPin, Tags, Bell
} from 'lucide-vue-next';
import Header from '../components/Header.vue';

const router = useRouter();
const userDropdown = ref(false);
const inventoryDropdown = ref(false);
const cameraDropdown = ref(false);

const navigateTo = (route) => {
  router.push(route);
};
</script>

<template>
  <div class="flex h-screen bg-[#1B262C] text-gray-800">
    <!-- Sidebar -->
    <aside class="w-64 bg-[#1B262C] overflow-y-auto scrollbar-hide flex-shrink-0">
      <div class="p-4 sticky top-0 bg-[#1B262C] z-10 flex items-center justify-center">
        <img :src="thatLogo" alt="SafetySense Logo" class="w-10 h-10 rounded-full object-cover" />
        <h2 class="text-2xl font-bold text-white ml-2">SafetySense</h2>
      </div>
      
      <nav class="space-y-5 px-5 pb-5">
        <!-- User Management -->
        <div class="relative mb-2">
          <button 
            @click="userDropdown = !userDropdown" 
            class="w-full flex items-center justify-between p-3 rounded-lg  duration-200 ease-in-out"
          >
            <div class="flex items-center">
              <Users class="w-5 h-5 text-white" />
              <span class="font-medium text-white ml-3">User Management</span>
            </div>
            <ChevronDown 
              class="w-5 h-5 text-white transition-transform duration-200"
              :class="{ 'transform rotate-180': userDropdown }"
            />
          </button>
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <ul v-if="userDropdown" class="mt-2 space-y-1">
              <li v-for="(item, index) in [
                { icon: Eye, text: 'View Users', route: '/admin/users/view' },
                { icon: UserPlus, text: 'Create User', route: '/admin/users/create' },
                { icon: ArchiveIcon, text: 'Archived users', route: '/admin/users/archived' },
                { icon: LogsIcon, text: 'Login History', route: '/admin/users/login-history' },
              ]" :key="index">
                <button 
                  @click="navigateTo(item.route)" 
                  class="w-full flex items-center p-2 pl-11 rounded-lg text-gray-300 hover:text-white hover:bg-[#263238] transition-colors duration-200"
                >
                  <component :is="item.icon" class="w-4 h-4 mr-3" />
                  {{ item.text }}
                </button>
              </li>
            </ul>
          </transition>
        </div>

        <!-- Inventory Management -->
        <div class="relative mb-2">
          <button 
            @click="inventoryDropdown = !inventoryDropdown" 
            class="w-full flex items-center justify-between p-3 rounded-lg  duration-200 ease-in-out "
          >
            <div class="flex items-center">
              <ShoppingCart class="w-5 h-5 text-white" />
              <span class="font-medium text-white ml-3">Inventory Management</span>
            </div>
            <ChevronDown 
              class="w-5 h-5 text-white transition-transform duration-200"
              :class="{ 'transform rotate-180': inventoryDropdown }"
            />
          </button>
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <ul v-if="inventoryDropdown" class="mt-2 space-y-1">
              <li v-for="(item, index) in [
                { icon: Eye, text: 'View Inventory', route: '/admin/inventory/items' },

                { icon: Boxes, text: 'Batches', route: '/admin/inventory/batches' },
                { icon: Truck, text: 'Deployments', route: '/admin/inventory/deployments' },
              ]" :key="index">
                <button 
                  @click="navigateTo(item.route)" 
                  class="w-full flex items-center p-2 pl-11 rounded-lg text-gray-300 hover:text-white hover:bg-[#263238] transition-colors duration-200"
                >
                  <component :is="item.icon" class="w-4 h-4 mr-3" />
                  {{ item.text }}
                </button>
              </li>
            </ul>
          </transition>
        </div>

        <!-- Camera Management -->
        <div class="relative mb-2">
          <button 
            @click="cameraDropdown = !cameraDropdown" 
            class="w-full flex items-center justify-between p-3 rounded-lg duration-200 ease-in-out "
          >
            <div class="flex items-center">
              <CameraIcon class="w-5 h-5 text-white" />
              <span class="font-medium text-white ml-3">Camera Management</span>
            </div>
            <ChevronDown 
              class="w-5 h-5 text-white transition-transform duration-200"
              :class="{ 'transform rotate-180': cameraDropdown }"
            />
          </button>
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <ul v-if="cameraDropdown" class="mt-2 space-y-1">
              <li>
                <button 
                  @click="navigateTo('/admin/camera/manage')" 
                  class="w-full flex items-center p-2 pl-11 rounded-lg text-gray-300 hover:text-white hover:bg-[#263238] transition-colors duration-200"
                >
                  <CameraIcon class="w-4 h-4 mr-3" />
                  Manage Cameras
                </button>
              </li>
              <li>
                <button 
                  @click="navigateTo('/admin/camera/archived')" 
                  class="w-full flex items-center p-2 pl-11 rounded-lg text-gray-300 hover:text-white hover:bg-[#263238] transition-colors duration-200"
                >
                  <ArchiveIcon class="w-4 h-4 mr-3" />
                  Archived Cameras
                </button>
              </li>
            </ul>
          </transition>
        </div>
      </nav>
    </aside>

    <!-- Right-side Content -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Header component -->
      <Header />
      
      <!-- Main content area -->
      <main class="flex-1 overflow-auto bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
          <div class="bg-white  rounded-lg">
            <router-view />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>