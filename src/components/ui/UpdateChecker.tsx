"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { APP_VERSION, checkOtaUpdate, openApkDownload } from "@/lib/ota-sync";

export default function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
  const [show, setShow] = useState(false);
  const [upToDateMsg, setUpToDateMsg] = useState(false);

  useEffect(() => {
    const checkUpdate = async (manual = false) => {
      try {
        const result = await checkOtaUpdate();
        if (result.hasUpdate) {
          setUpdateInfo({ version: result.latestVersion, url: result.downloadUrl });
          setShow(true);
          setUpToDateMsg(false);
        } else if (manual) {
          setUpToDateMsg(true);
          setTimeout(() => setUpToDateMsg(false), 3000);
        }
      } catch {
        // Silently ignore background failures
      }
    };
    
    // Auto check after 3 seconds
    const timer = setTimeout(() => checkUpdate(false), 3000);

    const handleForceCheck = () => checkUpdate(true);
    window.addEventListener("force-update-check", handleForceCheck);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("force-update-check", handleForceCheck);
    };
  }, []);

  if (upToDateMsg) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-surface-container border border-primary/20 text-white px-4 py-2 rounded-full shadow-lg text-sm animate-fade-in-up">
        FORTIXAM está actualizado (v{APP_VERSION})
      </div>
    );
  }

  if (!show || !updateInfo) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-surface-container border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />
        
        <button 
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Download className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Actualización Disponible</h3>
          <p className="text-white/70 text-sm mb-6">
            La versión <strong>{updateInfo.version}</strong> está lista para descargar.
          </p>
          <button
            onClick={() => {
              setShow(false);
              openApkDownload(updateInfo.url);
            }}
            className="w-full bg-primary text-black font-bold py-3 px-4 rounded-xl shadow-neon hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            Descargar e Instalar v{updateInfo.version}
          </button>
        </div>
      </div>
    </div>
  );
}
