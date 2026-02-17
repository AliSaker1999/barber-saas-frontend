export function parseNotificationData(data) {
  if (!data) return {};
  if (typeof data === "object") return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return {};
}

export function getNotificationPath(notification, userRoles = []) {
  const basePath = userRoles?.includes("CUSTOMER") ? "/customer" : "/company";
  const payload = parseNotificationData(notification?.Data);
  const targetPage = payload.targetPage;
  const tenantSegment = payload.tenantId ? `tenantId=${payload.tenantId}` : "";

  if (payload.type === "RATING") {
    const barberParam = payload.barberId ? `&barberId=${payload.barberId}` : "";
    if (payload.appointmentId) {
      return `${basePath}/appointments?rate=true&appointmentId=${payload.appointmentId}${barberParam}`;
    }
    if (payload.queueId) {
      const tenantParam = payload.tenantId ? `&tenantId=${payload.tenantId}` : "";
      return `${basePath}/queue?rate=true&queueId=${payload.queueId}${tenantParam}${barberParam}`;
    }
  }

  if (targetPage === "appointments" || payload.appointmentId) {
    const params = new URLSearchParams();
    if (payload.appointmentId) params.set("appointmentId", payload.appointmentId);
    if (tenantSegment) params.set("tenantId", payload.tenantId);
    const query = params.toString();
    return `${basePath}/appointments${query ? `?${query}` : ""}`;
  }

  if (targetPage === "queue" || payload.queueId || payload.tenantId) {
    const params = new URLSearchParams();
    if (payload.queueId) params.set("queueId", payload.queueId);
    if (payload.tenantId) params.set("tenantId", payload.tenantId);
    const query = params.toString();
    return `${basePath}/queue${query ? `?${query}` : ""}`;
  }

  if (notification?.Type === "PAYMENT_REPORT") {
    if (payload.appointmentId) return `/company/appointments?appointmentId=${payload.appointmentId}`;
    if (payload.queueId) return `/company/queue?queueId=${payload.queueId}`;
  }

  return `${basePath}/notifications`;
}
