"use client";

import { useState } from "react";
import { ArrowLeft, Settings, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import SettingsModal from "./SettingsModal";

interface TopAppBarProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  showSettings?: boolean;
  showVolume?: boolean;
  onClose?: () => void;
  variant?: "default" | "workout";
}

export default function TopAppBar({
  title,
  showBack = false,
  backHref="/",
  showSettings = false,
  showVolume = false,
  onClose,
  variant = "default",
}: TopAppBarProps) {
  const { audioEnabled, toggleAudio } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 border-b border-surface-container-highest flex items-center justify-between px-container-padding h-touch-target-min max-w-app left-1/2 -translate-x-1/2 ${
          variant === "workout"
            ? "bg-background/80 backdrop-blur-md"
            : "bg-background"
        }`}
      >
        <div className="w-12">
          {showBack && (
            <Link
              href={backHref}
              className="flex items-center justify-center w-12 h-12 text-primary-container hover:opacity-80 transition-opacity active:scale-95"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-12 h-12 text-on-surface hover:opacity-80 transition-opacity active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <h1
          className={`font-headline-md text-headline-md font-bold text-primary-container uppercase tracking-wider text-center flex-1 ${
            variant === "workout" ? "text-primary-container" : ""
          }`}
        >
          {title}
        </h1>

        <div className="w-12 flex justify-end">
          {showVolume && (
            <button
              onClick={toggleAudio}
              className="flex items-center justify-center w-12 h-12 text-on-surface hover:opacity-80 transition-opacity active:scale-95"
            >
              {audioEnabled ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <VolumeX className="w-6 h-6" />
              )}
            </button>
          )}
          {showSettings && (
            <button 
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center w-12 h-12 text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95"
            >
              <Settings className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
