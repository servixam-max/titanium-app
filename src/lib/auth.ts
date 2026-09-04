// Multi-user authentication and profile management for FORTIXAM
// Offline-first architecture with local encrypted/hashed storage

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLogin: string;
  avatarColor?: string;
}

const ACCOUNTS_STORAGE_KEY = "fortixam_user_accounts";
const ACTIVE_USER_ID_KEY = "fortixam_active_user_id";

// Primary pre-seeded account for user XAM
export const SEED_USER: UserAccount = {
  id: "xam-seed-id",
  username: "XAM",
  email: "xam@fortixam.com",
  passwordHash: hashPassword("MUSHROOM"),
  createdAt: "2026-05-01T00:00:00.000Z",
  lastLogin: new Date().toISOString(),
  avatarColor: "#00D27F",
};

function hashPassword(password: string): string {
  // Simple deterministic hash for offline WebView authentication
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${password.length}`;
}

export function getAllAccounts(): UserAccount[] {
  if (typeof window === "undefined") return [SEED_USER];
  try {
    const data = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!data) {
      // Initialize with default SEED_USER and make it active on initial launch
      saveAllAccounts([SEED_USER]);
      localStorage.setItem(ACTIVE_USER_ID_KEY, SEED_USER.id);
      return [SEED_USER];
    }
    const accounts: UserAccount[] = JSON.parse(data);
    // Ensure SEED_USER always exists and has valid password
    const hasSeed = accounts.some((a) => a.username.toUpperCase() === "XAM");
    if (!hasSeed) {
      accounts.push(SEED_USER);
      saveAllAccounts(accounts);
    }
    return accounts;
  } catch {
    return [SEED_USER];
  }
}

export function saveAllAccounts(accounts: UserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error("Error saving accounts:", err);
  }
}

export function getActiveUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_USER_ID_KEY);
}

export function getActiveUser(): UserAccount | null {
  if (typeof window === "undefined") return null;
  const activeId = getActiveUserId();
  if (!activeId) return null;
  const accounts = getAllAccounts();
  const found = accounts.find((a) => a.id === activeId);
  return found || null;
}

export function setActiveUser(user: UserAccount | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
  } else {
    localStorage.setItem(ACTIVE_USER_ID_KEY, user.id);
    // Update lastLogin
    const accounts = getAllAccounts();
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx !== -1) {
      accounts[idx].lastLogin = new Date().toISOString();
      saveAllAccounts(accounts);
    }
  }
}

export function loginUser(
  usernameOrEmail: string,
  passwordPlain: string
): { success: boolean; user?: UserAccount; error?: string } {
  const cleanInput = usernameOrEmail.trim().toLowerCase();
  const accounts = getAllAccounts();
  const user = accounts.find(
    (a) =>
      a.username.toLowerCase() === cleanInput ||
      a.email.toLowerCase() === cleanInput
  );

  if (!user) {
    return {
      success: false,
      error: "No existe ninguna cuenta con ese usuario o correo.",
    };
  }

  const expectedHash = hashPassword(passwordPlain);
  if (user.passwordHash !== expectedHash) {
    return {
      success: false,
      error: "Contraseña incorrecta. Inténtalo de nuevo.",
    };
  }

  setActiveUser(user);
  return { success: true, user };
}

export function registerUser(
  username: string,
  email: string,
  passwordPlain: string
): { success: boolean; user?: UserAccount; error?: string } {
  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanUsername.length < 2) {
    return {
      success: false,
      error: "El nombre de usuario debe tener al menos 2 caracteres.",
    };
  }
  if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    return {
      success: false,
      error: "Por favor, introduce un correo electrónico válido.",
    };
  }
  if (passwordPlain.length < 4) {
    return {
      success: false,
      error: "La contraseña debe tener al menos 4 caracteres.",
    };
  }

  const accounts = getAllAccounts();
  const userExists = accounts.some(
    (a) =>
      a.username.toLowerCase() === cleanUsername.toLowerCase() ||
      a.email.toLowerCase() === cleanEmail
  );

  if (userExists) {
    return {
      success: false,
      error: "Ese nombre de usuario o correo ya está registrado.",
    };
  }

  const colors = ["#00F59B", "#00F0FF", "#CCFF00", "#FF6B00", "#9D00FF", "#FF007A"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const newUser: UserAccount = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: hashPassword(passwordPlain),
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    avatarColor: randomColor,
  };

  accounts.push(newUser);
  saveAllAccounts(accounts);
  setActiveUser(newUser);

  return { success: true, user: newUser };
}

export function resetUserPassword(
  email: string,
  newPasswordPlain: string
): { success: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAllAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);

  if (idx === -1) {
    return {
      success: false,
      error: "No se encontró ninguna cuenta asociada a este correo.",
    };
  }

  if (newPasswordPlain.length < 4) {
    return {
      success: false,
      error: "La nueva contraseña debe tener al menos 4 caracteres.",
    };
  }

  accounts[idx].passwordHash = hashPassword(newPasswordPlain);
  saveAllAccounts(accounts);
  return { success: true };
}

export function logoutUser(): void {
  setActiveUser(null);
}
