import axios from "axios";
import { refreshToken } from "./tokenRefresher";
import { useAuthStore } from "../stores/authStore";

// Create an Axios instance
const api = axios.create({
  baseURL: "http://localhost:3000/api",
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Add an interceptor to include the token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken"); // Get token from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const authStore = useAuthStore();

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        console.log("Access token expired, refreshing...");
        const newToken = await refreshToken();

        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        authStore.updateToken(newToken); // Update Pinia store token

        return api(originalRequest);
      } catch (e) {
        console.log("Refresh token failed, logging out...");
        authStore.handleTokenExpired();
        window.location.href = "/";
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
