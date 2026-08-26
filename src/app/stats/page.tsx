"use client";

import { useState, useEffect } from "react";
import {
  Flame,
  Dumbbell,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  Activity,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { getSessions } from "@/lib/db";
import { WorkoutSession } from "@/lib/types";
function formatDuration(seconds: number) {
  if (!seconds) return "--";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function safeFormatDate(dateStr: string, options?: Intl.DateTimeFormatOptions) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "?";
    return date.toLocaleDateString(
      "es-ES",
      options || { day: "numeric", month: "short" },
    );
  } catch {
    return "?";
  }
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function calculateStreak(sessions: WorkoutSession[]) {
  if (sessions.length === 0) return 0;
  const completed = sessions.filter((s) => s.completed && s.endTime);
  const dates = Array.from(
    new Set(completed.map((s) => new Date(s.endTime!).toDateString())),
  ).map((d) => new Date(d));
  dates.sort((a, b) => b.getTime() - a.getTime());
  if (dates.length === 0) return 0;

  const today = new Date();
  let streak = 0;
  const check = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  // If no training today, start checking from yesterday
  if (!dates.some((d) => sameDay(d, check))) {
    check.setDate(check.getDate() - 1);
  }
  for (const d of dates) {
    if (sameDay(d, check)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else if (d < check) {
      break;
    }
  }
  return streak;
}

export default function StatsPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSessions().then((data) => {
      setSessions(data);
      setIsLoading(false);
    });
  }, []);

  const completed = sessions.filter((s) => s.completed && s.endTime);
  const total = completed.length;
  const totalSets = completed.reduce(
    (sum, s) => sum + s.exercises.reduce((e, ex) => e + ex.sets.length, 0),
    0,
  );
  const totalReps = completed.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (e, ex) => e + ex.sets.reduce((se, set) => se + (set.reps || 0), 0),
        0,
      ),
    0,
  );
  const totalVolume = completed.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (e, ex) =>
          e +
          ex.sets.reduce(
            (se, set) => se + (set.weight || 0) * (set.reps || 0),
            0,
          ),
        0,
      ),
    0,
  );
  const totalDuration = completed.reduce((sum, s) => {
    if (!s.endTime) return sum;
    return (
      sum +
      Math.round(
        (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) /
          1000,
      )
    );
  }, 0);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = completed.filter(
    (s) => s.endTime && new Date(s.endTime) >= weekStart,
  ).length;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = completed.filter(
    (s) => s.endTime && new Date(s.endTime) >= monthStart,
  ).length;

  const streak = calculateStreak(sessions);
  const lastSession = completed[0]?.endTime || null;
  const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
  const avgReps = total > 0 ? Math.round(totalReps / total) : 0;

  const chartData = completed.slice(-8).map((s) => ({
    start_time:
      typeof s.startTime === "string" ? s.startTime : s.startTime.toISOString(),
    volume: s.exercises.reduce(
      (e, ex) =>
        e +
        ex.sets.reduce(
          (se, set) => se + (set.weight || 0) * (set.reps || 0),
          0,
        ),
      0,
    ),
    routine_name: `Día ${s.routineId}`,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen pb-[120px] animate-page-in">
        <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />
        <main className="w-full px-container-padding pt-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-surface-container-high rounded-xl animate-pulse"
              />
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="min-h-screen pb-[100px]">
        <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />
        <main className="w-full px-container-padding pt-[80px] flex flex-col gap-section-gap">
          <section className="mt-4">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
              Estadísticas
            </h2>
            <p className="font-body-lg text-body-lg text-secondary mt-base">
              Tu progreso en números.
            </p>
          </section>
          <div className="text-center py-16">
            <Activity className="w-16 h-16 text-on-surface-variant mx-auto mb-4" />
            <p className="font-body-md text-body-md text-on-surface-variant">
              No hay datos suficientes todavía.
            </p>
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-2">
              ¡Entrena para ver tus estadísticas!
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[120px]">
      <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />

      <main className="w-full px-container-padding pt-4 flex flex-col gap-section-gap">
        <section className="mt-4">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
            Estadísticas
          </h2>
          <p className="font-body-lg text-body-lg text-secondary mt-base">
            Tu progreso en números.
          </p>
        </section>

        <section className="bg-surface-container-low border border-primary-container/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center flex-shrink-0">
            <Flame className="w-8 h-8 text-primary-container" />
          </div>
          <div>
            <span className="font-headline-lg text-headline-lg text-primary-container block leading-none">
              {streak} {streak === 1 ? "día" : "días"}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              RACHA ACTUAL
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Dumbbell className="w-5 h-5 text-primary-container" />}
            label="SESIONES"
            value={total.toString()}
            sublabel={`${thisWeek} esta semana`}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-primary-container" />}
            label="VOLUMEN"
            value={`${(totalVolume / 1000).toFixed(1)}T`}
            sublabel={`${totalSets} series totales`}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-primary-container" />}
            label="TIEMPO TOTAL"
            value={formatDuration(totalDuration)}
            sublabel={`Media ${formatDuration(avgDuration)}`}
          />
          <StatCard
            icon={<Award className="w-5 h-5 text-primary-container" />}
            label="REPETICIONES"
            value={totalReps.toString()}
            sublabel={`Media ${avgReps} reps/ses`}
          />
        </section>

        <section className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4">
          <h3 className="font-headline-md text-headline-md mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-container" />
            Actividad
          </h3>
          <div className="flex justify-between items-center py-2 border-b border-surface-container-highest">
            <span className="font-body-md text-body-md text-on-surface-variant">
              Esta semana
            </span>
            <span className="font-bold text-primary-container">
              {thisWeek} sesiones
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-surface-container-highest">
            <span className="font-body-md text-body-md text-on-surface-variant">
              Este mes
            </span>
            <span className="font-bold text-primary-container">
              {thisMonth} sesiones
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="font-body-md text-body-md text-on-surface-variant">
              Última sesión
            </span>
            <span className="font-bold text-primary-container capitalize">
              {lastSession
                ? safeFormatDate(
                    typeof lastSession === "string"
                      ? lastSession
                      : lastSession.toISOString(),
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )
                : "--"}
            </span>
          </div>
        </section>

        {chartData.length > 0 && (
          <section className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4">
            <h3 className="font-headline-md text-headline-md mb-3">
              Volumen por sesión
            </h3>
            <VolumeChart data={chartData} />
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="font-label-caps text-[10px] text-on-surface-variant">
          {label}
        </span>
      </div>
      <div>
        <span className="font-headline-lg text-headline-lg text-primary-container block leading-none">
          {value}
        </span>
        <span className="font-label-caps text-[10px] text-on-surface-variant mt-1 block">
          {sublabel}
        </span>
      </div>
    </div>
  );
}

function VolumeChart({
  data,
}: {
  data: Array<{ start_time: string; volume: number; routine_name: string }>;
}) {
  const width = 400;
  const height = 200;
  const padding = { top: 40, bottom: 30, left: 15, right: 15 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const volumes = data.map((d) => d.volume);
  const maxVol = Math.max(...volumes, 1);

  const barWidth = Math.min(40, chartWidth / data.length - 4);
  const gap = (chartWidth - barWidth * data.length) / (data.length + 1);

  const getX = (i: number) => padding.left + gap * (i + 1) + barWidth * i;
  const getY = (vol: number) =>
    padding.top + chartHeight - (vol / maxVol) * chartHeight;
  const barHeight = (vol: number) => (vol / maxVol) * chartHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: 200 }}
    >
      {[0, 0.5, 1].map((f, i) => {
        const y = padding.top + chartHeight * (1 - f);
        return (
          <line
            key={i}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="#262626"
            strokeWidth="1"
          />
        );
      })}

      {data.map((d, i) => {
        const vol = d.volume;
        const x = getX(i);
        const h = barHeight(vol);
        const y = getY(vol);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              fill="#ccff00"
              opacity={i === data.length - 1 ? 1 : 0.7}
              rx="3"
            />
            {i === data.length - 1 && vol > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fill="#ccff00"
                fontSize="9"
                fontWeight="bold"
              >
                {(vol / 1000).toFixed(1)}T
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              fill="#666"
              fontSize="8"
            >
              {safeFormatDate(d.start_time)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
