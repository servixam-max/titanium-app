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
} from "@/lib/auth";
import {
  generateVerificationCode,
  saveOtpSession,
  verifyOtpCode,
  sendPasswordResetEmail,
} from "@/lib/email-service";
import { haptics } from "@/lib/haptics";
import { playExerciseStart } from "@/lib/audio";

export default function AuthModal() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">("login");

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
  const [localDevCode, setLocalDevCode] = useState<string | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  // Feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check active user on mount
  useEffect(() => {
    const active = getActiveUser();
    if (active && !currentUser) {
      setCurrentUser(active);
    }
  }, [currentUser, setCurrentUser]);

  // If already logged in, do not render modal
  if (currentUser) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const res = loginUser(usernameOrEmail, password);
      if (res.success && res.user) {
        haptics.success();
        playExerciseStart();
        setCurrentUser(res.user);
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

  const handleRegister = (e: React.FormEvent) => {
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
      const res = registerUser(regUsername, regEmail, regPassword);
      if (res.success && res.user) {
        haptics.success();
        playExerciseStart();
        setCurrentUser(res.user);
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
        if (res.devCodeShown) {
          setLocalDevCode(code);
        } else {
          setLocalDevCode(null);
        }
        setSuccessMsg(`Código de 6 dígitos enviado a ${cleanEmail}.`);
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
          setLocalDevCode(null);
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
    <div className="fixed inset-0 z-[9999] bg-[#07090e]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#0f131a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col my-auto">
        {/* Neon Ambient Background Glows */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/20 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-cyan-500/20 rounded-full blur-[70px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#141b2a] border border-white/10 p-0.5 mb-3 shadow-lg flex items-center justify-center text-emerald-400">
            <Zap className="w-7 h-7 fill-emerald-400" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white uppercase font-mono">
            FORTIXAM
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
            Inicia sesión para acceder a tu entrenamiento y progreso.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-[#161c26] p-1 rounded-xl mb-5 relative z-10 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2 text-xs font-bold font-mono tracking-wide rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "login"
                ? "bg-emerald-600 text-white shadow-md border border-emerald-400/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2 text-xs font-bold font-mono tracking-wide rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-emerald-600 text-white shadow-md border border-emerald-400/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            CREAR CUENTA
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 mb-4 animate-fade-in-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 mb-4 animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5 relative z-10">
            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                Usuario o Correo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Nombre de usuario o correo"
                  className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-black/40 border border-emerald-400/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("forgot");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors text-center mt-2 underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3 relative z-10">
            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Tu nombre o apodo"
                  className="w-full h-10 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full h-10 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full h-10 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full h-10 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
                />
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 mt-1">
              Tu cuenta se creará con un perfil limpio (0 entrenamientos y 0 pesos registrados).
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-black/40 border border-emerald-400/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1 cursor-pointer"
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
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>Recuperar Contraseña</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Paso 1 de 3
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Introduce el correo registrado en tu cuenta para enviarte un código de seguridad de 6 dígitos.
                </p>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                    Correo Registrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="servixam@gmail.com"
                      className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-black/40 border border-emerald-400/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
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
                  className="text-xs text-zinc-400 hover:text-white transition-colors text-center mt-1 underline"
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
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cambiar correo</span>
                  </button>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Paso 2 de 3
                  </span>
                </div>

                <div className="bg-[#141a24] border border-white/10 rounded-xl p-3">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">Código enviado a:</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 truncate mt-0.5">
                    {forgotEmail}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1 text-center">
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
                    className="w-full h-14 bg-[#141a24] border border-emerald-500/40 rounded-xl text-center text-2xl font-mono font-black tracking-[0.4em] text-emerald-400 focus:outline-none focus:border-emerald-400 transition-all placeholder:tracking-normal placeholder:text-zinc-600"
                  />
                </div>

                {localDevCode && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-emerald-400/70">Código de seguridad</span>
                      <span className="font-mono font-bold text-sm tracking-wider">{localDevCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationCode(localDevCode);
                        haptics.selection();
                      }}
                      className="text-[10px] uppercase font-bold font-mono bg-emerald-500/20 px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/20 active:scale-95 transition-all"
                    >
                      Autocompletar
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || verificationCode.trim().length !== 6}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-black/40 border border-emerald-400/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verificar Código
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={isSubmitting}
                    className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
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
                    className="text-xs text-zinc-400 hover:text-white transition-colors underline"
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
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Nueva Contraseña</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Paso 3 de 3
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Identidad verificada para <span className="text-emerald-400 font-mono font-bold">{forgotEmail}</span>. Introduce tu nueva contraseña.
                </p>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-black/40 border border-emerald-400/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
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
                  className="text-xs text-zinc-400 hover:text-white transition-colors text-center mt-1 underline"
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
