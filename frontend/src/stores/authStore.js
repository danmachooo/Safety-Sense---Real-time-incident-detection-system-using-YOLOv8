import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../utils/axios";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const accessToken = ref(null);
  const isRefreshing = ref(false);
  const refreshPromise = ref(null);

  const isAuthenticated = computed(() => !!(user.value && accessToken.value));

  // -------------------------
  // Load auth state from localStorage
  // -------------------------
  const loadAuthState = () => {
    const savedToken = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("authUser");

    if (savedToken && savedUser) {
      accessToken.value = savedToken;
      user.value = JSON.parse(savedUser);
    }
  };

  // -------------------------
  // Async initialization (verify token)
  // -------------------------
  const initAuth = async () => {
    loadAuthState();

    if (accessToken.value) {
      try {
        const valid = await verifyAuth();
        if (!valid) clearAuthState();
      } catch {
        clearAuthState();
      }
    }
  };

  const updateToken = (newAccessToken) => {
    accessToken.value = newAccessToken;
    localStorage.setItem("accessToken", newAccessToken);
    setupTokenRefresh();
  };

  const clearAuthState = () => {
    user.value = null;
    accessToken.value = null;
    isRefreshing.value = false;
    refreshPromise.value = null;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("authUser");
  };

  // -------------------------
  // Token validation & refresh
  // -------------------------
  const setupTokenRefresh = () => {
    if (!accessToken.value) return;

    try {
      const payload = JSON.parse(atob(accessToken.value.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const refreshTime = (payload.exp - currentTime - 300) * 1000;

      if (refreshTime > 0) {
        setTimeout(async () => {
          try {
            await refreshToken();
            setupTokenRefresh();
          } catch {
            clearAuthState();
          }
        }, refreshTime);
      }
    } catch {
      clearAuthState();
    }
  };

  const refreshToken = async () => {
    if (isRefreshing.value && refreshPromise.value) return refreshPromise.value;

    isRefreshing.value = true;

    refreshPromise.value = (async () => {
      try {
        const response = await api.post(
          "/auth/refresh",
          {},
          { withCredentials: true }
        );

        if (response.data.success && response.data.token) {
          updateToken(response.data.token);
          return response.data.token;
        } else throw new Error("Invalid refresh response");
      } catch (err) {
        clearAuthState();
        throw err;
      } finally {
        isRefreshing.value = false;
        refreshPromise.value = null;
      }
    })();

    return refreshPromise.value;
  };

  // -------------------------
  // Auth actions
  // -------------------------
  const login = async (email, password) => {
    const loginSource = "web";
    const { data } = await api.post(
      "/auth/login",
      { email, password, loginSource },
      { withCredentials: true }
    );

    if (data.success && data.data) {
      user.value = data.data.user;
      updateToken(data.data.access);
      localStorage.setItem("authUser", JSON.stringify(data.data.user));
      return true;
    }

    return false;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } finally {
      clearAuthState();
    }
  };

  const verifyAuth = async () => {
    if (!accessToken.value) return false;
    try {
      const response = await api.get("/auth/verify");
      return response.data.success;
    } catch {
      try {
        await refreshToken();
        return true;
      } catch {
        clearAuthState();
        return false;
      }
    }
  };

  // -------------------------
  // Init
  // -------------------------
  loadAuthState();

  return {
    user,
    accessToken,
    isAuthenticated,
    login,
    logout,
    updateToken,
    clearAuthState,
    refreshToken,
    setupTokenRefresh,
    initAuth,
    verifyAuth,
  };
});
