import plainAxios from "./plainAxios";
import { useAuthStore } from "../stores/authStore";

export async function refreshToken(authStoreInstance) {
  console.log("Starting token refresh...");

  // Get refresh token from store first, then fallback to localStorage
  const authStore = authStoreInstance || useAuthStore();
  let refreshTokenValue =
    authStore.refreshToken || localStorage.getItem("refreshToken");

  if (!refreshTokenValue) {
    console.error("No refresh token found in store or localStorage");
    throw new Error("No refresh token found");
  }

  try {
    console.log("Making refresh request to /auth/refresh");
    const res = await plainAxios.post("/auth/refresh", {
      refreshToken: refreshTokenValue,
    });

    console.log("Refresh response status:", res.status);
    console.log("Refresh response data:", res.data);

    // Handle different possible response formats
    let newAccessToken;

    if (res.data.success && res.data.data?.access) {
      // Format: { success: true, data: { access: "token" } }
      newAccessToken = res.data.data.access;
    } else if (res.data.accessToken) {
      // Format: { accessToken: "token" }
      newAccessToken = res.data.accessToken;
    } else if (res.data.access) {
      // Format: { access: "token" }
      newAccessToken = res.data.access;
    } else if (res.data.token) {
      // Format: { token: "token" }
      newAccessToken = res.data.token;
    } else {
      console.error("Unexpected refresh response format:", res.data);
      throw new Error("No accessToken in refresh response");
    }

    if (!newAccessToken || typeof newAccessToken !== "string") {
      console.error("Invalid access token received:", newAccessToken);
      throw new Error("Invalid access token format");
    }

    console.log("New access token received, updating storage and store");

    // Update localStorage first
    localStorage.setItem("accessToken", newAccessToken);

    // Update the auth store
    authStore.updateToken(newAccessToken);

    // Update refresh token if provided
    if (res.data.refreshToken || (res.data.data && res.data.data.refresh)) {
      const newRefreshToken = res.data.refreshToken || res.data.data.refresh;
      console.log("New refresh token received, updating");
      authStore.refreshToken = newRefreshToken;
      localStorage.setItem("refreshToken", newRefreshToken);
    }

    console.log("Token refresh completed successfully");
    return newAccessToken;
  } catch (error) {
    console.error("Token refresh failed:", error);

    // Add more specific error handling
    if (error.response) {
      console.error("Refresh error response:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      // If it's a 401/403, the refresh token is invalid
      if (error.response.status === 401 || error.response.status === 403) {
        console.log("Refresh token appears to be invalid/expired");
        // Don't clear storage here - let the auth store handle it
      }
    } else if (error.request) {
      console.error("No response received for refresh request:", error.request);
    } else {
      console.error("Error setting up refresh request:", error.message);
    }

    // Re-throw the error so the calling code can handle it
    throw error;
  }
}
