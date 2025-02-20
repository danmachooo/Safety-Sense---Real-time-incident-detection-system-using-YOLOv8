<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ChevronDown, Users, ShoppingCart, Eye, UserPlus, UserCog, Package, PlusCircle, Edit } from 'lucide-vue-next';
import Header from '../components/Header.vue';

const router = useRouter();
const userDropdown = ref(false);
const inventoryDropdown = ref(false);

const navigateTo = (route) => {
  router.push(route);
};
</script>

<template>
  <div class="flex h-screen bg-gray-100 text-gray-800">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-lg">
      <div class="p-4">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">SafetySense</h2>

        <nav class="space-y-4">
          <!-- User Management -->
          <div class="relative">
            <button 
              @click="userDropdown = !userDropdown" 
              class="w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ease-in-out"
              :class="{ 'bg-blue-50 text-blue-600': userDropdown, 'hover:bg-gray-100': !userDropdown }"
            >
              <div class="flex items-center space-x-3">
                <Users class="w-5 h-5" />
                <span class="font-medium">User Management</span>
              </div>
              <ChevronDown 
                class="w-5 h-5 transition-transform duration-200"
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
              <ul v-if="userDropdown" class="mt-2 space-y-2">
                <li v-for="(item, index) in [
                  { icon: Eye, text: 'View Users', route: '/admin/users/view' },
                  { icon: UserPlus, text: 'Create User', route: '/admin/users/create' },
                ]" :key="index">
                  <button 
                    @click="navigateTo(item.route)" 
                    class="w-full flex items-center p-2 pl-11 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <component :is="item.icon" class="w-4 h-4 mr-3" />
                    {{ item.text }}
                  </button>
                </li>
              </ul>
            </transition>
          </div>

          <!-- Inventory Management -->
          <div class="relative">
            <button 
              @click="inventoryDropdown = !inventoryDropdown" 
              class="w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ease-in-out"
              :class="{ 'bg-blue-50 text-blue-600': inventoryDropdown, 'hover:bg-gray-100': !inventoryDropdown }"
            >
              <div class="flex items-center space-x-3">
                <ShoppingCart class="w-5 h-5" />
                <span class="font-medium">Inventory Management</span>
              </div>
              <ChevronDown 
                class="w-5 h-5 transition-transform duration-200"
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
              <ul v-if="inventoryDropdown" class="mt-2 space-y-2">
                <li v-for="(item, index) in [
                  { icon: Eye, text: 'View Inventory', route: '/admin/inventory/view' },
                  { icon: PlusCircle, text: 'Add Inventory', route: '/admin/inventory/create' },
                  { icon: Edit, text: 'Update Inventory', route: '/admin/inventory/update' }
                ]" :key="index">
                  <button 
                    @click="navigateTo(item.route)" 
                    class="w-full flex items-center p-2 pl-11 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <component :is="item.icon" class="w-4 h-4 mr-3" />
                    {{ item.text }}
                  </button>
                </li>
              </ul>
            </transition>
          </div>
        </nav>
      </div>
    </aside>

    <!-- Right-side Content -->
    <main class="flex-1 p-8 overflow-auto">
      <div class="max-w-10xl mx-auto">
        <!-- Add the Header component here -->
        <Header />
        <!-- Main content -->
        <div class="bg-white rounded-b-lg shadow-md p-6">
          <router-view />
        </div>
      </div>
    </main>  </div>
</template>

<style>
/* Add any global styles here if needed */
</style>