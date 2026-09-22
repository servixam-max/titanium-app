"use client";

import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Zap,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  loginUser,
  registerUser,
  resetUserPassword,
  getActiveUser,
  getAllAccounts,
  SEED_USER,
  setActiveUserId,
  markExplicitlyAuthenticated,
} from "@/lib/auth";
import { getServerUrl, detectActiveServer } from "@/lib/api-config";
import {
  generateVerificationCode,
  saveOtpSession,
  verifyOtpCode,
  sendPasswordResetEmail,
} from "@/lib/email-service";
import { haptics } from "@/lib/haptics";
import { playExerciseStart } from "@/lib/audio";
import { syncNow } from "@/lib/sync";

export default function AuthModal() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">("login");

  // Server connectivity status
  const [serverStatus, setServerStatus] = useState<"checking" | "connected" | "offline">("checking");
  const [serverDisplayUrl, setServerDisplayUrl] = useState<string>("");

  // Form states
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register specific
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Forgot password 3-step state
  const [forgotStep, setForgotStep] = useState<"email" | "code" | "new_password">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  // Feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mounted, setMounted] = useState(false);

  // Auto-detect server on mount
  useEffect(() => {
    let alive = true;
    detectActiveServer().then((url) => {
      if (!alive) return;
      if (url) {
        setServerStatus("connected");
        setServerDisplayUrl(url.replace(/^https?:\/\//, ""));
      } else {
        setServerStatus("offline");
        const fallback = getServerUrl();
        setServerDisplayUrl(fallback ? fallback.replace(/^https?:\/\//, "") : "Offline");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Check active user on mount
  useEffect(() => {
    setMounted(true);
    const active = getActiveUser();
    if (active && !currentUser) {
      setCurrentUser(active);
    }
  }, [currentUser, setCurrentUser]);

  // If not mounted or already logged in, do not render modal
  if (!mounted || currentUser) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const res = await loginUser(usernameOrEmail, password);
      if (res.success && res.user) {
        haptics.success();
        playExerciseStart();
        setCurrentUser(res.user);
        syncNow().catch(() => {});
      } else {
        haptics.error();
        setErrorMsg(res.error || "Error al iniciar sesión");
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      haptics.error();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerUser(regUsername, regEmail, regPassword);
      if (res.success && res.user) {
        haptics.success();
        playExerciseStart();
        setCurrentUser(res.user);
        syncNow().catch(() => {});
      } else {
        haptics.error();
        setErrorMsg(res.error || "Error al registrar la cuenta");
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado al registrarse");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Send verification code to email
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = forgotEmail.trim().toLowerCase();
    const accounts = getAllAccounts();
    const account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!account) {
      haptics.error();
      setErrorMsg("No existe ninguna cuenta registrada con este correo electrónico.");
      return;
    }

    setIsSubmitting(true);
    try {
      const code = generateVerificationCode();
      saveOtpSession(cleanEmail, code);
      const res = await sendPasswordResetEmail(cleanEmail, code);

      if (res.success) {
        haptics.success();
        setSuccessMsg(`Código de 6 dígitos enviado a tu correo.`);
        setForgotStep("code");
      } else {
        haptics.error();
        setErrorMsg(res.error || "No se pudo enviar el correo de verificación.");
      }
    } catch {
      setErrorMsg("Error al procesar la solicitud de recuperación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Validate code
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = forgotEmail.trim().toLowerCase();
    const cleanCode = verificationCode.trim();

    if (cleanCode.length !== 6) {
      setErrorMsg("El código de verificación debe contener exactamente 6 dígitos.");
      haptics.error();
      return;
    }

    const check = verifyOtpCode(cleanEmail, cleanCode);
    if (!check.valid) {
      haptics.error();
      setErrorMsg(check.error || "Código incorrecto o caducado.");
      return;
    }

    haptics.success();
    setSuccessMsg("¡Código verificado! Ahora define tu nueva contraseña.");
    setForgotStep("new_password");
  };

  // Step 3: Set new password
  const handleSetNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      haptics.error();
      return;
    }

    if (forgotNewPassword.length < 4) {
      setErrorMsg("La nueva contraseña debe tener al menos 4 caracteres.");
      haptics.error();
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const res = resetUserPassword(cleanEmail, forgotNewPassword, verificationCode);
      if (res.success) {
        haptics.success();
        playExerciseStart();
        setSuccessMsg("¡Contraseña actualizada con éxito! Redirigiendo...");
        setTimeout(() => {
          setActiveTab("login");
          setForgotStep("email");
          setUsernameOrEmail(cleanEmail);
          setPassword(forgotNewPassword);
          setForgotEmail("");
          setVerificationCode("");
          setForgotNewPassword("");
          setForgotConfirmPassword("");
          setSuccessMsg("");
        }, 1500);
      } else {
        haptics.error();
        setErrorMsg(res.error || "No se pudo restablecer la contraseña");
      }
    } catch {
      setErrorMsg("Ocurrió un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="fx-card-raised relative my-auto flex w-full max-w-md flex-col overflow-hidden p-6 sm:p-8">
        {/* Ambient Glows */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/10 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-[70px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 p-0.5 mb-3 shadow-sm flex items-center justify-center text-primary">
            <Zap className="w-7 h-7 fill-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-slate-900 dark:text-white uppercase font-mono">
            FORTIXAM
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-[280px]">
            Inicia sesión para acceder a tu entrenamiento y progreso.
          </p>
        </div>

        {/* Server Connectivity Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] mb-4 relative z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                serverStatus === "connected"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  : serverStatus === "checking"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-zinc-500"
              }`}
            />
            <span className="fx-label-sm truncate">
              {serverStatus === "connected"
                ? `Servidor: ${serverDisplayUrl}`
                : serverStatus === "checking"
                ? "Buscando servidor..."
                : "Modo Local / Servidor desconectado"}
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setServerStatus("checking");
              const active = await detectActiveServer();
              if (active) {
                setServerStatus("connected");
                setServerDisplayUrl(active.replace(/^https?:\/\//, ""));
                haptics.success();
              } else {
                setServerStatus("offline");
                haptics.error();
              }
            }}
            className="text-slate-400 hover:text-primary dark:text-zinc-400 dark:hover:text-primary p-1 cursor-pointer transition-colors"
            title="Reintentar conexión con servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${serverStatus === "checking" ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" aria-label="Acceso" className="fx-segmented relative z-10 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            aria-selected={activeTab === "login"}
            className="fx-segmented-item"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            aria-selected={activeTab === "register"}
            className="fx-segmented-item"
          >
            Crear cuenta
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 mb-4 animate-fade-in-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 mb-4 animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5 relative z-10">
            <div>
              <label className="fx-label-sm mb-1.5 block">
                Usuario o Correo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Nombre de usuario o correo"
                  className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="fx-label-sm mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-10 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="fx-press flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--fx-radius-control)] bg-primary text-[17px] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.success();
                playExerciseStart();
                markExplicitlyAuthenticated(true);
                setActiveUserId(SEED_USER.id);
                setCurrentUser(SEED_USER);
              }}
              className="fx-inset fx-press flex h-[50px] w-full items-center justify-center gap-2 text-[15px] font-semibold text-foreground"
            >
              <Zap className="w-3.5 h-3.5 text-primary fill-primary" />
              Entrar en Modo Offline (Sin Servidor)
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("forgot");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="text-xs text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors text-center mt-2 underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3 relative z-10">
            <div>
              <label className="fx-label-sm mb-1.5 block">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Tu nombre o apodo"
                  className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="fx-label-sm mb-1.5 block">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="fx-label-sm mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="fx-label-sm mb-1.5 block">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
              Tu cuenta se creará con un perfil limpio (0 entrenamientos y 0 pesos registrados).
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="fx-press flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--fx-radius-control)] bg-primary text-[17px] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Crear Cuenta Nueva
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD (OPTION B - 3 STEPS) */}
        {activeTab === "forgot" && (
          <div className="flex flex-col gap-3.5 relative z-10">
            {/* STEP 1: Enter Email */}
            {forgotStep === "email" && (
              <form onSubmit={handleRequestCode} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span>Recuperar contraseña</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Paso 1 de 3
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Introduce el correo registrado en tu cuenta para enviarte un código de seguridad de 6 dígitos.
                </p>

                <div>
                  <label className="fx-label-sm mb-1.5 block">
                    Correo Registrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="fx-press flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--fx-radius-control)] bg-primary text-[17px] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Enviando..." : "Enviar Código de Seguridad"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors text-center mt-1 underline"
                >
                  Volver a Iniciar Sesión
                </button>
              </form>
            )}

            {/* STEP 2: Enter Verification Code */}
            {forgotStep === "code" && (
              <form onSubmit={handleVerifyCode} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("email");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cambiar correo</span>
                  </button>
                  <span className="text-[10px] font-mono uppercase bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                    Paso 2 de 3
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-[#131626] border border-slate-200 dark:border-white/10 rounded-xl p-3">
                  <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400">Código enviado a:</div>
                  <div className="text-xs font-mono font-bold text-primary truncate mt-0.5">
                    {forgotEmail}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-600 dark:text-zinc-400 uppercase font-bold tracking-wider block mb-1 text-center">
                    Introduce el Código de 6 Dígitos
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoFocus
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full h-14 bg-slate-50 dark:bg-[#131626] border border-primary/50 rounded-xl text-center text-2xl font-mono font-black tracking-[0.4em] text-primary focus:outline-none focus:border-primary transition-all placeholder:tracking-normal placeholder:text-slate-300 dark:placeholder:text-zinc-600 shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || verificationCode.trim().length !== 6}
                  className="fx-press flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--fx-radius-control)] bg-primary text-[17px] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verificar Código
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={isSubmitting}
                    className="text-xs text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reenviar código
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("login");
                      setForgotStep("email");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors underline"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Define New Password */}
            {forgotStep === "new_password" && (
              <form onSubmit={handleSetNewPassword} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Nueva contraseña</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Paso 3 de 3
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Identidad verificada para <span className="text-primary font-mono font-bold">{forgotEmail}</span>. Introduce tu nueva contraseña.
                </p>

                <div>
                  <label className="fx-label-sm mb-1.5 block">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    />
                  </div>
                </div>

                <div>
                  <label className="fx-label-sm mb-1.5 block">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="h-12 w-full rounded-[var(--fx-radius-control)] bg-[var(--fx-inset)] pl-10 pr-3 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="fx-press flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--fx-radius-control)] bg-primary text-[17px] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <KeyRound className="w-4 h-4" />
                  {isSubmitting ? "Actualizando..." : "Guardar Nueva Contraseña"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setForgotStep("email");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors text-center mt-1 underline"
                >
                  Cancelar
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
