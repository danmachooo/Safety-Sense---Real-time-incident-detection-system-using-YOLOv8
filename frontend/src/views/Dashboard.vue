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
  Gauge,
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
    bgGradient: "from-red-500/10 via-red-500/5 to-transparent",
    iconGradient: "from-red-500 to-red-600",
    trend: "+12%",
    trendUp: true,
  },
  {
    title: "Active Incidents",
    value: dashboardData.value.data?.counts?.activeIncidents || 0,
    icon: Activity,
    color: "bg-orange-500",
    bgGradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    iconGradient: "from-orange-500 to-orange-600",
    trend: "+5%",
    trendUp: true,
  },
  {
    title: "Total Users",
    value: dashboardData.value.data?.counts?.totalUsers || 0,
    icon: Users,
    color: "bg-blue-500",
    bgGradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    iconGradient: "from-blue-500 to-blue-600",
    trend: "+8%",
    trendUp: true,
  },
  {
    title: "Active Deployments",
    value: dashboardData.value.data?.counts?.activeDeployments || 0,
    icon: Truck,
    color: "bg-green-500",
    bgGradient: "from-green-500/10 via-green-500/5 to-transparent",
    iconGradient: "from-green-500 to-green-600",
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
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-blue-50 text-blue-700 border-blue-200",
    ongoing: "bg-orange-50 text-orange-700 border-orange-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dismissed: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
};

