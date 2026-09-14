"use client";

import { useState, useMemo } from "react";
import { Trophy, CheckCircle2, Lock, Sparkles, Filter } from "lucide-react";
import { Achievement } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import Card3D from "@/components/ui/Card3D";
import BorderBeam from "@/components/ui/BorderBeam";
import { haptics } from "@/lib/haptics";

interface AchievementsListProps {
  achievements: Achievement[];
  className?: string;
}

type AchievementFilter = "all" | "unlocked" | "locked" | "streak" | "volume" | "discipline" | "milestone";

export default function AchievementsList({ achievements, className }: AchievementsListProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [activeFilter, setActiveFilter] = useState<AchievementFilter>("all");

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const overallPercentage = Math.round((unlockedCount / Math.max(1, totalCount)) * 100);

  const filteredAchievements = useMemo(() => {
    switch (activeFilter) {
      case "unlocked":
        return achievements.filter((a) => a.isUnlocked);
      case "locked":
        return achievements.filter((a) => !a.isUnlocked);
      case "streak":
      case "volume":
      case "discipline":
      case "milestone":
        return achievements.filter((a) => a.category === activeFilter);
      case "all":
      default:
        return achievements;
    }
  }, [achievements, activeFilter]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Bar with Overall Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Trophy className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Logros y Medallas
              </h3>
              <span className="text-[10px] font-mono text-zinc-400">
                {unlockedCount} de {totalCount} desbloqueados ({overallPercentage}%)
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono font-black text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(0,214,143,0.2)]">
            {overallPercentage}%
          </span>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-[#161c28] h-2 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-primary to-[#CCFF00] transition-all duration-700 shadow-[0_0_8px_rgba(0,214,143,0.7)]"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "all", label: `Todos (${totalCount})` },
          { id: "unlocked", label: `Desbloqueados (${unlockedCount})` },
          { id: "locked", label: `Pendientes (${totalCount - unlockedCount})` },
          { id: "streak", label: "Racha" },
          { id: "volume", label: "Volumen" },
          { id: "milestone", label: "Hitos" },
          { id: "discipline", label: "Disciplina" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              haptics.tick();
              setActiveFilter(tab.id as AchievementFilter);
            }}
            className={cn(
              "flex-shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all",
              activeFilter === tab.id
                ? "bg-primary text-black font-black shadow-[0_0_8px_rgba(0,214,143,0.4)]"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of achievements */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredAchievements.map((achievement) => {
          const pct = Math.min(
            100,
            Math.round((achievement.progress / Math.max(1, achievement.target)) * 100)
          );

          return (
            <button
              key={achievement.id}
              onClick={() => {
                haptics.selection();
                setSelectedAchievement(achievement);
              }}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[115px] cursor-pointer active:scale-98",
                achievement.isUnlocked
                  ? "bg-gradient-to-br from-[#121620] to-[#151f28] border-primary/40 shadow-[0_0_12px_rgba(0,214,143,0.15)] hover:border-primary/60"
                  : "bg-[#10141c] border-white/5 opacity-70 hover:opacity-100 hover:border-white/10"
              )}
            >
              {achievement.isUnlocked && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xl drop-shadow-md">{achievement.icon}</span>
                  {achievement.isUnlocked ? (
                    <span className="flex items-center gap-0.5 text-[9px] font-mono font-black text-primary uppercase">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      OK
                    </span>
                  ) : (
                    <Lock className="w-3 h-3 text-zinc-500" />
                  )}
                </div>
                <h4 className="text-xs font-mono font-black text-white leading-tight">
                  {achievement.title}
                </h4>
                <p className="text-[10px] font-mono text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                  {achievement.description}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="flex justify-between text-[9px] font-mono mb-1">
                  <span className="text-zinc-500">Progreso</span>
                  <span className={achievement.isUnlocked ? "text-primary font-bold" : "text-zinc-400"}>
                    {achievement.progress}/{achievement.target} {achievement.unit}
                  </span>
                </div>
                <div className="w-full bg-[#161c28] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      achievement.isUnlocked
                        ? "bg-primary shadow-[0_0_6px_rgba(0,214,143,0.8)]"
                        : "bg-cyan-500/60"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3D Interactive Trophy Modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
          onClick={() => setSelectedAchievement(null)}
        >
          <div
            className="max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Card3D highlight rotateXMax={14} rotateYMax={14}>
              <div className="relative overflow-hidden bg-gradient-to-b from-[#161f2e] to-[#0e121a] border border-primary/40 rounded-3xl p-6 text-center shadow-2xl">
                {selectedAchievement.isUnlocked && (
                  <BorderBeam
                    size={160}
                    duration={5}
                    colorFrom="#00D68F"
                    colorTo="#00E1FF"
                    borderWidth={2}
                    borderRadius={24}
                  />
                )}

                <div className="relative z-10">
                  <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-tr from-black/80 to-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_24px_rgba(0,214,143,0.3)]">
                    <span className="text-5xl block select-none">
                      {selectedAchievement.icon}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                    {selectedAchievement.category}
                  </span>
                  <h3 className="text-lg font-mono font-black text-white">
                    {selectedAchievement.title}
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1 leading-relaxed">
                    {selectedAchievement.description}
                  </p>

                  <div className="my-4 p-3 bg-black/50 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                      Estado del Logro
                    </span>
                    <span
                      className={cn(
                        "text-xs font-mono font-black uppercase tracking-wide",
                        selectedAchievement.isUnlocked
                          ? "text-primary flex items-center justify-center gap-1"
                          : "text-zinc-500"
                      )}
                    >
                      {selectedAchievement.isUnlocked ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          ¡Completado y Desbloqueado!
                        </>
                      ) : (
                        `En progreso (${selectedAchievement.progress} / ${selectedAchievement.target} ${selectedAchievement.unit})`
                      )}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      haptics.tick();
                      setSelectedAchievement(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </Card3D>
          </div>
        </div>
      )}
    </div>
  );
}
