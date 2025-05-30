import { useMutation, useQueryClient } from "@tanstack/vue-query";
import api from "../../axios";

export function useDeployment() {
  const queryClient = useQueryClient();

  const deployItemMutation = useMutation({
    mutationFn: async (deploymentDetails) => {
      const response = await api.post(
        "inventory/deployment",
        deploymentDetails
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate items query to refresh stock levels
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  return {
    deployItem: deployItemMutation.mutateAsync,
    isDeploying: deployItemMutation.isPending,
    deploymentError: deployItemMutation.error,
  };
}
