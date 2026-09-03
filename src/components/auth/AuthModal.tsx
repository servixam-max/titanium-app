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
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loginUser, registerUser, resetUserPassword, getActiveUser } from "@/lib/auth";
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

  // Forgot specific
  const [forgotEmail, setForgotEmail] = useState("");
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

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      haptics.error();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = resetUserPassword(forgotEmail, forgotNewPassword);
      if (res.success) {
        haptics.success();
        setSuccessMsg("¡Contraseña restablecida! Ya puedes iniciar sesión.");
        setTimeout(() => {
          setActiveTab("login");
          setUsernameOrEmail(forgotEmail);
          setPassword(forgotNewPassword);
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

  const fillQuickXamCredentials = () => {
    setUsernameOrEmail("XAM");
    setPassword("MUSHROOM");
    setErrorMsg("");
    haptics.light();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#07090e]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#0f131a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col my-auto">
        {/* Neon Ambient Background Glows */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/20 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-cyan-500/20 rounded-full blur-[70px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-cyan-400 p-0.5 mb-3 shadow-[0_0_20px_rgba(0,245,155,0.4)]">
            <div className="w-full h-full bg-[#0d1117] rounded-[14px] flex items-center justify-center text-primary">
              <Zap className="w-7 h-7 fill-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white uppercase font-mono">
            FORTIXAM <span className="text-primary">⚡</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
            Inicia sesión para acceder a tu historial, pesos y rutinas personales.
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
                ? "bg-primary text-black shadow-neon"
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
                ? "bg-primary text-black shadow-neon"
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
                  placeholder="ej. XAM"
                  className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
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
                  className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-10 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
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

            {/* Quick pre-configured user helper banner */}
            <div
              onClick={fillQuickXamCredentials}
              className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-all group mt-1"
            >
              <div className="flex items-center gap-2 text-left">
                <Sparkles className="w-4 h-4 text-primary animate-pulse flex-shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-white block">
                    Cuenta Maestra: <strong className="text-primary">XAM</strong>
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    Contraseña: <strong className="text-zinc-200">MUSHROOM</strong> (Toca para autocompletar)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary underline group-hover:text-white">
                Rellenar
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-xl shadow-neon hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Entrar al Gimnasio
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("forgot");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="text-xs text-zinc-400 hover:text-primary transition-colors text-center mt-2 underline"
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
              className="w-full h-11 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-xl shadow-neon hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Crear Cuenta Nueva
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {activeTab === "forgot" && (
          <form onSubmit={handleForgot} className="flex flex-col gap-3.5 relative z-10">
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <KeyRound className="w-4 h-4 text-primary" />
              <span>Restablecer Contraseña</span>
            </div>

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
                  placeholder="tu@correo.com"
                  className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
                />
              </div>
            </div>

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
                  className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                Repetir Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full h-11 bg-[#141a24] border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-xl shadow-neon hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              Guardar Nueva Contraseña
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
      </div>
    </div>
  );
}
