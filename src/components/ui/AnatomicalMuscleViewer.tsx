"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Layers } from "lucide-react";
import {
  AnatomicalMuscle,
  DetailedMuscleStat,
  MuscleTimeframe,
} from "@/lib/muscle-engine";
import { haptics } from "@/lib/haptics";

// Dynamically import the WebGL Three.js 3D Viewer with SSR disabled
const ThreeMuscleViewer = dynamic(() => import("./ThreeMuscleViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[440px] bg-[#0A0B10] rounded-3xl border border-white/10 gap-3">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-zinc-400">Iniciando Motor 3D WebGL...</span>
    </div>
  ),
});

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
  const [renderMode, setRenderMode] = useState<"3d" | "2d">("3d");

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Visual Engine Mode Switcher: 3D Real 360° vs 2D Diagrama */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 bg-[#0d101a] border border-white/10 rounded-2xl p-1 shadow-inner">
          <button
            onClick={() => {
              haptics.selection();
              setRenderMode("3d");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black uppercase transition-all flex items-center gap-1.5 ${
              renderMode === "3d"
                ? "bg-primary text-black font-black shadow-[0_0_12px_rgba(0,214,143,0.45)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Real 360°</span>
          </button>
          <button
            onClick={() => {
              haptics.selection();
              setRenderMode("2d");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
              renderMode === "2d"
                ? "bg-primary text-black font-black shadow-[0_0_12px_rgba(0,214,143,0.45)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D Plano</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-zinc-500 uppercase">
          {renderMode === "3d" ? "Motor WebGL 3D" : "Esquema Vectorial"}
        </span>
      </div>

      {/* Render Active Engine */}
      {renderMode === "3d" ? (
        <ThreeMuscleViewer
          muscleStats={muscleStats}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
        />
      ) : (
        <TwoDimensionalViewer
          muscleStats={muscleStats}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
        />
      )}
    </div>
  );
}

// 2D Vector Fallback Viewer
function TwoDimensionalViewer({
  muscleStats,
  timeframe: _timeframe,
  onTimeframeChange: _onTimeframeChange,
}: AnatomicalMuscleViewerProps) {
  const [activeView, setActiveView] = useState<"front" | "back">("front");
  const [selectedMuscle, setSelectedMuscle] = useState<AnatomicalMuscle | null>("chest");

  const getMuscleVisuals = (muscle: AnatomicalMuscle) => {
    const stat = muscleStats[muscle];
    const isSelected = selectedMuscle === muscle;
    const isTrained = stat && stat.volumeKg > 0;

    if (!isTrained) {
      return {
        fill: isSelected ? "rgba(0, 214, 143, 0.28)" : "#1c2536",
        stroke: isSelected ? "#D4FF00" : "rgba(255, 255, 255, 0.15)",
        strokeWidth: isSelected ? 2 : 0.8,
        opacity: isSelected ? 1 : 0.7,
        className: "transition-all duration-300 cursor-pointer hover:opacity-90",
      };
    }

    if (stat.intensityLevel === "peak") {
      return {
        fill: "#ffaa00",
        stroke: isSelected ? "#FFFFFF" : "#CCFF00",
        strokeWidth: isSelected ? 2.5 : 1.4,
        opacity: 1,
        className: "transition-all duration-300 cursor-pointer",
      };
    }

    if (stat.intensityLevel === "high") {
      return {
        fill: "#39FF14",
        stroke: isSelected ? "#FFFFFF" : "#00FF99",
        strokeWidth: isSelected ? 2.2 : 1.2,
        opacity: 0.98,
        className: "transition-all duration-300 cursor-pointer",
      };
    }

    if (stat.intensityLevel === "moderate") {
      return {
        fill: "#00FF9D",
        stroke: isSelected ? "#FFFFFF" : "#00AA66",
        strokeWidth: isSelected ? 2 : 1,
        opacity: 0.94,
        className: "transition-all duration-300 cursor-pointer",
      };
    }

    return {
      fill: "#00E1FF",
      stroke: isSelected ? "#FFFFFF" : "#0088AA",
      strokeWidth: isSelected ? 1.8 : 0.9,
      opacity: 0.88,
      className: "transition-all duration-300 cursor-pointer",
    };
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-[#0d101a] border border-white/10 rounded-2xl p-1 text-xs font-mono font-bold">
          <button
            onClick={() => {
              haptics.selection();
              setActiveView("front");
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeView === "front" ? "bg-gradient-to-r from-primary to-emerald-400 text-black font-black shadow-neon" : "text-zinc-400 hover:text-white"
            }`}
          >
            Frontal
          </button>
          <button
            onClick={() => {
              haptics.selection();
              setActiveView("back");
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeView === "back" ? "bg-gradient-to-r from-primary to-emerald-400 text-black font-black shadow-neon" : "text-zinc-400 hover:text-white"
            }`}
          >
            Dorsal
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[360px] bg-[#0A0B10] rounded-3xl border border-white/10 p-4">
        <svg viewBox="0 0 240 420" className="w-full h-[320px] select-none cursor-pointer">
          {activeView === "front" ? (
            <g id="front-view">
              <path
                d="M106 32 C106 18 134 18 134 32 C134 42 128 48 120 48 C112 48 106 42 106 32 Z
                   M112 48 L108 58 L86 64 C76 68 64 80 54 104 C46 122 38 152 42 178 C44 192 48 196 52 194 C56 192 60 178 62 164 L66 142
                   L76 132 L78 184 L84 212 L92 230 L92 274 L86 324 L82 368 L80 398 L94 402 L102 396 L108 340 L114 274 L120 236
                   L126 274 L132 340 L138 396 L146 402 L160 398 L158 368 L154 324 L148 274 L148 230 L156 212 L162 184 L164 132
                   L174 142 L178 164 C180 178 184 192 188 194 C192 196 196 192 198 178 C202 152 194 122 186 104 C176 80 164 68 154 64
                   L132 58 L128 48 Z"
                fill="#131626"
                stroke="rgba(255,255,255,0.12)"
              />
              <g onClick={() => setSelectedMuscle("chest")}>
                <path d="M96 90 L118 92 L118 116 L94 114 Z" {...getMuscleVisuals("chest")} />
                <path d="M144 90 L122 92 L122 116 L146 114 Z" {...getMuscleVisuals("chest")} />
              </g>
              <g onClick={() => setSelectedMuscle("deltoids_ant")}>
                <path d="M84 68 L70 94 L88 106 L96 82 Z" {...getMuscleVisuals("deltoids_ant")} />
                <path d="M156 68 L170 94 L152 106 L144 82 Z" {...getMuscleVisuals("deltoids_ant")} />
              </g>
              <g onClick={() => setSelectedMuscle("biceps")}>
                <path d="M60 108 L66 140 L74 112 Z" {...getMuscleVisuals("biceps")} />
                <path d="M180 108 L174 140 L166 112 Z" {...getMuscleVisuals("biceps")} />
              </g>
              <g onClick={() => setSelectedMuscle("abs")}>
                <path d="M102 124 L138 124 L134 186 L106 186 Z" {...getMuscleVisuals("abs")} />
              </g>
              <g onClick={() => setSelectedMuscle("quads")}>
                <path d="M92 216 L118 218 L112 284 L88 244 Z" {...getMuscleVisuals("quads")} />
                <path d="M148 216 L122 218 L128 284 L152 244 Z" {...getMuscleVisuals("quads")} />
              </g>
              <g onClick={() => setSelectedMuscle("calves")}>
                <path d="M90 322 L110 328 L104 374 L94 374 Z" {...getMuscleVisuals("calves")} />
                <path d="M150 322 L130 328 L136 374 L146 374 Z" {...getMuscleVisuals("calves")} />
              </g>
            </g>
          ) : (
            <g id="back-view">
              <path
                d="M106 32 C106 18 134 18 134 32 C134 42 128 48 120 48 C112 48 106 42 106 32 Z
                   M112 48 L106 58 L84 64 C74 68 62 80 52 104 C44 122 36 152 40 178 C42 192 46 196 50 194 C54 192 58 178 60 164 L64 142
                   L74 132 L76 184 L82 212 L90 230 L90 274 L84 324 L80 368 L78 398 L92 402 L100 396 L106 340 L112 274 L120 236
                   L128 274 L134 340 L140 396 L148 402 L162 398 L160 368 L156 324 L150 274 L150 230 L158 212 L164 184 L166 132
                   L176 142 L180 164 C182 178 186 192 190 194 C194 196 198 192 200 178 C204 152 196 122 188 104 C178 80 166 68 156 64
                   L134 58 L128 48 Z"
                fill="#131626"
                stroke="rgba(255,255,255,0.12)"
              />
              <g onClick={() => setSelectedMuscle("traps")}>
                <path d="M120 54 L138 64 L144 82 L120 126 L96 82 L102 64 Z" {...getMuscleVisuals("traps")} />
              </g>
              <g onClick={() => setSelectedMuscle("lats")}>
                <path d="M96 86 C88 94 80 110 78 136 L116 138 Z" {...getMuscleVisuals("lats")} />
                <path d="M144 86 C152 94 160 110 162 136 L124 138 Z" {...getMuscleVisuals("lats")} />
              </g>
              <g onClick={() => setSelectedMuscle("triceps")}>
                <path d="M62 108 L68 140 L70 110 Z" {...getMuscleVisuals("triceps")} />
                <path d="M178 108 L172 140 L170 110 Z" {...getMuscleVisuals("triceps")} />
              </g>
              <g onClick={() => setSelectedMuscle("glutes")}>
                <path d="M92 208 L118 212 L118 250 L90 248 Z" {...getMuscleVisuals("glutes")} />
                <path d="M148 208 L122 212 L122 250 L150 248 Z" {...getMuscleVisuals("glutes")} />
              </g>
              <g onClick={() => setSelectedMuscle("hamstrings")}>
                <path d="M92 254 L116 262 L112 306 L88 266 Z" {...getMuscleVisuals("hamstrings")} />
                <path d="M148 254 L124 262 L128 306 L152 266 Z" {...getMuscleVisuals("hamstrings")} />
              </g>
              <g onClick={() => setSelectedMuscle("calves")}>
                <path d="M90 322 L112 328 L104 378 L94 378 Z" {...getMuscleVisuals("calves")} />
                <path d="M150 322 L128 328 L136 378 L146 378 Z" {...getMuscleVisuals("calves")} />
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
