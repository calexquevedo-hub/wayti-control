import { useCallback, useEffect, useState } from "react";

const AUTH_KEY = "tiDemand.auth";
const LEGACY_KEY = "ti-demand-auth";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface AuthState {
  id: string;
  email: string;
  name: string;
  profile: any;
  token: string;
  isActive: boolean;
  mustChangePassword: boolean;
  locale?: string;
  theme?: "light" | "dark";
  notificationPrefs?: { email: boolean; slack: boolean };
}

// Simple client-side auth for prototype; replace with server-side auth for production.
export function useAuth() {
  const [user, setUser] = useState<AuthState | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthState;
        setUser(parsed);
        localStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return { ok: false, message: "Credenciais inválidas." } as const;
      }

      const data = (await response.json()) as { token: string; user: AuthState };
      const payload: AuthState = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        profile: data.user.profile,
        isActive: data.user.isActive ?? true,
        mustChangePassword: data.user.mustChangePassword,
        locale: data.user.locale,
        theme: data.user.theme,
        notificationPrefs: data.user.notificationPrefs,
        token: data.token,
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
      setUser(payload);
      return { ok: true } as const;
    } catch (error) {
      return { ok: false, message: "Falha ao conectar na API." } as const;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(LEGACY_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((next: AuthState | null) => {
    if (!next) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(LEGACY_KEY);
      setUser(null);
      return;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  return { user, login, logout, updateUser };
}
