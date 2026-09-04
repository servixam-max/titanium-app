"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trash2,
  Volume2,
  VolumeX,
  Download,
  RefreshCw,
  Dumbbell,
  Music,
  Briefcase,
  Database,
  BarChart3,
  Settings,
  Mic,
  Bell,
  BellOff,
  Speaker,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  LogOut,
  Upload,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AudioMode } from "@/lib/types";
import {
  setAudioMode as setGlobalAudioMode,
  setVoiceRate as setGlobalVoiceRate,
  speak,
} from "@/lib/audio";
import {
  APP_VERSION,
  checkOtaUpdate,
  openApkDownload,
} from "@/lib/ota-sync";
import {
  canInstallUnknownApps,
  requestInstallPermission,
  startInAppUpdate,
} from "@/lib/app-updater";
import { getSessions, saveSession, getWeights, saveWeight } from "@/lib/db";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    sessions,
    audioEnabled,
    audioMode,
    setAudioMode,
    voiceRate,
    setVoiceRate,
    toggleAudio,
    setEquipmentPreference,
    equipmentPreference,
    clearSessions,
    loadSessions,
    currentUser,
    logout,
  } = useAppStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // OTA state
  const [otaStatus, setOtaStatus] = useState<
    "idle" | "checking" | "update-found" | "downloading" | "up-to-date" | "error"
  >("idle");
  const [otaInfo, setOtaInfo] = useState<{ version: string; downloadUrl: string; serverUrl: string } | null>(null);
  const [otaError, setOtaError] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStats, setDownloadStats] = useState<{ current: string; total: string }>({
    current: "0 MB",
    total: "0 MB",
  });
  const [hasInstallPermission, setHasInstallPermission] = useState<boolean>(true);

  // Sync / Backup state
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState("");

  const handleExportBackup = async () => {
    try {
      setSyncStatus("syncing");
      setSyncMsg("Generando copia de seguridad...");
      const userSessions = await getSessions(currentUser?.id);
      const userWeights = await getWeights(currentUser?.id);
      const backupData = {
        app: "FORTIXAM",
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        user: {
          id: currentUser?.id,
          username: currentUser?.username,
          email: currentUser?.email,
        },
        sessions: userSessions,
        weights: userWeights,
        lastExerciseWeights: useAppStore.getState().lastExerciseWeights,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const usernameClean = (currentUser?.username || "usuario").toLowerCase().replace(/[^a-z0-9]/g, "_");
      a.download = `fortixam-backup-${usernameClean}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSyncStatus("success");
      setSyncMsg("¡Copia de seguridad guardada en tu dispositivo!");
      setTimeout(() => setSyncStatus("idle"), 4000);
    } catch {
      setSyncStatus("error");
      setSyncMsg("Error al generar copia de seguridad.");
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncStatus("syncing");
    setSyncMsg("Restaurando datos...");
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (!data || (!data.sessions && !data.weights)) {
          throw new Error("Formato inválido");
        }

        const targetUserId = currentUser?.id || "xam-seed-id";
        let sessionCount = 0;
        let weightCount = 0;

        if (Array.isArray(data.sessions)) {
          for (const s of data.sessions) {
            await saveSession(s, targetUserId);
            sessionCount++;
          }
        }
        if (Array.isArray(data.weights)) {
          for (const w of data.weights) {
            await saveWeight(w, targetUserId);
            weightCount++;
          }
        }

        await loadSessions();
        setSyncStatus("success");
        setSyncMsg(`¡Datos restaurados! (${sessionCount} sesiones, ${weightCount} pesos)`);
        setTimeout(() => setSyncStatus("idle"), 4000);
      } catch {
        setSyncStatus("error");
        setSyncMsg("Error: El archivo seleccionado no es válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Sync audio engine with store when modal opens / settings change
  useEffect(() => {
    setGlobalAudioMode(audioMode);
    setGlobalVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleResetHistory = async () => {
    await clearSessions();
    setShowResetConfirm(false);
    onClose();
  };



  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSetMode = (mode: AudioMode) => {
    setAudioMode(mode);
  };

  const modeOptions: {
    value: AudioMode;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      value: "full",
      label: "Completo",
      icon: <Speaker className="w-5 h-5" />,
      desc: "Voz + pitidos",
    },
    {
      value: "voice",
      label: "Solo Voz",
      icon: <Mic className="w-5 h-5" />,
      desc: "Anuncios hablados",
    },
    {
      value: "beeps",
      label: "Solo Pitidos",
      icon: <Bell className="w-5 h-5" />,
      desc: "Tonos y vibración",
    },
    {
      value: "silent",
      label: "Silencio",
      icon: <BellOff className="w-5 h-5" />,
      desc: "Sin sonido ni voz",
    },
  ];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={
              isMobile
                ? { y: "100%", opacity: 0.9 }
                : { y: 40, scale: 0.95, opacity: 0 }
            }
            animate={
              isMobile ? { y: 0, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }
            }
            exit={
              isMobile
                ? { y: "100%", opacity: 0.9 }
                : { y: 40, scale: 0.95, opacity: 0 }
            }
            transition={{
              type: isMobile ? "spring" : "tween",
              stiffness: 300,
              damping: 30,
              duration: isMobile ? undefined : 0.25,
            }}
            className="relative w-full h-full md:h-auto md:max-w-app bg-[#0b0e14] md:rounded-3xl border border-white/10 shadow-2xl md:max-h-[85vh] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0e121a]/95 backdrop-blur-md border-b border-white/10 p-container-padding flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary hidden md:block" />
                <h2
                  id="settings-title"
                  className="font-mono text-base font-black text-white uppercase tracking-wider"
                >
                  AJUSTES DEL SISTEMA
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                aria-label="Cerrar ajustes"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-container-padding flex-1 overflow-y-auto pb-[10vh]">
              <div className="flex flex-col gap-section-gap">
                {/* User Profile Card */}
                <section className="bg-gradient-to-r from-[#121722] to-[#161e2b] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-black font-mono text-xl shadow-neon"
                      style={{ backgroundColor: currentUser?.avatarColor || "#10B981" }}
                    >
                      {(currentUser?.username || "A").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base font-mono">
                          {currentUser?.username || "Atleta"}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                          CONECTADO
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 block mt-0.5">
                        {currentUser?.email || "atleta@fortixam.com"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-95"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </section>

                {/* Audio */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<Music className="w-4 h-4" />}
                    label="Audio y Sonidos"
                  />
                  <button
                    onClick={toggleAudio}
                    className={`w-full h-touch-target-min rounded-2xl border flex items-center justify-between px-4 transition-all active:scale-95 ${
                      audioEnabled
                        ? "border-primary/40 bg-primary/10 shadow-[0_0_15px_rgba(0,245,155,0.15)]"
                        : "border-white/10 bg-[#121620]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {audioEnabled ? (
                        <Volume2 className="w-6 h-6 text-primary" />
                      ) : (
                        <VolumeX className="w-6 h-6 text-zinc-400" />
                      )}
                      <span className="font-mono text-sm font-bold text-white">
                        {audioEnabled
                          ? "Efectos y Voz Activados"
                          : "Efectos y Voz Desactivados"}
                      </span>
                    </div>
                    <div
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${
                        audioEnabled
                          ? "bg-primary shadow-neon"
                          : "bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          audioEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </button>

                  {/* Audio Mode Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {modeOptions.map((option) => {
                      const selected = audioMode === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleSetMode(option.value)}
                          disabled={!audioEnabled && option.value !== "silent"}
                          className={`flex flex-col items-center justify-center gap-1 h-[76px] rounded-xl border-2 transition-all active:scale-95 ${
                            selected
                              ? "border-primary-container bg-primary-container/10 text-primary-container"
                              : "border-surface-container-highest bg-surface-container-low text-on-surface-variant"
                          } ${!audioEnabled && option.value !== "silent" ? "opacity-50" : ""}`}
                        >
                          <span
                            className={
                              selected
                                ? "text-primary-container"
                                : "text-on-surface-variant"
                            }
                          >
                            {option.icon}
                          </span>
                          <span className="font-body-sm text-body-sm font-bold">
                            {option.label}
                          </span>
                          <span className="font-label-caps text-[10px] leading-tight text-center">
                            {option.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Voice Rate */}
                  <div className="flex flex-col gap-3 bg-[#121620] border border-white/10 rounded-2xl p-stack-gap shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <Gauge className="w-4 h-4 text-cyan-400" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider">
                          Velocidad de Voz IA
                        </span>
                      </div>
                      <span className="text-xs text-cyan-400 font-mono font-bold">
                        {voiceRate.toFixed(2)}x
                      </span>
                    </div>

                    {/* Speed Presets */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Lenta", rate: 0.80 },
                        { label: "Normal", rate: 0.92, recommended: true },
                        { label: "Rápida", rate: 1.05 },
                      ].map((preset) => {
                        const isSelected = Math.abs(voiceRate - preset.rate) < 0.04;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setVoiceRate(preset.rate);
                              speak("Velocidad ajustada", 1.0, preset.rate);
                            }}
                            className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                              isSelected
                                ? "bg-primary text-black border-primary shadow-neon"
                                : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="range"
                      min={0.65}
                      max={1.30}
                      step={0.05}
                      value={voiceRate}
                      onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                      disabled={
                        !audioEnabled ||
                        audioMode === "silent" ||
                        audioMode === "beeps"
                      }
                    />

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-500">0.65x</span>
                      <button
                        type="button"
                        onClick={() =>
                          speak("Prepárate, tres, dos, uno, a entrenar", 1.0, voiceRate)
                        }
                        className="text-cyan-400 font-bold underline hover:opacity-80 active:scale-95 cursor-pointer"
                      >
                        🔊 Probar Voz
                      </button>
                      <span className="text-zinc-500">1.30x</span>
                    </div>
                  </div>
                </section>

                {/* Equipment Preference */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<Briefcase className="w-4 h-4" />}
                    label="Equipamiento Predeterminado"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEquipmentPreference("bodyweight")}
                      className={`flex-1 h-12 rounded-2xl border font-mono text-xs font-bold transition-all active:scale-95 ${
                        equipmentPreference === "bodyweight"
                          ? "border-primary bg-primary/10 text-primary shadow-neon"
                          : "border-white/10 bg-[#121620] text-zinc-400 hover:text-white"
                      }`}
                    >
                      SIN MATERIAL
                    </button>
                    <button
                      onClick={() => setEquipmentPreference("dumbbells")}
                      className={`flex-1 h-12 rounded-2xl border font-mono text-xs font-bold transition-all active:scale-95 ${
                        equipmentPreference === "dumbbells"
                          ? "border-primary bg-primary/10 text-primary shadow-neon"
                          : "border-white/10 bg-[#121620] text-zinc-400 hover:text-white"
                      }`}
                    >
                      MANCUERNAS
                    </button>
                  </div>
                </section>

                {/* Updates */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<Download className="w-4 h-4" />}
                    label="Actualizaciones"
                  />
                  <div className="bg-[#121620] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-white/10 font-mono">
                      <span>Versión instalada:</span>
                      <span className="font-black text-cyan-400 font-mono text-sm">v{APP_VERSION}</span>
                    </div>

                    {otaStatus === "idle" && (
                      <button
                        onClick={async () => {
                          setOtaStatus("checking");
                          setOtaError("");
                          setOtaInfo(null);
                          try {
                            const result = await checkOtaUpdate();
                            if (result.hasUpdate) {
                              const canInst = await canInstallUnknownApps();
                              setHasInstallPermission(canInst);
                              setOtaStatus("update-found");
                              setOtaInfo({
                                version: result.latestVersion,
                                downloadUrl: result.downloadUrl,
                                serverUrl: result.serverUrl,
                              });
                            } else {
                              setOtaStatus("up-to-date");
                            }
                          } catch (err: unknown) {
                            setOtaStatus("error");
                            const msg = err instanceof Error ? err.message : "No se pudo contactar con el servidor";
                            setOtaError(msg);
                          }
                        }}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-black/40 border border-emerald-400/30 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Comprobar Actualizaciones
                      </button>
                    )}

                    {otaStatus === "checking" && (
                      <div className="w-full h-12 bg-[#161c28] border border-cyan-400/30 rounded-2xl flex items-center justify-center gap-3 text-cyan-400 font-mono font-bold text-xs uppercase">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Buscando actualizaciones...</span>
                      </div>
                    )}

                    {otaStatus === "update-found" && otaInfo && (
                      <div className="bg-gradient-to-br from-[#121622] to-[#151b2a] border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                        <div className="flex items-center gap-2 text-emerald-400 font-mono font-black text-sm uppercase">
                          <Sparkles className="w-5 h-5" />
                          <span>¡Nueva versión v{otaInfo.version} lista!</span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono">
                          Servidor: <strong className="text-white">{otaInfo.serverUrl}</strong>
                        </p>

                        {!hasInstallPermission && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Permiso para autoinstalar</span>
                            </div>
                            <p className="text-[11px] text-zinc-300 font-mono">
                              Para instalar sin salir al navegador, activa el permiso de &ldquo;Instalar apps desconocidas&rdquo; para FORTIXAM (solo se hace una vez).
                            </p>
                            <button
                              onClick={async () => {
                                await requestInstallPermission();
                                setTimeout(async () => {
                                  const ok = await canInstallUnknownApps();
                                  setHasInstallPermission(ok);
                                }, 1500);
                              }}
                              className="h-8 bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                              <span>Conceder permiso en Ajustes</span>
                            </button>
                          </div>
                        )}

                        <button
                          onClick={async () => {
                            setOtaStatus("downloading");
                            setDownloadProgress(0);
                            setDownloadStats({ current: "0 MB", total: "..." });

                            const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

                            const result = await startInAppUpdate(otaInfo.downloadUrl, (progress) => {
                              if (progress.percent >= 0) {
                                setDownloadProgress(progress.percent);
                              }
                              if (progress.totalBytes > 0) {
                                setDownloadStats({
                                  current: formatMb(progress.bytesDownloaded),
                                  total: formatMb(progress.totalBytes),
                                });
                              }
                            });

                            if (!result.success) {
                              setOtaStatus("error");
                              setOtaError(result.error || "Fallo en la descarga interna. Puedes descargar desde el navegador.");
                            }
                          }}
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-black/40 border border-emerald-400/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          Descargar e Instalar v{otaInfo.version}
                        </button>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => openApkDownload(otaInfo.downloadUrl)}
                            className="text-[11px] text-cyan-400 underline hover:text-white font-mono"
                          >
                            Descarga clásica (navegador)
                          </button>
                          <button
                            onClick={() => setOtaStatus("idle")}
                            className="text-[11px] text-zinc-400 underline hover:text-white font-mono"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {otaStatus === "downloading" && otaInfo && (
                      <div className="bg-gradient-to-br from-[#121622] to-[#151b2a] border-2 border-primary rounded-2xl p-4 flex flex-col gap-3.5 shadow-neon">
                        <div className="flex items-center justify-between text-white font-mono text-xs font-bold">
                          <span className="flex items-center gap-2 text-primary">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {downloadProgress >= 100
                              ? "¡Descargado! Abriendo instalador..."
                              : `Descargando v${otaInfo.version}...`}
                          </span>
                          <span className="text-cyan-400">{downloadProgress}%</span>
                        </div>

                        <div className="w-full bg-black/50 rounded-full h-3.5 border border-white/10 overflow-hidden p-0.5">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-primary h-full rounded-full transition-all duration-200 shadow-neon"
                            style={{ width: `${Math.max(5, Math.min(100, downloadProgress))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span>{downloadStats.current} / {downloadStats.total}</span>
                          <span className="text-zinc-500">No cierres la app</span>
                        </div>
                      </div>
                    )}

                    {otaStatus === "up-to-date" && (
                      <div className="bg-[#141a24] border border-primary/30 rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                        <span className="font-mono font-bold text-white text-xs uppercase">Tu aplicación está al día (v{APP_VERSION})</span>
                        <button
                          onClick={() => setOtaStatus("idle")}
                          className="text-xs text-cyan-400 underline mt-1 font-mono"
                        >
                          Comprobar de nuevo
                        </button>
                      </div>
                    )}

                    {otaStatus === "error" && (
                      <div className="bg-error/10 border border-error/30 rounded-2xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-error font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>No se pudo comprobar</span>
                        </div>
                        <p className="text-xs text-zinc-400">{otaError}</p>
                        <button
                          onClick={() => setOtaStatus("idle")}
                          className="w-full h-10 mt-1 bg-surface-container-highest text-white font-bold rounded-lg flex items-center justify-center gap-2 text-xs active:scale-95"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Reintentar
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-on-surface-variant text-center">
                      Actualizaciones automáticas y seguras a nivel global.
                    </p>
                  </div>
                </section>

                {/* Local Backup and Restore */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<Database className="w-4 h-4" />}
                    label="Copias de Seguridad Locales"
                  />
                  <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-zinc-400">
                      Guarda o restaura tus entrenamientos y pesos directamente en un archivo <strong className="text-white">.json</strong> en tu móvil.
                    </p>

                    <button
                      disabled={syncStatus === "syncing"}
                      onClick={handleExportBackup}
                      className="w-full h-12 bg-surface-container-high border border-primary/20 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/10 active:scale-95 transition-all text-primary"
                    >
                      <Download className="w-5 h-5" />
                      <span className="font-bold text-sm">
                        {syncStatus === "syncing" ? "Generando copia..." : "Exportar Copia de Seguridad (JSON)"}
                      </span>
                    </button>

                    <label className="w-full h-12 bg-surface-container border border-surface-container-highest rounded-xl flex items-center justify-center gap-2 text-on-surface hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer">
                      <Upload className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Restaurar Copia de Seguridad</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                    
                    {syncMsg && (
                      <p className={`text-xs text-center font-bold ${syncStatus === "error" ? "text-error" : "text-primary"}`}>
                        {syncMsg}
                      </p>
                    )}

                    {!showResetConfirm ? (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full h-10 bg-surface-container flex items-center justify-center gap-2 rounded-lg text-error hover:bg-error/10 active:scale-95 transition-all mt-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Borrar todos los datos locales</span>
                      </button>
                    ) : (
                      <div className="bg-error/10 border border-error/20 rounded-lg p-3 mt-2">
                        <p className="text-xs text-error mb-3 text-center">¿Seguro? Se perderán tus entrenamientos en este dispositivo.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setShowResetConfirm(false)} className="flex-1 h-10 bg-surface rounded-md text-xs font-bold">Cancelar</button>
                          <button onClick={handleResetHistory} className="flex-1 h-10 bg-error text-black rounded-md text-xs font-bold">Sí, borrar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Stats */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<BarChart3 className="w-4 h-4" />}
                    label="Información y Estadísticas"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-cyan-500/20 rounded-2xl p-4 text-center shadow-lg">
                      <Dumbbell className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                      <span className="font-mono text-2xl font-black text-white block">
                        {sessions.length}
                      </span>
                      <p className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-wider mt-1">
                        ENTRENAMIENTOS
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-primary/20 rounded-2xl p-4 text-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                      <span className="font-mono text-2xl font-black text-white block">
                        v{APP_VERSION}
                      </span>
                      <p className="font-mono text-[10px] font-bold text-primary uppercase tracking-wider mt-1">
                        VERSIÓN ACTUAL
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-zinc-400 mb-1">
      <span className="text-primary">{icon}</span>
      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
        {label}
      </h3>
    </div>
  );
}
