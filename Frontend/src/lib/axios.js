import axios from "axios";
import { ENV } from "../config/env.ts";
import { clearToken, getToken } from "./auth";

// Internal backend-only Axios client
const api = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: false,      // set true only if you use cookies/sessions
  allowAbsoluteUrls: false,    // prevents accidental calls to external absolute URLs via this client
});

// --- Request: attach token (if present) ---
api.interceptors.request.use(
  (config) => {
    const token = getToken();

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
      console.error("[API NETWORK ERROR]", {
        message: error?.message,
        code: error?.code,
        config: error?.config,
      });
      // Don't show alert for network errors - let components handle gracefully
      return Promise.reject(error);
    }

    // 401: redirect to admin login
    if (status === 401) {
      const loginPath = "/#/login";
      clearToken();
      window.location.assign(loginPath);
      return Promise.reject(error);
    }

    // 500+: log but don't alert (let components decide)
    if (status >= 500) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        `Server error (${status})`;

      console.error("[API 500+]", msg, error?.response?.data);
    }

    return Promise.reject(error);
  }
);

export default api;
