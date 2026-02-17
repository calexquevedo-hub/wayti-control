import { useEffect, useState } from "react";

const THEME_KEY = "ti-demand-theme";

export type ThemeMode = "light" | "dark";

// Manages light/dark mode with localStorage persistence.
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return stored ?? "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    setTheme,
  };
}
