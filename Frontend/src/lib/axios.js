import axios from "axios";
import { ENV } from "../config/env";

// Internal backend-only Axios client
const api = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: false,      // set true only if you use cookies/sessions
  allowAbsoluteUrls: false,    // prevents accidental calls to external absolute URLs via this client
});

// --- Request: attach token (if present) ---
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response: global error handling ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Network/CORS errors often have no response/status
    if (!status) {
      console.error("[API NETWORK ERROR]", error?.message || error);
      alert("Network error: unable to reach the API. Check connection/CORS.");
      return Promise.reject(error);
    }

    // 401: redirect to login
    if (status === 401) {
      const loginPath = "/admin/login";
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("jwt");
      window.location.assign(loginPath);
      return Promise.reject(error);
    }

    // 500+: show alert (swap to toast later)
    if (status >= 500) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        `Server error (${status})`;

      console.error("[API 500+]", msg);
      alert(msg);
    }

    return Promise.reject(error);
  }
);

export default api;
