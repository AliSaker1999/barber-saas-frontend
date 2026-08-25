import { Capacitor } from "@capacitor/core";

// The Android emulator can't reach the host machine via "localhost" — that
// resolves to the emulator itself. It needs the special 10.0.2.2 alias
// instead. Swap it in automatically when running as a native Android app, so
// the same .env value works for both a browser and the emulator without
// hand-editing it every time you switch between them. Production URLs (which
// never contain "localhost") pass through untouched either way.
export function resolveDevUrl(envValue, fallback) {
  const url = envValue || fallback;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    return url.replace("localhost", "10.0.2.2");
  }
  return url;
}
