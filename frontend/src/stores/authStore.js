// stores/authStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../utils/axios";

export const useAuthStore = defineStore("auth", () => {
  const authUser = ref(null);

  const isAuthenticated = computed(() => !!authUser.value);
  const isAuthLoading = ref(true); // new state

  // -------------------------
  // Init auth state (check if still logged in)
  // -------------------------

  const initAuth = async () => {
    try {
      const { data } = await api.get("/auth/verify");
      if (data.success) {
        authUser.value = data.sanitizedUser;
      } else {
        clearAuthState();
      }
    } catch {
      clearAuthState();
    } finally {
      isAuthLoading.value = false;
    }
  };

  // -------------------------
  // Auth actions
  // -------------------------
  const login = async (email, password) => {
    const loginSource = "web";
    const { data } = await api.post("/auth/login", {
      email,
      password,
      loginSource,
    });

    if (data.success && data.data) {
      authUser.value = data.data.user;
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuthState();
    }
  };

  const clearAuthState = () => {
    authUser.value = null;
  };

  const refreshSession = async () => {
    try {
      await api.post("/auth/refresh"); // backend sets new cookie
      return true;
    } catch {
      clearAuthState();
      return false;
    }
  };
  return {
    authUser,
    isAuthenticated,
    isAuthLoading,
    initAuth,
    login,
    logout,
    clearAuthState,
    refreshSession,
  };
});
