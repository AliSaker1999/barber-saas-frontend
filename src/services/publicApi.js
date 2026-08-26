import axios from "axios";
import { resolveDevUrl } from "../utils/platformUrl";

const defaultApiUrl = "https://barber-saas-backend-l4iz.onrender.com/api";
const baseURL = resolveDevUrl(import.meta.env.VITE_API_URL, defaultApiUrl);

// A separate axios instance for the public/guest booking flow. It must never read or
// clear the shared `token`/`user` localStorage keys the main `api` instance uses — a real
// logged-in session on the same device/browser could depend on them — and it must never
// hard-redirect to /login on a 401, since this flow has no login page to send anyone to.
// The guest's own token (from POST /public/tenants/:slug/guest) is attached explicitly
// via setPublicAuthToken below, isolated to this instance only.
const publicApi = axios.create({ baseURL });

export function setPublicAuthToken(token) {
  if (token) {
    publicApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete publicApi.defaults.headers.common.Authorization;
  }
}

export default publicApi;
