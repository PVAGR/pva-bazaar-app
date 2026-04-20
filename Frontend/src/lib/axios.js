import axios from "axios";
import { ENV } from "../config/env";

let refreshPromise = null;

function normalizeApiBaseUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  let next = value.replace(/\/+$/, '');
  if (!/\/api$/i.test(next)) {
    next = `${next}/api`;
  }
  return next;
}

function isUnsafeProductionOverride(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return false;
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(value);
}

function resolveApiBaseUrl() {
  const envBase = normalizeApiBaseUrl(ENV.API_URL);
  const isProd = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production';
  try {
    const localOverride = localStorage.getItem('api-base-url');
    if (localOverride) {
      const normalizedOverride = normalizeApiBaseUrl(localOverride);
      if (normalizedOverride) {
        if (isProd && isUnsafeProductionOverride(normalizedOverride)) {
          localStorage.removeItem('api-base-url');
        } else {
          return normalizedOverride;
        }
      }
    }
  } catch (_err) {
    // Ignore localStorage read errors and continue with environment fallback.
  }
  return envBase;
}

async function tryRefreshAdminToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt");

  if (!token) {
    return null;
  }

  refreshPromise = axios
    .post(
      `${resolveApiBaseUrl()}/admin/token-refresh`,
      {},
      {
        headers: {
          Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        },
        withCredentials: false,
      }
    )
    .then((res) => {
      const nextToken = res?.data?.token;
      if (!nextToken) return null;
      localStorage.setItem("token", nextToken);
      localStorage.removeItem("authToken");
      localStorage.removeItem("jwt");
      return nextToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Internal backend-only Axios client
const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: false,      // set true only if you use cookies/sessions
  allowAbsoluteUrls: false,    // prevents accidental calls to external absolute URLs via this client
});

// --- Request: attach token (if present) ---
api.interceptors.request.use(
  (config) => {
    config.baseURL = resolveApiBaseUrl();

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
  async (error) => {
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

    // 401: session expired or invalid credentials on a protected call
    if (status === 401) {
      const originalRequest = error?.config || {};
      const requestUrl = String(error?.config?.url || '');
      const isAdminAuthRequest = /\/admin\/(login|signup|bootstrap-status)$/i.test(requestUrl);
      const isUserAuthRequest = /\/auth\/(login|register)$/i.test(requestUrl);
      const isTokenRefreshRequest = /\/admin\/token-refresh$/i.test(requestUrl);
      if (isAdminAuthRequest || isUserAuthRequest) {
        return Promise.reject(error);
      }

      const tokenBefore =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt");
      const hadToken = Boolean(tokenBefore);
      const adminShellSession =
        typeof window !== "undefined" &&
        sessionStorage.getItem("admin-auth") === "authenticated";

      const hasTriedRefresh = Boolean(originalRequest?._retryAfterRefresh);
      if (adminShellSession && !hasTriedRefresh && !isTokenRefreshRequest) {
        const refreshedToken = await tryRefreshAdminToken();
        if (refreshedToken) {
          originalRequest._retryAfterRefresh = true;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = refreshedToken.startsWith("Bearer ")
            ? refreshedToken
            : `Bearer ${refreshedToken}`;
          return api.request(originalRequest);
        }
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

      if (typeof window !== "undefined" && hadToken) {
        const currentHash = window.location.hash || '';
        const onAdminShell = currentHash.startsWith("#/admin");
        if (adminShellSession) {
          window.dispatchEvent(new Event("admin-session-expired"));
          if (!onAdminShell) {
            window.location.assign("/#/admin");
          }
        } else if (!currentHash.startsWith("#/login")) {
          window.location.assign("/#/login");
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
