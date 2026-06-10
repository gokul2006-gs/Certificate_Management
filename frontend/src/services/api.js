import axios from "axios";

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

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: UPLOAD_TIMEOUT_MS,
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
  (error) => Promise.reject(error)
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

export const checkSession = async () => {
  const response = await api.get("/accounts/session/");
  return response.data;
};

export const getCsrfToken = async () => {
  const response = await requestWithRetry((timeoutMs) =>
    api.get("/accounts/csrf/", { timeout: timeoutMs })
  );
  api.defaults.headers.common["X-CSRFToken"] = response.data.csrfToken;
  return response.data.csrfToken;
};
console.log("API BASE URL:", resolveApiBaseUrl());
export default api;
