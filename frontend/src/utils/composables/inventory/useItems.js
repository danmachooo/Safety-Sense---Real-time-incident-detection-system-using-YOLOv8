import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import api from "../../axios";

export function useItems(params) {
  const queryClient = useQueryClient();

  // Fetch items with caching
  const {
    data: itemsData,
    isLoading: loading,
    error,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["items", params],
    queryFn: async () => {
      const response = await api.get("inventory/items", {
        params: {
          page: params.value.page,
          limit: params.value.limit,
          search: params.value.search || undefined,
          category:
            params.value.category !== "all" ? params.value.category : undefined,
          sortBy: params.value.sortBy,
          sortOrder: params.value.sortOrder,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Computed values from the query data
  const items = computed(() => itemsData.value?.data || []);
  const totalItems = computed(() => itemsData.value?.meta.total || 0);
  const totalPages = computed(() => itemsData.value?.meta.pages || 0);
  const currentPage = computed(() => itemsData.value?.meta.currentPage || 1);

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (newItem) => {
      const response = await api.post("inventory/items", newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (item) => {
      const { id, ...itemData } = item;
      const response = await api.put(`inventory/items/${id}`, itemData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`inventory/items/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  return {
    // Data
    items,
    totalItems,
    totalPages,
    currentPage,
    loading,
    error,

    // Actions
    refetchItems,
    createItem: createItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,

    // Mutation states
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
  };
}
