import axios from "axios";

// Create a plain axios instance without interceptors for refresh calls
// This prevents circular refresh calls
const plainAxios = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Optional: Add basic logging for debugging (remove in production)
if (process.env.NODE_ENV === "development") {
  plainAxios.interceptors.request.use((request) => {
    console.log(
      "Plain Axios Request:",
      request.method?.toUpperCase(),
      request.url
    );
    return request;
  });

  plainAxios.interceptors.response.use(
    (response) => {
      console.log(
        "Plain Axios Response:",
        response.status,
        response.config.url
      );
      return response;
    },
    (error) => {
      console.log(
        "Plain Axios Error:",
        error.response?.status || "Network Error",
        error.config?.url
      );
      return Promise.reject(error);
    }
  );
}

export default plainAxios;
