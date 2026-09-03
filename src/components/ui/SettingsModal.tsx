"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trash2,
  Volume2,
  VolumeX,
  Download,
  RefreshCw,
  Dumbbell,
  Info,
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
  Server,
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
  syncToServer,
  syncFromServer,
  openApkDownload,
} from "@/lib/ota-sync";

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
  } = useAppStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // OTA state
  const [otaStatus, setOtaStatus] = useState<"idle" | "checking" | "update-found" | "up-to-date" | "error">("idle");
  const [otaInfo, setOtaInfo] = useState<{ version: string; downloadUrl: string; serverUrl: string } | null>(null);
  const [otaError, setOtaError] = useState("");

  // Sync state
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState("");

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



  const handleResetAll = () => {
    localStorage.clear();
    window.location.reload();
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
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
            className="relative w-full h-full md:h-auto md:max-w-app bg-surface md:rounded-2xl shadow-2xl md:max-h-[85vh] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            {/* Header */}
            <div className="sticky top-0 bg-surface border-b border-surface-container-highest p-container-padding flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary-container hidden md:block" />
                <h2
                  id="settings-title"
                  className="font-headline-md text-headline-md text-primary-container"
                >
                  AJUSTES
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest active:scale-95 transition-all"
                aria-label="Cerrar ajustes"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-container-padding flex-1 overflow-y-auto pb-[10vh]">
              <div className="flex flex-col gap-section-gap">
                {/* Audio */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<Music className="w-4 h-4" />}
                    label="Audio"
                  />
                  <button
                    onClick={toggleAudio}
                    className={`w-full h-touch-target-min rounded-xl border-2 flex items-center justify-between px-4 transition-all active:scale-95 ${
                      audioEnabled
                        ? "border-primary-container bg-primary-container/10"
                        : "border-surface-container-highest bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {audioEnabled ? (
                        <Volume2 className="w-6 h-6 text-primary-container" />
                      ) : (
                        <VolumeX className="w-6 h-6 text-on-surface-variant" />
                      )}
                      <span className="font-body-md text-body-md font-bold">
                        {audioEnabled
                          ? "Sonidos Activados"
                          : "Sonidos Desactivados"}
                      </span>
                    </div>
                    <div
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${
                        audioEnabled
                          ? "bg-primary-container"
                          : "bg-surface-container-highest"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-background transition-transform ${
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
                  <div className="flex flex-col gap-3 bg-surface-container-low border border-surface-container-highest rounded-xl p-stack-gap">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-on-surface">
                        <Gauge className="w-4 h-4 text-primary-container" />
                        <span className="font-body-md text-body-md font-bold">
                          Velocidad de Voz
                        </span>
                      </div>
                      <span className="font-label-caps text-label-caps text-primary-container font-mono font-bold">
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
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                              isSelected
                                ? "bg-primary-container text-black border-primary-container shadow-sm"
                                : "bg-surface-container-high text-on-surface-variant border-surface-container-highest hover:text-white"
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
                      className="w-full accent-primary-container"
                      disabled={
                        !audioEnabled ||
                        audioMode === "silent" ||
                        audioMode === "beeps"
                      }
                    />

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">0.65x (Muy pausada)</span>
                      <button
                        type="button"
                        onClick={() =>
                          speak("Prepárate, tres, dos, uno, a entrenar", 1.0, voiceRate)
                        }
                        className="text-primary-container font-bold underline hover:opacity-80 active:scale-95"
                      >
                        🔊 Probar Voz
                      </button>
                      <span className="text-on-surface-variant">1.30x</span>
                    </div>
                  </div>
                </section>

                {/* Equipment Preference */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<Briefcase className="w-4 h-4" />}
                    label="Equipamiento por Defecto"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEquipmentPreference("bodyweight")}
                      className={`flex-1 h-touch-target-min rounded-xl border-2 font-label-caps text-label-caps transition-all active:scale-95 ${
                        equipmentPreference === "bodyweight"
                          ? "border-primary-container bg-primary-container/10 text-primary-container"
                          : "border-surface-container-highest bg-surface-container-low text-secondary"
                      }`}
                    >
                      SIN MATERIAL
                    </button>
                    <button
                      onClick={() => setEquipmentPreference("dumbbells")}
                      className={`flex-1 h-touch-target-min rounded-xl border-2 font-label-caps text-label-caps transition-all active:scale-95 ${
                        equipmentPreference === "dumbbells"
                          ? "border-primary-container bg-primary-container/10 text-primary-container"
                          : "border-surface-container-highest bg-surface-container-low text-secondary"
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
                  <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant pb-2 border-b border-surface-container-highest">
                      <span>Versión instalada:</span>
                      <span className="font-bold text-primary-container">v{APP_VERSION}</span>
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
                              setOtaStatus("update-found");
                              setOtaInfo({
                                version: result.latestVersion,
                                downloadUrl: result.downloadUrl,
                                serverUrl: result.serverUrl,
                              });
                            } else {
                              setOtaStatus("up-to-date");
                            }
                          } catch (err: any) {
                            setOtaStatus("error");
                            setOtaError(err?.message || "No se pudo contactar con el servidor");
                          }
                        }}
                        className="w-full h-12 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-neon"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Comprobar Actualizaciones
                      </button>
                    )}

                    {otaStatus === "checking" && (
                      <div className="w-full h-12 bg-surface-container-high border border-primary/30 rounded-xl flex items-center justify-center gap-3 text-primary-container font-bold">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Buscando actualizaciones...</span>
                      </div>
                    )}

                    {otaStatus === "update-found" && otaInfo && (
                      <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-primary font-bold">
                          <Sparkles className="w-5 h-5" />
                          <span>¡Nueva versión v{otaInfo.version} lista!</span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Detectada en <strong className="text-white">{otaInfo.serverUrl}</strong>
                        </p>
                        <button
                          onClick={() => {
                            openApkDownload(otaInfo.downloadUrl);
                          }}
                          className="w-full h-12 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-neon hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                        >
                          <Download className="w-5 h-5" />
                          Descargar e Instalar v{otaInfo.version}
                        </button>
                        <button
                          onClick={() => setOtaStatus("idle")}
                          className="text-xs text-on-surface-variant underline text-center hover:text-white"
                        >
                          Volver a comprobar
                        </button>
                      </div>
                    )}

                    {otaStatus === "up-to-date" && (
                      <div className="bg-surface-container-high border border-primary/20 rounded-xl p-4 flex flex-col items-center gap-2 text-center">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                        <span className="font-bold text-white text-sm">Tu aplicación está al día (v{APP_VERSION})</span>
                        <button
                          onClick={() => setOtaStatus("idle")}
                          className="text-xs text-primary-container underline mt-1"
                        >
                          Comprobar de nuevo
                        </button>
                      </div>
                    )}

                    {otaStatus === "error" && (
                      <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-error font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>No se pudo comprobar</span>
                        </div>
                        <p className="text-xs text-on-surface-variant">{otaError}</p>
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

                {/* Data Management */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader
                    icon={<Database className="w-4 h-4" />}
                    label="Datos y Copias de Seguridad"
                  />
                  <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4 flex flex-col gap-3">
                    <button
                      disabled={syncStatus === "syncing"}
                      onClick={async () => {
                        setSyncStatus("syncing");
                        setSyncMsg("");
                        try {
                          const ok = await syncToServer({
                            sessions,
                            lastExerciseWeights: useAppStore.getState().lastExerciseWeights,
                            exportDate: new Date().toISOString()
                          });
                          if (ok) {
                            setSyncStatus("success");
                            setSyncMsg("¡Copia guardada con éxito en sync.json!");
                            setTimeout(() => setSyncStatus("idle"), 4000);
                          } else {
                            setSyncStatus("error");
                            setSyncMsg("Error al guardar copia. ¿Está encendido el servidor?");
                          }
                        } catch {
                          setSyncStatus("error");
                          setSyncMsg("Error de red.");
                        }
                      }}
                      className="w-full h-12 bg-surface-container-high border border-primary/20 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/10 active:scale-95 transition-all text-primary-container"
                    >
                      <Server className="w-5 h-5" />
                      <span className="font-bold">
                        {syncStatus === "syncing" ? "Sincronizando..." : "Guardar copia en PC"}
                      </span>
                    </button>

                    <button
                      disabled={syncStatus === "syncing"}
                      onClick={async () => {
                        setSyncStatus("syncing");
                        setSyncMsg("");
                        try {
                          await loadSessions();
                          setSyncStatus("success");
                          setSyncMsg("¡Datos e historial restaurados desde el PC!");
                          setTimeout(() => setSyncStatus("idle"), 4000);
                        } catch {
                          setSyncStatus("error");
                          setSyncMsg("Error al restaurar desde el PC.");
                        }
                      }}
                      className="w-full h-12 bg-surface-container border border-surface-container-highest rounded-lg flex items-center justify-center gap-2 text-on-surface hover:text-white active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-semibold">Restaurar datos desde PC</span>
                    </button>
                    
                    {syncMsg && (
                      <p className={`text-xs text-center font-bold ${syncStatus === "error" ? "text-error" : "text-primary-container"}`}>
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
                    label="Estadísticas"
                  />
                  <div className="grid grid-cols-2 gap-stack-gap">
                    <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-stack-gap text-center">
                      <Dumbbell className="w-6 h-6 text-primary-container mx-auto mb-2" />
                      <span className="font-headline-lg text-headline-lg text-primary-container">
                        {sessions.length}
                      </span>
                      <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
                        ENTRENAMIENTOS
                      </p>
                    </div>
                    <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-stack-gap text-center">
                      <Info className="w-6 h-6 text-primary-container mx-auto mb-2" />
                      <span className="font-headline-lg text-headline-lg text-primary-container">
                        v2.0
                      </span>
                      <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
                        VERSIÓN
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
    <div className="flex items-center gap-2 text-on-surface-variant">
      <span className="text-primary-container">{icon}</span>
      <h3 className="font-headline-md text-headline-md text-on-surface">
        {label}
      </h3>
    </div>
  );
}
