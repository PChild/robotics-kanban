import type { TimeclockActivity } from "@/types";

export interface KioskConfig {
  activity: TimeclockActivity;
  activityName: string;
}

const KIOSK_STORAGE_KEY = "robotics-timeclock-kiosk";
const KIOSK_STATE_EVENT = "robotics-kiosk-state-change";

function isKioskConfig(value: unknown): value is KioskConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<KioskConfig>;
  return (
    (candidate.activity === "shop" || candidate.activity === "outreach")
    && typeof candidate.activityName === "string"
  );
}

export function getKioskSession() {
  if (typeof window === "undefined") return null;
  const saved = window.sessionStorage.getItem(KIOSK_STORAGE_KEY);
  if (!saved) return null;

  try {
    const parsed: unknown = JSON.parse(saved);
    if (isKioskConfig(parsed)) return parsed;
  } catch {
    // Invalid or obsolete session data is cleared below.
  }

  window.sessionStorage.removeItem(KIOSK_STORAGE_KEY);
  return null;
}

export function startKioskSession(config: KioskConfig) {
  window.sessionStorage.setItem(KIOSK_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(KIOSK_STATE_EVENT));
}

export function clearKioskSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KIOSK_STORAGE_KEY);
  window.dispatchEvent(new Event(KIOSK_STATE_EVENT));
}

export function subscribeToKioskSession(listener: () => void) {
  window.addEventListener(KIOSK_STATE_EVENT, listener);
  window.addEventListener("pageshow", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.removeEventListener(KIOSK_STATE_EVENT, listener);
    window.removeEventListener("pageshow", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}
