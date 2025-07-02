<script setup>
import { ref, onMounted, computed } from "vue";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Package,
  Truck,
  Activity,
  Clock,
  MapPin,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
  Inbox,
  Database,
  WifiOff,
  AlertOctagon,
} from "lucide-vue-next";
import api from "../utils/axios";
// Reactive data
const loading = ref(true);
const error = ref(null);
const dashboardData = ref({});
const incidentStats = ref({});
const inventoryStats = ref({});
const deploymentStats = ref({});
const userActivityStats = ref({});
const activityFeed = ref([]);
const selectedTimeframe = ref("30days");

// Computed properties
const summaryCards = computed(() => [
  {
    title: "Total Incidents",
    value: dashboardData.value.data?.counts?.totalIncidents || 0,
    icon: AlertTriangle,
    color: "bg-red-500",
    trend: "+12%",
    trendUp: true,
  },
  {
    title: "Active Incidents",
    value: dashboardData.value.data?.counts?.activeIncidents || 0,
    icon: Activity,
    color: "bg-orange-500",
    trend: "+5%",
    trendUp: true,
  },
  {
    title: "Total Users",
    value: dashboardData.value.data?.counts?.totalUsers || 0,
    icon: Users,
    color: "bg-blue-500",
    trend: "+8%",
    trendUp: true,
  },
  {
    title: "Active Deployments",
    value: dashboardData.value.data?.counts?.activeDeployments || 0,
    icon: Truck,
    color: "bg-green-500",
    trend: "+15%",
    trendUp: true,
  },
]);

const timeframeOptions = [
  { value: "week", label: "Last Week" },
  { value: "month", label: "Last Month" },
  { value: "30days", label: "Last 30 Days" },
  { value: "year", label: "Last Year" },
];

// Helper computed properties for empty states
const hasRecentIncidents = computed(
  () => dashboardData.value.data?.recentIncidents?.length > 0
);

const hasLowStockItems = computed(
  () => dashboardData.value.data?.lowStockItems?.length > 0
);

const hasRecentDeployments = computed(
  () => dashboardData.value.data?.recentDeployments?.length > 0
);

const hasIncidentStats = computed(
  () =>
    incidentStats.value.data?.incidentsByStatus?.length > 0 ||
    incidentStats.value.data?.incidentsByType?.length > 0
);

const hasTopResponders = computed(
  () => userActivityStats.value.data?.topResponders?.length > 0
);

const hasInventoryCategories = computed(
  () => inventoryStats.value.data?.itemsByCategory?.length > 0
);

// Methods
const fetchDashboardData = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Fetch all dashboard data
    const [
      summaryResponse,
      incidentResponse,
      inventoryResponse,
      deploymentResponse,
      userActivityResponse,
      activityResponse,
    ] = await Promise.all([
      api.get("/dashboard/summary"),
      api.get(`/dashboard/incidents?timeframe=${selectedTimeframe.value}`),
      api.get("/dashboard/inventory"),
      api.get(`/dashboard/deployments?timeframe=${selectedTimeframe.value}`),
      api.get(`/dashboard/users?timeframe=${selectedTimeframe.value}`),
      api.get("/dashboard/activity?limit=10"),
    ]);

    dashboardData.value = summaryResponse.data;
    incidentStats.value = incidentResponse.data;
    inventoryStats.value = inventoryResponse.data;
    deploymentStats.value = deploymentResponse.data;
    userActivityStats.value = userActivityResponse.data;
    activityFeed.value = activityResponse.data;
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    error.value =
      err.response?.data?.message ||
      "Failed to load dashboard data. Please try again.";
  } finally {
    loading.value = false;
  }
};

