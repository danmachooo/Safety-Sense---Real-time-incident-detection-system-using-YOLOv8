import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../utils/axios";
import { refreshToken as refreshTokenApi } from "../utils/tokenRefresher";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const accessToken = ref(null);
  const refreshToken = ref(null);
  const isRefreshing = ref(false);

  // Fixed: Keep user authenticated while refreshing if they have a refresh token
  const isAuthenticated = computed(() => {
    return !!(user.value && (accessToken.value || refreshToken.value));
  });

  let refreshTimeoutId = null;

  const loadAuthState = () => {
    const savedToken = localStorage.getItem("accessToken");
    const savedRefresh = localStorage.getItem("refreshToken");
    const savedUser = localStorage.getItem("authUser");

    if (savedUser && (savedToken || savedRefresh)) {
      accessToken.value = savedToken;
      refreshToken.value = savedRefresh;
      user.value = JSON.parse(savedUser);

      // If we have a refresh token but no access token, try to refresh immediately
      if (!savedToken && savedRefresh) {
        attemptTokenRefresh();
      } else if (savedToken) {
        startRefreshTimer();
      }
    }
  };

  const startRefreshTimer = () => {
    if (!accessToken.value) return;

    try {
      const payload = JSON.parse(atob(accessToken.value.split(".")[1]));
      const exp = payload.exp * 1000;
      const now = Date.now();
      // Refresh 30 seconds before expiry, or 5 seconds for short-lived tokens
      const refreshBuffer = exp - now > 60000 ? 30000 : 5000;

      let timeout = exp - now - refreshBuffer;

      console.log("EXP: ", exp);
      console.log("NOW: ", now);
      console.log("REFRESH: ", refreshBuffer);
      console.log("TIMEOUT: ", timeout);

      if (refreshTimeoutId) clearTimeout(refreshTimeoutId);

      if (timeout > 0) {
        console.log(`Scheduling token refresh in ${timeout}ms`);
        refreshTimeoutId = setTimeout(() => {
          attemptTokenRefresh();
        }, timeout);
      } else {
        // Token already expired or about to expire
        console.log("Token expired or about to expire, refreshing immediately");
        attemptTokenRefresh();
      }
    } catch (err) {
      console.error("Failed to decode token:", err);
      // If we can't decode the token but have a refresh token, try to refresh
      if (refreshToken.value) {
        attemptTokenRefresh();
      } else {
        handleTokenExpired();
      }
    }
  };

  const attemptTokenRefresh = async () => {
    if (isRefreshing.value) {
      console.log("Refresh already in progress, skipping");
      return;
    }

    if (!refreshToken.value) {
      console.log("No refresh token available");
      handleTokenExpired();
      return;
    }

    isRefreshing.value = true;
    console.log("Attempting to refresh token...");

    try {
      const newToken = await refreshTokenApi(useAuthStore());

      if (newToken && typeof newToken === "string") {
        console.log("Token refreshed successfully");
        updateToken(newToken);
        startRefreshTimer();
      } else {
        console.error("Invalid token received from refresh");
        handleTokenExpired();
      }
    } catch (err) {
      console.error("Token refresh failed:", err);

      // Check if it's a network error vs auth error
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Refresh token is invalid/expired
        console.log("Refresh token expired, logging out");
        handleTokenExpired();
      } else {
        // Network error or other issue - keep trying
        console.log("Network error during refresh, will retry");
        // Retry after a short delay
        setTimeout(() => {
          if (refreshToken.value) {
            attemptTokenRefresh();
          }
        }, 5000);
      }
    } finally {
      isRefreshing.value = false;
    }
  };

  const stopRefreshTimer = () => {
    if (refreshTimeoutId) {
      clearTimeout(refreshTimeoutId);
      refreshTimeoutId = null;
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

  const handleTokenExpired = () => {
    console.log("Handling token expiration - clearing auth state");

    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authUser");

    stopRefreshTimer();

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

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success) {
        const { user: userData, access, refresh } = response.data.data;

        user.value = userData;
        updateToken(access);
        refreshToken.value = refresh;

        localStorage.setItem("refreshToken", refresh);
        localStorage.setItem("authUser", JSON.stringify(userData));

        startRefreshTimer();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login failed:", err.response?.data?.message || err);
      handleTokenExpired();
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
      handleTokenExpired();
    }
  };

  // Load auth state on store initialization
  loadAuthState();

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isRefreshing,
    login,
    logout,
    updateToken,
    handleTokenExpired,
    startRefreshTimer,
    stopRefreshTimer,
  };
});
