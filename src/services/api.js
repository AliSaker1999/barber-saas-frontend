import axios from "axios";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

const defaultApiUrl = "https://barber-saas-backend-l4iz.onrender.com/api";
const baseURL = import.meta.env.VITE_API_URL || defaultApiUrl;

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
    return Promise.reject(error);
  }
);

export default api;
