"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Sparkles,
  Info,
  Flame,
  RotateCw,
  Activity,
  Scan,
  ShieldCheck,
  Zap,
  Crosshair,
  Sliders,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  AnatomicalMuscle,
  DetailedMuscleStat,
  MuscleTimeframe,
  MUSCLE_METADATA,
} from "@/lib/muscle-engine";
import { haptics } from "@/lib/haptics";

interface AnatomicalMuscleViewerProps {
  muscleStats: Record<AnatomicalMuscle, DetailedMuscleStat>;
  timeframe: MuscleTimeframe;
  onTimeframeChange?: (timeframe: MuscleTimeframe) => void;
  className?: string;
}

// Center coordinates for targeting reticles
const MUSCLE_TARGET_COORDS: Record<AnatomicalMuscle, { front?: [number, number]; back?: [number, number] }> = {
  chest: { front: [160, 132] },
  deltoids_ant: { front: [122, 126] },
  deltoids_lat: { front: [88, 134], back: [88, 134] },
  deltoids_post: { back: [96, 132] },
  biceps: { front: [82, 184] },
  triceps: { back: [78, 176] },
  forearms: { front: [66, 256], back: [66, 256] },
  abs: { front: [160, 212] },
  obliques: { front: [122, 224] },
  traps: { back: [160, 118] },
  lats: { back: [120, 188] },
  lower_back: { back: [160, 250] },
  glutes: { back: [134, 298] },
  quads: { front: [124, 342] },
  hamstrings: { back: [130, 368] },
  calves: { front: [124, 458], back: [124, 454] },
};

