import axios from "axios";
import {
  getApiBaseCandidates,
  getPreferredApiBase,
  normalizeApiBaseUrl,
  rememberApiBase,
} from "./apiBase";

let refreshPromise = null;

function uniqueNormalizedBases(values) {
  const out = [];
  for (const value of values) {
    const normalized = normalizeApiBaseUrl(value);
    if (!normalized || out.includes(normalized)) continue;
    out.push(normalized);
  }
  return out;
}

function shouldRetryBackendError(error) {
  const status = error?.response?.status;
  if (!status) return true;
  return status >= 500;
}

function getFailoverBases(baseURL) {
  return uniqueNormalizedBases([baseURL, ...getApiBaseCandidates()]);
}

// Internal backend-only Axios client.
const coreApi = axios.create({
  baseURL: getPreferredApiBase(),
  withCredentials: false, // set true only if you use cookies/sessions
  allowAbsoluteUrls: false, // prevents accidental calls to external absolute URLs via this client
});

const baseRequest = coreApi.request.bind(coreApi);

async function requestWithFailover(config = {}) {
  const requestConfig = { ...config };
  const requestUrl = String(requestConfig.url || "");

  // Absolute URLs are already explicit and should not be rewritten.
  if (/^https?:\/\//i.test(requestUrl)) {
    return baseRequest(requestConfig);
  }

  const bases = getFailoverBases(requestConfig.baseURL);
  let lastError = null;

  for (const baseURL of bases) {
    try {
      const response = await baseRequest({
        ...requestConfig,
        baseURL,
      });

      if (baseURL) {
        rememberApiBase(baseURL);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (!shouldRetryBackendError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed");
}

// --- Request: attach token (if present) ---
coreApi.interceptors.request.use(
  (config) => {
    if (!config.baseURL) {
      config.baseURL = getPreferredApiBase();
    }

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
coreApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    // Network/CORS errors often have no response/status.
    if (!status) {
      console.error("[API NETWORK ERROR]", {
        message: error?.message,
        code: error?.code,
        config: error?.config,
      });
      return Promise.reject(error);
    }

    // 401: session expired or invalid credentials on a protected call.
    if (status === 401) {
      const originalRequest = error?.config || {};
      const requestUrl = String(error?.config?.url || "");
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
          return requestWithFailover(originalRequest);
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
        const currentHash = window.location.hash || "";
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

    // 500+: log but don't alert (let components decide).
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

  refreshPromise = requestWithFailover({
    method: "post",
    url: "/admin/token-refresh",
    data: {},
    headers: {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    },
    withCredentials: false,
  })
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

const api = coreApi;
api.request = requestWithFailover;
api.get = (url, config = {}) => requestWithFailover({ ...config, method: "get", url });
api.delete = (url, config = {}) => requestWithFailover({ ...config, method: "delete", url });
api.head = (url, config = {}) => requestWithFailover({ ...config, method: "head", url });
api.options = (url, config = {}) => requestWithFailover({ ...config, method: "options", url });
api.post = (url, data, config = {}) => requestWithFailover({ ...config, method: "post", url, data });
api.put = (url, data, config = {}) => requestWithFailover({ ...config, method: "put", url, data });
api.patch = (url, data, config = {}) => requestWithFailover({ ...config, method: "patch", url, data });

export default api;
