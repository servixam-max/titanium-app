import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyTheme, getStoredTheme } from "./theme";

describe("Theme Management Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("defaults to dark theme when nothing is stored", () => {
    expect(getStoredTheme()).toBe("dark");
  });

  it("applies light theme correctly to documentElement", () => {
    applyTheme("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("fortixam-theme")).toBe("light");
  });

  it("applies dark theme correctly to documentElement", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(localStorage.getItem("fortixam-theme")).toBe("dark");
  });

  it("applies system preference when theme is system", () => {
    // Mock matchMedia returning false (light)
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    applyTheme("system");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("fortixam-theme")).toBe("system");

    // Mock matchMedia returning true (dark)
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
