import axios from "axios";
import { useAuthStore } from "../stores/authStore";

const api = axios.create({
  baseURL: "http://3.27.95.242:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Queue for requests while token is being refreshed
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - attach token to requests
api.interceptors.request.use(
  (config) => {
    // Skip adding token for refresh endpoint to avoid loops
    if (config.url === "/auth/refresh") {
      return config;
    }

    // Get token from store first, fallback to localStorage
    const authStore = useAuthStore();
    let token = authStore.accessToken;

    // Fallback to localStorage if store doesn't have token
    if (!token) {
      token = localStorage.getItem("accessToken");
    }

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle authentication errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if this is a 401 error and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for login and refresh endpoints
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
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Retry original request with new token
            const authStore = useAuthStore();
            if (authStore.accessToken) {
              originalRequest.headers[
                "Authorization"
              ] = `Bearer ${authStore.accessToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      console.log("401 Unauthorized - attempting token refresh");
      isRefreshing = true;

      try {
        const authStore = useAuthStore();
        const newToken = await authStore.refreshToken();

        // Process queued requests
        processQueue(null, newToken);

        // Retry original request with new token
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, process queue with error and clear auth
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors, just reject
    return Promise.reject(error);
  }
);

// Add request/response logging for debugging (remove in production)
// if (process.env.NODE_ENV === "development") {
//   api.interceptors.request.use((request) => {
//     console.log("API Request:", request.method?.toUpperCase(), request.url);
//     return request;
//   });

//   api.interceptors.response.use(
//     (response) => {
//       console.log("API Response:", response.status, response.config.url);
//       return response;
//     },
//     (error) => {
//       console.log(
//         "API Error:",
//         error.response?.status || "Network Error",
//         error.config?.url
//       );
//       return Promise.reject(error);
//     }
//   );
// }

export default api;
