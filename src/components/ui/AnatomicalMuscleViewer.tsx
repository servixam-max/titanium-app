"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Info, Flame, RotateCw, Activity, CheckCircle2 } from "lucide-react";
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

export default function AnatomicalMuscleViewer({
  muscleStats,
  timeframe,
  onTimeframeChange,
  className = "",
}: AnatomicalMuscleViewerProps) {
  const [activeView, setActiveView] = useState<"front" | "back">("front");
  const [selectedMuscle, setSelectedMuscle] = useState<AnatomicalMuscle | null>("chest");

  // Color & styling resolver for each muscle
  const getMuscleVisuals = (muscle: AnatomicalMuscle) => {
    const stat = muscleStats[muscle];
    const isSelected = selectedMuscle === muscle;
    const ratio = stat?.activationRatio ?? 0;

    if (!stat || stat.volumeKg === 0) {
      return {
        fill: isSelected ? "rgba(0, 214, 143, 0.2)" : "url(#inactive-muscle-grad)",
        stroke: isSelected ? "#00D68F" : "rgba(255, 255, 255, 0.12)",
        strokeWidth: isSelected ? 1.5 : 0.8,
        filter: isSelected ? "url(#neon-glow)" : "url(#subtle-bevel)",
        opacity: isSelected ? 0.95 : 0.65,
      };
    }

    if (stat.intensityLevel === "peak") {
      return {
        fill: "url(#peak-muscle-grad)",
        stroke: "#CCFF00",
        strokeWidth: isSelected ? 2 : 1.2,
        filter: "url(#peak-glow)",
        opacity: 1,
      };
    }

    if (stat.intensityLevel === "high") {
      return {
        fill: "url(#high-muscle-grad)",
        stroke: "#00FF9D",
        strokeWidth: isSelected ? 1.8 : 1,
        filter: "url(#high-glow)",
        opacity: 0.95,
      };
    }

    if (stat.intensityLevel === "moderate") {
      return {
        fill: "url(#mod-muscle-grad)",
        stroke: "#00D68F",
        strokeWidth: isSelected ? 1.6 : 0.9,
        filter: "url(#neon-glow)",
        opacity: 0.9,
      };
    }

    // Light
    return {
      fill: "url(#light-muscle-grad)",
      stroke: "#00E1FF",
      strokeWidth: isSelected ? 1.4 : 0.8,
      filter: "url(#subtle-bevel)",
      opacity: 0.85,
    };
  };

  const selectedStat = selectedMuscle ? muscleStats[selectedMuscle] : null;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* View & Timeframe Control Bar */}
      <div className="flex items-center justify-between gap-2">
        {/* Front / Back Toggle */}
        <div className="flex items-center bg-[#0e131d] border border-white/10 rounded-2xl p-1 shadow-inner">
          <button
            onClick={() => {
              haptics.selection();
              setActiveView("front");
              if (selectedMuscle && MUSCLE_METADATA[selectedMuscle]?.view === "back") {
                setSelectedMuscle("chest");
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
              activeView === "front"
                ? "bg-primary text-black font-black shadow-[0_0_12px_rgba(0,214,143,0.4)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Frontal
          </button>
          <button
            onClick={() => {
              haptics.selection();
              setActiveView("back");
              if (selectedMuscle && MUSCLE_METADATA[selectedMuscle]?.view === "front") {
                setSelectedMuscle("lats");
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
              activeView === "back"
                ? "bg-primary text-black font-black shadow-[0_0_12px_rgba(0,214,143,0.4)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Dorsal
          </button>
        </div>

        {/* Timeframe Chips */}
        {onTimeframeChange && (
          <div className="flex items-center bg-[#0e131d] border border-white/10 rounded-2xl p-1 text-[11px] font-mono">
            {(["week", "month", "all"] as MuscleTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  haptics.tick();
                  onTimeframeChange(tf);
                }}
                className={`px-2.5 py-1.5 rounded-xl font-bold uppercase transition-all ${
                  timeframe === tf
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tf === "week" ? "Semana" : tf === "month" ? "Mes" : "Total"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main 3D Anatomical Stage */}
      <div className="relative flex flex-col items-center justify-center min-h-[380px] bg-gradient-to-b from-[#0a0f19] via-[#0d1424] to-[#0a0e17] rounded-3xl border border-white/10 p-4 shadow-2xl overflow-hidden">
        {/* Ambient 3D Neon Backlights */}
        <div className="pointer-events-none absolute -top-16 -left-16 w-52 h-52 rounded-full bg-primary/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 w-52 h-52 rounded-full bg-cyan-500/10 blur-[90px]" />

        {/* Grid lines floor effect */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#00D68F]/5 to-transparent [mask-image:linear-gradient(to_bottom,transparent,black)]" />

        <div className="relative z-10 w-full max-w-[280px] flex flex-col items-center">
          <svg
            viewBox="0 0 240 420"
            className="w-full h-[360px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)] select-none cursor-pointer"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="body-silhouette-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#141a27" />
                <stop offset="50%" stopColor="#101520" />
                <stop offset="100%" stopColor="#0a0e16" />
              </linearGradient>

              <linearGradient id="inactive-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e2738" />
                <stop offset="100%" stopColor="#131924" />
              </linearGradient>

              <linearGradient id="light-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E1FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0088AA" stopOpacity="0.5" />
              </linearGradient>

              <linearGradient id="mod-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FF9D" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#00AA66" stopOpacity="0.7" />
              </linearGradient>

              <linearGradient id="high-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#39FF14" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#00D68F" stopOpacity="0.85" />
              </linearGradient>

              <linearGradient id="peak-muscle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CCFF00" stopOpacity="1" />
                <stop offset="50%" stopColor="#00FF9D" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FF9900" stopOpacity="0.85" />
              </linearGradient>

              {/* Filters for 3D Bevel and Neon Glow */}
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="high-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur1" />
                <feGaussianBlur stdDeviation="2" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="peak-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7" result="blur1" />
                <feGaussianBlur stdDeviation="3" result="blur2" />
                <feColorMatrix
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 2 0"
                />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="subtle-bevel" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0.5" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.7" />
              </filter>
            </defs>

            {/* ============================================================
                ANTERIOR / FRONTAL VIEW
                ============================================================ */}
            {activeView === "front" && (
              <g id="view-front">
                {/* Athletic Body Base Silhouette */}
                <path
                  d="M106 32 C106 18 134 18 134 32 C134 42 128 48 120 48 C112 48 106 42 106 32 Z
                     M112 48 L108 58 L86 64 C76 68 64 80 54 104 C46 122 38 152 42 178 C44 192 48 196 52 194 C56 192 60 178 62 164 L66 142
                     L76 132 L78 184 L84 212 L92 230 L92 274 L86 324 L82 368 L80 398 L94 402 L102 396 L108 340 L114 274 L120 236
                     L126 274 L132 340 L138 396 L146 402 L160 398 L158 368 L154 324 L148 274 L148 230 L156 212 L162 184 L164 132
                     L174 142 L178 164 C180 178 184 192 188 194 C192 196 196 192 198 178 C202 152 194 122 186 104 C176 80 164 68 154 64
                     L132 58 L128 48 Z"
                  fill="url(#body-silhouette-grad)"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1.2"
                />

                {/* Clavicles & Neck Lines */}
                <path d="M120 56 L120 74" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <path d="M96 66 Q120 74 144 66" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />

                {/* DELTOIDS (ANTERIOR & LATERAL) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("deltoids_ant");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Shoulder */}
                  <path
                    d="M86 64 C78 66 66 76 60 92 C56 102 56 114 62 120 C68 126 74 124 78 112 C82 102 84 88 88 78 Z"
                    {...getMuscleVisuals("deltoids_ant")}
                  />
                  {/* Right Shoulder */}
                  <path
                    d="M154 64 C162 66 174 76 180 92 C184 102 184 114 178 120 C172 126 166 124 162 112 C158 102 156 88 152 78 Z"
                    {...getMuscleVisuals("deltoids_ant")}
                  />
                </g>

                {/* PECTORALES (CHEST) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("chest");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Pec */}
                  <path
                    d="M92 74 C104 74 116 75 118 78 L118 116 C110 122 96 122 88 116 C82 110 82 98 84 86 C86 78 88 74 92 74 Z"
                    {...getMuscleVisuals("chest")}
                  />
                  {/* Right Pec */}
                  <path
                    d="M148 74 C136 74 124 75 122 78 L122 116 C130 122 144 122 152 116 C158 110 158 98 156 86 C154 78 152 74 148 74 Z"
                    {...getMuscleVisuals("chest")}
                  />
                  {/* Sternum / Mid Cleft line */}
                  <path d="M120 74 L120 124" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
                </g>

                {/* BICEPS (FRONT ARMS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("biceps");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Bicep */}
                  <path
                    d="M60 114 C56 120 54 130 56 142 C58 150 62 154 66 148 C70 142 72 132 70 122 C68 114 64 110 60 114 Z"
                    {...getMuscleVisuals("biceps")}
                  />
                  {/* Right Bicep */}
                  <path
                    d="M180 114 C184 120 186 130 184 142 C182 150 178 154 174 148 C170 142 168 132 170 122 C172 114 176 110 180 114 Z"
                    {...getMuscleVisuals("biceps")}
                  />
                </g>

                {/* FOREARMS (ANTEBRAZOS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("forearms");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Forearm */}
                  <path
                    d="M56 148 C50 156 46 168 46 182 C48 188 52 188 54 182 C58 174 62 162 64 150 Z"
                    {...getMuscleVisuals("forearms")}
                  />
                  {/* Right Forearm */}
                  <path
                    d="M184 148 C190 156 194 168 194 182 C192 188 188 188 186 182 C182 174 178 162 176 150 Z"
                    {...getMuscleVisuals("forearms")}
                  />
                </g>

                {/* RECTUS ABDOMINIS (6-PACK ABS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("abs");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Upper Abs Pair */}
                  <path
                    d="M102 126 C110 126 116 128 118 130 L118 144 C114 146 108 146 102 144 C98 140 98 130 102 126 Z"
                    {...getMuscleVisuals("abs")}
                  />
                  <path
                    d="M138 126 C130 126 124 128 122 130 L122 144 C126 146 132 146 138 144 C142 140 142 130 138 126 Z"
                    {...getMuscleVisuals("abs")}
                  />

                  {/* Mid Abs Pair */}
                  <path
                    d="M103 148 C110 148 116 150 118 152 L118 166 C114 168 108 168 103 166 C100 162 100 152 103 148 Z"
                    {...getMuscleVisuals("abs")}
                  />
                  <path
                    d="M137 148 C130 148 124 150 122 152 L122 166 C126 168 132 168 137 166 C140 162 140 152 137 148 Z"
                    {...getMuscleVisuals("abs")}
                  />

                  {/* Lower Abs / Core V-Taper */}
                  <path
                    d="M105 170 C110 170 116 172 118 174 L118 194 C112 196 106 190 105 170 Z"
                    {...getMuscleVisuals("abs")}
                  />
                  <path
                    d="M135 170 C130 170 124 172 122 174 L122 194 C128 196 134 190 135 170 Z"
                    {...getMuscleVisuals("abs")}
                  />
                </g>

                {/* OBLIQUES (LATERAL FLANKS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("obliques");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Oblique */}
                  <path
                    d="M84 134 C88 134 94 138 98 146 L96 182 C90 186 84 178 82 164 C80 150 82 138 84 134 Z"
                    {...getMuscleVisuals("obliques")}
                  />
                  {/* Right Oblique */}
                  <path
                    d="M156 134 C152 134 146 138 142 146 L144 182 C150 186 156 178 158 164 C160 150 158 138 156 134 Z"
                    {...getMuscleVisuals("obliques")}
                  />
                </g>

                {/* QUADRICEPS (THIGHS - RECTUS & VASTUS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("quads");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Quad Group */}
                  <path
                    d="M92 214 C100 214 114 218 116 226 L114 286 C108 296 98 296 94 286 L88 238 C86 224 88 214 92 214 Z"
                    {...getMuscleVisuals("quads")}
                  />
                  {/* Left Vastus Medialis (Teardrop above knee) */}
                  <path
                    d="M106 274 C112 274 116 278 116 288 C116 296 110 300 106 298 C102 294 102 284 106 274 Z"
                    {...getMuscleVisuals("quads")}
                  />

                  {/* Right Quad Group */}
                  <path
                    d="M148 214 C140 214 126 218 124 226 L126 286 C132 296 142 296 146 286 L152 238 C154 224 152 214 148 214 Z"
                    {...getMuscleVisuals("quads")}
                  />
                  {/* Right Vastus Medialis */}
                  <path
                    d="M134 274 C128 274 124 278 124 288 C124 296 130 300 134 298 C138 294 138 284 134 274 Z"
                    {...getMuscleVisuals("quads")}
                  />
                </g>

                {/* CALVES / TIBIALIS ANTERIOR (SHINS & LOWER LEGS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("calves");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Shin/Calf */}
                  <path
                    d="M94 316 C102 316 106 322 108 338 L104 382 C98 384 94 380 92 368 C90 354 88 332 94 316 Z"
                    {...getMuscleVisuals("calves")}
                  />
                  {/* Right Shin/Calf */}
                  <path
                    d="M146 316 C138 316 134 322 132 338 L136 382 C142 384 146 380 148 368 C150 354 152 332 146 316 Z"
                    {...getMuscleVisuals("calves")}
                  />
                </g>
              </g>
            )}

            {/* ============================================================
                POSTERIOR / DORSAL VIEW
                ============================================================ */}
            {activeView === "back" && (
              <g id="view-back">
                {/* Athletic Body Base Silhouette Posterior */}
                <path
                  d="M106 32 C106 18 134 18 134 32 C134 42 128 48 120 48 C112 48 106 42 106 32 Z
                     M112 48 L106 58 L84 64 C74 68 62 80 52 104 C44 122 36 152 40 178 C42 192 46 196 50 194 C54 192 58 178 60 164 L64 142
                     L74 132 L76 184 L82 212 L90 230 L90 274 L84 324 L80 368 L78 398 L92 402 L100 396 L106 340 L112 274 L120 236
                     L128 274 L134 340 L140 396 L148 402 L162 398 L160 368 L156 324 L150 274 L150 230 L158 212 L164 184 L166 132
                     L176 142 L180 164 C182 178 186 192 190 194 C194 196 198 192 200 178 C204 152 196 122 188 104 C178 80 166 68 156 64
                     L134 58 L128 48 Z"
                  fill="url(#body-silhouette-grad)"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1.2"
                />

                {/* Spine Center Groove */}
                <path d="M120 62 L120 210" stroke="rgba(0,0,0,0.45)" strokeWidth="1.2" strokeDasharray="3 2" />

                {/* TRAPEZIUS (TRAPS - UPPER & MID DIAMOND) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("traps");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  <path
                    d="M120 54 L138 64 L144 82 L120 126 L96 82 L102 64 Z"
                    {...getMuscleVisuals("traps")}
                  />
                </g>

                {/* REAR DELTOIDS */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("deltoids_post");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  <path
                    d="M86 66 C78 70 70 80 66 94 C64 104 68 114 74 114 C78 110 82 98 88 86 Z"
                    {...getMuscleVisuals("deltoids_post")}
                  />
                  <path
                    d="M154 66 C162 70 170 80 174 94 C176 104 172 114 166 114 C162 110 158 98 152 86 Z"
                    {...getMuscleVisuals("deltoids_post")}
                  />
                </g>

                {/* LATS (DORSALES ANCHOS / V-TAPER) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("lats");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Lat */}
                  <path
                    d="M96 86 C88 94 80 110 78 136 C80 156 90 168 100 172 L116 138 C106 118 100 102 96 86 Z"
                    {...getMuscleVisuals("lats")}
                  />
                  {/* Right Lat */}
                  <path
                    d="M144 86 C152 94 160 110 162 136 C160 156 150 168 140 172 L124 138 C134 118 140 102 144 86 Z"
                    {...getMuscleVisuals("lats")}
                  />
                </g>

                {/* TRICEPS (BACK ARMS HORSESHOE) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("triceps");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Tricep */}
                  <path
                    d="M62 108 C58 116 56 128 58 144 C62 148 66 148 68 140 C70 130 72 120 70 110 Z"
                    {...getMuscleVisuals("triceps")}
                  />
                  {/* Right Tricep */}
                  <path
                    d="M178 108 C182 116 184 128 182 144 C178 148 174 148 172 140 C170 130 168 120 170 110 Z"
                    {...getMuscleVisuals("triceps")}
                  />
                </g>

                {/* LOWER BACK (ERECTOR SPINAE / LUMBARES) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("lower_back");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Lower Back Column */}
                  <path
                    d="M106 166 L118 166 L118 206 L108 206 C104 192 104 178 106 166 Z"
                    {...getMuscleVisuals("lower_back")}
                  />
                  {/* Right Lower Back Column */}
                  <path
                    d="M134 166 L122 166 L122 206 L132 206 C136 192 136 178 134 166 Z"
                    {...getMuscleVisuals("lower_back")}
                  />
                </g>

                {/* GLUTES (GLÚTEOS) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("glutes");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Glute */}
                  <path
                    d="M92 208 C102 206 116 208 118 212 L118 250 C110 258 98 258 90 248 C84 238 86 218 92 208 Z"
                    {...getMuscleVisuals("glutes")}
                  />
                  {/* Right Glute */}
                  <path
                    d="M148 208 C138 206 124 208 122 212 L122 250 C130 258 142 258 150 248 C156 238 154 218 148 208 Z"
                    {...getMuscleVisuals("glutes")}
                  />
                </g>

                {/* HAMSTRINGS (ISQUIOSURALES) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("hamstrings");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Hamstring */}
                  <path
                    d="M92 254 C100 254 112 256 116 262 L112 306 C104 314 96 312 92 302 L88 266 Z"
                    {...getMuscleVisuals("hamstrings")}
                  />
                  {/* Right Hamstring */}
                  <path
                    d="M148 254 C140 254 128 256 124 262 L128 306 C136 314 144 312 148 302 L152 266 Z"
                    {...getMuscleVisuals("hamstrings")}
                  />
                </g>

                {/* CALVES (GASTROCNEMIUS - DIAMOND BELLIES) */}
                <g
                  onClick={() => {
                    haptics.selection();
                    setSelectedMuscle("calves");
                  }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  {/* Left Calf (Medial + Lateral Heads) */}
                  <path
                    d="M90 322 C96 318 108 318 112 328 C114 340 108 358 104 378 L94 378 C90 358 86 338 90 322 Z"
                    {...getMuscleVisuals("calves")}
                  />
                  {/* Right Calf (Medial + Lateral Heads) */}
                  <path
                    d="M150 322 C144 318 132 318 128 328 C126 340 132 358 136 378 L146 378 C150 358 154 338 150 322 Z"
                    {...getMuscleVisuals("calves")}
                  />
                </g>
              </g>
            )}
          </svg>

          {/* Quick anatomical instruction cue */}
          <span className="text-[10px] font-mono text-zinc-400 mt-2 flex items-center gap-1.5">
            <Info className="w-3 h-3 text-primary" />
            Toca cualquier músculo para inspeccionar carga y series
          </span>
        </div>

        {/* Heatmap intensity legend bar */}
        <div className="flex items-center justify-between w-full pt-3 mt-2 border-t border-white/5 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e2738] border border-white/20" />
            <span className="text-zinc-500">Inactivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00E1FF]" />
            <span className="text-zinc-400">Leve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_6px_#00D68F]" />
            <span className="text-primary font-bold">Óptimo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] shadow-[0_0_8px_#CCFF00]" />
            <span className="text-[#CCFF00] font-black">Máximo</span>
          </div>
        </div>
      </div>

      {/* Interactive Muscle Inspection Drawer / Card */}
      <AnimatePresence mode="wait">
        {selectedStat && (
          <motion.div
            key={selectedStat.muscle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-gradient-to-br from-[#121824] to-[#151f2e] border border-primary/30 rounded-2xl p-4 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full">
                    {selectedStat.info.majorGroup}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {selectedStat.info.scientificName}
                  </span>
                </div>
                <h4 className="text-base font-black font-mono text-white">
                  {selectedStat.info.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {selectedStat.info.description}
                </p>
              </div>

              {/* Intensity Pill */}
              <div className="text-right flex-shrink-0">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                    selectedStat.intensityLevel === "peak"
                      ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/40 shadow-[0_0_8px_rgba(204,255,0,0.3)]"
                      : selectedStat.intensityLevel === "high"
                      ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_8px_rgba(0,214,143,0.3)]"
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
                    : "Sin Estímulo"}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center">
              <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Carga Estimada</span>
                <span className="text-sm font-black font-mono text-white">
                  {Math.round(selectedStat.volumeKg)} <span className="text-[10px] text-zinc-400">kg</span>
                </span>
              </div>
              <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Series Totales</span>
                <span className="text-sm font-black font-mono text-primary">
                  {selectedStat.totalSets} <span className="text-[10px] text-zinc-400">sets</span>
                </span>
              </div>
              <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Repeticiones</span>
                <span className="text-sm font-black font-mono text-cyan-400">
                  {selectedStat.totalReps} <span className="text-[10px] text-zinc-400">reps</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
