import { useQuery } from "@tanstack/vue-query";
import { ref, computed } from "vue";

export function useUser() {
  // Get user from localStorage as fallback
  const loggedInUser = ref(JSON.parse(localStorage.getItem("authUser")) || {});

  // We could also fetch user data from API if needed
  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      // If you have an API endpoint for user profile
      // const response = await api.get("/user/profile")
      // return response.data

      // For now, return the localStorage data
      return loggedInUser.value;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: loggedInUser.value,
  });

  // Computed user properties
  const user = computed(() => ({
    firstname: userData.value?.firstname || "",
    lastname: userData.value?.lastname || "",
    contact: userData.value?.contact || "",
    email: userData.value?.email || "",
    role: userData.value?.role || "",
    createdAt: userData.value?.createdAt || "",
    isVerified: userData.value?.isVerified ?? false,
    isBlocked: userData.value?.isBlocked ?? false,
    avatar: userData.value?.avatar || null,
  }));

  const userInitials = computed(() => {
    const first = user.value.firstname?.[0] || "";
    const last = user.value.lastname?.[0] || "";
    return `${first}${last}`.toUpperCase();
  });

  const userFullName = computed(() => {
    return `${user.value.firstname} ${user.value.lastname}`.trim();
  });

  return {
    user,
    userInitials,
    userFullName,
    isLoading,
    error,
  };
}
