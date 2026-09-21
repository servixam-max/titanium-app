import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveUser,
  getActiveUserId,
  setActiveUserId,
  logoutUser,
  isExplicitlyAuthenticated,
  markExplicitlyAuthenticated,
  SEED_USER,
  loginUser,
} from "./auth";
import { buildApiUrl, isNativeApp, getServerUrl, setServerUrl } from "./api-config";

describe("Client Auth and Initial Login Prompt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null on fresh launch so that login modal is shown first", () => {
    expect(isExplicitlyAuthenticated()).toBe(false);
    expect(getActiveUser()).toBeNull();
  });

  it("returns null even if legacy storage had xam-seed-id before explicit login", () => {
    localStorage.setItem("fortixam_active_user_id", "xam-seed-id");
    // Without explicit auth flag, it must not auto-login
    expect(isExplicitlyAuthenticated()).toBe(false);
    expect(getActiveUser()).toBeNull();
  });

  it("returns active user after explicit login", () => {
    markExplicitlyAuthenticated(true);
    setActiveUserId(SEED_USER.id);
    const active = getActiveUser();
    expect(active).not.toBeNull();
    expect(active?.username).toBe("XAM");
  });

  it("resets active user and explicit auth on logout", () => {
    markExplicitlyAuthenticated(true);
    setActiveUserId(SEED_USER.id);
    expect(getActiveUser()).not.toBeNull();

    logoutUser();
    expect(isExplicitlyAuthenticated()).toBe(false);
    expect(getActiveUserId()).toBeNull();
    expect(getActiveUser()).toBeNull();
  });

  it("authenticates offline with both MUSHROOM and lowercase mushroom", async () => {
    const resUpper = await loginUser("XAM", "MUSHROOM");
    expect(resUpper.success).toBe(true);
    expect(resUpper.user?.username).toBe("XAM");
    expect(isExplicitlyAuthenticated()).toBe(true);

    logoutUser();

    const resLower = await loginUser("servixam@gmail.com", "mushroom");
    expect(resLower.success).toBe(true);
    expect(resLower.user?.email).toBe("servixam@gmail.com");
    expect(isExplicitlyAuthenticated()).toBe(true);
  });
});

describe("API Config and URL builder", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("formats relative paths when not native app", () => {
    expect(buildApiUrl("/api/auth/login")).toBe("/api/auth/login");
  });

  it("preserves full http/https URLs", () => {
    expect(buildApiUrl("http://example.com/api/test")).toBe("http://example.com/api/test");
  });

  it("respects custom server URL when configured", () => {
    setServerUrl("http://192.168.2.107:3001");
    expect(getServerUrl()).toBe("http://192.168.2.107:3001");
  });
});
