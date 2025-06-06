import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import api from "../../axios";

export function useDeployments(params) {
  const queryClient = useQueryClient();
  const {
    data: deploymentsData,
    isLoading: loading,
    error,
    refetch: refetchDeployments,
  } = useQuery({
    // ✅ Make queryKey track computedParams.value identity
    queryKey: computed(() => [
      "deployments",
      params.value.page,
      params.value.limit,
      params.value.status,
      params.value.search,
    ]),
    queryFn: async () => {
      const response = await api.get("inventory/deployment", {
        params: {
          page: params.value.page,
          limit: params.value.limit,
          status: params.value.status || undefined,
          search: params.value.search || undefined,
        },
      });
      return response.data;
    },
    refetchOnMount: "always",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Update deployment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.put(`inventory/deployment/${id}/status`, {
        status,
        actual_return_date:
          status === "RETURNED" ? new Date().toISOString() : null,
        notes: `Status updated to ${status}`,
      });
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate both the list and the individual deployment
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["deployment"] });
    },
  });

  // Computed values from the query data
  const deployments = computed(() => deploymentsData.value?.data || []);
  const totalPages = computed(() => deploymentsData.value?.meta.pages || 1);

  // Computed stats
  const deployedCount = computed(() => {
    return deployments.value.filter((d) => d.status === "DEPLOYED").length;
  });

  const returnedCount = computed(() => {
    return deployments.value.filter((d) => d.status === "RETURNED").length;
  });

  const overdueCount = computed(() => {
    return deployments.value.filter((d) => {
      if (d.status !== "DEPLOYED") return false;
      return new Date(d.expected_return_date) < new Date();
    }).length;
  });

  const totalDeployments = computed(() => deployments.value.length);

  return {
    // Data
    deployments,
    totalPages,
    loading,
    error,

    // Stats
    deployedCount,
    returnedCount,
    overdueCount,
    totalDeployments,

    // Actions
    refetchDeployments,
    updateDeploymentStatus: updateStatusMutation.mutateAsync,

    // Mutation states
    isUpdating: updateStatusMutation.isPending,
  };
}

// Separate composable for individual deployment
export function useDeployment(id) {
  const {
    data: deployment,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["deployment", id],
    queryFn: async () => {
      const response = await api.get(`inventory/deployment/${id.value}`);
      return response.data.data;
    },
    enabled: computed(() => !!id.value), // Only run the query if we have an ID
    staleTime: 5 * 60 * 1000,
  });

  return {
    deployment,
    loading,
    error,
  };
}
