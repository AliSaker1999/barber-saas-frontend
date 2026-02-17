import api from "./api";

export async function initiateForgotPassword(identity) {
  const response = await api.post("/auth/forgot-password/initiate", { identity });
  return response.data?.data || {};
}

export async function verifyForgotPasswordPhone({ identity, phoneNumber }) {
  const response = await api.post("/auth/forgot-password/verify-phone", {
    email: identity,
    phoneNumber
  });
  return response.data?.data || response.data;
}

export async function resetForgotPassword({ identity, code, newPassword }) {
  const response = await api.post("/auth/forgot-password/reset", {
    identity,
    code,
    newPassword
  });
  return response.data;
}