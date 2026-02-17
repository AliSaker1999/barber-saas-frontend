const FRIENDLY_MESSAGES = [
  { code: 400, message: "Some information is invalid. Please review and try again." },
  { code: 401, message: "Invalid email or password." },
  { code: 403, message: "You do not have permission to perform this action." },
  { code: 404, message: "The requested resource was not found." },
  { code: 409, message: "This action conflicts with existing data." },
  { code: 422, message: "Please check your input and try again." },
  { code: 429, message: "Too many requests. Please wait a moment and try again." },
  { code: 500, message: "Server error. Please try again in a moment." },
  { code: 502, message: "Service is temporarily unavailable. Please try again soon." },
  { code: 503, message: "Service is temporarily unavailable. Please try again soon." },
  { code: 504, message: "Server timeout. Please try again." }
];

const RAW_ERROR_PATTERNS = /sql|stack|exception|trace|sequelize|syntax error|violation|internal|timeout of \d+ms exceeded/i;

export function getFriendlyErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (typeof serverMessage === "string" && serverMessage.trim() && !RAW_ERROR_PATTERNS.test(serverMessage)) {
    return serverMessage;
  }

  if (status) {
    const mapped = FRIENDLY_MESSAGES.find(item => item.code === status);
    if (mapped) return mapped.message;
    if (status >= 500) return "Server error. Please try again in a moment.";
  }

  if (error?.code === "ERR_NETWORK") {
    return "Network issue detected. Check your connection and try again.";
  }

  return fallback;
}
