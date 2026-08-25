import axios from "axios";
import { getFriendlyErrorMessage } from "../utils/errorMessages";
import { resolveDevUrl } from "../utils/platformUrl";

const defaultApiUrl = "https://barber-saas-backend-l4iz.onrender.com/api";
const baseURL = resolveDevUrl(import.meta.env.VITE_API_URL, defaultApiUrl);

const api = axios.create({
  baseURL
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const friendlyMessage = getFriendlyErrorMessage(error);

    if (error.response?.data && typeof error.response.data === "object") {
      error.response.data.message = friendlyMessage;
    }

    error.friendlyMessage = friendlyMessage;

    // A 401 means the stored token is invalid, expired, or (as happened during
    // testing) left over from a different app that shares this localhost origin.
    // Trusting it blindly leaves the app looking logged in while every request
    // silently fails — clear it and send the user back to a real login instead.
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
