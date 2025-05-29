import api from "./plainAxios"; // Axios instance with withCredentials: true
import { useAuthStore } from "../stores/authStore";

export async function refreshToken(authStoreInstance) {
  console.log("Starting token refresh...");

  const authStore = authStoreInstance || useAuthStore();

  try {
    console.log("Making refresh request to /auth/refresh");
    const res = await api.post("/auth/refresh"); // 👈 No body, cookie is sent automatically

    console.log("Refresh response status:", res.status);
    console.log("Refresh response data:", res.data);

    let newAccessToken;

    if (res.data.success && res.data.data?.access) {
      newAccessToken = res.data.data.access;
    } else if (res.data.accessToken) {
      newAccessToken = res.data.accessToken;
    } else if (res.data.access) {
      newAccessToken = res.data.access;
    } else if (res.data.token) {
      newAccessToken = res.data.token;
    } else {
      throw new Error("No accessToken in refresh response");
    }

    if (!newAccessToken || typeof newAccessToken !== "string") {
      throw new Error("Invalid access token format");
    }

    // Update localStorage and store
    localStorage.setItem("accessToken", newAccessToken);
    authStore.updateToken(newAccessToken);

    console.log("Token refresh completed successfully");
    return newAccessToken;
  } catch (error) {
    console.error("Token refresh failed:", error);

    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        console.log("Refresh token is invalid or expired");
      }
    }

    throw error;
  }
}
