import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import { refreshToken as refreshTokenApi } from "./tokenRefresher";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - attach token to requests
api.interceptors.request.use(
  (config) => {
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

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if this is a 401 error and we haven't already tried to refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refreshToken")
    ) {
      originalRequest._retry = true;

      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              return api(originalRequest);
            }
            return Promise.reject(new Error("No token received"));
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const authStore = useAuthStore();

        // Only attempt refresh if we have a refresh token
        if (!authStore.refreshToken && !localStorage.getItem("refreshToken")) {
          throw new Error("No refresh token available");
        }

        console.log("Attempting token refresh due to 401 response");
        const newToken = await refreshTokenApi(authStore);

        if (!newToken || typeof newToken !== "string") {
          throw new Error("Invalid token received from refresh");
        }

        // Update the store with new token
        authStore.updateToken(newToken);

        // Process all queued requests with new token
        processQueue(null, newToken);

        // Retry the original request with new token
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

        console.log("Token refreshed successfully, retrying original request");
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed in interceptor:", refreshError);

        // Process queue with error
        processQueue(refreshError, null);

        // Handle different types of refresh errors
        const authStore = useAuthStore();

        if (
          refreshError.response?.status === 401 ||
          refreshError.response?.status === 403
        ) {
          // Refresh token is invalid - logout user
          console.log("Refresh token expired, logging out user");
          authStore.handleTokenExpired();
        } else if (
          refreshError.message?.includes("Network Error") ||
          !refreshError.response
        ) {
          // Network error - don't logout, let the request fail naturally
          console.log(
            "Network error during token refresh, keeping user logged in"
          );
        } else {
          // Other errors - logout to be safe
          authStore.handleTokenExpired();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For non-401 errors or if we don't have a refresh token, just reject
    return Promise.reject(error);
  }
);

// // Add request/response logging for debugging (remove in production)
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
