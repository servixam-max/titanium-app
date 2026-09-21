// FORTIXAM v8 — client authentication
// Hybrid server-first with offline fallback for MVP continuity.

import { UserAccount, UserProfile } from "./types";
import { buildApiUrl, isNativeApp, detectActiveServer } from "./api-config";

const ACTIVE_USER_ID_KEY = "fortixam_active_user_id";
const ACCESS_TOKEN_KEY = "fortixam_access_token";
const REFRESH_TOKEN_KEY = "fortixam_refresh_token";
const SERVER_USER_KEY = "fortixam_server_user";
const EXPLICIT_AUTH_KEY = "fortixam_explicit_auth_v1";

export function isExplicitlyAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return (
    Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)) ||
    localStorage.getItem(EXPLICIT_AUTH_KEY) === "true"
  );
}

export function markExplicitlyAuthenticated(isAuth: boolean): void {
  if (typeof window === "undefined") return;
  if (isAuth) {
    localStorage.setItem(EXPLICIT_AUTH_KEY, "true");
  } else {
    localStorage.removeItem(EXPLICIT_AUTH_KEY);
  }
}

// Legacy offline accounts (kept for migration/fallback)
const ACCOUNTS_STORAGE_KEY = "fortixam_user_accounts";

export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${password.length}`;
}

export const SEED_USER: UserAccount = {
  id: "xam-seed-id",
  clientId: "offline",
  ownerUserId: "xam-seed-id",
  username: "XAM",
  email: "servixam@gmail.com",
  passwordHash: hashPassword("MUSHROOM"),
  createdAt: "2026-05-01T00:00:00.000Z",
  modifiedAt: "2026-05-01T00:00:00.000Z",
  lastLogin: new Date().toISOString(),
  version: 1,
  avatarColor: "#10B981",
  authProvider: "local",
};

export function getActiveUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_USER_ID_KEY);
}

export function setActiveUserId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_USER_ID_KEY, id);
  else localStorage.removeItem(ACTIVE_USER_ID_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SERVER_USER_KEY);
}

export function getServerUser(): UserAccount | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SERVER_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setServerUser(user: UserAccount | null): void {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(SERVER_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(SERVER_USER_KEY);
}

export async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl("/api/health"), { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(buildApiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "x-refresh-token": refreshToken },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
      if (data.user) setServerUser(data.user);
    }
    return data.accessToken || null;
  } catch {
    return null;
  }
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  let token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const target = typeof input === "string" ? buildApiUrl(input) : input;
  let res = await fetch(target, { ...init, headers });
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(target, { ...init, headers });
    }
  }
  return res;
}

async function serverLogin(email: string, password: string): Promise<AuthResult> {
  try {
    const url = buildApiUrl("/api/auth/login");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || "Error de servidor" };

    const now = new Date().toISOString();
    const user: UserAccount = {
      id: data.user.userId,
      clientId: "server",
      ownerUserId: data.user.userId,
      username: data.user.username,
      email: data.user.email,
      passwordHash: "",
      avatarColor: "#00F59B",
      createdAt: now,
      modifiedAt: now,
      lastLogin: now,
      version: 1,
      serverUserId: data.user.userId,
      authProvider: "local",
    };

    setActiveUserId(user.id);
    setTokens(data.accessToken, data.refreshToken);
    setServerUser(user);
    markExplicitlyAuthenticated(true);
    return { success: true, user, accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch (_err) {
    return { success: false, error: "Sin conexión con el servidor" };
  }
}

async function serverRegister(username: string, email: string, password: string): Promise<AuthResult> {
  try {
    const url = buildApiUrl("/api/auth/register");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || "Error de servidor" };

    const now = new Date().toISOString();
    const user: UserAccount = {
      id: data.user.userId,
      clientId: "server",
      ownerUserId: data.user.userId,
      username: data.user.username,
      email: data.user.email,
      passwordHash: "",
      avatarColor: "#00F59B",
      createdAt: now,
      modifiedAt: now,
      lastLogin: now,
      version: 1,
      serverUserId: data.user.userId,
      authProvider: "local",
    };

    setActiveUserId(user.id);
    setTokens(data.accessToken, data.refreshToken);
    setServerUser(user);
    markExplicitlyAuthenticated(true);
    return { success: true, user, accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch (_err) {
    return { success: false, error: "Sin conexión con el servidor" };
  }
}

// Legacy offline account helpers (fallback)
export function getLegacyAccounts(): UserAccount[] {
  if (typeof window === "undefined") return [SEED_USER];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      saveLegacyAccounts([SEED_USER]);
      return [SEED_USER];
    }
    const accounts: UserAccount[] = JSON.parse(raw);
    if (!accounts.some((a) => a.username.toUpperCase() === "XAM")) {
      accounts.unshift(SEED_USER);
      saveLegacyAccounts(accounts);
    }
    return accounts;
  } catch {
    return [SEED_USER];
  }
}

function saveLegacyAccounts(accounts: UserAccount[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function offlineLogin(usernameOrEmail: string, passwordPlain: string): AuthResult {
  const cleanInput = usernameOrEmail.trim().toLowerCase();
  const accounts = getLegacyAccounts();
  const user = accounts.find(
    (a) => a.username.toLowerCase() === cleanInput || a.email.toLowerCase() === cleanInput
  );
  if (!user) return { success: false, error: "No existe cuenta offline con esos datos." };

  const isSeed = user.id === SEED_USER.id || user.username.toUpperCase() === "XAM";
  const passMatch =
    user.passwordHash === hashPassword(passwordPlain) ||
    (isSeed && (passwordPlain === "MUSHROOM" || passwordPlain.toLowerCase() === "mushroom"));

  if (!passMatch) {
    return { success: false, error: "Contraseña incorrecta." };
  }
  setActiveUserId(user.id);
  setServerUser(user);
  markExplicitlyAuthenticated(true);
  return { success: true, user };
}

function offlineRegister(username: string, email: string, passwordPlain: string): AuthResult {
  const accounts = getLegacyAccounts();
  const exists = accounts.some(
    (a) => a.username.toLowerCase() === username.toLowerCase() || a.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) return { success: false, error: "Ese usuario o correo ya existe en modo offline." };

  const now = new Date().toISOString();
  const colors = ["#10B981", "#00E1FF", "#7C3AED", "#FF6B00", "#FF007A"];
  const user: UserAccount = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    clientId: "offline",
    ownerUserId: `local_${Date.now()}`,
    username,
    email,
    passwordHash: hashPassword(passwordPlain),
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    createdAt: now,
    modifiedAt: now,
    lastLogin: now,
    version: 1,
    authProvider: "local",
  };
  accounts.push(user);
  saveLegacyAccounts(accounts);
  setActiveUserId(user.id);
  setServerUser(user);
  markExplicitlyAuthenticated(true);
  return { success: true, user };
}

export async function loginUser(usernameOrEmail: string, passwordPlain: string): Promise<AuthResult> {
  const cleanInput = usernameOrEmail.trim().toLowerCase();

  // On native mobile app, auto-detect active server if possible
  if (isNativeApp()) {
    try {
      await detectActiveServer();
    } catch {}
  }

  // 1. Try server login if server endpoint is available
  try {
    const serverResult = await serverLogin(usernameOrEmail, passwordPlain);
    if (serverResult.success) return serverResult;

    // If server rejected with a specific credential error (e.g. wrong password), don't silently ignore if user intended server login
    if (serverResult.error && serverResult.error !== "Sin conexión con el servidor") {
      const offline = offlineLogin(usernameOrEmail, passwordPlain);
      if (offline.success) return offline;
      return serverResult;
    }
  } catch {}

  // 2. Fallback to offline accounts
  const offline = offlineLogin(usernameOrEmail, passwordPlain);
  if (offline.success) return offline;

  // 3. If default seed user credentials matched
  if (cleanInput === "xam" || cleanInput === "servixam@gmail.com") {
    if (passwordPlain === "MUSHROOM" || passwordPlain.toLowerCase() === "mushroom") {
      setActiveUserId(SEED_USER.id);
      setServerUser(SEED_USER);
      markExplicitlyAuthenticated(true);
      return { success: true, user: SEED_USER };
    }
    return { success: false, error: "Contraseña incorrecta." };
  }

  // 4. Return offline error rather than misleading "Sin conexión con el servidor"
  return {
    success: false,
    error: offline.error || "No existe cuenta offline con esos datos. Pulsa 'CREAR CUENTA' o 'Entrar sin conexión'.",
  };
}

export async function registerUser(username: string, email: string, passwordPlain: string): Promise<AuthResult> {
  try {
    const serverResult = await serverRegister(username, email, passwordPlain);
    if (serverResult.success) return serverResult;
  } catch {}

  const offline = offlineRegister(username, email, passwordPlain);
  return offline;
}

export async function fetchMe(): Promise<{ user?: UserAccount; profile?: UserProfile; error?: string }> {
  const res = await fetchWithAuth("/api/auth/me");
  if (!res.ok) {
    return { error: "No se pudo obtener el perfil" };
  }
  const data = await res.json();
  if (data.user) setServerUser(data.user);
  return { user: data.user, profile: data.profile };
}

export function logoutUser(): void {
  clearTokens();
  setActiveUserId(null);
  markExplicitlyAuthenticated(false);
}

export function getActiveUser(): UserAccount | null {
  // If the user has not explicitly authenticated in this app, show login prompt
  if (!isExplicitlyAuthenticated()) {
    return null;
  }

  // 1. Check server user
  const serverUser = getServerUser();
  if (serverUser) return serverUser;

  // 2. Check active user ID in local legacy accounts
  const activeId = getActiveUserId();
  const accounts = getLegacyAccounts();
  if (activeId) {
    const found = accounts.find((a) => a.id === activeId);
    if (found) return found;
  }

  return null;
}

// Legacy offline account compatibility helpers
export function getAllAccounts(): UserAccount[] {
  return getLegacyAccounts();
}

export function resetUserPassword(
  email: string,
  newPasswordPlain: string,
  verificationCode: string,
): { success: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getLegacyAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);
  if (idx === -1) return { success: false, error: "No se encontró cuenta offline con este correo." };
  if (!verificationCode || verificationCode.trim().length !== 6) {
    return { success: false, error: "Debes ingresar el código de verificación de 6 dígitos." };
  }
  accounts[idx].passwordHash = hashPassword(newPasswordPlain);
  saveLegacyAccounts(accounts);
  return { success: true };
}
