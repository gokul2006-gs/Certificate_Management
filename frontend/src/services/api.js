import axios from "axios";
import AuthService from "../navigation/AuthService";
import { getLoginPath, isPublicPath } from "../navigation/authPaths";

function resolveApiBaseUrl() {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
  }

  const apiPort = import.meta.env.VITE_API_PORT || "8000";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${apiPort}/api`;
}

export const UPLOAD_TIMEOUT_MS = 120000;
const WAKEUP_TIMEOUT_MS = 90000;
const WAKEUP_RETRY_DELAY_MS = 5000;
const WAKEUP_MAX_ATTEMPTS = 4;

let cachedCsrfToken = null;

export const clearCsrfCache = () => {
  cachedCsrfToken = null;
  delete api.defaults.headers.common["X-CSRFToken"];
};

export const getCsrfToken = async (force = false) => {
  if (cachedCsrfToken && !force) {
    return cachedCsrfToken;
  }

  const response = await requestWithRetry((timeoutMs) =>
    api.get("/accounts/csrf/", { timeout: timeoutMs })
  );

  console.log("CSRF TOKEN:", response.data.csrfToken);
  cachedCsrfToken = response.data.csrfToken;
  api.defaults.headers.common["X-CSRFToken"] = cachedCsrfToken;

  return cachedCsrfToken;
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: UPLOAD_TIMEOUT_MS,
});

api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  const isMutating = ["post", "put", "delete", "patch"].includes(method);

  if (isMutating && !config.headers["X-CSRFToken"]) {
    // If not cached, getCsrfToken() will fetch it. If already cached, it returns instantly.
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    } catch (err) {
      console.warn("Could not automatically retrieve CSRF token:", err);
    }
  }

  return config;
});

function isRetryableNetworkError(error) {
  return !error?.response;
}

async function requestWithRetry(requestFn, {
  attempts = WAKEUP_MAX_ATTEMPTS,
  delayMs = WAKEUP_RETRY_DELAY_MS,
  timeoutMs = WAKEUP_TIMEOUT_MS,
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestFn(timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const method = originalRequest.method?.toLowerCase();

    if (
      error.response?.status === 403 &&
      !originalRequest._retry &&
      ["post", "put", "delete", "patch"].includes(method)
    ) {
      originalRequest._retry = true;
      try {
        console.log("CSRF expired or invalid. Retrying request with fresh CSRF token...");
        const freshToken = await getCsrfToken(true);
        originalRequest.headers["X-CSRFToken"] = freshToken;
        return await api(originalRequest);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      method === "get" &&
      !originalRequest.skipAuthRedirect &&
      !isPublicPath(window.location.pathname)
    ) {
      AuthService.clearAll();
      window.location.replace(getLoginPath(AuthService.getRole()));
    }

    return Promise.reject(error);
  }
);

export function formatApiError(error, fallback = "Request failed") {
  const data = error?.response?.data;
  if (!data) {
    return error?.message || fallback;
  }
  if (data.error && data.detail) {
    return `${data.error} ${data.detail}`;
  }
  if (typeof data.error === "string") {
    return data.error;
  }
  if (typeof data.detail === "string") {
    return data.detail;
  }
  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Try again with fewer students or a smaller template image.";
  }
  if (!error?.response) {
    return "Cannot reach the API. On Render free tier the server may be waking up — wait 30 seconds and try again.";
  }
  return fallback;
}

export const checkSession = () => AuthService.fetchSession();

export default api;