export default function AnatomicalMuscleViewer({
  muscleStats,
  timeframe,
  onTimeframeChange,
  className = "",
}: AnatomicalMuscleViewerProps) {
  const [activeView, setActiveView] = useState<"front" | "back">("front");
  const [selectedMuscle, setSelectedMuscle] = useState<AnatomicalMuscle | null>("chest");
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);

  // 3D Tilt & Parallax Physics
  const stageRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 24, stiffness: 220, mass: 0.8 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [14, -14]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-20, 20]), springConfig);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Switch views with 3D transition
  const toggleView = (view: "front" | "back") => {
    haptics.selection();
    setActiveView(view);
    if (view === "front" && selectedMuscle && MUSCLE_METADATA[selectedMuscle]?.view === "back") {
      setSelectedMuscle("chest");
    } else if (view === "back" && selectedMuscle && MUSCLE_METADATA[selectedMuscle]?.view === "front") {
      setSelectedMuscle("lats");
    }
  };

  // Color & styling resolver for each muscle
  const getMuscleVisuals = (muscle: AnatomicalMuscle) => {
    const stat = muscleStats[muscle];
    const isSelected = selectedMuscle === muscle;
    const isTrained = stat && stat.volumeKg > 0;

    if (!isTrained) {
      return {
        fill: isSelected ? "rgba(0, 214, 143, 0.28)" : "url(#inactive-muscle-grad)",
        stroke: isSelected ? "#00D68F" : "rgba(255, 255, 255, 0.12)",
        strokeWidth: isSelected ? 2 : 0.8,
        filter: isSelected ? "url(#neon-glow)" : "url(#subtle-bevel)",
        opacity: isSelected ? 1 : 0.68,
        className: "transition-all duration-300 cursor-pointer hover:opacity-90",
      };
    }

    if (stat.intensityLevel === "peak") {
      return {
        fill: "url(#peak-muscle-grad)",
        stroke: isSelected ? "#FFFFFF" : "#CCFF00",
        strokeWidth: isSelected ? 2.5 : 1.4,
        filter: isSelected ? "url(#peak-bloom)" : "url(#neon-glow)",
        opacity: 1,
        className: "transition-all duration-300 cursor-pointer animate-cyber-pulse",
      };
    }

    if (stat.intensityLevel === "high") {
      return {
        fill: "url(#high-muscle-grad)",
        stroke: isSelected ? "#FFFFFF" : "#39FF14",
        strokeWidth: isSelected ? 2.2 : 1.2,
        filter: "url(#neon-glow)",
        opacity: 0.98,
        className: "transition-all duration-300 cursor-pointer",
      };
    }

    if (stat.intensityLevel === "moderate") {
      return {
        fill: "url(#mod-muscle-grad)",
        stroke: isSelected ? "#FFFFFF" : "#00FF9D",
        strokeWidth: isSelected ? 2 : 1,
        filter: "url(#neon-glow)",
        opacity: 0.94,
        className: "transition-all duration-300 cursor-pointer",
      };
    }

    // Light stimulation
    return {
      fill: "url(#light-muscle-grad)",
      stroke: isSelected ? "#FFFFFF" : "#00E1FF",
      strokeWidth: isSelected ? 1.8 : 0.9,
      filter: "url(#subtle-bevel)",
      opacity: 0.88,
      className: "transition-all duration-300 cursor-pointer",
    };
  };

  const selectedStat = selectedMuscle ? muscleStats[selectedMuscle] : null;

  // Biomechanical Symmetry Calculations
  const biomechanics = useMemo(() => {
    // Push vs Pull
    const pushVol =
      (muscleStats.chest?.volumeKg || 0) +
      (muscleStats.deltoids_ant?.volumeKg || 0) +
      (muscleStats.deltoids_lat?.volumeKg || 0) +
      (muscleStats.triceps?.volumeKg || 0);

    const pullVol =
      (muscleStats.lats?.volumeKg || 0) +
      (muscleStats.traps?.volumeKg || 0) +
      (muscleStats.deltoids_post?.volumeKg || 0) +
      (muscleStats.biceps?.volumeKg || 0) +
      (muscleStats.forearms?.volumeKg || 0);

    const totalTorso = pushVol + pullVol;
    const pushRatio = totalTorso > 0 ? Math.round((pushVol / totalTorso) * 100) : 50;
    const pullRatio = totalTorso > 0 ? 100 - pushRatio : 50;

    // Upper vs Lower
    const upperVol = totalTorso + (muscleStats.abs?.volumeKg || 0) + (muscleStats.obliques?.volumeKg || 0);
    const lowerVol =
      (muscleStats.quads?.volumeKg || 0) +
      (muscleStats.hamstrings?.volumeKg || 0) +
      (muscleStats.glutes?.volumeKg || 0) +
      (muscleStats.calves?.volumeKg || 0);

    const totalBody = upperVol + lowerVol;
    const upperRatio = totalBody > 0 ? Math.round((upperVol / totalBody) * 100) : 50;
    const lowerRatio = totalBody > 0 ? 100 - upperRatio : 50;

    // Active muscles count
    const activeCount = Object.values(muscleStats).filter((s) => s.volumeKg > 0).length;

    return {
      pushRatio,
      pullRatio,
      upperRatio,
      lowerRatio,
      activeCount,
      totalEffective: totalBody,
    };
  }, [muscleStats]);

  // Target reticle position for selected muscle in active view
  const targetCoords = selectedMuscle
    ? activeView === "front"
      ? MUSCLE_TARGET_COORDS[selectedMuscle]?.front
      : MUSCLE_TARGET_COORDS[selectedMuscle]?.back
    : null;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Top Controls: View Selector + Timeframe + Scanner Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Front / Back 3D Toggle */}
        <div className="flex items-center bg-[#0d121c] border border-white/10 rounded-2xl p-1 shadow-inner">
          <button
            onClick={() => toggleView("front")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
              activeView === "front"
                ? "bg-primary text-black font-black shadow-[0_0_14px_rgba(0,214,143,0.45)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Frontal
          </button>
          <button
            onClick={() => toggleView("back")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
              activeView === "back"
                ? "bg-primary text-black font-black shadow-[0_0_14px_rgba(0,214,143,0.45)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Dorsal
          </button>
          <button
            onClick={() => toggleView(activeView === "front" ? "back" : "front")}
            title="Giro 180°"
            className="p-1.5 ml-0.5 text-zinc-400 hover:text-primary transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Action Tools: Hologram Scanner & Timeframe */}
        <div className="flex items-center gap-1.5">
          {/* Biometric Hologram Scanner Toggle */}
          <button
            onClick={() => {
              haptics.tick();
              setIsScannerActive(!isScannerActive);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isScannerActive
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,225,255,0.35)]"
                : "bg-[#0d121c] border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Scan className={`w-3.5 h-3.5 ${isScannerActive ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Escáner</span>
          </button>

          {/* Timeframe Chips */}
          {onTimeframeChange && (
            <div className="flex items-center bg-[#0d121c] border border-white/10 rounded-2xl p-1 text-[11px] font-mono">
              {(["week", "month", "all"] as MuscleTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    haptics.tick();
                    onTimeframeChange(tf);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-bold uppercase transition-all ${
                    timeframe === tf
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tf === "week" ? "Sem" : tf === "month" ? "Mes" : "Total"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main 3D Interactive Anatomical Stage */}
      <div
        ref={stageRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative flex flex-col items-center justify-center min-h-[420px] bg-gradient-to-b from-[#080d16] via-[#0c1322] to-[#070b13] rounded-3xl border border-white/10 p-4 shadow-2xl overflow-hidden touch-pan-y [perspective:1200px]"
      >
        {/* Ambient Volumetric Neons */}
        <div className="pointer-events-none absolute -top-12 -left-12 w-64 h-64 rounded-full bg-primary/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-cyan-500/15 blur-[100px]" />

        {/* 3D Perspective Hologram Grid Floor */}
        <div
          className="pointer-events-none absolute bottom-0 left-[-20%] right-[-20%] h-36 hologram-grid-floor opacity-40 [transform:rotateX(68deg)_translateZ(-40px)] [mask-image:linear-gradient(to_bottom,transparent,black_80%)]"
        />

        {/* HUD Overlay Telemetry Headers */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-20 text-[10px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-zinc-300 font-bold uppercase tracking-wider">
              {activeView === "front" ? "ANTERIOR" : "POSTERIOR"} 3D
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-black/40 border border-white/10 rounded-full text-zinc-300">
              {biomechanics.activeCount}/16 MÚSCULOS ACTIVOS
            </span>
          </div>
        </div>

        {/* Laser Scanner Beam (Active Mode) */}
        {isScannerActive && (
          <div className="pointer-events-none absolute inset-x-6 z-30 animate-laser-sweep">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00E1FF]" />
            <div className="w-full h-8 bg-gradient-to-b from-cyan-400/15 to-transparent" />
          </div>
        )}

        {/* 3D Motion Physique Wrapper */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative z-10 w-full max-w-[300px] flex flex-col items-center select-none py-2"
        >
          <svg
            viewBox="0 0 320 540"
            className="w-full h-[400px] drop-shadow-[0_18px_32px_rgba(0,0,0,0.85)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Dark metallic titanium base */}
              <linearGradient id="body-base-metal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#172030" />
                <stop offset="50%" stopColor="#101724" />
                <stop offset="100%" stopColor="#0a0f18" />
              </linearGradient>

              {/* Inactive Muscle */}
              <linearGradient id="inactive-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#222c3d" />
                <stop offset="100%" stopColor="#141c28" />
              </linearGradient>

              {/* Intensity Gradients with 3D Curvature */}
              <linearGradient id="light-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.85" />
                <stop offset="60%" stopColor="#00AACC" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#006688" stopOpacity="0.5" />
              </linearGradient>

              <linearGradient id="mod-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#33FFB5" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#00D68F" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#008855" stopOpacity="0.65" />
              </linearGradient>

              <linearGradient id="high-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#55FF33" stopOpacity="1" />
                <stop offset="50%" stopColor="#00FF99" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#009944" stopOpacity="0.75" />
              </linearGradient>

              <linearGradient id="peak-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF200" stopOpacity="1" />
                <stop offset="40%" stopColor="#FF8800" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FF3300" stopOpacity="0.85" />
              </linearGradient>

              {/* Micro Striation Pattern for Living Muscle Fibers */}
              <pattern id="muscle-fibers" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
              </pattern>

              {/* 3D Bevel & Dropshadow */}
              <filter id="subtle-bevel" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.8" />
              </filter>

              {/* Neon Glow Bloom */}
              <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Peak Hypertrophy Bloom */}
              <filter id="peak-bloom" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="6" result="blur1" />
                <feGaussianBlur stdDeviation="2" result="blur2" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 2 0" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ============================================================
                VISTA ANTERIOR (FRONTAL) ESCULPIDA DE ALTA DEFINICIÓN
                ============================================================ */}
            {activeView === "front" && (
              <g id="anterior-view">
                {/* Athletic Heroic Silhouette Base */}
                <path
                  d="M144 42 C144 24 176 24 176 42 C176 56 168 64 160 66 C152 64 144 56 144 42 Z
                     M150 66 L144 86 L112 94 C96 100 80 116 70 144 C60 166 50 204 54 238 C56 256 62 260 68 258 C74 254 78 236 82 216 L88 186
                     L100 174 L104 242 L112 280 L122 304 L122 360 L114 426 L108 484 L106 522 L124 528 L136 520 L144 446 L152 360 L160 310
                     L168 360 L176 446 L184 520 L196 528 L214 522 L212 484 L206 426 L198 360 L198 304 L208 280 L216 242 L220 174
                     L232 186 L238 216 C242 236 246 254 252 258 C258 260 264 256 266 238 C270 204 260 166 250 144 C240 116 224 100 208 94
                     L176 86 L170 66 Z"
                  fill="url(#body-base-metal)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1.2"
                />

                {/* Clavicles & Neck Lines */}
                <path d="M128 92 Q160 102 192 92" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.4" />
                <path d="M160 74 L160 98" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />

                {/* 1. DELTOIDES ANTERIOR (HOMBRO FRONTAL) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("deltoids_ant");
                  }}
                >
                  {/* Left Anterior Deltoid */}
                  <path
                    d="M112 96 C104 98 94 108 90 124 C86 138 88 152 94 160 C98 164 104 162 108 148 C112 136 114 120 118 106 Z"
                    {...getMuscleVisuals("deltoids_ant")}
                  />
                  {/* Right Anterior Deltoid */}
                  <path
                    d="M208 96 C216 98 226 108 230 124 C234 138 232 152 226 160 C222 164 216 162 212 148 C208 136 206 120 202 106 Z"
                    {...getMuscleVisuals("deltoids_ant")}
                  />
                </g>

                {/* 2. DELTOIDES LATERAL (ANCHURA 3D DEL HOMBRO) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("deltoids_lat");
                  }}
                >
                  {/* Left Lateral Deltoid Cap */}
                  <path
                    d="M92 106 C84 114 74 128 72 144 C70 156 74 166 80 168 C86 170 90 162 92 148 C94 136 94 120 92 106 Z"
                    {...getMuscleVisuals("deltoids_lat")}
                  />
                  {/* Right Lateral Deltoid Cap */}
                  <path
                    d="M228 106 C236 114 246 128 248 144 C250 156 246 166 240 168 C234 170 230 162 228 148 C226 136 226 120 228 106 Z"
                    {...getMuscleVisuals("deltoids_lat")}
                  />
                </g>

                {/* 3. PECTORALES (CHEST) - CABEZA CLAVICULAR Y ESTERNAL */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("chest");
                  }}
                >
                  {/* Left Pec */}
                  <path
                    d="M120 102 C134 102 154 104 157 108 L157 154 C146 162 126 162 116 154 C108 146 108 130 110 116 C112 108 116 102 120 102 Z"
                    {...getMuscleVisuals("chest")}
                  />
                  {/* Left Pec Striations overlay */}
                  {muscleStats.chest?.volumeKg > 0 && (
                    <path
                      d="M120 102 C134 102 154 104 157 108 L157 154 C146 162 126 162 116 154 C108 146 108 130 110 116 Z"
                      fill="url(#muscle-fibers)"
                      opacity={0.35}
                    />
                  )}

                  {/* Right Pec */}
                  <path
                    d="M200 102 C186 102 166 104 163 108 L163 154 C174 162 194 162 204 154 C212 146 212 130 210 116 C208 108 204 102 200 102 Z"
                    {...getMuscleVisuals("chest")}
                  />
                  {muscleStats.chest?.volumeKg > 0 && (
                    <path
                      d="M200 102 C186 102 166 104 163 108 L163 154 C174 162 194 162 204 154 C212 146 212 130 210 116 Z"
                      fill="url(#muscle-fibers)"
                      opacity={0.35}
                    />
                  )}

                  {/* Sternum / Mid Cleft line */}
                  <path d="M160 100 L160 162" stroke="rgba(0,0,0,0.5)" strokeWidth="1.8" />
                </g>

                {/* 4. BÍCEPS BRAQUIAL */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("biceps");
                  }}
                >
                  {/* Left Bicep */}
                  <path
                    d="M80 152 C74 160 72 174 74 190 C76 200 82 206 88 198 C94 190 96 176 94 162 C92 152 86 148 80 152 Z"
                    {...getMuscleVisuals("biceps")}
                  />
                  {/* Right Bicep */}
                  <path
                    d="M240 152 C246 160 248 174 246 190 C244 200 238 206 232 198 C226 190 224 176 226 162 C228 152 234 148 240 152 Z"
                    {...getMuscleVisuals("biceps")}
                  />
                </g>

                {/* 5. ANTEBRAZOS (BRAQUIORRADIAL Y FLEXORES) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("forearms");
                  }}
                >
                  {/* Left Forearm */}
                  <path
                    d="M74 198 C66 208 60 224 60 244 C62 252 68 252 72 244 C78 232 84 216 86 200 Z"
                    {...getMuscleVisuals("forearms")}
                  />
                  {/* Right Forearm */}
                  <path
                    d="M246 198 C254 208 260 224 260 244 C258 252 252 252 248 244 C242 232 236 216 234 200 Z"
                    {...getMuscleVisuals("forearms")}
                  />
                </g>

                {/* 6. ABDOMINALES (RECTUS ABDOMINIS - 6 PACK ESCULPIDO) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("abs");
                  }}
                >
                  {/* Upper Abs Pair */}
                  <path
                    d="M136 166 C146 166 154 168 157 170 L157 190 C152 192 144 192 136 190 C132 184 132 172 136 166 Z"
                    {...getMuscleVisuals("abs")}
                  />
                  <path
                    d="M184 166 C174 166 166 168 163 170 L163 190 C168 192 176 192 184 190 C188 184 188 172 184 166 Z"
                    {...getMuscleVisuals("abs")}
                  />

                  {/* Mid Abs Pair */}
                  <path
                    d="M137 196 C146 196 154 198 157 200 L157 222 C152 224 144 224 137 222 C134 216 134 202 137 196 Z"
                    {...getMuscleVisuals("abs")}
                  />
                  <path
                    d="M183 196 C174 196 166 198 163 200 L163 222 C168 224 176 224 183 222 C186 216 186 202 183 196 Z"
                    {...getMuscleVisuals("abs")}
                  />

                  {/* Lower Abs Pair / V-Cut */}
                  <path
                    d="M139 228 C148 228 154 230 157 232 L157 262 C148 264 140 256 139 228 Z"
                    {...getMuscleVisuals("abs")}
                  />
                  <path
                    d="M181 228 C172 228 166 230 163 232 L163 262 C172 264 180 256 181 228 Z"
                    {...getMuscleVisuals("abs")}
                  />

                  {/* Linea alba center line */}
                  <path d="M160 164 L160 264" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                </g>

                {/* 7. OBLICUOS Y SERRATOS (CORE FLANKS & V-TAPER) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("obliques");
                  }}
                >
                  {/* Left Oblique / Serratus */}
                  <path
                    d="M112 178 C118 178 126 184 130 194 L128 244 C120 250 112 238 110 220 C108 200 110 184 112 178 Z"
                    {...getMuscleVisuals("obliques")}
                  />
                  {/* Right Oblique / Serratus */}
                  <path
                    d="M208 178 C202 178 194 184 190 194 L192 244 C200 250 208 238 210 220 C212 200 210 184 208 178 Z"
                    {...getMuscleVisuals("obliques")}
                  />
                </g>

                {/* 8. CUÁDRICEPS (RECTUS & VASTUS MEDIALIS/LATERALIS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("quads");
                  }}
                >
                  {/* Left Quad Body */}
                  <path
                    d="M122 284 C134 284 152 290 154 300 L152 380 C144 394 130 394 126 380 L118 316 C114 298 118 284 122 284 Z"
                    {...getMuscleVisuals("quads")}
                  />
                  {/* Left Vastus Medialis (Teardrop) */}
                  <path
                    d="M140 366 C148 366 154 372 154 384 C154 396 146 400 140 398 C136 392 136 378 140 366 Z"
                    {...getMuscleVisuals("quads")}
                  />

                  {/* Right Quad Body */}
                  <path
                    d="M198 284 C186 284 168 290 166 300 L168 380 C176 394 190 394 194 380 L202 316 C206 298 202 284 198 284 Z"
                    {...getMuscleVisuals("quads")}
                  />
                  {/* Right Vastus Medialis (Teardrop) */}
                  <path
                    d="M180 366 C172 366 166 372 166 384 C166 396 174 400 180 398 C184 392 184 378 180 366 Z"
                    {...getMuscleVisuals("quads")}
                  />
                </g>

                {/* 9. GEMELOS Y TIBIAL ANTERIOR */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("calves");
                  }}
                >
                  {/* Left Shin/Calf */}
                  <path
                    d="M126 422 C136 422 142 430 144 452 L138 506 C130 508 126 504 122 488 C120 470 118 442 126 422 Z"
                    {...getMuscleVisuals("calves")}
                  />
                  {/* Right Shin/Calf */}
                  <path
                    d="M194 422 C184 422 178 430 176 452 L182 506 C190 508 194 504 198 488 C200 470 202 442 194 422 Z"
                    {...getMuscleVisuals("calves")}
                  />
                </g>
              </g>
            )}

            {/* ============================================================
                VISTA POSTERIOR (DORSAL) ESCULPIDA DE ALTA DEFINICIÓN
                ============================================================ */}
            {activeView === "back" && (
              <g id="posterior-view">
                {/* Athletic Silhouette Base Posterior */}
                <path
                  d="M144 42 C144 24 176 24 176 42 C176 56 168 64 160 66 C152 64 144 56 144 42 Z
                     M150 66 L142 86 L110 94 C94 100 78 116 68 144 C58 166 48 204 52 238 C54 256 60 260 66 258 C72 254 76 236 80 216 L86 186
                     L98 174 L102 242 L110 280 L120 304 L120 360 L112 426 L106 484 L104 522 L122 528 L134 520 L142 446 L150 360 L160 310
                     L170 360 L178 446 L186 520 L198 528 L216 522 L214 484 L208 426 L200 360 L200 304 L210 280 L218 242 L222 174
                     L234 186 L240 216 C244 236 248 254 254 258 C260 260 266 256 268 238 C272 204 262 166 252 144 C242 116 226 100 210 94
                     L178 86 L170 66 Z"
                  fill="url(#body-base-metal)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1.2"
                />

                {/* Spine Center Groove */}
                <path d="M160 78 L160 275" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeDasharray="4 2" />

                {/* 1. TRAPECIO (DIAMANTE COMPLETO) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("traps");
                  }}
                >
                  <path
                    d="M160 70 L184 84 L192 108 L160 166 L128 108 L136 84 Z"
                    {...getMuscleVisuals("traps")}
                  />
                  {muscleStats.traps?.volumeKg > 0 && (
                    <path
                      d="M160 70 L184 84 L192 108 L160 166 L128 108 L136 84 Z"
                      fill="url(#muscle-fibers)"
                      opacity={0.35}
                    />
                  )}
                </g>

                {/* 2. DELTOIDES POSTERIOR (REAR DELTS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("deltoids_post");
                  }}
                >
                  {/* Left Rear Delt */}
                  <path
                    d="M112 98 C102 104 92 118 86 136 C84 148 90 162 98 162 C104 156 108 140 116 124 Z"
                    {...getMuscleVisuals("deltoids_post")}
                  />
                  {/* Right Rear Delt */}
                  <path
                    d="M208 98 C218 104 228 118 234 136 C236 148 230 162 222 162 C216 156 212 140 204 124 Z"
                    {...getMuscleVisuals("deltoids_post")}
                  />
                </g>

                {/* 3. DORSALES ANCHOS (LATS - V-TAPER) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("lats");
                  }}
                >
                  {/* Left Lat Wing */}
                  <path
                    d="M128 114 C116 126 106 148 104 182 C106 208 120 224 132 230 L154 184 C142 158 134 136 128 114 Z"
                    {...getMuscleVisuals("lats")}
                  />
                  {muscleStats.lats?.volumeKg > 0 && (
                    <path
                      d="M128 114 C116 126 106 148 104 182 C106 208 120 224 132 230 L154 184 Z"
                      fill="url(#muscle-fibers)"
                      opacity={0.35}
                    />
                  )}

                  {/* Right Lat Wing */}
                  <path
                    d="M192 114 C204 126 214 148 216 182 C214 208 200 224 188 230 L166 184 C178 158 186 136 192 114 Z"
                    {...getMuscleVisuals("lats")}
                  />
                  {muscleStats.lats?.volumeKg > 0 && (
                    <path
                      d="M192 114 C204 126 214 148 216 182 C214 208 200 224 188 230 L166 184 Z"
                      fill="url(#muscle-fibers)"
                      opacity={0.35}
                    />
                  )}
                </g>

                {/* 4. TRÍCEPS BRAQUIAL (HERRADURA) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("triceps");
                  }}
                >
                  {/* Left Tricep */}
                  <path
                    d="M82 144 C76 154 74 170 76 192 C82 198 88 198 90 188 C92 174 94 160 92 146 Z"
                    {...getMuscleVisuals("triceps")}
                  />
                  {/* Right Tricep */}
                  <path
                    d="M238 144 C244 154 246 170 244 192 C238 198 232 198 230 188 C228 174 226 160 228 146 Z"
                    {...getMuscleVisuals("triceps")}
                  />
                </g>

                {/* 5. LUMBARES / ERECTORES ESPINALES */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("lower_back");
                  }}
                >
                  {/* Left Lumbar Column */}
                  <path
                    d="M142 222 L157 222 L157 274 L144 274 C140 256 140 238 142 222 Z"
                    {...getMuscleVisuals("lower_back")}
                  />
                  {/* Right Lumbar Column */}
                  <path
                    d="M178 222 L163 222 L163 274 L176 274 C180 256 180 238 178 222 Z"
                    {...getMuscleVisuals("lower_back")}
                  />
                </g>

                {/* 6. GLÚTEOS (MAYOR Y MEDIO) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("glutes");
                  }}
                >
                  {/* Left Glute */}
                  <path
                    d="M122 278 C136 274 154 278 157 284 L157 334 C146 344 130 344 120 330 C112 318 114 292 122 278 Z"
                    {...getMuscleVisuals("glutes")}
                  />
                  {/* Right Glute */}
                  <path
                    d="M198 278 C184 274 166 278 163 284 L163 334 C174 344 190 344 200 330 C208 318 206 292 198 278 Z"
                    {...getMuscleVisuals("glutes")}
                  />
                </g>

                {/* 7. ISQUIOSURALES (HAMSTRINGS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("hamstrings");
                  }}
                >
                  {/* Left Hamstring */}
                  <path
                    d="M122 340 C134 340 150 342 154 350 L150 408 C140 418 128 416 122 402 L118 356 Z"
                    {...getMuscleVisuals("hamstrings")}
                  />
                  {/* Right Hamstring */}
                  <path
                    d="M198 340 C186 340 170 342 166 350 L170 408 C180 418 192 416 198 402 L202 356 Z"
                    {...getMuscleVisuals("hamstrings")}
                  />
                </g>

                {/* 8. GEMELOS POSTERIORES (GASTROCNEMIUS Y SÓLEO) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("calves");
                  }}
                >
                  {/* Left Calf Bellies */}
                  <path
                    d="M120 430 C128 424 144 424 150 438 C152 454 144 478 138 504 L126 504 C120 478 116 450 120 430 Z"
                    {...getMuscleVisuals("calves")}
                  />
                  {/* Right Calf Bellies */}
                  <path
                    d="M200 430 C192 424 176 424 170 438 C168 454 176 478 182 504 L194 504 C200 478 204 450 200 430 Z"
                    {...getMuscleVisuals("calves")}
                  />
                </g>
              </g>
            )}

            {/* Target Reticle Crosshair for selected muscle */}
            {targetCoords && (
              <g id="target-reticle" className="pointer-events-none">
                <circle
                  cx={targetCoords[0]}
                  cy={targetCoords[1]}
                  r="12"
                  fill="none"
                  stroke="#00D68F"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  className="animate-spin origin-center"
                />
                <circle
                  cx={targetCoords[0]}
                  cy={targetCoords[1]}
                  r="4"
                  fill="#CCFF00"
                  className="animate-ping"
                />
                <circle cx={targetCoords[0]} cy={targetCoords[1]} r="2" fill="#FFFFFF" />
              </g>
            )}
          </svg>
        </motion.div>

        {/* 3D Touch Navigation Hint */}
        <span className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center gap-1.5 z-10">
          <Crosshair className="w-3 h-3 text-primary" />
          Arrastra para inclinar en 3D · Toca cualquier músculo
        </span>

        {/* Heatmap Spectrum Legend */}
        <div className="flex items-center justify-between w-full pt-3 mt-3 border-t border-white/5 text-[10px] font-mono z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#222c3d] border border-white/20" />
            <span className="text-zinc-500">Inactivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00E1FF]" />
            <span className="text-zinc-400">Leve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_#00D68F]" />
            <span className="text-primary font-bold">Óptimo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] shadow-[0_0_8px_#CCFF00]" />
            <span className="text-[#CCFF00] font-black">Hipertrofia</span>
          </div>
        </div>
      </div>

      {/* Biomechanical Symmetry & Balance Panel */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Push vs Pull Postural Ratio */}
        <div className="bg-[#0f1420] border border-white/10 rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Empuje vs Tracción
            </span>
            <span className="text-[10px] font-mono text-primary font-black">
              {biomechanics.pushRatio}% / {biomechanics.pullRatio}%
            </span>
          </div>
          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-500"
              style={{ width: `${biomechanics.pushRatio}%` }}
              title="Empuje (Pecho/Hombro/Tríceps)"
            />
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
              style={{ width: `${biomechanics.pullRatio}%` }}
              title="Tracción (Espalda/Dorsal/Bíceps)"
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1.5">
            {biomechanics.pushRatio >= 45 && biomechanics.pushRatio <= 55
              ? "Equilibrio postural óptimo"
              : biomechanics.pushRatio > 55
              ? "Mayor volumen en empuje"
              : "Mayor volumen en tracción"}
          </span>
        </div>

        {/* Upper vs Lower Body Ratio */}
        <div className="bg-[#0f1420] border border-white/10 rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Torso vs Piernas
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-black">
              {biomechanics.upperRatio}% / {biomechanics.lowerRatio}%
            </span>
          </div>
          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-500"
              style={{ width: `${biomechanics.upperRatio}%` }}
              title="Tren Superior & Core"
            />
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${biomechanics.lowerRatio}%` }}
              title="Tren Inferior"
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1.5">
            {biomechanics.lowerRatio >= 35
              ? "Desarrollo atlético balanceado"
              : "Recomendado: Foco en piernas"}
          </span>
        </div>
      </div>

      {/* Interactive Muscle Inspection Detail Card */}
      <AnimatePresence mode="wait">
        {selectedStat && (
          <motion.div
            key={selectedStat.muscle}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-[#121826] via-[#151f30] to-[#0f1522] border border-primary/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient accent flare */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full">
                    {selectedStat.info.majorGroup}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {selectedStat.info.scientificName}
                  </span>
                </div>
                <h4 className="text-lg font-black font-mono text-white tracking-tight">
                  {selectedStat.info.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {selectedStat.info.description}
                </p>
              </div>

              {/* Intensity Pill */}
              <div className="text-right flex-shrink-0">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                    selectedStat.intensityLevel === "peak"
                      ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/40 shadow-[0_0_12px_rgba(204,255,0,0.35)]"
                      : selectedStat.intensityLevel === "high"
                      ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(0,214,143,0.3)]"
                      : selectedStat.intensityLevel === "moderate"
                      ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                      : selectedStat.intensityLevel === "light"
                      ? "bg-blue-400/20 text-blue-300 border border-blue-400/30"
                      : "bg-white/5 text-zinc-400 border border-white/10"
                  }`}
                >
                  {selectedStat.intensityLevel === "peak"
                    ? "Hipertrofia Máx."
                    : selectedStat.intensityLevel === "high"
                    ? "Alta Carga"
                    : selectedStat.intensityLevel === "moderate"
                    ? "Carga Óptima"
                    : selectedStat.intensityLevel === "light"
                    ? "Activación Leve"
                    : "Listo / Recuperado"}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/5 text-center relative z-10">
              <div className="bg-black/35 rounded-2xl p-2.5 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Carga Estimada</span>
                <span className="text-base font-black font-mono text-white">
                  {Math.round(selectedStat.volumeKg)}{" "}
                  <span className="text-[10px] text-zinc-400">kg</span>
                </span>
              </div>
              <div className="bg-black/35 rounded-2xl p-2.5 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Series Totales</span>
                <span className="text-base font-black font-mono text-primary">
                  {selectedStat.totalSets}{" "}
                  <span className="text-[10px] text-zinc-400">sets</span>
                </span>
              </div>
              <div className="bg-black/35 rounded-2xl p-2.5 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Repeticiones</span>
                <span className="text-base font-black font-mono text-cyan-400">
                  {selectedStat.totalReps}{" "}
                  <span className="text-[10px] text-zinc-400">reps</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
