import axios from "axios";
import { useAuthStore } from "../stores/authStore";

// Base axios instance
const api = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL || "https://www.api.safetysense.team/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Queue for requests while token is being refreshed
let isRefreshing = false;
let failedQueue = [];

// Process queued requests
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject, originalRequest }) => {
    if (error) {
      reject(error);
    } else {
      if (token) {
        originalRequest.headers["Authorization"] = `Bearer ${token}`;
      }
      resolve(api(originalRequest));
    }
  });
  failedQueue = [];
};

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    if (config.url === "/auth/refresh") return config;

    const authStore = useAuthStore();
    let token = authStore.accessToken || localStorage.getItem("accessToken");

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip login and refresh endpoints
      if (
        originalRequest.url === "/auth/login" ||
        originalRequest.url === "/auth/refresh"
      ) {
        const authStore = useAuthStore();
        authStore.clearAuthState();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, originalRequest });
        });
      }

      isRefreshing = true;
      const authStore = useAuthStore();

      try {
        // Use a separate instance to avoid loops
        const refreshApi = axios.create({
          baseURL:
            import.meta.env.VITE_BACKEND_URL ||
            "https://www.api.safetysense.team/api",
          withCredentials: true,
        });

        const response = await refreshApi.post("/auth/refresh");
        const newToken = response.data.token;

        if (!newToken) throw new Error("Failed to refresh token");

        // Update store and localStorage
        authStore.updateToken(newToken);

        // Process queued requests
        processQueue(null, newToken);

        // Retry original request
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        authStore.clearAuthState();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
