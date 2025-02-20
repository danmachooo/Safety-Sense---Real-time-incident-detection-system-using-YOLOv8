import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../utils/axios";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const isAuthenticated = ref(false);
  const token = ref(null);

  // 🔥 Load token from localStorage when the store initializes
  const loadAuthState = () => {
    const savedToken = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("authUser");

    if (savedToken && savedUser) {
      token.value = savedToken;
      user.value = JSON.parse(savedUser);
      isAuthenticated.value = true;
    }
  };

  // Call this function when the store is first created
  loadAuthState();

  // Login function
  const login = async (email, password) => {
    try {
      const response = await api.post("/authentication/login", { email, password });

      // Store user and token
      user.value = response.data.data.user;
      token.value = response.data.data.token;
      isAuthenticated.value = true;

      // Save to localStorage for persistence
      localStorage.setItem("authToken", token.value);
      localStorage.setItem("authUser", JSON.stringify(user.value));

      console.log("Login Successful!");
    } catch (error) {
      console.error("Login failed:", error.response?.data?.message || error.message);
    }
  };

  // Logout function
  const logout = () => {
    user.value = null;
    isAuthenticated.value = false;
    token.value = null;

    // Remove from localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");

    console.log("Logged Out!");
  };

  return { user, isAuthenticated, token, login, logout };
});
