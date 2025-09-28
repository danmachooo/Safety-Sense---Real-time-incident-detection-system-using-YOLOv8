// utils/axios.ts
import axios from "axios";

// Base axios instance
const api = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL || "https://api.safetysense.team/api",
  withCredentials: true,
});

// Response interceptor for 401 → try refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        // Handle different refresh error scenarios
        if (refreshError.response?.status === 403) {
          // Refresh token expired or invalid
          console.log("Session expired, please login again");
        }

        const { useAuthStore } = await import("../stores/authStore");
        const authStore = useAuthStore();
        authStore.clearAuthState();

        // Redirect to login page
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
export default api;
