import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LAST_ACTIVITY_KEY = "tiDemand.lastActivityAt";
const FORCE_LOGOUT_KEY = "tiDemand.forceLogoutAt";
const LOGOUT_REASON_KEY = "tiDemand.logoutReason";

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_WARNING_MS = 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "focus",
];

function readNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTimeoutMs() {
  const configured = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 60_000 ? configured : DEFAULT_TIMEOUT_MS;
}

function getWarningMs(timeoutMs: number) {
  const configured = Number(import.meta.env.VITE_IDLE_WARNING_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, Math.max(timeoutMs - 5_000, 1_000));
  }
  return Math.min(DEFAULT_WARNING_MS, Math.max(timeoutMs - 5_000, 1_000));
}

interface UseInactivityLogoutOptions {
  enabled: boolean;
  onLogout: () => void;
}

export function useInactivityLogout({ enabled, onLogout }: UseInactivityLogoutOptions) {
  const timeoutMs = useMemo(() => getTimeoutMs(), []);
  const warningMs = useMemo(() => getWarningMs(timeoutMs), [timeoutMs]);
  const [remainingMs, setRemainingMs] = useState(timeoutMs);
  const [warningOpen, setWarningOpen] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastPersistRef = useRef(0);
  const loggedOutRef = useRef(false);

  const performLogout = useCallback(() => {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;
    localStorage.setItem(LOGOUT_REASON_KEY, "inactive");
    localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()));
    onLogout();
  }, [onLogout]);

  const syncActivity = useCallback(
    (timestamp = Date.now()) => {
      lastActivityRef.current = timestamp;
      setRemainingMs(timeoutMs);
      setWarningOpen(false);
      if (timestamp - lastPersistRef.current < 1_000) return;
      lastPersistRef.current = timestamp;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
    },
    [timeoutMs]
  );

  useEffect(() => {
    if (!enabled) {
      loggedOutRef.current = false;
      setWarningOpen(false);
      setRemainingMs(timeoutMs);
      return;
    }

    const storedActivity = readNumber(localStorage.getItem(LAST_ACTIVITY_KEY));
    const startingPoint = storedActivity ?? Date.now();
    syncActivity(startingPoint);

    const handleActivity = () => syncActivity();
    const handleVisibility = () => {
      if (!document.hidden) syncActivity();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY) {
        const timestamp = readNumber(event.newValue);
        if (!timestamp) return;
        lastActivityRef.current = timestamp;
        setRemainingMs(Math.max(timeoutMs - (Date.now() - timestamp), 0));
        setWarningOpen(false);
        return;
      }
      if (event.key === FORCE_LOGOUT_KEY && event.newValue) {
        performLogout();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);

    const timer = window.setInterval(() => {
      const remaining = timeoutMs - (Date.now() - lastActivityRef.current);
      setRemainingMs(Math.max(remaining, 0));
      if (remaining <= 0) {
        performLogout();
        return;
      }
      setWarningOpen(remaining <= warningMs);
    }, 1_000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(timer);
    };
  }, [enabled, performLogout, syncActivity, timeoutMs, warningMs]);

  const continueSession = useCallback(() => {
    if (!enabled) return;
    syncActivity();
  }, [enabled, syncActivity]);

  return {
    warningOpen: enabled && warningOpen,
    remainingSeconds: Math.ceil(remainingMs / 1_000),
    continueSession,
    timeoutMinutes: Math.round(timeoutMs / 60_000),
    warningSeconds: Math.ceil(warningMs / 1_000),
  };
}

export const inactivityLogoutStorageKeys = {
  lastActivity: LAST_ACTIVITY_KEY,
  forceLogout: FORCE_LOGOUT_KEY,
  reason: LOGOUT_REASON_KEY,
};
