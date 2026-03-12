import axios from "axios";
import { ENV } from "../config/env";
import { clearToken, getToken } from "./auth";
import { createLogger } from "./logger";

const logger = createLogger('API');

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
      logger.error(
        'Network error',
        error,
        {
          message: error?.message,
          code: error?.code,
          url: error?.config?.url,
        }
      );
      // Don't show alert for network errors - let components handle gracefully
      return Promise.reject(error);
    }

    // 401: only redirect to login when the request itself was an auth/session check.
    // Do NOT redirect when auth-gated internal endpoints (like openclaw/messages) return 401
    // because the logged-in token may simply not be recognized yet on stale deploy.
    if (status === 401) {
      const url = error?.config?.url || '';
      const isAuthEndpoint = /\/(auth|login|me|session)\b/i.test(url);
      if (isAuthEndpoint) {
        clearToken();
        window.location.assign('/#/admin');
      }
      return Promise.reject(error);
    }

    // 500+: log but don't alert (let components decide)
    if (status >= 500) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        `Server error (${status})`;

      logger.error(`Server error (${status})`, error, {
        message: msg,
        data: error?.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
