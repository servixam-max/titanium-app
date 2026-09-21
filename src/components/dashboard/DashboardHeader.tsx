"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sunrise, Sun, Moon, Flame } from "lucide-react";
import { UserAccount } from "@/lib/types";
import { getAthleteLevel } from "@/lib/gamification";

interface DashboardHeaderProps {
  user: UserAccount | null;
  streak: number;
  weeklyDays: boolean[];
  todayIndex: number;
  totalXP?: number;
}

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function useGreeting() {
  const [greeting, setGreeting] = useState<{ text: string; Icon: React.ComponentType<{ className?: string }> }>({
    text: "Hola",
    Icon: Sun,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 13) setGreeting({ text: "Buenos días", Icon: Sunrise });
    else if (hour >= 13 && hour < 20) setGreeting({ text: "Buenas tardes", Icon: Sun });
    else setGreeting({ text: "Buenas noches", Icon: Moon });
  }, []);

  return greeting;
}

export default function DashboardHeader({
  user,
  streak,
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
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <GreetingIcon className="h-4 w-4 text-emerald-600 dark:text-primary" />
            <span>{greetingText}</span>
          </div>
          <h2 className="mt-0.5 truncate text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {user?.username || "Atleta"}
          </h2>

          {athleteInfo && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border shadow-sm"
                style={{
                  color: athleteInfo.currentLevel.badgeColor,
                  borderColor: `${athleteInfo.currentLevel.badgeColor}40`,
                  backgroundColor: `${athleteInfo.currentLevel.badgeColor}15`,
                }}
              >
                Nv. {athleteInfo.currentLevel.level} · {athleteInfo.currentLevel.title}
              </span>
            </div>
          )}
        </div>

        {/* Streak Counter with Flame */}
        <div className="flex flex-shrink-0 items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 shadow-sm">
          <Flame className="h-4 w-4 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 animate-pulse" />
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-base font-black leading-none text-amber-600 dark:text-amber-400">
              {streak}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {streak === 1 ? "día" : "días"}
            </span>
          </div>
        </div>
      </div>

      {/* Activity strip */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 pt-3">
        <div className="flex items-center justify-between w-full">
          {DAY_LABELS.map((label, idx) => {
            const trained = weeklyDays[idx];
            const isToday = idx === todayIndex;
            return (
              <div
                key={label}
                className={`flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-bold transition-all sm:h-8 sm:w-8 sm:text-xs ${
                  trained
                    ? "bg-primary text-black font-black scale-105 shadow-sm"
                    : isToday
                    ? "border-2 border-primary bg-primary/15 text-primary font-black"
                    : "border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-[#131626] text-slate-500 dark:text-slate-400"
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
