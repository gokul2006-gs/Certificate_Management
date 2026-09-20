import axios from "axios";
import AuthService from "../navigation/AuthService";
import { getLoginPath, isPublicPath } from "../navigation/authPaths";

function normalizeApiBaseUrl(url) {
  const trimmed = String(url || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (configured) return normalizeApiBaseUrl(configured);
  const apiPort = import.meta.env.VITE_API_PORT || "5000";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${apiPort}/api`;
}

export const UPLOAD_TIMEOUT_MS = 120000;

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: UPLOAD_TIMEOUT_MS,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const method = originalRequest.method?.toLowerCase();
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

function formatValidationDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.join(", ");
  if (detail && typeof detail === "object") {
    if (detail.fieldErrors) {
      return Object.entries(detail.fieldErrors)
        .map(([field, messages]) => `${field}: ${[].concat(messages).join(", ")}`)
        .join("; ");
    }
    return Object.entries(detail)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`)
      .join("; ");
  }
  return String(detail);
}

export function formatApiError(error, fallback = "Request failed") {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (data.error && data.detail) return `${data.error}: ${formatValidationDetail(data.detail)}`;
  if (data.detail) return formatValidationDetail(data.detail);
  if (typeof data.error === "string") return data.error;
  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Try again with fewer students or a smaller template image.";
  }
  if (!error?.response) return "Cannot reach the API. Confirm the backend is running.";
  return fallback;
}

export const checkSession = () => AuthService.fetchSession();
export default api;
