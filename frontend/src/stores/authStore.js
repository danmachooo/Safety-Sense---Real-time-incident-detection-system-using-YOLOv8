// stores/authStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../utils/axios";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);

  const isAuthenticated = computed(() => !!user.value);

  // -------------------------
  // Init auth state (check if still logged in)
  // -------------------------
  const initAuth = async () => {
    try {
      const { data } = await api.get("/auth/verify");
      if (data.success) {
        user.value = data.sanitizedUser;
      } else {
        clearAuthState();
      }
    } catch {
      clearAuthState();
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
      user.value = data.data.user;
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
    user.value = null;
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
    user,
    isAuthenticated,
    initAuth,
    login,
    logout,
    clearAuthState,
    refreshSession,
  };
});
