<script setup>
import { ref, computed, watch, onMounted } from "vue";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  Check,
  AlertTriangle,
  Truck,
  MapPin,
  Calendar,
  Package,
  Clock,
  CheckCircle2,
  Ban,
  User,
  Users,
  FileText,
  ArrowLeft,
} from "lucide-vue-next";
import api from "../../../utils/axios";

// Reactive state
const deployments = ref([]);
const loading = ref(false);
const error = ref(null);
const currentPage = ref(1);
const totalPages = ref(1);
const totalDeployments = ref(0);
const itemsPerPage = ref(10);
const searchQuery = ref("");
const statusFilter = ref("");
const showModal = ref(false);
const currentDeployment = ref(null);
const deploymentLoading = ref(false);
const isUpdating = ref(false);
const notification = ref({ show: false, type: "", message: "" });
const pendingChanges = ref([]);
const deploymentNotes = ref("");
const newNote = ref("");
const showNotesHistory = ref(false);
const notesHistory = ref([]);
const showBorrowersModal = ref(false);

// Borrowers data structure aligned with API response
const borrowersData = ref({
  items: [],
  summary: {
    totalItems: 0,
    currentlyDeployed: 0,
    lost: 0,
    damaged: 0,
    totalUniqueBorrowers: 0,
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});
const goToPage = async (page) => {
  if (page < 1 || page > totalPages.value) return; // prevent invalid pages
  currentPage.value = page;
  await fetchDeployments(); // refetch deployments for the new page
};

// Borrowers filter
const borrowersFilter = ref({
  search: "",
  condition: "",
  sortBy: "itemName",
});

// Borrowers modal pagination (client-side)
const borrowersCurrentPage = ref(1);
const borrowersItemsPerPage = ref(10); // Adjustable; 20 items per page for better UX in modal

// Non-returnable items
const nonReturnableItems = [
  "alcohol",
  "gloves",
  "masks",
  "sanitizer",
  "wipes",
  "disposable",
  "single-use",
  "consumable",
  "bandages",
  "gauze",
  "tape",
  "syringe",
  "needle",
  "swab",
  "cotton",
  "tissue",
  "paper",
  "plastic",
];

// Utility functions
const calculateDaysBorrowed = (deploymentDate) => {
  if (!deploymentDate) return 0;
  const today = new Date();
  const deployDate = new Date(deploymentDate);
  return Math.ceil((today - deployDate) / (1000 * 60 * 60 * 24));
};

const getConditionColor = (condition) => {
  switch (condition?.toUpperCase()) {
    case "GOOD":
      return "bg-emerald-100 text-emerald-800";
    case "LOST":
      return "bg-amber-100 text-amber-800";
    case "DAMAGED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Computed properties
const filteredBorrowersData = computed(() => {
  if (!borrowersData.value.items) return [];

  return borrowersData.value.items
    .map((item) => {
      const currentBorrower = item.currentBorrower
        ? {
            ...item.currentBorrower,
            daysBorrowed: calculateDaysBorrowed(
              item.currentBorrower.deploymentDate
            ),
            // Suggestion: Add overdue flag based on current date (September 06, 2025).
            isOverdue:
              item.currentBorrower.expectedReturnDate &&
              new Date(item.currentBorrower.expectedReturnDate) <
                new Date("2025-09-06T00:00:00.000Z"), // Compare to current date.
          }
        : null;

      return {
        ...item,
        currentBorrower,
        totalBorrowers: item.totalBorrowers || [],
      };
    })
    .filter((item) => {
      const search = borrowersFilter.value.search.toLowerCase();
      return (
        item.itemName.toLowerCase().includes(search) ||
        item.serialNumber?.toLowerCase().includes(search) ||
        item.currentBorrower?.name.toLowerCase().includes(search) ||
        (item.totalBorrowers || []).some((b) =>
          b.email?.toLowerCase().includes(search)
        )
      );
    })
    .filter((item) => {
      if (!borrowersFilter.value.condition) return true;
      return (
        item.newCondition?.toLowerCase() ===
        borrowersFilter.value.condition?.toLowerCase()
      );
    })
    .sort((a, b) => {
      switch (borrowersFilter.value.sortBy) {
        case "itemName":
          return (a.itemName || "").localeCompare(b.itemName || "");
        case "borrowerName":
          return (a.currentBorrower?.name || "").localeCompare(
            b.currentBorrower?.name || ""
          );
        case "daysBorrowed":
          return (
            (a.currentBorrower?.daysBorrowed || 0) -
            (b.currentBorrower?.daysBorrowed || 0)
          );
        case "totalBorrowers":
          return (
            (b.totalBorrowers?.length || 0) - (a.totalBorrowers?.length || 0)
          );
        default:
          return 0;
      }
    });
});

const paginatedBorrowersData = computed(() => {
  const start = (borrowersCurrentPage.value - 1) * borrowersItemsPerPage.value;
  const end = start + borrowersItemsPerPage.value;
  return filteredBorrowersData.value.slice(start, end);
});

const totalBorrowersPages = computed(() =>
  Math.ceil(filteredBorrowersData.value.length / borrowersItemsPerPage.value)
);

const visibleBorrowersPages = computed(() => {
  const range = 2;
  let start = Math.max(1, borrowersCurrentPage.value - range);
  let end = Math.min(
    totalBorrowersPages.value,
    borrowersCurrentPage.value + range
  );
  if (end - start < range * 2) {
    start = Math.max(1, end - range * 2);
    end = Math.min(totalBorrowersPages.value, start + range * 2);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

const filteredItemsCount = computed(() => filteredBorrowersData.value.length);

const isDataReady = computed(
  () => !loading.value && borrowersData.value?.items?.length > 0
);

// Modal functions
const openBorrowersReport = () => {
  showBorrowersModal.value = true;
  fetchBorrowersData();
};

const closeBorrowersReport = () => {
  showBorrowersModal.value = false;
  borrowersFilter.value = { search: "", condition: "", sortBy: "itemName" };
  borrowersCurrentPage.value = 1;
};

// Pagination handlers for borrowers modal
const prevBorrowersPage = () => {
  if (borrowersCurrentPage.value > 1) {
    borrowersCurrentPage.value--;
  }
};

const nextBorrowersPage = () => {
  if (borrowersCurrentPage.value < totalBorrowersPages.value) {
    borrowersCurrentPage.value++;
  }
};

// API functions
const fetchBorrowersData = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await api.get("inventory/deployment/history");

    if (response.data.success) {
      const rawItems = response.data.data.items || [];

      borrowersData.value = {
        items: rawItems.map((item) => {
          // Always sort borrowingHistory DESC just to be safe
          const sortedHistory = [...(item.borrowingHistory || [])].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );

          const latestHistory = sortedHistory[0];
          const currentCondition = latestHistory?.newCondition || "GOOD";

          return {
            id: item.id,
            itemName: item.itemName || "Unknown Item",
            serialNumber: item.serialNumber || null,
            itemDescription: item.itemDescription || "",
            newCondition: currentCondition, // ✅ Always newest condition
            currentBorrower: item.currentBorrower,
            totalBorrowers: item.totalBorrowers || [],
            borrowingHistory: sortedHistory, // keep sorted for UI
          };
        }),
        summary: {
          totalItems: response.data.data.summary?.totalItems || 0,
          currentlyDeployed: response.data.data.summary?.currentlyDeployed || 0,
          lost: response.data.data.summary?.lost || 0,
          damaged: response.data.data.summary?.damaged || 0,
          totalUniqueBorrowers:
            response.data.data.summary?.totalUniqueBorrowers || 0,
        },
        pagination: response.data.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 50,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    } else {
      throw new Error(
        response.data.message || "Failed to fetch borrowers data"
      );
    }
  } catch (err) {
    console.error("Error fetching borrowers data:", err);
    error.value = err.message;
    showNotification("Failed to fetch borrowers data", "error");
    borrowersData.value = { items: [], summary: {}, pagination: {} };
  } finally {
    loading.value = false;
  }
};

const isItemReturnable = (itemName) => {
  if (!itemName) return true;
  const lowerItemName = itemName.toLowerCase();
  return !nonReturnableItems.some((keyword) => lowerItemName.includes(keyword));
};

const shouldShowReturnDate = (deployment) => {
  const itemName = deployment.item?.name || "";
  return isItemReturnable(itemName) && deployment.expected_return_date;
};

const canUpdateSerialStatus = (itemStatus) => {
  return ["DEPLOYED", "DAMAGED", "LOST"].includes(itemStatus);
};

const fetchDeployments = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await api.get("inventory/deployment", {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        status: statusFilter.value || undefined,
        search: searchQuery.value || undefined,
      },
    });
    deployments.value = response.data.data || [];
    totalPages.value = response.data.meta?.pages || 1;
    totalDeployments.value = response.data.meta?.total || 0;
  } catch (err) {
    console.error("Error fetching deployments:", err);
    error.value = err.message;
    showNotification("Failed to fetch deployments", "error");
    deployments.value = [];
  } finally {
    loading.value = false;
  }
};

const stageChange = (serialId, condition) => {
  const existing = pendingChanges.value.find((c) => c.id === serialId);
  if (existing) {
    existing.condition = condition;
  } else {
    pendingChanges.value.push({ id: serialId, condition });
  }
};

const removePendingChange = (serialId) => {
  pendingChanges.value = pendingChanges.value.filter(
    (change) => change.id !== serialId
  );
};

const updateDeployment = async (payload) => {
  console.log("Payload: ", payload);
  try {
    isUpdating.value = true;
    const response = await api.put(
      `inventory/deployment/${currentDeployment.value.id}/status`,
      payload
    );
    currentDeployment.value = response.data.data;
    notesHistory.value = response.data.data.notes || [];
    newNote.value = "";
    return response.data;
  } catch (err) {
    console.error("Error updating deployment:", err);
    throw err;
  } finally {
    isUpdating.value = false;
  }
};

const confirmChanges = async () => {
  try {
    const payload = {
      serials: pendingChanges.value.map((change) => ({
        id: change.id,
        return_condition: change.condition,
      })),
    };
    if (newNote.value.trim()) {
      payload.notes = newNote.value.trim();
    }
    await updateDeployment(payload);
    showNotification(
      `Successfully updated ${pendingChanges.value.length} serial(s)`,
      "success"
    );
    pendingChanges.value = [];
    fetchDeployments();
  } catch (err) {
    showNotification("Failed to update serial statuses", "error");
  }
};

const updateDeploymentStatus = async (status) => {
  console.log("Deployment status: ", status);
  try {
    const payload = {
      status,
      actual_return_date:
        status === "RETURNED" ? new Date().toISOString() : null,
    };
    if (newNote.value.trim()) {
      payload.notes = newNote.value.trim();
    }
    await updateDeployment(payload);
    showNotification(`Deployment status updated to ${status}`, "success");
    closeModal();
    fetchDeployments();
  } catch (err) {
    showNotification("Failed to update deployment status", "error");
  }
};

const fetchDeployment = async (id) => {
  try {
    deploymentLoading.value = true;
    const response = await api.get(`inventory/deployment/${id}`);
    currentDeployment.value = response.data.data;
    notesHistory.value = response.data.data.notes || [];
    newNote.value = "";
    deploymentNotes.value = "";
    pendingChanges.value = [];
  } catch (err) {
    console.error("Error fetching deployment details:", err);
    showNotification("Failed to fetch deployment details", "error");
  } finally {
    deploymentLoading.value = false;
  }
};

const statusColor = (status) => {
  switch (status) {
    case "DEPLOYED":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: "text-blue-600",
      };
    case "RETURNED":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: "text-emerald-600",
      };
    case "LOST":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      };
    case "DAMAGED":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "text-amber-600",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: "text-gray-600",
      };
  }
};

