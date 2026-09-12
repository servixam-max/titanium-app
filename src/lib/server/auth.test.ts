import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "./auth";

describe("server auth", () => {
  it("hashes and verifies passwords", () => {
    const hash = hashPassword("MUSHROOM");
    expect(verifyPassword("MUSHROOM", hash)).toBe(true);
    expect(verifyPassword("mushroom", hash)).toBe(false);
  });

  it("signs and verifies access tokens", () => {
    const token = signAccessToken({ userId: "u1", email: "a@b.com", username: "XAM" });
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe("u1");
    expect(payload.email).toBe("a@b.com");
  });

  it("signs and verifies refresh tokens", () => {
    const token = signRefreshToken({ userId: "u1", email: "a@b.com", username: "XAM" });
    const payload = verifyRefreshToken(token);
    expect(payload.userId).toBe("u1");
  });
});
