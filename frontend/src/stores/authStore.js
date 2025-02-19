import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../utils/axios";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const isAuthenticated = ref(false);
  const token = ref(null);

  // Login function with API request
  const login = async (email, password) => {
    try {
        const response = await api.post("/authentication/login", {
        email,
        password
      });

      // If login is successful, store user data and token
      user.value = response.data.user;
      token.value = response.data.token;
      isAuthenticated.value = true;

      // Save token in localStorage for persistence
      localStorage.setItem("authToken", token.value);
      
      console.log("Login Successful!", response.data);
    } catch (error) {
      console.error("Login failed:", error.response?.data?.message || error.message);
    }
  };

  // Logout function
  const logout = () => {
    user.value = null;
    isAuthenticated.value = false;
    token.value = null;

    // Remove token from localStorage
    localStorage.removeItem("authToken");

    console.log("Logged Out!");
  };

  return { user, isAuthenticated, token, login, logout };
});
