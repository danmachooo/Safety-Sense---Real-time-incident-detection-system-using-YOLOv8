import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../utils/axios";
import { refreshToken as refreshTokenApi } from "../utils/tokenRefresher";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const accessToken = ref(null);
  const refreshToken = ref(null);
  const isAuthenticated = computed(
    () => !!accessToken.value || !!refreshToken.value
  );

  let refreshTimeoutId = null;

  const loadAuthState = () => {
    const savedToken = localStorage.getItem("accessToken");
    const savedRefresh = localStorage.getItem("refreshToken");
    const savedUser = localStorage.getItem("authUser");

    if ((savedToken || savedRefresh) && savedUser) {
      accessToken.value = savedToken;
      refreshToken.value = savedRefresh;
      user.value = JSON.parse(savedUser);
      startRefreshTimer();
    }
  };

  // Start the refresh timer based on token expiration
  function startRefreshTimer() {
    if (!accessToken.value) return;

    // Decode JWT payload to get expiration time (exp)
    const payload = JSON.parse(atob(accessToken.value.split(".")[1]));
    const exp = payload.exp * 1000; // convert to ms
    const now = Date.now();

    // Calculate timeout to refresh 30 seconds before expiry
    const timeout = exp - now - 30000;

    // Clear any existing timer
    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);

    if (timeout > 0) {
      refreshTimeoutId = setTimeout(async () => {
        try {
          const newToken = await refreshTokenApi();
          updateToken(newToken);
          startRefreshTimer(); // Schedule next refresh
        } catch (error) {
          console.error("Automatic token refresh failed:", error);
          handleTokenExpired();
          window.location.href = "/";
        }
      }, timeout);
    } else {
      // Token already expired, logout immediately or try refresh manually
      handleTokenExpired();
      window.location.href = "/";
    }
  }

  function stopRefreshTimer() {
    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
  }

  const updateToken = (newAccessToken) => {
    accessToken.value = newAccessToken;
    localStorage.setItem("accessToken", newAccessToken);
  };

  const handleTokenExpired = () => {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.clear();
    stopRefreshTimer();
  };

  // Call loadAuthState once when store initializes
  loadAuthState();

  // Your login and logout methods (unchanged) but start/stop timer accordingly

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success) {
        const { user: userData, access, refresh } = response.data.data;

        user.value = userData;
        updateToken(access);
        refreshToken.value = refresh;
        localStorage.setItem("refreshToken", refresh);
        localStorage.setItem("authUser", JSON.stringify(user.value));

        startRefreshTimer();

        console.log("Login Successful!");
      }
    } catch (error) {
      handleTokenExpired();
      console.error("Login failed:", error.response?.data?.message || error);
    }
  };

  const logout = async () => {
    try {
      const response = await api.post("/auth/logout");
      if (response.data.success) {
        handleTokenExpired();
        console.log("Logged Out!");
      }
    } catch (error) {
      console.error("Logout failed:", error.response?.data?.message || error);
      handleTokenExpired();
    }
  };

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    login,
    logout,
    updateToken,
    handleTokenExpired,
    startRefreshTimer,
    stopRefreshTimer,
  };
});
