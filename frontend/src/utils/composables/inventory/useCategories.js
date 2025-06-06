import { useQuery } from "@tanstack/vue-query";
import api from "../../axios";
import { ref } from "vue";

export function useCategories() {
  const {
    data: categories,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("inventory/categories");
      return response.data.data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - categories don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    categories: categories || ref([]),
    loading,
    error,
  };
}
