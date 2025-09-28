// utils/axios.ts
import axios from "axios";

// Base axios instance
const api = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL || "https://api.safetysense.team/api",
  withCredentials: true,
});

// Response interceptor for 401 → try refresh
// utils/axios.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 🚨 Skip handling for auth endpoints themselves
    if (
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/logout") ||
      originalRequest.url?.includes("/auth/verify") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        const { useAuthStore } = await import("../stores/authStore");
        const authStore = useAuthStore();
        authStore.clearAuthState();

        // 🚨 Only redirect if not already on login
        if (
          window.location.pathname !== "/" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
