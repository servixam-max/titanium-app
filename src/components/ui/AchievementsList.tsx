"use client";

import { useState } from "react";
import { Trophy, CheckCircle2, Lock } from "lucide-react";
import { Achievement } from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface AchievementsListProps {
  achievements: Achievement[];
  className?: string;
}

export default function AchievementsList({ achievements, className }: AchievementsListProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Logros y Medallas
          </h3>
        </div>
        <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full">
          {unlockedCount} / {achievements.length} DESBLOQUEADOS
        </span>
      </div>

      {/* Grid of achievements */}
      <div className="grid grid-cols-2 gap-2.5">
        {achievements.map((achievement) => {
          const pct = Math.min(
            100,
            Math.round((achievement.progress / Math.max(1, achievement.target)) * 100)
          );

          return (
            <button
              key={achievement.id}
              onClick={() => setSelectedAchievement(achievement)}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px] cursor-pointer active:scale-98",
                achievement.isUnlocked
                  ? "bg-gradient-to-br from-[#121620] to-[#151f28] border-primary/40 shadow-[0_0_12px_rgba(0,214,143,0.15)] hover:border-primary/60"
                  : "bg-[#10141c] border-white/5 opacity-75 hover:opacity-100 hover:border-white/10"
              )}
            >
              {achievement.isUnlocked && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xl">{achievement.icon}</span>
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

      {/* Detail Modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedAchievement(null)}
        >
          <div
            className="bg-[#121620] border border-primary/40 rounded-3xl p-6 max-w-xs w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <span className="text-5xl block mb-2">{selectedAchievement.icon}</span>
              <h3 className="text-lg font-mono font-black text-white">
                {selectedAchievement.title}
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                {selectedAchievement.description}
              </p>

              <div className="my-4 p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                  Estado
                </span>
                <span
                  className={cn(
                    "text-xs font-mono font-black uppercase",
                    selectedAchievement.isUnlocked ? "text-primary" : "text-amber-400"
                  )}
                >
                  {selectedAchievement.isUnlocked
                    ? "✨ ¡Logro Desbloqueado!"
                    : `En progreso: ${selectedAchievement.progress} / ${selectedAchievement.target} ${selectedAchievement.unit}`}
                </span>
              </div>

              <button
                onClick={() => setSelectedAchievement(null)}
                className="w-full h-11 bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
