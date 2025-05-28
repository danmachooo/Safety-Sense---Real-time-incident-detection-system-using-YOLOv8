import plainAxios from "./plainAxios";
import { useAuthStore } from "../stores/authStore"; // Adjust the path if needed

export async function refreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");

  const res = await plainAxios.post("/auth/refresh", { refreshToken });

  const newAccessToken = res.data.accessToken;
  localStorage.setItem("accessToken", newAccessToken);

  const authStore = useAuthStore(); // Access store
  authStore.updateToken(newAccessToken); // Update Pinia state

  console.log("NEW ACCESS TOKEN", newAccessToken);
  return newAccessToken;
}
