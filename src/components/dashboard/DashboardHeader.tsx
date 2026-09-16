"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sunrise, Sun, Moon, Flame, Zap, Clock } from "lucide-react";
import { UserAccount } from "@/lib/types";
import { getAthleteLevel } from "@/lib/gamification";

interface DashboardHeaderProps {
  user: UserAccount | null;
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  weeklyDays: boolean[];
  todayIndex: number;
  totalXP?: number;
}

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function useGreeting() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 13) return { text: "Buenos días", Icon: Sunrise };
  if (hour >= 13 && hour < 20) return { text: "Buenas tardes", Icon: Sun };
  return { text: "Buenas noches", Icon: Moon };
}

export default function DashboardHeader({
  user,
  streak,
  totalWorkouts,
  totalMinutes,
  weeklyDays,
  todayIndex,
  totalXP,
}: DashboardHeaderProps) {
  const { text: greetingText, Icon: GreetingIcon } = useGreeting();

  const athleteInfo = useMemo(() => {
    return totalXP !== undefined ? getAthleteLevel(totalXP) : null;
  }, [totalXP]);

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-panel p-4 shadow-2xl relative overflow-hidden border border-white/10"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <GreetingIcon className="h-4 w-4 text-primary" />
            <span>{greetingText}</span>
          </div>
          <h2 className="mt-0.5 truncate text-xl font-black text-white tracking-tight">
            {user?.username || "Atleta"}
          </h2>

          {athleteInfo && (
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm"
                style={{
                  color: athleteInfo.currentLevel.badgeColor,
                  borderColor: `${athleteInfo.currentLevel.badgeColor}60`,
                  backgroundColor: `${athleteInfo.currentLevel.badgeColor}20`,
                }}
              >
                Nv. {athleteInfo.currentLevel.level} · {athleteInfo.currentLevel.title}
              </span>
              <div className="flex items-center gap-1.5 flex-1 max-w-[130px]">
                <div className="w-full bg-[#181C2C] h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{
                      width: `${athleteInfo.progressPercent}%`,
                      backgroundColor: athleteInfo.currentLevel.badgeColor,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-200 font-bold whitespace-nowrap">
                  {totalXP} XP
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Streak Counter with Solar Flame */}
        <div className="flex flex-shrink-0 items-center gap-2 rounded-2xl border border-amber-500/30 bg-[#161310] px-3.5 py-2 shadow-lg">
          <Flame className="h-5 w-5 animate-pulse text-amber-400 fill-amber-400" />
          <div className="flex flex-col text-right">
            <span className="font-mono text-lg font-black leading-none text-amber-400">
              {streak}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/80 mt-0.5">
              {streak === 1 ? "Día racha" : "Días racha"}
            </span>
          </div>
        </div>
      </div>

      {/* Activity strip */}
      <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex items-center gap-1.5">
          {DAY_LABELS.map((label, idx) => {
            const trained = weeklyDays[idx];
            const isToday = idx === todayIndex;
            return (
              <div
                key={label}
                className={`flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-black transition-all sm:h-8 sm:w-8 sm:text-xs ${
                  trained
                    ? "bg-primary text-black shadow-neon font-black scale-105"
                    : isToday
                    ? "border-2 border-primary bg-primary/20 text-primary font-black"
                    : "border border-white/10 bg-[#141824] text-slate-400 font-bold"
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pl-2 text-[11px] text-slate-200">
          <span className="flex items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <strong className="text-white font-mono">{totalWorkouts}</strong>
          </span>
          <span className="flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <strong className="text-white font-mono">{totalMinutes}m</strong>
          </span>
        </div>
      </div>
    </motion.section>
  );
}
