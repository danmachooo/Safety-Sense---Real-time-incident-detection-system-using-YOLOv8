import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../utils/axios";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const accessToken = ref(null);
  const isRefreshing = ref(false);
  const refreshPromise = ref(null);

  const isAuthenticated = computed(() => {
    return !!(user.value && accessToken.value);
  });

  const loadAuthState = () => {
    const savedToken = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("authUser");

    if (savedUser && savedToken) {
      accessToken.value = savedToken;
      user.value = JSON.parse(savedUser);
    }
  };

  const updateToken = (newAccessToken) => {
    if (!newAccessToken || typeof newAccessToken !== "string") {
      console.error("updateToken called with invalid token:", newAccessToken);
      return;
    }

    console.log("Updating access token");
    accessToken.value = newAccessToken;
    localStorage.setItem("accessToken", newAccessToken);
  };

  const clearAuthState = () => {
    console.log("Clearing auth state");

    user.value = null;
    accessToken.value = null;
    isRefreshing.value = false;
    refreshPromise.value = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("authUser");

    // Only redirect if we're not already on the login page
    if (
      window.location.pathname !== "/" &&
      window.location.pathname !== "/login"
    ) {
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }
  };

  const refreshToken = async () => {
    // If already refreshing, return the existing promise
    if (isRefreshing.value && refreshPromise.value) {
      return refreshPromise.value;
    }

    console.log("Attempting to refresh token...");
    isRefreshing.value = true;

    refreshPromise.value = (async () => {
      try {
        // Create a separate axios instance for refresh to avoid interceptor loops
        const refreshApi = api.create({
          baseURL: "http://localhost:3000/api",
          withCredentials: true,
        });

        const response = await refreshApi.post("/auth/refresh");

        if (response.data.success && response.data.token) {
          const newToken = response.data.token;
          updateToken(newToken);
          console.log("Token refreshed successfully");
          return newToken;
        } else {
          throw new Error("Invalid refresh response");
        }
      } catch (error) {
        console.error(
          "Token refresh failed:",
          error.response?.data?.message || error.message
        );
        // If refresh fails, clear auth state and redirect to login
        clearAuthState();
        throw error;
      } finally {
        isRefreshing.value = false;
        refreshPromise.value = null;
      }
    })();

    return refreshPromise.value;
  };

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success) {
        const { user: userData, access } = response.data.data;

        user.value = userData;
        updateToken(access);

        localStorage.setItem("authUser", JSON.stringify(userData));

        return true;
      }
      return false;
    } catch (err) {
      console.error("Login failed:", err.response?.data?.message || err);
      clearAuthState();
      throw err;
    }
  };

  const logout = async () => {
    try {
      // Try to logout on server, but don't wait too long
      const logoutPromise = api.post("/auth/logout");
      await Promise.race([
        logoutPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Logout timeout")), 5000)
        ),
      ]);
    } catch (err) {
      console.error("Logout failed:", err.response?.data?.message || err);
    } finally {
      clearAuthState();
    }
  };

  // Load auth state on store initialization
  loadAuthState();

  return {
    user,
    accessToken,
    isAuthenticated,
    isRefreshing,
    login,
    logout,
    updateToken,
    clearAuthState,
    refreshToken,
  };
});