const refreshData = () => {
  fetchDashboardData();
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    ongoing: "bg-orange-100 text-orange-800",
    resolved: "bg-green-100 text-green-800",
    dismissed: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getIncidentTypeColor = (type) => {
  const colors = {
    fire: "bg-red-100 text-red-800",
    flood: "bg-blue-100 text-blue-800",
    earthquake: "bg-orange-100 text-orange-800",
    accident: "bg-purple-100 text-purple-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
};

onMounted(() => {
  fetchDashboardData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-gray-600 mt-1">
          Welcome back! Here's what's happening with SafetySense.
        </p>
      </div>
      <div class="flex items-center space-x-4">
        <select
          v-model="selectedTimeframe"
          @change="fetchDashboardData"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          :disabled="loading"
        >
          <option
            v-for="option in timeframeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <button
          @click="refreshData"
          class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
        >
          <RefreshCw
            class="w-4 h-4 mr-2"
            :class="{ 'animate-spin': loading }"
          />
          Refresh
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-if="error && !loading"
      class="bg-red-50 border border-red-200 rounded-lg p-6"
    >
      <div class="flex items-center">
        <AlertOctagon class="w-6 h-6 text-red-500 mr-3" />
        <div>
          <h3 class="text-lg font-medium text-red-800">
            Unable to Load Dashboard
          </h3>
          <p class="text-red-600 mt-1">{{ error }}</p>
          <button
            @click="refreshData"
            class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-6">
      <!-- Loading Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div class="animate-pulse">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div class="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Content -->
      <div class="flex justify-center items-center h-64">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
          ></div>
          <p class="text-gray-500 mt-4">Loading dashboard data...</p>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="!error" class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="card in summaryCards"
          :key="card.title"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:scale-105"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{{ card.title }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">
                {{ card.value.toLocaleString() }}
              </p>
              <div class="flex items-center mt-2">
                <TrendingUp
                  v-if="card.trendUp"
                  class="w-4 h-4 text-green-500 mr-1"
                />
                <TrendingDown v-else class="w-4 h-4 text-red-500 mr-1" />
                <span
                  :class="card.trendUp ? 'text-green-600' : 'text-red-600'"
                  class="text-sm font-medium"
                >
                  {{ card.trend }}
                </span>
                <span class="text-gray-500 text-sm ml-1">vs last period</span>
              </div>
            </div>
            <div :class="card.color" class="p-3 rounded-lg">
              <component :is="card.icon" class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Charts and Stats Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Incident Statistics -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">
              Incident Statistics
            </h3>
            <BarChart3 class="w-5 h-5 text-gray-400" />
          </div>

          <div v-if="hasIncidentStats">
            <!-- Incidents by Status -->
            <div
              class="space-y-4"
              v-if="incidentStats.data?.incidentsByStatus?.length"
            >
              <h4 class="text-sm font-medium text-gray-700">By Status</h4>
              <div class="space-y-2">
                <div
                  v-for="item in incidentStats.data.incidentsByStatus"
                  :key="item.status"
                  class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-center">
                    <div
                      class="w-3 h-3 rounded-full mr-3"
                      :class="getStatusColor(item.status).split(' ')[0]"
                    ></div>
                    <span class="text-sm text-gray-600 capitalize">{{
                      item.status
                    }}</span>
                  </div>
                  <span class="text-sm font-medium text-gray-900">{{
                    item.count
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Incidents by Type -->
            <div
              class="mt-6 space-y-4"
              v-if="incidentStats.data?.incidentsByType?.length"
            >
              <h4 class="text-sm font-medium text-gray-700">By Type</h4>
              <div class="space-y-2">
                <div
                  v-for="item in incidentStats.data.incidentsByType"
                  :key="item.type"
                  class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-center">
                    <div
                      class="w-3 h-3 rounded-full mr-3"
                      :class="getIncidentTypeColor(item.type).split(' ')[0]"
                    ></div>
                    <span class="text-sm text-gray-600 capitalize">{{
                      item.type
                    }}</span>
                  </div>
                  <span class="text-sm font-medium text-gray-900">{{
                    item.count
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State for Incident Stats -->
          <div v-else class="text-center py-8">
            <BarChart3 class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 class="text-lg font-medium text-gray-500 mb-2">
              No Incident Data
            </h4>
            <p class="text-gray-400 text-sm">
              No incident statistics available for the selected timeframe.
            </p>
          </div>
        </div>

        <!-- User Activity Stats -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">User Activity</h3>
            <Users class="w-5 h-5 text-gray-400" />
          </div>

          <div class="space-y-6">
            <!-- Key Metrics -->
            <div class="grid grid-cols-2 gap-4">
              <div
                class="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <p class="text-2xl font-bold text-blue-600">
                  {{ userActivityStats.data?.acceptanceRate || 0 }}%
                </p>
                <p class="text-sm text-gray-600">Acceptance Rate</p>
              </div>
              <div
                class="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <p class="text-2xl font-bold text-green-600">
                  {{ userActivityStats.data?.avgResponseTime || 0 }}m
                </p>
                <p class="text-sm text-gray-600">Avg Response</p>
              </div>
            </div>

            <!-- Top Responders -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">
                Top Responders
              </h4>
              <div v-if="hasTopResponders" class="space-y-2">
                <div
                  v-for="(
                    responder, index
                  ) in userActivityStats.data.topResponders.slice(0, 3)"
                  :key="responder.id"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div class="flex items-center">
                    <div
                      class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3"
                    >
                      <span class="text-sm font-medium text-blue-600">{{
                        index + 1
                      }}</span>
                    </div>
                    <span class="text-sm text-gray-900">{{
                      responder.name
                    }}</span>
                  </div>
                  <span class="text-sm font-medium text-gray-600"
                    >{{ responder.acceptedCount }} incidents</span
                  >
                </div>
              </div>
              <div v-else class="text-center py-4">
                <Users class="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p class="text-sm text-gray-500">No responder data available</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity and Alerts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Incidents -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">
              Recent Incidents
            </h3>
            <AlertTriangle class="w-5 h-5 text-gray-400" />
          </div>

          <div v-if="hasRecentIncidents" class="space-y-3">
            <div
              v-for="incident in dashboardData.data.recentIncidents.slice(0, 5)"
              :key="incident.id"
              class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div class="flex-shrink-0">
                <AlertTriangle class="w-5 h-5 text-orange-500 mt-0.5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 capitalize">
                  {{ incident.type }} Incident
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ formatDate(incident.createdAt) }}
                </p>
                <div class="mt-2">
                  <span
                    :class="getStatusColor(incident.status)"
                    class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ incident.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State for Recent Incidents -->
          <div v-else class="text-center py-8">
            <Inbox class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 class="text-lg font-medium text-gray-500 mb-2">
              No Recent Incidents
            </h4>
            <p class="text-gray-400 text-sm">
              All clear! No recent incidents to display.
            </p>
          </div>
        </div>

        <!-- Low Stock Alerts -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">
              Low Stock Alerts
            </h3>
            <Package class="w-5 h-5 text-gray-400" />
          </div>

          <div v-if="hasLowStockItems" class="space-y-3">
            <div
              v-for="item in dashboardData.data.lowStockItems.slice(0, 5)"
              :key="item.id"
              class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              <div class="flex items-center">
                <AlertCircle class="w-5 h-5 text-red-500 mr-3" />
                <div>
                  <p class="text-sm font-medium text-gray-900">
                    {{ item.name }}
                  </p>
                  <p class="text-xs text-gray-500">{{ item.category?.name }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-red-600">
                  {{ item.quantity_in_stock }}
                </p>
                <p class="text-xs text-gray-500">
                  Min: {{ item.min_stock_level }}
                </p>
              </div>
            </div>
          </div>

          <!-- Empty State for Low Stock -->
          <div v-else class="text-center py-8">
            <CheckCircle class="w-12 h-12 text-green-300 mx-auto mb-4" />
            <h4 class="text-lg font-medium text-gray-500 mb-2">
              Stock Levels Good
            </h4>
            <p class="text-gray-400 text-sm">
              All inventory items are adequately stocked.
            </p>
          </div>
        </div>

        <!-- Recent Deployments -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">
              Recent Deployments
            </h3>
            <Truck class="w-5 h-5 text-gray-400" />
          </div>

          <div v-if="hasRecentDeployments" class="space-y-3">
            <div
              v-for="deployment in dashboardData.data.recentDeployments.slice(
                0,
                5
              )"
              :key="deployment.id"
              class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div class="flex-shrink-0">
                <Truck class="w-5 h-5 text-green-500 mt-0.5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">
                  {{ deployment.inventoryDeploymentItem?.name }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ deployment.deployer?.firstname }}
                  {{ deployment.deployer?.lastname }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatDate(deployment.deployment_date) }}
                </p>
                <div class="mt-2">
                  <span
                    class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
                  >
                    {{ deployment.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State for Recent Deployments -->
          <div v-else class="text-center py-8">
            <Database class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 class="text-lg font-medium text-gray-500 mb-2">
              No Recent Deployments
            </h4>
            <p class="text-gray-400 text-sm">
              No equipment deployments in the selected timeframe.
            </p>
          </div>
        </div>
      </div>

      <!-- Inventory Overview -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">
            Inventory Overview
          </h3>
          <PieChart class="w-5 h-5 text-gray-400" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div
            class="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Package class="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p class="text-2xl font-bold text-blue-600">
              {{ inventoryStats.data?.totalItems || 0 }}
            </p>
            <p class="text-sm text-gray-600">Total Items</p>
          </div>
          <div
            class="text-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <AlertTriangle class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p class="text-2xl font-bold text-red-600">
              {{ inventoryStats.data?.lowStockItems || 0 }}
            </p>
            <p class="text-sm text-gray-600">Low Stock</p>
          </div>
          <div
            class="text-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <Clock class="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p class="text-2xl font-bold text-yellow-600">
              {{ inventoryStats.data?.maintenanceItems || 0 }}
            </p>
            <p class="text-sm text-gray-600">Need Maintenance</p>
          </div>
          <div
            class="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <CheckCircle class="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p class="text-2xl font-bold text-green-600">
              ${{ (inventoryStats.data?.totalValue || 0).toLocaleString() }}
            </p>
            <p class="text-sm text-gray-600">Total Value</p>
          </div>
        </div>

        <!-- Items by Category -->
        <div class="mt-8">
          <h4 class="text-sm font-medium text-gray-700 mb-4">
            Items by Category
          </h4>
          <div
            v-if="hasInventoryCategories"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div
              v-for="category in inventoryStats.data.itemsByCategory"
              :key="category.categoryName"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p class="text-sm font-medium text-gray-900">
                  {{ category.categoryName }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ category.itemCount }} items
                </p>
              </div>
              <p class="text-sm font-medium text-gray-600">
                {{ category.totalQuantity }}
              </p>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <Package class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 class="text-lg font-medium text-gray-500 mb-2">
              No Categories
            </h4>
            <p class="text-gray-400 text-sm">
              No inventory categories available to display.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
