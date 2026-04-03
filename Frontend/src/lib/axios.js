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
      console.error("[API NETWORK ERROR]", {
        message: error?.message,
        code: error?.code,
        config: error?.config,
      });
      // Don't show alert for network errors - let components handle gracefully
      return Promise.reject(error);
    }

    // 401: redirect to login
    if (status === 401) {
      const requestUrl = String(error?.config?.url || '');
      const isAdminAuthRequest = /\/admin\/(login|signup|bootstrap-status)$/i.test(requestUrl);
      if (isAdminAuthRequest) {
        return Promise.reject(error);
      }

      try {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("jwt");
        sessionStorage.removeItem("admin-auth");
        sessionStorage.removeItem("admin-auth-version");
        sessionStorage.removeItem("admin-login-time");
      } catch (_err) {
        // Ignore storage failures and continue with the forced session reset.
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event('admin-session-expired'));
        const currentHash = window.location.hash || '';
        const onAdminShell = currentHash.startsWith('#/admin');
        if (!onAdminShell) {
          window.location.assign('/#/admin');
        }
      }
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
