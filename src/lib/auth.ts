// FORTIXAM v8 — client authentication
// Hybrid server-first with offline fallback for MVP continuity.

import { UserAccount, UserProfile } from "./types";

const ACTIVE_USER_ID_KEY = "fortixam_active_user_id";
const ACCESS_TOKEN_KEY = "fortixam_access_token";
const REFRESH_TOKEN_KEY = "fortixam_refresh_token";
const SERVER_USER_KEY = "fortixam_server_user";

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
    const res = await fetch("/api/health", { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch("/api/auth/refresh", {
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

  let res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(input, { ...init, headers });
    }
  }
  return res;
}

async function serverLogin(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
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
      avatarColor: "#00D68F",
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
    return { success: true, user, accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch (_err) {
    return { success: false, error: "Sin conexión con el servidor" };
  }
}

async function serverRegister(username: string, email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
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
      avatarColor: "#00D68F",
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
    return { success: true, user, accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch (_err) {
    return { success: false, error: "Sin conexión con el servidor" };
  }
}

// Legacy offline account helpers (fallback)
function getLegacyAccounts(): UserAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
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
  if (user.passwordHash !== hashPassword(passwordPlain)) {
    return { success: false, error: "Contraseña incorrecta." };
  }
  setActiveUserId(user.id);
  setServerUser(user);
  return { success: true, user };
}

function offlineRegister(username: string, email: string, passwordPlain: string): AuthResult {
  const accounts = getLegacyAccounts();
  const exists = accounts.some(
    (a) => a.username.toLowerCase() === username.toLowerCase() || a.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) return { success: false, error: "Ese usuario o correo ya existe en modo offline." };

  const now = new Date().toISOString();
  const colors = ["#00D68F", "#00E1FF", "#7C3AED", "#FF6B00", "#FF007A"];
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
  return { success: true, user };
}

export async function loginUser(usernameOrEmail: string, passwordPlain: string): Promise<AuthResult> {
  const serverResult = await serverLogin(usernameOrEmail, passwordPlain);
  if (serverResult.success) return serverResult;

  // Fallback to offline accounts when server unavailable
  const offline = offlineLogin(usernameOrEmail, passwordPlain);
  if (offline.success) return offline;

  return serverResult;
}

export async function registerUser(username: string, email: string, passwordPlain: string): Promise<AuthResult> {
  const serverResult = await serverRegister(username, email, passwordPlain);
  if (serverResult.success) return serverResult;

  const offline = offlineRegister(username, email, passwordPlain);
  if (offline.success) return offline;

  return serverResult;
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
}

export function getActiveUser(): UserAccount | null {
  return getServerUser();
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
