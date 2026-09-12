"use client";

import { motion } from "framer-motion";
import { Sunrise, Sun, Moon, Flame, Zap, Clock } from "lucide-react";
import { UserAccount } from "@/lib/types";

interface DashboardHeaderProps {
  user: UserAccount | null;
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  weeklyDays: boolean[];
  todayIndex: number;
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
}: DashboardHeaderProps) {
  const { text: greetingText, Icon: GreetingIcon } = useGreeting();

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-panel p-4 shadow-xl"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-t-3xl" />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
            <GreetingIcon className="h-3.5 w-3.5 text-primary" />
            <span>{greetingText}</span>
          </div>
          <h2 className="mt-0.5 truncate text-title-md text-white">
            {user?.username || "Atleta"}
          </h2>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-[#0e121a] px-3 py-1.5 shadow-md">
          <Flame className="h-4 w-4 animate-pulse text-primary fill-primary/30" />
          <div className="flex flex-col text-right">
            <span className="font-mono text-base font-black leading-none text-primary">
              {streak}
            </span>
            <span className="text-[9px] font-medium text-text-secondary">
              {streak === 1 ? "Día racha" : "Días racha"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5">
          {DAY_LABELS.map((label, idx) => {
            const trained = weeklyDays[idx];
            const isToday = idx === todayIndex;
            return (
              <div
                key={label}
                className={`flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-black transition-all sm:h-8 sm:w-8 sm:text-xs ${
                  trained
                    ? "bg-[#00D68F] text-black shadow-md font-black"
                    : isToday
                    ? "border-2 border-[#00D68F] bg-[#00D68F]/20 text-[#00D68F]"
                    : "border border-white/10 bg-[#141a24] text-zinc-400"
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pl-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-2.5 py-1">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <strong className="text-white">{totalWorkouts}</strong>
          </span>
          <span className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <strong className="text-white">{totalMinutes}m</strong>
          </span>
        </div>
      </div>
    </motion.section>
  );
}
