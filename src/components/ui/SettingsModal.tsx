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
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AudioMode } from "@/lib/types";
import { setAudioMode as setGlobalAudioMode, setVoiceRate as setGlobalVoiceRate, getVoiceRate } from "@/lib/audio";

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
  } = useAppStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const handleExportData = () => {
    const data = {
      sessions,
      exportDate: new Date().toISOString(),
      appVersion: "2.0.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titanium-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 2000);
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

  const modeOptions: { value: AudioMode; label: string; icon: React.ReactNode; desc: string }[] = [
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
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
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

          {/* Modal / Bottom Sheet */}
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
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (isMobile && info.offset.y > 120 && info.velocity.y > 0) {
                onClose();
              }
            }}
            className="relative w-full md:max-w-app md:w-full bg-surface border border-surface-container-highest md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            {/* Drag handle (mobile only) */}
            {isMobile && (
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-surface-container-highest" />
              </div>
            )}

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
            <div className="p-container-padding overflow-y-auto max-h-[calc(90vh-72px)] md:max-h-[calc(85vh-72px)]">
              <div className="flex flex-col gap-section-gap">
                {/* Audio */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader icon={<Music className="w-4 h-4" />} label="Audio" />
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
                        {audioEnabled ? "Sonidos Activados" : "Sonidos Desactivados"}
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
                          <span className={selected ? "text-primary-container" : "text-on-surface-variant"}>{option.icon}</span>
                          <span className="font-body-sm text-body-sm font-bold">{option.label}</span>
                          <span className="font-label-caps text-[10px] leading-tight text-center">{option.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Voice Rate */}
                  <div className="flex flex-col gap-2 bg-surface-container-low border border-surface-container-highest rounded-xl p-stack-gap">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-on-surface">
                        <Gauge className="w-4 h-4 text-primary-container" />
                        <span className="font-body-md text-body-md font-bold">Velocidad de Voz</span>
                      </div>
                      <span className="font-label-caps text-label-caps text-primary-container">{voiceRate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.5}
                      step={0.05}
                      value={voiceRate}
                      onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                      className="w-full accent-primary-container"
                      disabled={!audioEnabled || audioMode === "silent" || audioMode === "beeps"}
                    />
                    <div className="flex justify-between text-on-surface-variant text-xs">
                      <span>Lenta</span>
                      <span>Rápida</span>
                    </div>
                  </div>
                </section>

                {/* Equipment Preference */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader icon={<Briefcase className="w-4 h-4" />} label="Equipamiento por Defecto" />
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

                {/* Data Management */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader icon={<Database className="w-4 h-4" />} label="Datos" />

                  <button
                    onClick={handleExportData}
                    className="w-full h-touch-target-min bg-surface-container-low border border-surface-container-highest rounded-xl flex items-center gap-3 px-4 hover:bg-surface-container-high active:scale-95 transition-all"
                  >
                    <Download className="w-5 h-5 text-primary-container" />
                    <span className="font-body-md text-body-md font-bold">
                      Exportar Datos (JSON)
                    </span>
                    {showExportSuccess && (
                      <span className="ml-auto font-label-caps text-label-caps text-primary-container">
                        ¡Exportado!
                      </span>
                    )}
                  </button>

                  {!showResetConfirm ? (
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full h-touch-target-min bg-surface-container-low border border-surface-container-highest rounded-xl flex items-center gap-3 px-4 hover:bg-surface-container-high active:scale-95 transition-all"
                    >
                      <Trash2 className="w-5 h-5 text-error" />
                      <span className="font-body-md text-body-md font-bold text-error">
                        Reiniciar Historial
                      </span>
                    </button>
                  ) : (
                    <div className="bg-error-container/20 border border-error rounded-xl p-stack-gap">
                      <p className="font-body-md text-body-md text-on-error-container mb-4">
                        ¿Seguro? Se eliminarán todos tus entrenamientos guardados.
                        Esta acción no se puede deshacer.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowResetConfirm(false)}
                          className="flex-1 h-touch-target-min bg-surface-container-high rounded-lg font-label-caps text-label-caps active:scale-95 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleResetHistory}
                          className="flex-1 h-touch-target-min bg-error text-on-error rounded-lg font-label-caps text-label-caps active:scale-95 transition-all"
                        >
                          Sí, Eliminar
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleResetAll}
                    className="w-full h-touch-target-min bg-surface-container-low border border-surface-container-highest rounded-xl flex items-center gap-3 px-4 hover:bg-surface-container-high active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-5 h-5 text-error" />
                    <span className="font-body-md text-body-md font-bold text-error">
                      Restablecer Todo
                    </span>
                  </button>
                </section>

                {/* Stats */}
                <section className="flex flex-col gap-stack-gap">
                  <SectionHeader icon={<BarChart3 className="w-4 h-4" />} label="Estadísticas" />
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
