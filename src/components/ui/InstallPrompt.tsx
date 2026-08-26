"use client";

import { useState, useEffect } from "react";
import { Download, X, Share2, PlusSquare } from "lucide-react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">(
    "other",
  );
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Already installed?
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).navigator.standalone === true) return;

    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      setPlatform("ios");
    } else if (isAndroid) {
      setPlatform("android");
    }

    // Check if dismissed
    const dismissed = localStorage.getItem("fortixam-install-dismissed");
    if (dismissed) return;

    // Show after 2 seconds
    const timer = setTimeout(() => {
      setShow(true);
    }, 2000);

    // Android: listen for beforeinstallprompt
    if (!isIOS) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => clearTimeout(timer);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promptEvent = deferredPrompt as any;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("fortixam-install-dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[80px] left-4 right-4 z-50 bg-surface-container-high border border-primary-container/30 rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-primary-container" />
        </div>

        <div className="flex-1">
          <h4 className="font-body-md text-body-md font-bold text-on-surface">
            Instalar FORTIXAM
          </h4>

          {platform === "ios" ? (
            <>
              <p className="text-secondary text-sm mt-0.5">
                Para instalar en iPhone/iPad:
              </p>
              <ol className="text-secondary text-sm mt-1 space-y-1 ml-4 list-decimal">
                <li>
                  Toca el botón <Share2 className="w-3 h-3 inline mx-0.5" />{" "}
                  Compartir
                </li>
                <li>
                  Selecciona{" "}
                  <strong className="text-primary-container">
                    Añadir a pantalla de inicio
                  </strong>
                </li>
              </ol>
            </>
          ) : (
            <p className="text-secondary text-sm mt-0.5">
              Añade la app a tu pantalla de inicio para acceso rápido y modo
              offline.
            </p>
          )}

          <div className="flex gap-2 mt-3">
            {platform === "android" && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="flex-1 h-[40px] bg-primary-container text-on-primary font-bold rounded-lg text-sm active:scale-95 transition-transform"
              >
                <PlusSquare className="w-4 h-4 inline mr-1" />
                Instalar
              </button>
            )}

            {platform === "ios" && (
              <button
                onClick={handleDismiss}
                className="flex-1 h-[40px] bg-surface-container-low text-on-surface font-bold rounded-lg text-sm border border-surface-container-highest active:scale-95 transition-transform"
              >
                Entendido
              </button>
            )}

            {platform === "other" && (
              <button
                onClick={handleDismiss}
                className="flex-1 h-[40px] bg-primary-container text-on-primary font-bold rounded-lg text-sm active:scale-95 transition-transform"
              >
                OK
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="h-[40px] px-3 text-on-surface-variant hover:text-on-surface active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
