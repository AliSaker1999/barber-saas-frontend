import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

let initialized = false;

export async function initPushNotifications({ onToken, onNotification } = {}) {
  if (initialized) return;
  initialized = true;

  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // Ignore permission errors.
    }
  }

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const permissions = await PushNotifications.requestPermissions();
    if (permissions.receive !== "granted") {
      return;
    }

    await PushNotifications.addListener("registration", token => {
      if (onToken) onToken(token.value);
    });

    await PushNotifications.addListener("registrationError", error => {
      console.error("Push registration error:", error);
    });

    await PushNotifications.addListener("pushNotificationReceived", notification => {
      if (onNotification) onNotification(notification);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", notification => {
      if (onNotification) onNotification(notification.notification || notification);
    });

    if (Capacitor.getPlatform() === "android") {
      try {
        await PushNotifications.createChannel({
          id: "default",
          name: "General",
          description: "General notifications",
          importance: 5,
          visibility: 1,
          sound: "default"
        });
      } catch {
        // Channel may already exist.
      }
    }

    await PushNotifications.register();
  } catch {
    // Keep app functional even when native push setup is incomplete.
  }
}

export function showClientNotification({ title, body, data, tag, onClick } = {}) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const notification = new Notification(title || "Ajmal", {
    body: body || "You have a new update",
    data,
    tag
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }
}
