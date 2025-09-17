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

      // Setup auto-refresh after loading auth state
      setupTokenRefresh();
    }
  };

  const updateToken = (newAccessToken) => {
    if (!newAccessToken || typeof newAccessToken !== "string") {
      console.error("updateToken called with invalid token:", newAccessToken);
      return;
    }

    accessToken.value = newAccessToken;
    localStorage.setItem("accessToken", newAccessToken);

    // Setup auto-refresh for the new token
    setupTokenRefresh();
  };

  const clearAuthState = () => {
    user.value = null;
    accessToken.value = null;
    isRefreshing.value = false;
    refreshPromise.value = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("authUser");

    if (
      window.location.pathname !== "/" &&
      window.location.pathname !== "/login"
    ) {
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }
  };

  // Check if token is expired or about to expire
  const isTokenValid = () => {
    if (!accessToken.value) return false;

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(accessToken.value.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // Check if token expires within the next 5 minutes
      return payload.exp > currentTime + 300;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  };

  // Auto-refresh token before expiration
  const setupTokenRefresh = () => {
    if (!accessToken.value) return;

    try {
      const payload = JSON.parse(atob(accessToken.value.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;

      // Refresh 5 minutes before expiration
      const refreshTime = (expirationTime - currentTime - 300) * 1000;

      if (refreshTime > 0) {
        setTimeout(async () => {
          try {
            await refreshToken();
            setupTokenRefresh(); // Setup next refresh
          } catch (error) {
            console.error("Auto-refresh failed:", error);
            clearAuthState();
          }
        }, refreshTime);
      }
    } catch (error) {
      console.error("Token refresh setup error:", error);
    }
  };

  const refreshToken = async () => {
    if (isRefreshing.value && refreshPromise.value) {
      return refreshPromise.value;
    }

    isRefreshing.value = true;

    refreshPromise.value = (async () => {
      try {
        // Use refresh endpoint (cookie-based)
        const response = await api.post(
          "/auth/refresh",
          {},
          { withCredentials: true }
        );

        if (response.data.success && response.data.token) {
          const newToken = response.data.token;
          updateToken(newToken);
          return newToken;
        } else {
          throw new Error("Invalid refresh response");
        }
      } catch (error) {
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
      const loginSource = "web";
      const response = await api.post(
        "/auth/login",
        { email, password, loginSource },
        { withCredentials: true } // ensure refresh cookie is set
      );

      const { data } = response;
      if (data.success && data.data) {
        const { user: userData, access } = data.data;

        user.value = userData;
        updateToken(access);

        localStorage.setItem("authUser", JSON.stringify(userData));

        return true;
      }

      return false;
    } catch (err) {
      clearAuthState();
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch (err) {
      console.error("Logout failed:", err.response?.data?.message || err);
    } finally {
      clearAuthState();
    }
  };

  // Verify authentication status with server
  const verifyAuth = async () => {
    if (!accessToken.value) {
      return false;
    }

    try {
      // Make a request to a protected endpoint to verify token
      const response = await api.get("/auth/verify");
      return response.data.success;
    } catch (error) {
      console.error("Auth verification failed:", error);

      // If verification fails, try to refresh token
      try {
        await refreshToken();
        return true;
      } catch (refreshError) {
        clearAuthState();
        return false;
      }
    }
  };

  // Initialize
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
    isTokenValid,
    verifyAuth,
    setupTokenRefresh,
  };
});
