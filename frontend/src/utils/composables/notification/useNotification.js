import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { ref, computed } from "vue";
import api from "../../axios";
export function useNotifications() {
  const queryClient = useQueryClient();

  // State
  const currentTab = ref("unread");
  const sortOrder = ref("desc");
  const limit = 5;
  const offset = ref(0);

  // Create reactive params for notifications query
  const notificationParams = computed(() => ({
    isRead: currentTab.value === "read",
    limit,
    offset: offset.value,
    sortOrder: sortOrder.value,
  }));

  // Fetch notifications list
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ["notifications", notificationParams],
    queryFn: async () => {
      const params = new URLSearchParams({
        isRead: notificationParams.value.isRead,
        limit: notificationParams.value.limit,
        offset: notificationParams.value.offset,
        sortOrder: notificationParams.value.sortOrder,
      });

      const response = await api.get(`/system/notifications?${params}`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch unread count
  const { data: unreadCountData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await api.get("/system/notifications/unread-count");
      return response.data;
    },
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/system/notifications/mark-as-read/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Update the notifications list cache
      queryClient.setQueryData(
        ["notifications", notificationParams.value],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            data: oldData.data
              .map((notification) =>
                notification.id === id
                  ? { ...notification, isRead: true }
                  : notification
              )
              .filter((notification) =>
                // Remove from unread list if we're viewing unread
                currentTab.value === "unread" ? notification.id !== id : true
              ),
            totalNotifications:
              currentTab.value === "unread"
                ? Math.max(0, oldData.totalNotifications - 1)
                : oldData.totalNotifications,
          };
        }
      );

      // Update unread count
      queryClient.setQueryData(["notifications", "unread-count"], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          count: Math.max(0, oldData.count - 1),
        };
      });

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Computed values
  const notifications = computed(() => notificationsData.value?.data || []);
  const totalNotifications = computed(
    () => notificationsData.value?.totalNotifications || 0
  );
  const hasMore = computed(() => notificationsData.value?.hasMore || false);
  const unreadCount = computed(() => unreadCountData.value?.count || 0);

  // Actions
  const markAsRead = (id) => markAsReadMutation.mutateAsync(id);

  const loadMore = () => {
    offset.value += limit;
    refetchNotifications();
  };

  const toggleSort = () => {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
    offset.value = 0;
  };

  const switchTab = (tab) => {
    currentTab.value = tab;
    offset.value = 0;
  };

  const refreshNotifications = () => {
    refetchNotifications();
    refetchUnreadCount();
  };

  return {
    // State
    currentTab,
    sortOrder,

    // Data
    notifications,
    totalNotifications,
    hasMore,
    unreadCount,
    isLoading,
    error,

    // Actions
    markAsRead,
    loadMore,
    toggleSort,
    switchTab,
    refreshNotifications,

    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
  };
}
