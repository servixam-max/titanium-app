"use client";

import { useState } from "react";
import { X, Trash2, Volume2, VolumeX, Download, RefreshCw, Dumbbell, Info } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { sessions, audioEnabled, toggleAudio, setEquipmentPreference, equipmentPreference, clearSessions } = useAppStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleResetHistory = async () => {
    await clearSessions();
    setShowResetConfirm(false);
    onClose();
  };

  const handleExportData = () => {
    const data = {
      sessions,
      exportDate: new Date().toISOString(),
      appVersion: "1.0.0",
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-app bg-surface border border-surface-container-highest rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-surface-container-highest p-container-padding flex items-center justify-between z-10">
          <h2 className="font-headline-md text-headline-md text-primary-container">
            AJUSTES
          </h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-high active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-container-padding flex flex-col gap-section-gap">
          {/* Audio Toggle */}
          <section className="flex flex-col gap-stack-gap">
            <h3 className="font-headline-md text-headline-md text-on-surface">Audio</h3>
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
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
                audioEnabled ? "bg-primary-container" : "bg-surface-container-highest"
              }`}>
                <div className={`w-5 h-5 rounded-full bg-background transition-transform ${
                  audioEnabled ? "translate-x-5" : "translate-x-0"
                }`} />
              </div>
            </button>
          </section>

          {/* Equipment Preference */}
          <section className="flex flex-col gap-stack-gap">
            <h3 className="font-headline-md text-headline-md text-on-surface">Equipamiento por Defecto</h3>
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
            <h3 className="font-headline-md text-headline-md text-on-surface">Datos</h3>
            
            {/* Export Data */}
            <button
              onClick={handleExportData}
              className="w-full h-touch-target-min bg-surface-container-low border border-surface-container-highest rounded-xl flex items-center gap-3 px-4 hover:bg-surface-container-high active:scale-95 transition-all"
            >
              <Download className="w-5 h-5 text-primary-container" />
              <span className="font-body-md text-body-md font-bold">Exportar Datos (JSON)</span>
              {showExportSuccess && (
                <span className="ml-auto font-label-caps text-label-caps text-primary-container">
                  ¡Exportado!
                </span>
              )}
            </button>

            {/* Reset History */}
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full h-touch-target-min bg-surface-container-low border border-surface-container-highest rounded-xl flex items-center gap-3 px-4 hover:bg-surface-container-high active:scale-95 transition-all"
              >
                <Trash2 className="w-5 h-5 text-error" />
                <span className="font-body-md text-body-md font-bold text-error">Reiniciar Historial</span>
              </button>
            ) : (
              <div className="bg-error-container/20 border border-error rounded-xl p-stack-gap">
                <p className="font-body-md text-body-md text-on-error-container mb-4">
                  ¿Seguro? Se eliminarán todos tus entrenamientos guardados. Esta acción no se puede deshacer.
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

            {/* Reset All */}
            <button
              onClick={handleResetAll}
              className="w-full h-touch-target-min bg-surface-container-low border border-surface-container-highest rounded-xl flex items-center gap-3 px-4 hover:bg-surface-container-high active:scale-95 transition-all"
            >
              <RefreshCw className="w-5 h-5 text-error" />
              <span className="font-body-md text-body-md font-bold text-error">Restablecer Todo</span>
            </button>
          </section>

          {/* Stats */}
          <section className="flex flex-col gap-stack-gap">
            <h3 className="font-headline-md text-headline-md text-on-surface">Estadísticas</h3>
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
                  v1.0
                </span>
                <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
                  VERSIÓN
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