const getIncidentTypeColor = (type) => {
  const colors = {
    fire: "bg-red-50 text-red-700 border-red-200",
    flood: "bg-blue-50 text-blue-700 border-blue-200",
    earthquake: "bg-orange-50 text-orange-700 border-orange-200",
    accident: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return colors[type] || "bg-gray-50 text-gray-700 border-gray-200";
};

onMounted(() => {
  fetchDashboardData();
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30"
  >
    <!-- Header -->
    <div
      class="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-10"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 py-8"
        >
          <!-- LEFT: Icon + Text -->
          <div class="flex items-center space-x-4">
            <div
              class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg"
            >
              <Gauge class="w-8 h-8 text-white" />
            </div>
            <div class="space-y-1">
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent"
              >
                Dashboard
              </h1>
              <p class="text-gray-600 text-base font-medium">
                Welcome back! Here's what's happening with SafetySense.
              </p>
            </div>
          </div>

          <!-- RIGHT: Select + Refresh -->
          <div class="flex items-center gap-4">
            <select
              v-model="selectedTimeframe"
              @change="fetchDashboardData"
              class="px-5 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm font-medium"
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
              class="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] font-medium"
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
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <!-- Error State -->
      <div
        v-if="error && !loading"
        class="relative overflow-hidden bg-gradient-to-r from-red-50 via-red-50/80 to-red-100/60 border border-red-200/80 rounded-3xl p-8 shadow-lg"
      >
        <div
          class="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent"
        ></div>
        <div class="relative flex items-start gap-4">
          <div class="flex-shrink-0">
            <div
              class="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <AlertOctagon class="w-6 h-6 text-white" />
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-red-900 mb-2">
              Unable to Load Dashboard
            </h3>
            <p class="text-red-700 mb-4 leading-relaxed">{{ error }}</p>
            <button
              @click="refreshData"
              class="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl hover:from-red-700 hover:to-red-800 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-10">
        <!-- Loading Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="i in 4"
            :key="i"
            class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-8"
          >
            <div class="animate-pulse">
              <div class="flex items-center justify-between">
                <div class="flex-1 space-y-4">
                  <div
                    class="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-3/4"
                  ></div>
                  <div
                    class="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-1/2"
                  ></div>
                  <div
                    class="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-2/3"
                  ></div>
                </div>
                <div
                  class="w-14 h-14 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading Content -->
        <div class="flex justify-center items-center h-80">
          <div class="text-center space-y-6">
            <div class="relative">
              <div
                class="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto"
              ></div>
            </div>
            <div class="space-y-2">
              <p class="text-gray-700 font-semibold text-lg">
                Loading dashboard data...
              </p>
              <p class="text-gray-500 text-sm">This may take a few moments</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div v-else-if="error" class="space-y-10">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="card in summaryCards"
            :key="card.title"
            class="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-8 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer"
          >
            <!-- Background Gradient -->
            <div
              :class="`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`"
            ></div>

            <div class="relative z-10">
              <div class="flex items-start justify-between mb-6">
                <div class="flex-1 space-y-3">
                  <p
                    class="text-sm font-semibold text-gray-600 uppercase tracking-wide"
                  >
                    {{ card.title }}
                  </p>
                  <p class="text-4xl font-bold text-gray-900 leading-none">
                    {{ card.value.toLocaleString() }}
                  </p>
                </div>
                <div
                  :class="`bg-gradient-to-r ${card.iconGradient} p-4 rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`"
                >
                  <component :is="card.icon" class="w-7 h-7 text-white" />
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <TrendingUp
                    v-if="card.trendUp"
                    class="w-4 h-4 text-emerald-500"
                  />
                  <TrendingDown v-else class="w-4 h-4 text-red-500" />
                  <span
                    :class="card.trendUp ? 'text-emerald-600' : 'text-red-600'"
                    class="text-sm font-bold"
                  >
                    {{ card.trend }}
                  </span>
                  <span class="text-gray-500 text-sm font-medium"
                    >vs last period</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts and Stats Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <!-- Incident Statistics -->
          <div
            class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-8">
              <div class="space-y-1">
                <h3 class="text-2xl font-bold text-gray-900">
                  Incident Statistics
                </h3>
                <p class="text-gray-600 text-sm font-medium">
                  Real-time breakdown and analysis
                </p>
              </div>
              <div
                class="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-lg"
              >
                <BarChart3 class="w-6 h-6 text-white" />
              </div>
            </div>

            <div v-if="hasIncidentStats" class="space-y-8">
              <!-- Incidents by Status -->
              <div
                class="space-y-4"
                v-if="incidentStats.data?.incidentsByStatus?.length"
              >
                <h4
                  class="text-sm font-bold text-gray-700 uppercase tracking-wide"
                >
                  By Status
                </h4>
                <div class="space-y-3">
                  <div
                    v-for="item in incidentStats.data.incidentsByStatus"
                    :key="item.status"
                    class="group flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50/80 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200/60"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                        :class="getStatusColor(item.status).split(' ')[0]"
                      >
                        <Clock
                          v-if="item.status === 'pending'"
                          class="w-4 h-4"
                          :class="getStatusColor(item.status).split(' ')[1]"
                        />
                        <Activity
                          v-else-if="item.status === 'ongoing'"
                          class="w-4 h-4"
                          :class="getStatusColor(item.status).split(' ')[1]"
                        />
                        <CheckCircle
                          v-else-if="item.status === 'resolved'"
                          class="w-4 h-4"
                          :class="getStatusColor(item.status).split(' ')[1]"
                        />
                        <Eye
                          v-else-if="item.status === 'accepted'"
                          class="w-4 h-4"
                          :class="getStatusColor(item.status).split(' ')[1]"
                        />
                        <XCircle
                          v-else
                          class="w-4 h-4"
                          :class="getStatusColor(item.status).split(' ')[1]"
                        />
                      </div>
                      <span
                        class="text-sm font-semibold text-gray-700 capitalize"
                        >{{ item.status }}</span
                      >
                    </div>
                    <span
                      class="text-lg font-bold text-gray-900 group-hover:scale-110 transition-transform duration-200"
                      >{{ item.count }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Incidents by Type -->
              <div
                class="space-y-4 pt-6 border-t border-gray-200/60"
                v-if="incidentStats.data?.incidentsByType?.length"
              >
                <h4
                  class="text-sm font-bold text-gray-700 uppercase tracking-wide"
                >
                  By Type
                </h4>
                <div class="space-y-3">
                  <div
                    v-for="item in incidentStats.data.incidentsByType"
                    :key="item.type"
                    class="group flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50/80 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200/60"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                        :class="getIncidentTypeColor(item.type).split(' ')[0]"
                      >
                        <AlertTriangle
                          v-if="item.type === 'fire'"
                          class="w-4 h-4"
                          :class="getIncidentTypeColor(item.type).split(' ')[1]"
                        />
                        <Activity
                          v-else-if="item.type === 'flood'"
                          class="w-4 h-4"
                          :class="getIncidentTypeColor(item.type).split(' ')[1]"
                        />
                        <AlertCircle
                          v-else-if="item.type === 'earthquake'"
                          class="w-4 h-4"
                          :class="getIncidentTypeColor(item.type).split(' ')[1]"
                        />
                        <Truck
                          v-else-if="item.type === 'accident'"
                          class="w-4 h-4"
                          :class="getIncidentTypeColor(item.type).split(' ')[1]"
                        />
                        <AlertTriangle
                          v-else
                          class="w-4 h-4"
                          :class="getIncidentTypeColor(item.type).split(' ')[1]"
                        />
                      </div>
                      <span
                        class="text-sm font-semibold text-gray-700 capitalize"
                        >{{ item.type }}</span
                      >
                    </div>
                    <span
                      class="text-lg font-bold text-gray-900 group-hover:scale-110 transition-transform duration-200"
                      >{{ item.count }}</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State for Incident Stats -->
            <div v-else class="text-center py-16">
              <div
                class="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6"
              >
                <BarChart3 class="w-10 h-10 text-gray-400" />
              </div>
              <h4 class="text-xl font-bold text-gray-500 mb-3">
                No Incident Data
              </h4>
              <p class="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                No incident statistics available for the selected timeframe.
              </p>
            </div>
          </div>

          <!-- User Activity Stats -->
          <div
            class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-8">
              <div class="space-y-1">
                <h3 class="text-2xl font-bold text-gray-900">User Activity</h3>
                <p class="text-gray-600 text-sm font-medium">
                  Team performance metrics
                </p>
              </div>
              <div
                class="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg"
              >
                <Users class="w-6 h-6 text-white" />
              </div>
            </div>

            <div class="space-y-8">
              <!-- Key Metrics -->
              <div class="grid grid-cols-2 gap-6">
                <div
                  class="group text-center p-6 bg-gradient-to-br from-blue-50/80 to-blue-100/60 rounded-2xl hover:from-blue-100/80 hover:to-blue-200/60 transition-all duration-300 border border-blue-200/40 cursor-pointer"
                >
                  <div
                    class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg"
                  >
                    <Activity class="w-6 h-6 text-white" />
                  </div>
                  <p class="text-3xl font-bold text-blue-600 mb-2">
                    {{ userActivityStats.data?.acceptanceRate || 0 }}%
                  </p>
                  <p
                    class="text-xs font-semibold text-blue-700 uppercase tracking-wide"
                  >
                    Acceptance Rate
                  </p>
                </div>
                <div
                  class="group text-center p-6 bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 rounded-2xl hover:from-emerald-100/80 hover:to-emerald-200/60 transition-all duration-300 border border-emerald-200/40 cursor-pointer"
                >
                  <div
                    class="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg"
                  >
                    <Clock class="w-6 h-6 text-white" />
                  </div>
                  <p class="text-3xl font-bold text-emerald-600 mb-2">
                    {{ userActivityStats.data?.avgResponseTime || 0 }}m
                  </p>
                  <p
                    class="text-xs font-semibold text-emerald-700 uppercase tracking-wide"
                  >
                    Avg Response
                  </p>
                </div>
              </div>

              <!-- Top Responders -->
              <div>
                <h4
                  class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4"
                >
                  Top Responders
                </h4>
                <div v-if="hasTopResponders" class="space-y-3">
                  <div
                    v-for="(
                      responder, index
                    ) in userActivityStats.data.topResponders.slice(0, 3)"
                    :key="responder.id"
                    class="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/80 to-gray-100/60 rounded-2xl hover:from-gray-100/80 hover:to-gray-200/60 transition-all duration-300 border border-gray-200/40 cursor-pointer"
                  >
                    <div class="flex items-center gap-4">
                      <div class="relative">
                        <div
                          class="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
                        >
                          <span class="text-sm font-bold text-white">{{
                            index + 1
                          }}</span>
                        </div>
                        <div
                          v-if="index === 0"
                          class="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <span class="text-xs">👑</span>
                        </div>
                      </div>
                      <span class="text-sm font-bold text-gray-900">{{
                        responder.name
                      }}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-sm font-bold text-gray-600">{{
                        responder.acceptedCount
                      }}</span>
                      <p class="text-xs text-gray-500 font-medium">incidents</p>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-12">
                  <div
                    class="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4"
                  >
                    <Users class="w-8 h-8 text-gray-400" />
                  </div>
                  <p class="text-sm text-gray-500 font-medium">
                    No responder data available
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity and Alerts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Recent Incidents -->
          <div
            class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-8">
              <div class="space-y-1">
                <h3 class="text-xl font-bold text-gray-900">
                  Recent Incidents
                </h3>
                <p class="text-gray-600 text-sm font-medium">
                  Latest emergency reports
                </p>
              </div>
              <div
                class="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-lg"
              >
                <AlertTriangle class="w-5 h-5 text-white" />
              </div>
            </div>

            <div v-if="hasRecentIncidents" class="space-y-4">
              <div
                v-for="incident in dashboardData.data.recentIncidents.slice(
                  0,
                  5
                )"
                :key="incident.id"
                class="group flex items-start gap-4 p-4 bg-gray-50/80 rounded-2xl hover:bg-gray-100/80 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200/60"
              >
                <div class="flex-shrink-0">
                  <div
                    class="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  >
                    <AlertTriangle class="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div class="flex-1 min-w-0 space-y-2">
                  <p class="text-sm font-bold text-gray-900 capitalize">
                    {{ incident.type }} Incident
                  </p>
                  <p class="text-xs text-gray-500 font-medium">
                    {{ formatDate(incident.createdAt) }}
                  </p>
                  <span
                    :class="getStatusColor(incident.status)"
                    class="inline-flex px-3 py-1 text-xs font-semibold rounded-xl border"
                  >
                    {{ incident.status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Empty State for Recent Incidents -->
            <div v-else class="text-center py-16">
              <div
                class="w-20 h-20 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-6"
              >
                <Inbox class="w-10 h-10 text-emerald-500" />
              </div>
              <h4 class="text-xl font-bold text-gray-500 mb-3">
                No Recent Incidents
              </h4>
              <p class="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                All clear! No recent incidents to display.
              </p>
            </div>
          </div>

          <!-- Low Stock Alerts -->
          <div
            class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-8">
              <div class="space-y-1">
                <h3 class="text-xl font-bold text-gray-900">
                  Low Stock Alerts
                </h3>
                <p class="text-gray-600 text-sm font-medium">
                  Items requiring attention
                </p>
              </div>
              <div
                class="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg"
              >
                <Package class="w-5 h-5 text-white" />
              </div>
            </div>

            <div v-if="hasLowStockItems" class="space-y-4">
              <div
                v-for="item in dashboardData.data.lowStockItems.slice(0, 5)"
                :key="item.id"
                class="group flex items-center justify-between p-4 bg-gradient-to-r from-red-50/80 to-red-100/60 rounded-2xl border border-red-200/60 hover:from-red-100/80 hover:to-red-200/60 transition-all duration-300 cursor-pointer"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg"
                  >
                    <AlertCircle class="w-6 h-6 text-red" />
                  </div>
                  <div class="space-y-1">
                    <p class="text-sm font-bold text-gray-900">
                      {{ item.name }}
                    </p>
                    <p class="text-xs text-gray-600 font-medium">
                      {{ item.category?.name }}
                    </p>
                  </div>
                </div>
                <div class="text-right space-y-1">
                  <p class="text-sm font-bold text-red-600">
                    {{ item.quantity_in_stock }}
                  </p>
                  <p class="text-xs text-gray-500 font-medium">
                    Min: {{ item.min_stock_level }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Empty State for Low Stock -->
            <div v-else class="text-center py-16">
              <div
                class="w-20 h-20 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle class="w-10 h-10 text-emerald-500" />
              </div>
              <h4 class="text-xl font-bold text-gray-500 mb-3">
                Stock Levels Good
              </h4>
              <p class="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                All inventory items are adequately stocked.
              </p>
            </div>
          </div>

          <!-- Recent Deployments -->
          <div
            class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-8">
              <div class="space-y-1">
                <h3 class="text-xl font-bold text-gray-900">
                  Recent Deployments
                </h3>
                <p class="text-gray-600 text-sm font-medium">
                  Recent equipment activity
                </p>
              </div>
              <div
                class="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg"
              >
                <Truck class="w-5 h-5 text-white" />
              </div>
            </div>

            <div v-if="hasRecentDeployments" class="space-y-4">
              <div
                v-for="deployment in dashboardData.data.recentDeployments.slice(
                  0,
                  5
                )"
                :key="deployment.id"
                class="group flex items-start gap-4 p-4 bg-gray-50/80 rounded-2xl hover:bg-gray-100/80 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200/60"
              >
                <div class="flex-shrink-0">
                  <div
                    class="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  >
                    <Truck class="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div class="flex-1 min-w-0 space-y-2">
                  <p class="text-sm font-bold text-gray-900">
                    {{ deployment.inventoryDeploymentItem?.name }}
                  </p>
                  <p class="text-xs text-gray-600 font-medium">
                    {{ deployment.deployer?.firstname }}
                    {{ deployment.deployer?.lastname }}
                  </p>
                  <p class="text-xs text-gray-500 font-medium">
                    {{ formatDate(deployment.deployment_date) }}
                  </p>
                  <span
                    class="inline-flex px-3 py-1 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {{ deployment.status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Empty State for Recent Deployments -->
            <div v-else class="text-center py-16">
              <div
                class="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6"
              >
                <Database class="w-10 h-10 text-gray-400" />
              </div>
              <h4 class="text-xl font-bold text-gray-500 mb-3">
                No Recent Deployments
              </h4>
              <p class="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                No equipment deployments in the selected timeframe.
              </p>
            </div>
          </div>
        </div>

        <!-- Inventory Overview -->
        <div
          class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/60 p-10 hover:shadow-xl transition-all duration-300"
        >
          <div class="flex items-center justify-between mb-10">
            <div class="space-y-2">
              <h3 class="text-3xl font-bold text-gray-900">
                Inventory Overview
              </h3>
              <p class="text-gray-600 text-base font-medium">
                Complete equipment and supply status
              </p>
            </div>
            <div
              class="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg"
            >
              <PieChart class="w-7 h-7 text-white" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div
              class="group text-center p-8 bg-gradient-to-br from-blue-50/80 to-blue-100/60 rounded-3xl hover:from-blue-100/80 hover:to-blue-200/60 transition-all duration-300 border border-blue-200/40 cursor-pointer"
            >
              <div
                class="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg"
              >
                <Package class="w-8 h-8 text-white" />
              </div>
              <p class="text-4xl font-bold text-blue-600 mb-3">
                {{ inventoryStats.data?.totalItems || 0 }}
              </p>
              <p
                class="text-sm font-bold text-blue-700 uppercase tracking-wide"
              >
                Total Items
              </p>
            </div>
            <div
              class="group text-center p-8 bg-gradient-to-br from-red-50/80 to-red-100/60 rounded-3xl hover:from-red-100/80 hover:to-red-200/60 transition-all duration-300 border border-red-200/40 cursor-pointer"
            >
              <div
                class="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg"
              >
                <AlertTriangle class="w-8 h-8 text-white" />
              </div>
              <p class="text-4xl font-bold text-red-600 mb-3">
                {{ inventoryStats.data?.lowStockItems || 0 }}
              </p>
              <p class="text-sm font-bold text-red-700 uppercase tracking-wide">
                Low Stock
              </p>
            </div>
            <div
              class="group text-center p-8 bg-gradient-to-br from-amber-50/80 to-amber-100/60 rounded-3xl hover:from-amber-100/80 hover:to-amber-200/60 transition-all duration-300 border border-amber-200/40 cursor-pointer"
            >
              <div
                class="w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg"
              >
                <Clock class="w-8 h-8 text-white" />
              </div>
              <p class="text-4xl font-bold text-amber-600 mb-3">
                {{ inventoryStats.data?.maintenanceItems || 0 }}
              </p>
              <p
                class="text-sm font-bold text-amber-700 uppercase tracking-wide"
              >
                Need Maintenance
              </p>
            </div>
            <div
              class="group text-center p-8 bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 rounded-3xl hover:from-emerald-100/80 hover:to-emerald-200/60 transition-all duration-300 border border-emerald-200/40 cursor-pointer"
            >
              <div
                class="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg"
              >
                <CheckCircle class="w-8 h-8 text-white" />
              </div>
              <p class="text-4xl font-bold text-emerald-600 mb-3">
                ₱{{
                  Number(inventoryStats.data?.totalValue || 0).toLocaleString(
                    "en-PH",
                    { minimumFractionDigits: 2 }
                  )
                }}
              </p>

              <p
                class="text-sm font-bold text-emerald-700 uppercase tracking-wide"
              >
                Total Value
              </p>
            </div>
          </div>

          <!-- Items by Category -->
          <div>
            <h4 class="text-xl font-bold text-gray-900 mb-8">
              Items by Category
            </h4>

            <div
              v-if="hasInventoryCategories"
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <div
                v-for="category in inventoryStats.data.itemsByCategory"
                :key="category.categoryName"
                class="group flex items-center justify-between p-6 bg-gradient-to-r from-gray-50/80 to-gray-100/60 rounded-3xl hover:from-gray-100/80 hover:to-gray-200/60 transition-all duration-300 border border-gray-200/40 cursor-pointer"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg"
                  >
                    <Package class="w-7 h-7 text-white" />
                  </div>
                  <div class="space-y-1">
                    <p class="text-sm font-bold text-gray-900">
                      {{ category.categoryName }}
                    </p>
                    <p class="text-xs text-gray-600 font-medium">
                      {{ category.itemCount }} items
                    </p>
                  </div>
                </div>
                <p
                  class="text-xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-200"
                >
                  {{ category.totalQuantity }}
                </p>
              </div>
            </div>

            <div v-else class="text-center py-20">
              <div
                class="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <Package class="w-12 h-12 text-gray-400" />
              </div>
              <h4 class="text-2xl font-bold text-gray-500 mb-4">
                No Categories
              </h4>
              <p
                class="text-gray-400 text-base max-w-md mx-auto leading-relaxed"
              >
                No inventory categories available to display.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Enhanced scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, #94a3b8, #64748b);
}

/* Smooth animations */
* {
  transition-property: transform, opacity, background-color, border-color, color,
    fill, stroke, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced glass morphism */
.backdrop-blur-sm {
  backdrop-filter: blur(12px);
}

.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}

/* Custom gradient animations */
@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}
</style>
