"use client";

import { useMemo, useState, useEffect } from "react";
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

/**
 * Cabecera sobria: saludo, nombre y racha. Sin tarjeta, sin píldoras con
 * borde ni insignias compitiendo: la racha es un dato, no un adorno.
 */
export default function DashboardHeader({
  user,
  streak,
  weeklyDays,
  todayIndex,
  totalXP,
}: DashboardHeaderProps) {
  const { text: greetingText, Icon: GreetingIcon } = useGreeting();

  const athleteInfo = useMemo(
    () => (totalXP !== undefined ? getAthleteLevel(totalXP) : null),
    [totalXP],
  );

  return (
    <header className="flex flex-col gap-4 px-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[15px] text-[color:var(--text-secondary)]">
            <GreetingIcon className="h-4 w-4 text-primary" />
            <span>{greetingText}</span>
          </div>
          <h1 className="mt-0.5 truncate text-[28px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
            {user?.username || "Atleta"}
          </h1>
          {athleteInfo && (
            <p className="mt-1 text-[13px] text-[color:var(--text-tertiary)]">
              Nivel {athleteInfo.currentLevel.level} · {athleteInfo.currentLevel.title}
            </p>
          )}
        </div>

        {streak > 0 && (
          <div className="flex flex-shrink-0 items-center gap-1.5 pt-1">
            <Flame className="h-4 w-4 text-amber-500" />
            <span className="fx-num text-[17px] text-foreground">{streak}</span>
            <span className="fx-label-sm">{streak === 1 ? "día" : "días"}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {DAY_LABELS.map((label, idx) => {
          const trained = weeklyDays[idx];
          const isToday = idx === todayIndex;
          return (
            <span
              key={label}
              aria-label={trained ? `${label}: entrenado` : `${label}: sin entrenar`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                trained
                  ? "bg-primary"
                  : isToday
                    ? "bg-[color:var(--text-tertiary)]"
                    : "bg-[var(--fx-hairline)]"
              }`}
            />
          );
        })}
      </div>
    </header>
  );
}
