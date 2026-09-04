// Service for dispatching verification codes and managing OTP tokens in FORTIXAM

export interface OtpSession {
  email: string;
  code: string;
  expiresAt: number;
}

const OTP_KEY = "fortixam_password_reset_otp";

export function generateVerificationCode(): string {
  // 6-digit random code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function saveOtpSession(email: string, code: string): void {
  if (typeof window === "undefined") return;
  const session: OtpSession = {
    email: email.trim().toLowerCase(),
    code: code.trim(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes validity
  };
  localStorage.setItem(OTP_KEY, JSON.stringify(session));
}

export function getOtpSession(): OtpSession | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(OTP_KEY);
    if (!data) return null;
    const session: OtpSession = JSON.parse(data);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(OTP_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function verifyOtpCode(email: string, inputCode: string): { valid: boolean; error?: string } {
  const session = getOtpSession();
  if (!session) {
    return { valid: false, error: "El código ha caducado o no ha sido solicitado." };
  }
  if (session.email !== email.trim().toLowerCase()) {
    return { valid: false, error: "El correo no coincide con la solicitud de recuperación." };
  }
  if (session.code !== inputCode.trim()) {
    return { valid: false, error: "Código incorrecto. Revisa los 6 dígitos introducidos." };
  }
  return { valid: true };
}

export function clearOtpSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OTP_KEY);
}

// Function to send the verification email with the 6-digit code
export async function sendPasswordResetEmail(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string; devCodeShown?: boolean }> {
  const resendApiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("fortixam_resend_api_key")
      : null;

  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FORTIXAM <onboarding@resend.dev>",
          to: [email],
          subject: `Código de recuperación: ${code} - FORTIXAM`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #0c1017; color: #f3f3f3; padding: 32px 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #10B981; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: 2px;">FORTIXAM</h1>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Seguridad y Recuperación de Cuenta</p>
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">Has solicitado restablecer la contraseña de tu cuenta asociada a <strong>${email}</strong>.</p>
              <div style="text-align: center; margin: 30px 0; background: #161e2e; padding: 24px; border-radius: 16px; border: 1px solid rgba(16,185,129,0.3);">
                <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Tu código de seguridad (15 min)</span>
                <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #10B981;">${code}</span>
              </div>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5;">Si tú no solicitaste este cambio, puedes ignorar este correo. Nadie puede acceder a tu cuenta sin este código.</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        return { success: true, devCodeShown: false };
      }
    } catch (err) {
      console.warn("Error sending via Resend:", err);
    }
  }

  // If no external API key is set, succeed and indicate code can be confirmed locally
  return { success: true, devCodeShown: true };
}