const isOverdue = (deployment) => {
  if (deployment.status !== "DEPLOYED") return false;
  if (!deployment.expected_return_date) return false;
  return new Date(deployment.expected_return_date) < new Date();
};

const getDaysUntilReturn = (deployment) => {
  if (deployment.status !== "DEPLOYED") return null;
  if (!deployment.expected_return_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const returnDate = new Date(deployment.expected_return_date);
  returnDate.setHours(0, 0, 0, 0);
  const diffTime = returnDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const showNotification = (message, type) => {
  notification.value = { show: true, type, message };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const viewDeployment = (id) => {
  fetchDeployment(id);
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  setTimeout(() => {
    currentDeployment.value = null;
    pendingChanges.value = [];
  }, 300);
};

const handleStatusUpdate = async (status) => {
  await updateDeploymentStatus(status);
};

const deployedCount = computed(() => {
  return deployments.value.filter((d) => d.status === "DEPLOYED").length;
});

const returnedCount = computed(() => {
  return deployments.value.filter((d) => d.status === "RETURNED").length;
});

const overdueCount = computed(() => {
  return deployments.value.filter((d) => isOverdue(d)).length;
});

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

// Watchers
watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  fetchDeployments();
});

watch(
  [
    () => borrowersFilter.value.search,
    () => borrowersFilter.value.condition,
    () => borrowersFilter.value.sortBy,
  ],
  () => {
    borrowersCurrentPage.value = 1;
  }
);

onMounted(() => {
  fetchBorrowersData();
  fetchDeployments();
});
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
            :is="notification.type === 'success' ? CheckCircle2 : AlertTriangle"
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
        class="bg-white/80 backdrop-blur-sm shadow-lg border-b mb-8 border-gray-200/50 sticky top-0 z-10"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 py-8"
          >
            <!-- Left: Icon + Title + Subtitle -->
            <div class="flex items-center space-x-4">
              <div
                class="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl"
              >
                <Truck class="w-8 h-8 text-white" />
              </div>
              <div>
                <h1
                  class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
                >
                  Deployment Management
                </h1>
                <p class="text-gray-600 mt-1 text-base font-medium">
                  Track and manage inventory deployments with user assignments
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <button
                @click="openBorrowersReport"
                class="bg-gray-900 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
              >
                <Users class="w-5 h-5 mr-2" />
                View Borrowers Report
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showBorrowersModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click="closeBorrowersReport"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          @click.stop
        >
          <div class="bg-gray-900 text-white p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <Users class="w-6 h-6" />
                <h2 class="text-2xl font-bold">
                  Deployed Items & Borrowers Report
                </h2>
              </div>
              <button
                @click="closeBorrowersReport"
                class="hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X class="w-6 h-6" />
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div class="bg-white/20 rounded-lg p-4">
                <p class="text-sm opacity-90">Total Items</p>
                <p class="text-2xl font-bold">
                  {{ borrowersData.summary?.totalItems || 0 }}
                </p>
              </div>
              <div class="bg-white/20 rounded-lg p-4">
                <p class="text-sm opacity-90">Unique Borrowers</p>
                <p class="text-2xl font-bold">
                  {{ borrowersData.summary?.totalUniqueBorrowers || 0 }}
                </p>
              </div>
              <div class="bg-white/20 rounded-lg p-4">
                <p class="text-sm opacity-90">Currently Deployed</p>
                <p class="text-2xl font-bold">
                  {{ borrowersData.summary?.currentlyDeployed || 0 }}
                </p>
              </div>
              <div class="bg-white/20 rounded-lg p-4">
                <p class="text-sm opacity-90">Overdue Items</p>
                <p class="text-2xl font-bold">
                  {{
                    borrowersData.summary?.lost +
                      borrowersData.summary?.damaged || 0
                  }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div class="relative">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <input
                  v-model="borrowersFilter.search"
                  type="text"
                  placeholder="Search items or borrowers..."
                  class="pl-10 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <select
                v-model="borrowersFilter.condition"
                class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Conditions</option>
                <option value="good">Good</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
              <select
                v-model="borrowersFilter.sortBy"
                class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="itemName">Sort by Item Name</option>
                <option value="borrowerName">Sort by Borrower</option>
                <option value="daysBorrowed">Sort by Days Borrowed</option>
                <option value="totalBorrowers">Sort by Total Borrowers</option>
              </select>
            </div>

            <div v-if="loading" class="text-center py-12">
              <p class="text-gray-500 text-lg">Loading...</p>
            </div>
            <div v-else-if="error" class="text-center py-12">
              <p class="text-red-600 text-lg">Error: {{ error }}</p>
            </div>
            <div
              v-else-if="!filteredBorrowersData.length"
              class="text-center py-12"
            >
              <Package class="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p class="text-gray-500 text-lg">
                No items match your current filters
              </p>
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="item in paginatedBorrowersData"
                :key="item.id"
                class="bg-gray-50 rounded-xl p-6 border border-gray-200"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center space-x-4">
                    <div class="p-3 bg-indigo-100 rounded-lg">
                      <Package class="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900">
                        {{ item.itemName || "N/A" }}
                      </h3>
                      <p class="text-sm text-gray-600">
                        {{ item.serialNumber || "N/A" }}
                      </p>
                      <p class="text-sm text-gray-500">
                        {{ item.itemDescription || "No description" }}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span
                      :class="[
                        'px-3 py-1 text-sm font-medium rounded-full',
                        getConditionColor(item.newCondition),
                      ]"
                    >
                      {{ item.newCondition || "N/A" }}
                    </span>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ item.totalBorrowers?.length || 0 }} total borrowers
                    </p>
                  </div>
                </div>

                <div
                  v-if="item.currentBorrower"
                  class="bg-white rounded-lg p-4 mb-4"
                >
                  <h4 class="font-medium text-gray-900 mb-3 flex items-center">
                    <User class="w-4 h-4 mr-2 text-indigo-600" />
                    Current Borrower
                  </h4>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900">
                        {{ item.currentBorrower.name || "N/A" }}
                      </p>
                      <p class="text-sm text-gray-600">
                        {{ item.currentBorrower.email || "N/A" }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm text-gray-600">
                        {{ item.currentBorrower.daysBorrowed || 0 }} days
                        borrowed
                      </p>
                      <p class="text-xs text-gray-500">
                        Due:
                        {{
                          formatDate(item.currentBorrower.expectedReturnDate)
                        }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="bg-white rounded-lg p-4">
                  <h4 class="font-medium text-gray-900 mb-3 flex items-center">
                    <Clock class="w-4 h-4 mr-2 text-gray-600" />
                    Borrowing History ({{ item.totalBorrowers?.length || 0 }}
                    borrowers)
                  </h4>
                  <div
                    v-if="item.totalBorrowers?.length"
                    class="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    <div
                      v-for="borrower in item.totalBorrowers"
                      :key="borrower.id"
                      :class="[
                        'p-3 rounded-lg border',
                        borrower.id === item.currentBorrower?.id
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-gray-50 border-gray-200',
                      ]"
                    >
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="font-medium text-gray-900">
                            {{ borrower.name || "N/A" }}
                          </p>
                          <p class="text-xs text-gray-600">
                            {{ borrower.email || "N/A" }}
                          </p>
                        </div>
                        <div
                          v-if="borrower.id === item.currentBorrower?.id"
                          class="text-xs"
                        >
                          <span
                            class="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full"
                          >
                            Current
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center text-gray-500">
                    No borrowing history available
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination controls for borrowers modal -->
            <div
              v-if="totalBorrowersPages > 1"
              class="flex items-center justify-between mt-6 px-4"
            >
              <button
                @click="prevBorrowersPage"
                :disabled="borrowersCurrentPage === 1"
                class="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft class="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div class="flex space-x-2">
                <button
                  v-for="page in visibleBorrowersPages"
                  :key="page"
                  @click="borrowersCurrentPage = page"
                  :class="[
                    'px-4 py-2 rounded-lg',
                    borrowersCurrentPage === page
                      ? 'bg-indigo-500 text-white'
                      : 'border border-gray-300 hover:bg-gray-50',
                  ]"
                >
                  {{ page }}
                </button>
              </div>

              <button
                @click="nextBorrowersPage"
                :disabled="borrowersCurrentPage === totalBorrowersPages"
                class="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight class="w-5 h-5" />
              </button>
            </div>

            <!-- Optional: Show current page info -->
            <p
              v-if="filteredItemsCount > 0"
              class="text-center text-sm text-gray-500 mt-4"
            >
              Showing
              {{ (borrowersCurrentPage - 1) * borrowersItemsPerPage + 1 }} -
              {{
                Math.min(
                  borrowersCurrentPage * borrowersItemsPerPage,
                  filteredItemsCount
                )
              }}
              of {{ filteredItemsCount }} items
            </p>
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
              <p class="text-sm font-medium text-gray-600">Total Deployments</p>
              <p class="text-3xl font-bold text-gray-900">
                {{ totalDeployments }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Package class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">
                Currently Deployed
              </p>
              <p class="text-3xl font-bold text-blue-600">
                {{ deployedCount }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-xl">
              <Truck class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Returned</p>
              <p class="text-3xl font-bold text-emerald-600">
                {{ returnedCount }}
              </p>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle2 class="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div
          class="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Overdue</p>
              <p class="text-3xl font-bold text-red-600">{{ overdueCount }}</p>
            </div>
            <div class="p-3 bg-red-100 rounded-xl">
              <Clock class="w-6 h-6 text-red-600" />
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
              placeholder="Search deployments..."
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div class="relative">
            <Filter
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <select
              v-model="statusFilter"
              class="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
            >
              <option value="">All Statuses</option>
              <option value="DEPLOYED">Deployed</option>
              <option value="RETURNED">Returned</option>
              <option value="LOST">Lost</option>
              <option value="DAMAGED">Damaged</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="relative">
          <div
            class="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"
          ></div>
          <div
            class="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"
          ></div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50/80 backdrop-blur-sm border border-red-200 p-6 rounded-2xl text-red-700"
      >
        <div class="flex items-center">
          <AlertTriangle class="w-6 h-6 mr-3" />
          <div>
            <p class="font-semibold">Error loading data:</p>
            <p>{{ error.message }}</p>
          </div>
        </div>
      </div>

      <!-- Deployments Table -->
      <div
        v-else-if="deployments && deployments.length > 0"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Item
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Location
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Quantity
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Personnel
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Status
                </th>
                <th
                  class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  Return Date
                </th>
                <th
                  class="px-6 py-4 text-right text-sm font-semibold text-gray-700"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="deployment in deployments"
                :key="deployment.id"
                class="hover:bg-blue-50/50 transition-colors duration-200"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div
                      :class="[
                        'w-10 h-10 rounded-xl flex items-center justify-center mr-4',
                        isItemReturnable(deployment.item?.name)
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-600',
                      ]"
                    >
                      <Package class="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div class="font-semibold text-gray-900">
                        {{ deployment.item?.name || "Unknown Item" }}
                      </div>
                      <div
                        v-if="!isItemReturnable(deployment.item?.name)"
                        class="text-xs text-gray-500 flex items-center mt-1"
                      >
                        <Ban class="w-3 h-3 mr-1" />
                        Non-returnable
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <MapPin class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-gray-900 font-medium">{{
                      deployment.deployment_location
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-semibold text-gray-900">{{
                    deployment.quantity_deployed
                  }}</span>
                </td>
                <td class="px-6 py-4">
                  <div class="space-y-2">
                    <!-- Deployed By -->
                    <div class="flex items-center text-sm">
                      <User class="w-3 h-3 text-gray-400 mr-1" />
                      <span class="text-gray-600">By:</span>
                      <span class="ml-1 font-medium text-gray-900">
                        {{
                          deployment.deployer
                            ? `${deployment.deployer.firstname} ${deployment.deployer.lastname}`
                            : "Unknown"
                        }}
                      </span>
                    </div>
                    <!-- Deployed To -->
                    <div
                      v-if="deployment.recipient"
                      class="flex items-center text-sm"
                    >
                      <User class="w-3 h-3 text-blue-400 mr-1" />
                      <span class="text-gray-600">To:</span>
                      <span class="ml-1 font-medium text-blue-900">
                        {{
                          `${deployment.recipient.firstname} ${deployment.recipient.lastname}`
                        }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'px-3 py-1 text-sm font-medium rounded-full border',
                      statusColor(deployment.status).bg,
                      statusColor(deployment.status).text,
                      statusColor(deployment.status).border,
                    ]"
                  >
                    {{ deployment.status }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div
                    v-if="shouldShowReturnDate(deployment)"
                    class="flex items-center"
                  >
                    <Calendar class="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div class="font-medium text-gray-900">
                        {{ formatDate(deployment.expected_return_date) }}
                      </div>
                      <div
                        v-if="deployment.status === 'DEPLOYED'"
                        class="text-sm"
                      >
                        <span
                          :class="
                            isOverdue(deployment)
                              ? 'text-red-600'
                              : getDaysUntilReturn(deployment) <= 7
                              ? 'text-amber-600'
                              : 'text-gray-500'
                          "
                        >
                          {{
                            isOverdue(deployment)
                              ? `${Math.abs(
                                  getDaysUntilReturn(deployment)
                                )} days overdue`
                              : getDaysUntilReturn(deployment) === 0
                              ? "Due today"
                              : getDaysUntilReturn(deployment) > 0
                              ? `${getDaysUntilReturn(deployment)} days left`
                              : ""
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div v-else class="flex items-center text-gray-500">
                    <Ban class="w-4 h-4 mr-2" />
                    <span class="text-sm">Permanent deployment</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end">
                    <button
                      @click="viewDeployment(deployment.id)"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <Eye class="w-5 h-5" />
                    </button>
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
              {{ Math.min(currentPage * itemsPerPage, totalDeployments) }} of
              {{ totalDeployments }} results
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

      <!-- Empty State -->
      <div
        v-else-if="!loading && (!deployments || deployments.length === 0)"
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center"
      >
        <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          No deployments found
        </h3>
        <p class="text-gray-600 mb-6">
          There are no deployments matching your current filters.
        </p>
        <button
          @click="
            () => {
              searchQuery = '';
              statusFilter = '';
              currentPage = 1;
              fetchDeployments();
            }
          "
          class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      <!-- Enhanced Deployment Details Modal -->
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="closeModal"
      >
        <div
          class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden transform transition-all duration-300 scale-100"
        >
          <!-- Modal Header -->
          <div
            class="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-100"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <button
                  @click="closeModal"
                  class="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-200"
                >
                  <ArrowLeft class="w-5 h-5" />
                </button>
                <div
                  :class="[
                    'p-3 rounded-xl mr-4',
                    currentDeployment &&
                    isItemReturnable(currentDeployment.item?.name)
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      : 'bg-gradient-to-r from-gray-400 to-gray-600',
                  ]"
                >
                  <Package class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 class="text-2xl font-bold text-gray-900">
                    Deployment Details
                  </h3>
                  <p class="text-gray-600 mt-1">
                    View and manage deployment information
                  </p>
                </div>
              </div>
              <button
                @click="closeModal"
                class="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-xl transition-all duration-200"
              >
                <X class="w-6 h-6" />
              </button>
            </div>
          </div>

          <!-- Modal Content -->
          <div class="overflow-y-auto max-h-[calc(95vh-120px)]">
            <!-- Loading state for deployment details -->
            <div
              v-if="deploymentLoading"
              class="p-12 flex flex-col items-center justify-center"
            >
              <div class="relative mb-4">
                <div
                  class="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"
                ></div>
                <div
                  class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"
                ></div>
              </div>
              <p class="text-gray-600 font-medium">
                Loading deployment details...
              </p>
            </div>

            <!-- Deployment details content -->
            <div v-else-if="currentDeployment" class="p-8">
              <!-- Status Banner -->
              <div
                v-if="
                  currentDeployment.status === 'DEPLOYED' &&
                  isOverdue(currentDeployment)
                "
                class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center"
              >
                <AlertTriangle class="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <p class="font-semibold text-red-800">Overdue Return</p>
                  <p class="text-sm text-red-600">
                    This deployment is
                    {{ Math.abs(getDaysUntilReturn(currentDeployment)) }} days
                    overdue for return.
                  </p>
                </div>
              </div>

              <!-- Main Information Cards -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Item Information Card -->
                <div
                  class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
                >
                  <div class="flex items-center mb-4">
                    <Package class="w-5 h-5 text-blue-600 mr-2" />
                    <h4 class="text-lg font-semibold text-gray-900">
                      Item Information
                    </h4>
                  </div>
                  <div class="space-y-4">
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Item Name
                      </p>
                      <p class="text-lg font-semibold text-gray-900">
                        {{ currentDeployment.item?.name || "Unknown Item" }}
                      </p>
                      <div
                        v-if="!isItemReturnable(currentDeployment.item?.name)"
                        class="flex items-center mt-2 text-sm text-gray-600"
                      >
                        <Ban class="w-4 h-4 mr-1" />
                        Non-returnable item
                      </div>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Quantity Deployed
                      </p>
                      <p class="text-2xl font-bold text-blue-600">
                        {{ currentDeployment.quantity_deployed }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Personnel Information Card -->
                <div
                  class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100"
                >
                  <div class="flex items-center mb-4">
                    <Users class="w-5 h-5 text-purple-600 mr-2" />
                    <h4 class="text-lg font-semibold text-gray-900">
                      Personnel Information
                    </h4>
                  </div>
                  <div class="space-y-4">
                    <!-- Deployed By -->
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Deployed By
                      </p>
                      <div class="flex items-center">
                        <div
                          class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3"
                        >
                          <User class="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p class="font-semibold text-gray-900">
                            {{
                              currentDeployment.deployer
                                ? `${currentDeployment.deployer.firstname} ${currentDeployment.deployer.lastname}`
                                : "Unknown User"
                            }}
                          </p>
                        </div>
                      </div>
                    </div>
                    <!-- Deployed To -->
                    <div v-if="currentDeployment.recipient">
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Deployed To
                      </p>
                      <div class="flex items-center">
                        <div
                          class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3"
                        >
                          <User class="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p class="font-semibold text-gray-900">
                            {{
                              `${currentDeployment.recipient.firstname} ${currentDeployment.recipient.lastname}`
                            }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Deployment Information Card -->
              <div class="mb-8">
                <div
                  class="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100"
                >
                  <div class="flex items-center mb-4">
                    <MapPin class="w-5 h-5 text-emerald-600 mr-2" />
                    <h4 class="text-lg font-semibold text-gray-900">
                      Deployment Information
                    </h4>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Location
                      </p>
                      <p class="text-lg font-semibold text-gray-900">
                        {{ currentDeployment.deployment_location }}
                      </p>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-600 mb-1">
                        Current Status
                      </p>
                      <span
                        :class="[
                          'inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border',
                          statusColor(currentDeployment.status).bg,
                          statusColor(currentDeployment.status).text,
                          statusColor(currentDeployment.status).border,
                        ]"
                      >
                        <div
                          :class="[
                            'w-2 h-2 rounded-full mr-2',
                            statusColor(currentDeployment.status).icon.replace(
                              'text-',
                              'bg-'
                            ),
                          ]"
                        ></div>
                        {{ currentDeployment.status }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Timeline Card -->
              <div
                class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 mb-8"
              >
                <div class="flex items-center mb-4">
                  <Calendar class="w-5 h-5 text-amber-600 mr-2" />
                  <h4 class="text-lg font-semibold text-gray-900">Timeline</h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">
                      Deployment Date
                    </p>
                    <div class="flex items-center">
                      <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <p class="text-gray-900 font-medium">
                        {{ formatDate(currentDeployment.deployment_date) }}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-600 mb-1">
                      Expected Return Date
                    </p>
                    <div
                      v-if="shouldShowReturnDate(currentDeployment)"
                      class="flex items-center"
                    >
                      <div
                        :class="[
                          'w-3 h-3 rounded-full mr-3',
                          isOverdue(currentDeployment)
                            ? 'bg-red-500'
                            : 'bg-emerald-500',
                        ]"
                      ></div>
                      <div>
                        <p class="text-gray-900 font-medium">
                          {{
                            formatDate(currentDeployment.expected_return_date)
                          }}
                        </p>
                        <p
                          v-if="currentDeployment.status === 'DEPLOYED'"
                          :class="[
                            'text-sm mt-1',
                            isOverdue(currentDeployment)
                              ? 'text-red-600'
                              : 'text-emerald-600',
                          ]"
                        >
                          {{
                            isOverdue(currentDeployment)
                              ? `${Math.abs(
                                  getDaysUntilReturn(currentDeployment)
                                )} days overdue`
                              : getDaysUntilReturn(currentDeployment) === 0
                              ? "Due today"
                              : `${getDaysUntilReturn(
                                  currentDeployment
                                )} days remaining`
                          }}
                        </p>
                      </div>
                    </div>
                    <div v-else class="flex items-center text-gray-500">
                      <div class="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                      <p class="text-sm">Permanent deployment</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notes Section -->
              <div
                class="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-8"
              >
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center">
                    <FileText class="w-5 h-5 text-gray-600 mr-2" />
                    <h4 class="text-lg font-semibold text-gray-900">
                      Notes & Activity
                    </h4>
                    <span
                      v-if="currentDeployment.notes?.length"
                      class="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {{ currentDeployment.notes.length }}
                    </span>
                  </div>
                  <button
                    v-if="currentDeployment.notes?.length > 3"
                    @click="showNotesHistory = !showNotesHistory"
                    class="text-sm text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                  >
                    {{ showNotesHistory ? "Show Less" : "Show All" }}
                    <ChevronRight
                      :class="[
                        'w-4 h-4 ml-1 transition-transform duration-200',
                        showNotesHistory ? 'rotate-90' : '',
                      ]"
                    />
                  </button>
                </div>

                <!-- Recent Notes (Always visible) -->
                <div v-if="currentDeployment.notes?.length > 0" class="mb-4">
                  <div class="space-y-3">
                    <div
                      v-for="note in showNotesHistory
                        ? currentDeployment.notes
                        : currentDeployment.notes.slice(0, 3)"
                      :key="note.id"
                      class="bg-white rounded-lg p-4 border border-gray-200 transition-all duration-200 hover:border-gray-300"
                      :class="
                        note.note_type === 'SYSTEM'
                          ? 'border-l-4 border-l-blue-400'
                          : 'border-l-4 border-l-emerald-400'
                      "
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <p class="text-gray-700 mb-2 leading-relaxed">
                            {{ note.note_text }}
                          </p>
                          <div class="flex items-center text-xs text-gray-500">
                            <div class="flex items-center mr-4">
                              <User class="w-3 h-3 mr-1" />
                              {{
                                note.createdBy
                                  ? `${note.createdBy.firstname} ${note.createdBy.lastname}`
                                  : "System"
                              }}
                            </div>
                            <div class="flex items-center">
                              <Clock class="w-3 h-3 mr-1" />
                              {{ formatDate(note.createdAt) }}
                            </div>
                          </div>
                        </div>
                        <div
                          :class="[
                            'ml-3 px-2 py-1 text-xs rounded-full font-medium',
                            note.note_type === 'SYSTEM'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700',
                          ]"
                        >
                          {{ note.note_type === "SYSTEM" ? "System" : "User" }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Add New Note -->
                <div class="bg-white rounded-lg p-4 border border-gray-200">
                  <div class="space-y-3">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Add Note (optional)
                      </label>
                      <textarea
                        v-model="newNote"
                        class="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        rows="3"
                        placeholder="Add a note with your next action..."
                        :disabled="isUpdating"
                      ></textarea>
                    </div>

                    <!-- Note: This note will be included when you confirm serial changes or update deployment status -->
                    <div
                      v-if="newNote.trim()"
                      class="text-sm text-blue-600 bg-blue-50 p-2 rounded"
                    >
                      <FileText class="w-4 h-4 inline mr-1" />
                      This note will be added with your next action
                    </div>
                  </div>
                </div>

                <!-- Empty state -->
                <div
                  v-if="!currentDeployment.notes?.length"
                  class="text-center py-8 text-gray-500"
                >
                  <FileText class="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <p class="font-medium">No notes yet</p>
                  <p class="text-sm">
                    Add the first note above to track this deployment's
                    activity.
                  </p>
                </div>
              </div>

              <!-- Serialized Items Section -->
              <div
                v-if="currentDeployment.itemDeployments?.length"
                class="mb-8"
              >
                <div
                  class="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200"
                >
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center">
                      <Package class="w-5 h-5 text-gray-600 mr-2" />
                      <h4 class="text-lg font-semibold text-gray-900">
                        Serialized Items
                      </h4>
                    </div>
                    <button
                      v-if="pendingChanges.length"
                      @click="confirmChanges"
                      class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      :disabled="isUpdating"
                    >
                      <Check class="w-4 h-4 inline mr-1" />
                      Confirm {{ pendingChanges.length }} Change{{
                        pendingChanges.length > 1 ? "s" : ""
                      }}
                    </button>
                  </div>
                  <div class="divide-y divide-gray-200">
                    <div
                      v-for="deployment in currentDeployment.itemDeployments"
                      :key="deployment.item.id"
                      class="flex items-center justify-between py-4"
                      :class="{
                        'bg-yellow-50': pendingChanges.some(
                          (change) => change.id === deployment.item.id
                        ),
                      }"
                    >
                      <!-- Serial Info -->
                      <div>
                        <p class="font-semibold text-gray-900">
                          Serial #: {{ deployment.item.serial_number }}
                        </p>
                        <p class="text-sm text-gray-600">
                          Status: {{ deployment.item.status }}
                          <span v-if="deployment.return_condition">
                            ({{ deployment.return_condition }})
                          </span>
                        </p>
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex gap-2">
                        <!-- Return (GOOD) Button -->
                        <button
                          v-if="
                            !pendingChanges.some(
                              (change) => change.id === deployment.item.id
                            )
                          "
                          @click="stageChange(deployment.item.id, 'GOOD')"
                          class="btn-status-returned"
                          :class="{
                            'bg-gray-200 text-gray-500 cursor-not-allowed':
                              !canUpdateSerialStatus(deployment.item.status),
                          }"
                          :disabled="
                            isUpdating ||
                            !canUpdateSerialStatus(deployment.item.status)
                          "
                        >
                          <Check class="w-4 h-4 mr-1" /> Return
                        </button>
                        <button
                          v-else-if="
                            pendingChanges.some(
                              (change) =>
                                change.id === deployment.item.id &&
                                change.condition === 'GOOD'
                            )
                          "
                          @click="removePendingChange(deployment.item.id)"
                          class="bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-2 rounded-lg hover:bg-emerald-200"
                          :disabled="isUpdating"
                        >
                          <X class="w-4 h-4 mr-1" /> Undo Return
                        </button>

                        <!-- Damaged Button -->
                        <button
                          v-if="
                            !pendingChanges.some(
                              (change) => change.id === deployment.item.id
                            )
                          "
                          @click="stageChange(deployment.item.id, 'DAMAGED')"
                          class="btn-status-damaged"
                          :class="{
                            'bg-gray-200 text-gray-500 cursor-not-allowed':
                              !canUpdateSerialStatus(deployment.item.status),
                          }"
                          :disabled="
                            isUpdating ||
                            !canUpdateSerialStatus(deployment.item.status)
                          "
                        >
                          <AlertTriangle class="w-4 h-4 mr-1" /> Damaged
                        </button>
                        <button
                          v-else-if="
                            pendingChanges.some(
                              (change) =>
                                change.id === deployment.item.id &&
                                change.condition === 'DAMAGED'
                            )
                          "
                          @click="removePendingChange(deployment.item.id)"
                          class="bg-amber-100 text-amber-700 border border-amber-300 px-3 py-2 rounded-lg hover:bg-amber-200"
                          :disabled="isUpdating"
                        >
                          <X class="w-4 h-4 mr-1" /> Undo Damaged
                        </button>

                        <!-- Lost Button -->
                        <button
                          v-if="
                            !pendingChanges.some(
                              (change) => change.id === deployment.item.id
                            )
                          "
                          @click="stageChange(deployment.item.id, 'LOST')"
                          class="btn-status-lost"
                          :class="{
                            'bg-gray-200 text-gray-500 cursor-not-allowed':
                              !canUpdateSerialStatus(deployment.item.status),
                          }"
                          :disabled="
                            isUpdating ||
                            !canUpdateSerialStatus(deployment.item.status)
                          "
                        >
                          <AlertTriangle class="w-4 h-4 mr-1" /> Lost
                        </button>
                        <button
                          v-else-if="
                            pendingChanges.some(
                              (change) =>
                                change.id === deployment.item.id &&
                                change.condition === 'LOST'
                            )
                          "
                          @click="removePendingChange(deployment.item.id)"
                          class="bg-red-100 text-red-700 border border-red-300 px-3 py-2 rounded-lg hover:bg-red-200"
                          :disabled="isUpdating"
                        >
                          <X class="w-4 h-4 mr-1" /> Undo Lost
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

.btn-pagination {
  @apply relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

.btn-pagination:not(:last-child) {
  @apply border-r-0;
}

.btn-status-returned {
  @apply px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md;
}

.btn-status-lost {
  @apply px-6 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md;
}

.btn-status-damaged {
  @apply px-6 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md;
}
</style>
