export type AppTheme = "dark" | "light" | "system";

const STORAGE_KEY = "fortixam-theme";
const DARK_THEME_COLOR = "#0A0B10";
const LIGHT_THEME_COLOR = "#F8FAFC";

let systemListenerAttached = false;
let currentActiveTheme: AppTheme = "dark";

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "dark" || val === "light" || val === "system") {
      return val;
    }
  } catch {
    // localStorage may be disabled or inaccessible
  }
  return "dark";
}

export function isSystemDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: AppTheme): void {
  if (typeof window === "undefined") return;

  currentActiveTheme = theme;

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage quota or access errors
  }

  const isDark = theme === "dark" || (theme === "system" && isSystemDark());

  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }

  // Update theme-color meta tag for browser / Android status bar
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }

  // Attach system listener once if in system mode
  if (theme === "system" && !systemListenerAttached && window.matchMedia) {
    systemListenerAttached = true;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (currentActiveTheme === "system") {
        applyTheme("system");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
    } else if ("addListener" in mediaQuery) {
      // Legacy browser support
      (mediaQuery as unknown as { addListener: (cb: () => void) => void }).addListener(handler);
    }
  }
}

export function initTheme(): void {
  const theme = getStoredTheme();
  applyTheme(theme);
}
