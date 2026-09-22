"use client";
import { useEffect, useState } from "react";
import { Download, X, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { APP_VERSION, checkOtaUpdate, openApkDownload } from "@/lib/ota-sync";
import { canInstallUnknownApps, requestInstallPermission, startInAppUpdate } from "@/lib/app-updater";

export default function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
  const [show, setShow] = useState(false);
  const [upToDateMsg, setUpToDateMsg] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState({ current: "0 MB", total: "..." });
  const [hasPermission, setHasPermission] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkUpdate = async (manual = false) => {
      try {
        const result = await checkOtaUpdate();
        if (result.hasUpdate) {
          const canInst = await canInstallUnknownApps();
          setHasPermission(canInst);
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
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-[#131626] border-primary/30 text-white px-4 py-2 rounded-full shadow-lg text-sm animate-fade-in-up">
        FORTIXAM está actualizado (v{APP_VERSION.version})
      </div>
    );
  }

  if (!show || !updateInfo) return null;

  const handleStartUpdate = async () => {
    const canInst = await canInstallUnknownApps();
    if (!canInst) {
      setHasPermission(false);
      await requestInstallPermission();
      return;
    }

    setIsDownloading(true);
    setProgress(0);
    setErrorMsg(null);
    setDownloadStats({ current: "0 MB", total: "..." });

    const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    const res = await startInAppUpdate(updateInfo.url, (p) => {
      if (p.percent >= 0) setProgress(p.percent);
      if (p.totalBytes > 0) {
        setDownloadStats({
          current: formatMb(p.bytesDownloaded),
          total: formatMb(p.totalBytes),
        });
      }
    });

    if (!res.success) {
      setIsDownloading(false);
      setErrorMsg(res.error || "Error al descargar actualización.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-slate-200 dark:border-primary/50 rounded-3xl p-6 w-full max-w-sm shadow-xl dark:shadow-[0_0_40px_rgba(0,245,155,0.25)] animate-fade-in-up relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/15 rounded-full blur-[60px] pointer-events-none" />
        
        {!isDownloading && (
          <button 
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-white/50 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border-primary/30 flex items-center justify-center mb-4 text-primary shadow-sm">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight mb-1">
            Actualización Lista
          </h3>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mb-4">
            Nueva versión <strong className="text-primary">v{updateInfo.version}</strong> disponible con mejoras y correcciones.
          </p>

          {!isDownloading && !hasPermission && (
            <div className="w-full bg-amber-500/10 border-amber-500/30 rounded-xl p-3 mb-4 text-left">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Permiso de instalación</span>
              </div>
              <p className="text-[13px] text-slate-600 dark:text-zinc-300 mb-2">
                Concede permiso para que la app se actualice sola con 1 toque.
              </p>
              <button
                onClick={async () => {
                  await requestInstallPermission();
                  setTimeout(async () => {
                    const ok = await canInstallUnknownApps();
                    setHasPermission(ok);
                  }, 1500);
                }}
                className="w-full h-8 bg-amber-500 text-white font-bold text-[13px] rounded-lg flex items-center justify-center active:scale-95 cursor-pointer shadow-sm"
              >
                Conceder en Ajustes
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="w-full bg-rose-500/10 border-rose-500/30 rounded-xl p-3 mb-3 text-xs text-rose-600 dark:text-rose-300 text-left">
              {errorMsg}
            </div>
          )}

          {isDownloading ? (
            <div className="w-full bg-slate-50 dark:bg-[#131626] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-2 text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progress >= 100 ? "Abriendo instalador..." : "Descargando..."}
                </span>
                <span className="text-cyan-600 dark:text-cyan-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-black/50 rounded-full h-3.5 border-slate-300 dark:border-white/10 overflow-hidden p-0.5">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-200 shadow-sm"
                  style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[13px] text-slate-500 dark:text-zinc-400">
                <span>{downloadStats.current} / {downloadStats.total}</span>
                <span className="text-slate-400 dark:text-zinc-500">No cierres la app</span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartUpdate}
              className="w-full h-12 bg-primary hover:brightness-105 text-white font-bold text-xs rounded-2xl shadow-sm border-primary/40 hover:scale-[1.01] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Actualizar a v{updateInfo.version}
            </button>
          )}

          {!isDownloading && (
            <button
              onClick={() => {
                setShow(false);
                openApkDownload(updateInfo.url);
              }}
              className="text-[13px] text-cyan-400 underline mt-3 hover:text-white"
            >
              Descargar desde el navegador
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
