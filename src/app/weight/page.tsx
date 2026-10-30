"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Minus,
  Scale,
  Sparkles,
  CheckCircle2,
  Activity,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import TopAppBarSpacer from "@/components/ui/TopAppBarSpacer";
import BottomNav from "@/components/ui/BottomNav";
import { SkeletonWeightEntry } from "@/components/ui/Skeleton";
import { saveWeight, getWeights, deleteWeight, getWeightStats, LocalWeightEntry } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import {
  buildWeightTrend,
  computeGoalProgress,
  formatKg,
  formatTrendPending,
  formatWeeklyChange,
} from "@/lib/weight-trend";
import { clearWeightGoal, loadWeightGoal, saveWeightGoal } from "@/lib/weight-goal";

const ESTIMATED_HEIGHT_M = 1.75;

function formatSignedKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return formatKg(0);
  return `${rounded > 0 ? "+" : "−"}${formatKg(Math.abs(rounded))}`;
}

export default function WeightPage() {
  const { currentUser } = useAppStore();
  const [weights, setWeights] = useState<LocalWeightEntry[]>([]);
  const [stats, setStats] = useState<{
    entries: number;
    min: number;
    max: number;
    average: number;
    current: number;
    previous: number;
    diff: number;
    history: LocalWeightEntry[];
  } | null>(null);

  const [inputWeight, setInputWeight] = useState<number>(75.0);
  const [inputDate, setInputDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showInput, setShowInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [goalKg, setGoalKg] = useState<number | null>(null);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);

  const loadWeights = useCallback(async () => {
    setIsLoading(true);
    try {
      const localWeights = await getWeights(currentUser?.id);
      setWeights(localWeights);
      const localStats = await getWeightStats(currentUser?.id);
      setStats(localStats);
      if (localStats && localStats.current) {
        setInputWeight(localStats.current);
      }
    } catch (err) {
      console.error("Error loading weights:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadWeights();
    setGoalKg(loadWeightGoal(currentUser?.id));
  }, [loadWeights, currentUser]);

  const handleSave = async () => {
    if (!inputWeight || inputWeight <= 20 || inputWeight >= 300) return;

    setIsSaving(true);
    haptics.tick();
    try {
      const entry: LocalWeightEntry = {
        id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        weight: Number(inputWeight.toFixed(1)),
        date: inputDate || new Date().toISOString().split("T")[0],
      } as LocalWeightEntry;
      await saveWeight(entry, currentUser?.id);
      setShowInput(false);
      await loadWeights();
      haptics.success();
    } catch (err) {
      console.error("Error saving weight:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    haptics.tick();
    await deleteWeight(id);
    setDeleteConfirm(null);
    await loadWeights();
  };

  const adjustInput = (delta: number) => {
    haptics.light();
    setInputWeight((prev) => Number(Math.max(30, Math.min(250, prev + delta)).toFixed(1)));
  };

  const trend = useMemo(
    () =>
      buildWeightTrend(
        weights.map((entry) => ({ date: entry.date, weight: entry.weight })),
      ),
    [weights],
  );

  const goalProgress = useMemo(
    () => computeGoalProgress(trend, goalKg),
    [trend, goalKg],
  );

  const previousDelta =
    trend.average7 !== null && trend.previousAverage7 !== null
      ? Math.round((trend.average7 - trend.previousAverage7) * 10) / 10
      : null;
  const previousDeltaClass =
    previousDelta === null
      ? "text-[color:var(--text-tertiary)]"
      : previousDelta < 0
        ? "text-primary-strong"
        : previousDelta > 0
          ? "text-amber-700 dark:text-amber-400"
          : "text-[color:var(--text-tertiary)]";

  const openGoalEditor = () => {
    haptics.light();
    setGoalInput(goalKg != null ? String(goalKg) : "");
    setGoalError(null);
    setShowGoalInput(true);
  };

  const handleSaveGoal = () => {
    const parsed = Number(String(goalInput).replace(",", "."));
    const saved = saveWeightGoal(currentUser?.id, parsed);
    if (saved === null) {
      setGoalError("Pon un peso entre 30 y 250 kg.");
      return;
    }
    setGoalKg(saved);
    setGoalError(null);
    setShowGoalInput(false);
    haptics.success();
  };

  const handleClearGoal = () => {
    haptics.tick();
    clearWeightGoal(currentUser?.id);
    setGoalKg(null);
    setShowGoalInput(false);
    setGoalError(null);
  };

  // BMI Calculation
  const bmi = useMemo(() => {
    if (!stats?.current) return null;
    const value = stats.current / (ESTIMATED_HEIGHT_M * ESTIMATED_HEIGHT_M);
    let category = "Normopeso";
    let color = "#10B981";
    if (value < 18.5) {
      category = "Bajo peso";
      color = "#06B6D4";
    } else if (value >= 25 && value < 30) {
      category = "Muscular / Sobrepeso";
      color = "#F59E0B";
    } else if (value >= 30) {
      category = "Elevado";
      color = "#EF4444";
    }
    return { value, category, color };
  }, [stats]);

  // SVG Trend Points
  const trendPoints = useMemo(() => {
    if (!stats || stats.history.length < 2) return null;
    const history = stats.history.slice(-14); // last 14 points max
    const weightsArr = history.map((h) => h.weight);
    const dataMin = Math.min(...weightsArr);
    const dataMax = Math.max(...weightsArr);

    // El objetivo entra en el dominio para que su línea se vea entera.
    const domainMin = goalKg !== null ? Math.min(dataMin, goalKg) : dataMin;
    const domainMax = goalKg !== null ? Math.max(dataMax, goalKg) : dataMax;
    const range = Math.max(0.5, domainMax - domainMin);
    const yMin = domainMin - range * 0.15;
    const yMax = domainMax + range * 0.15;

    const padding = { top: 16, right: 16, bottom: 20, left: 16 };
    const width = 300;
    const height = 110;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const toX = (idx: number) =>
      padding.left + (idx / Math.max(1, history.length - 1)) * chartW;
    const toY = (w: number) =>
      padding.top + chartH - ((w - yMin) / Math.max(0.001, yMax - yMin)) * chartH;

    const points = history.map((item, idx) => ({
      x: toX(idx),
      y: toY(item.weight),
      weight: item.weight,
      date: item.date,
    }));

    // Smooth bezier path
    const smooth = (pts: { x: number; y: number }[]) => {
      if (pts.length < 2) return "";
      let d = `M ${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cpx = (prev.x + curr.x) / 2;
        d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
      }
      return d;
    };

    const pathString = smooth(points);

    // Area under curve (for fill)
    const baseY = padding.top + chartH;
    const areaPath = pathString
      ? `${pathString} L ${points[points.length - 1].x},${baseY} L ${points[0].x},${baseY} Z`
      : "";

    // Media 7d por fecha (la de weight-trend, no una ventana por índice).
    const averageByDate = new Map(trend.points.map((item) => [item.date, item.average]));
    const maPoints =
      trend.status === "ready"
        ? points
            .map((pt) => {
              const average = averageByDate.get(pt.date);
              return average !== undefined ? { x: pt.x, y: toY(average) } : null;
            })
            .filter((pt): pt is { x: number; y: number } => pt !== null)
        : [];
    const maPath = smooth(maPoints);

    // Min/max positions
    const minIdx = weightsArr.indexOf(dataMin);
    const maxIdx = weightsArr.indexOf(dataMax);
    const minPt = points[minIdx];
    const maxPt = points[maxIdx];

    const goalY = goalKg !== null ? toY(goalKg) : null;
    const goalLabelY =
      goalY !== null ? Math.min(height - 6, Math.max(8, goalY - 4)) : null;

    return {
      points,
      pathString,
      areaPath,
      maPath,
      width,
      height,
      minPt,
      maxPt,
      dataMin,
      dataMax,
      goalY,
      goalLabelY,
    };
  }, [stats, trend, goalKg]);

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
    return dateStr;
  };

  return (
    <div className="min-h-screen pb-[120px] bg-background text-on-background">
      <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />

      <TopAppBarSpacer />

      <main className="w-full px-4 pt-4 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Header with User Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
              <Scale className="w-5 h-5 text-primary" />
              CONTROL DE PESO
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Evolución de masa corporal y composición
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 fx-card rounded-full shadow-sm">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentUser?.avatarColor || "#10B981" }}
            />
            <span className="text-[13px] font-bold text-slate-800 dark:text-white">
              {currentUser?.username || "XAM"}
            </span>
          </div>
        </div>

        {/* Current Weight Hero Card */}
        {stats && stats.current ? (
          <div className="fx-card rounded-3xl p-5 shadow-sm dark:shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[13px] font-bold text-slate-500 dark:text-zinc-400 block">
                  Último Pesaje Registrado
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                    {formatKg(stats.current)}
                  </span>
                  <span className="text-xl font-bold text-primary">kg</span> </div> </div> {/* Difference Badge */} <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono font-bold ${ stats.diff < 0 ?"bg-success-soft border-emerald-500/30 text-primary-strong"
                    : stats.diff > 0
                    ? "bg-warning-soft border-amber-500/30 text-amber-700 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300"
                }`}
              >
                {stats.diff < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : stats.diff > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
                <span>
                  {formatSignedKg(stats.diff)} kg
                </span>
              </div>
            </div>

            {/* BMI & Stats Bar */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-white/10 relative z-10">
              <div className="text-center bg-slate-50 dark:bg-[#0d101a] rounded-xl p-2.5">
                <span className="text-[12px] text-slate-500 dark:text-zinc-400 block">IMC Est.</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {bmi ? formatKg(bmi.value) : "--"}
                </span>
              </div>
              <div className="text-center bg-slate-50 dark:bg-[#0d101a] rounded-xl p-2.5">
                <span className="text-[12px] text-slate-500 dark:text-zinc-400 block">Mínimo</span>
                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                  {formatKg(stats.min)} kg
                </span>
              </div>
              <div className="text-center bg-slate-50 dark:bg-[#0d101a] rounded-xl p-2.5">
                <span className="text-[12px] text-slate-500 dark:text-zinc-400 block">Máximo</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-0.5 block">
                  {formatKg(stats.max)} kg
                </span>
              </div>
            </div>

            {/* Enhanced Trend SVG Chart */}
            {trendPoints && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex flex-col">
                <span className="text-[12px] text-slate-500 dark:text-zinc-400 mb-2 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-primary" /> Evolución de peso
                </span>
                <svg
                  viewBox={`0 0 ${trendPoints.width} ${trendPoints.height}`}
                  className="w-full overflow-visible"
                  style={{ height: 110 }}
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Area fill */}
                  <path d={trendPoints.areaPath} fill="url(#areaGrad)" />

                  {/* Main line */}
                  <path
                    d={trendPoints.pathString}
                    fill="none"
                    stroke="url(#lineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />

                  {/* 7-day moving average */}
                  {trendPoints.maPath && (
                    <path
                      data-testid="weight-trend-ma"
                      d={trendPoints.maPath}
                      fill="none"
                      stroke="#00E1FF"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Goal line */}
                  {goalKg !== null &&
                    trendPoints.goalY !== null &&
                    trendPoints.goalLabelY !== null && (
                      <g data-testid="weight-goal-line">
                        <line
                          x1="0"
                          y1={trendPoints.goalY}
                          x2={trendPoints.width}
                          y2={trendPoints.goalY}
                          stroke="var(--text-tertiary)"
                          strokeWidth="1.2"
                          strokeDasharray="5 4"
                          strokeOpacity="0.8"
                        />
                        <text
                          x={2}
                          y={trendPoints.goalLabelY}
                          textAnchor="start"
                          fontSize="8"
                          fill="var(--text-tertiary)"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {formatKg(goalKg)}
                        </text>
                      </g>
                    )}

                  {/* Data points */}
                  {trendPoints.points.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3"
                      className="fill-white dark:fill-[#0d101a] stroke-primary"
                      strokeWidth="1.8"
                    />
                  ))}

                  {/* Min marker */}
                  {trendPoints.minPt && (
                    <g>
                      <circle cx={trendPoints.minPt.x} cy={trendPoints.minPt.y} r="5" fill="#00E1FF" fillOpacity="0.2" stroke="#00E1FF" strokeWidth="1.5" />
                      {/* Si el mínimo queda pegado a la línea de objetivo, su etiqueta
                          sube encima del punto para no chocar con la del objetivo. */}
                      <text
                        x={trendPoints.minPt.x}
                        y={
                          trendPoints.goalY !== null &&
                          Math.abs(trendPoints.minPt.y - trendPoints.goalY) < 12
                            ? trendPoints.minPt.y - 8
                            : trendPoints.minPt.y + 14
                        }
                        textAnchor="middle"
                        fontSize="8"
                        fill="#00E1FF"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {formatKg(trendPoints.dataMin)}
                      </text>
                    </g>
                  )}

                  {/* Max marker */}
                  {trendPoints.maxPt && (
                    <g>
                      <circle cx={trendPoints.maxPt.x} cy={trendPoints.maxPt.y} r="5" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.5" />
                      <text x={trendPoints.maxPt.x} y={trendPoints.maxPt.y - 8} textAnchor="middle" fontSize="8" fill="#F59E0B" fontFamily="monospace" fontWeight="bold">
                        {formatKg(trendPoints.dataMax)}
                      </text>
                    </g>
                  )}
                </svg>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-1 self-end">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-primary rounded" />
                    <span className="text-[12px] text-slate-500 dark:text-zinc-400">Peso</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 border-t border-dashed border-cyan-400 opacity-60" />
                    <span className="text-[12px] text-slate-500 dark:text-zinc-400">Media 7d</span>
                  </div>
                  {goalKg !== null && (
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-0.5 border-t border-dashed border-slate-400 dark:border-zinc-400" />
                      <span className="text-[12px] text-slate-500 dark:text-zinc-400">Objetivo</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Quick Log Action or Form */}
        {!showInput ? (
          <button
            onClick={() => {
              setShowInput(true);
              haptics.light();
            }}
            className="w-full h-12 bg-primary text-black font-bold text-sm rounded-2xl shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-primary/40"
          >
            <Plus className="w-5 h-5" />
            Registrar Nuevo Pesaje
          </button>
        ) : (
          <div className="bg-white dark:bg-[#131626] border-slate-200 dark:border-primary/50 rounded-3xl p-5 shadow-lg dark:shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Nuevo Registro
              </span>
              <button
                onClick={() => setShowInput(false)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white"
              >
                Cancelar
              </button>
            </div>

            {/* Stepper Weight Display */}
            <div className="flex flex-col items-center my-3">
              <span className="text-5xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {formatKg(inputWeight)} <span className="text-2xl text-primary font-bold">kg</span>
              </span>

              {/* Quick Stepper Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => adjustInput(-1.0)}
                  className="px-3 py-2 fx-inset rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all"
                >
                  -1 kg
                </button>
                <button
                  type="button"
                  onClick={() => adjustInput(-0.1)}
                  className="px-3 py-2 fx-inset rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all"
                >
                  -0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustInput(0.1)}
                  className="px-3 py-2 fx-inset rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all"
                >
                  +0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustInput(1.0)}
                  className="px-3 py-2 fx-inset rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all"
                >
                  +1 kg
                </button>
              </div>
            </div>

            {/* Date Picker */}
            <div className="mt-4">
              <label className="text-[12px] text-slate-500 dark:text-zinc-400 block mb-1">
                Fecha de pesaje
              </label>
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-[#0d101a] rounded-xl px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 bg-primary text-black font-bold text-sm rounded-xl shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer border-primary/40"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? "Guardando..." : "Confirmar Pesaje"}
            </button>
          </div>
        )}

        {/* Trend and goal */}
        <section
          data-testid="weight-trend"
          className="fx-card rounded-3xl p-5 shadow-sm dark:shadow-2xl"
        >
          <h2 className="text-[13px] font-bold text-foreground">Tendencia y objetivo</h2>

          {trend.status === "ready" && trend.average7 !== null ? (
            <div className="mt-3">
              <span className="text-[12px] font-semibold text-[color:var(--text-tertiary)] block">
                Media 7 días
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold fx-num tracking-tight text-foreground">
                  {formatKg(trend.average7)}
                </span>
                <span className="text-sm font-bold text-primary-strong">kg</span>
              </div>

              {trend.previousAverage7 !== null && previousDelta !== null ? (
                <p className={`mt-0.5 text-[12px] font-semibold ${previousDeltaClass}`}>
                  {formatSignedKg(previousDelta)} kg vs. semana anterior
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] text-[color:var(--text-tertiary)]">
                  Primera semana de referencia
                </p>
              )}

              {trend.weeklyChange !== null && (
                <p className="mt-1 text-[12px] text-[color:var(--text-tertiary)]">
                  {formatWeeklyChange(trend.weeklyChange)}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-[13px] font-semibold text-foreground">
                {formatTrendPending(trend) ?? ""}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--text-tertiary)]">
                Con menos no se puede separar la tendencia de la oscilación diaria (±1 kg).
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[color:var(--fx-hairline)]">
            {showGoalInput ? (
              <div>
                <label
                  htmlFor="weight-goal-input"
                  className="text-[12px] font-semibold text-[color:var(--text-tertiary)] block"
                >
                  Peso objetivo (kg)
                </label>
                <input
                  id="weight-goal-input"
                  aria-label="Peso objetivo (kg)"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="30"
                  max="250"
                  value={goalInput}
                  onChange={(event) => {
                    setGoalInput(event.target.value);
                    setGoalError(null);
                  }}
                  className="mt-1 w-full h-12 rounded-xl bg-[var(--fx-inset)] px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
                {goalError && (
                  <p role="alert" className="mt-1 text-[12px] text-danger">
                    {goalError}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGoal}
                    className="flex-1 h-12 rounded-xl bg-primary text-sm font-bold text-black transition-all active:scale-95"
                  >
                    Guardar objetivo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGoalInput(false);
                      setGoalError(null);
                    }}
                    className="h-12 px-4 rounded-xl bg-[var(--fx-inset)] text-sm font-semibold text-foreground transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : goalKg !== null ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">
                    Objetivo {formatKg(goalKg)} kg
                  </p>

                  {goalProgress?.reached ? (
                    <p className="mt-0.5 text-[13px] font-semibold text-primary-strong">
                      Objetivo alcanzado.
                    </p>
                  ) : goalProgress === null ? (
                    <p className="mt-0.5 text-[12px] text-[color:var(--text-tertiary)]">
                      Sin tendencia todavía para calcular lo que falta.
                    </p>
                  ) : goalProgress.remainingKg > 0 ? (
                    <p className="mt-0.5 text-[13px] font-semibold text-foreground">
                      Faltan {formatKg(goalProgress.remainingKg)} kg
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[13px] font-semibold text-foreground">
                      Faltan {formatKg(-goalProgress.remainingKg)} kg por subir
                    </p>
                  )}

                  {goalProgress && !goalProgress.reached && (
                    <p className="mt-0.5 text-[12px] text-[color:var(--text-tertiary)]">
                      {goalProgress.weeksToGoal !== null
                        ? goalProgress.weeksToGoal === 1
                          ? "A este ritmo, 1 semana"
                          : `A este ritmo, unas ${goalProgress.weeksToGoal} semanas`
                        : "A este ritmo no llegas al objetivo"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={openGoalEditor}
                    aria-label="Editar objetivo de peso"
                    className="h-11 min-w-11 px-3 rounded-xl bg-[var(--fx-inset)] text-[12px] font-semibold text-foreground transition-all active:scale-95"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleClearGoal}
                    aria-label="Quitar objetivo de peso"
                    className="h-11 min-w-11 px-3 rounded-xl bg-[var(--fx-inset)] text-[12px] font-semibold text-foreground transition-all active:scale-95"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[13px] font-semibold text-foreground">Sin objetivo</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[color:var(--text-tertiary)]">
                  Pon un objetivo y te diré cuánto falta y a qué ritmo vas.
                </p>
                <button
                  type="button"
                  onClick={openGoalEditor}
                  className="mt-3 w-full h-12 rounded-xl bg-primary text-[14px] font-bold text-black transition-all active:scale-95"
                >
                  Fijar objetivo
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Weights History List */}
        <section className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              Historial de Mediciones ({weights.length})
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonWeightEntry key={i} />
              ))}
            </div>
          ) : weights.length === 0 ? (
            <div className="fx-card rounded-2xl p-6 flex flex-col items-center text-center my-2 shadow-sm dark:shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-zinc-400 mb-2">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sin registros de peso</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs">
                Registra tu peso periódicamente para seguir tu progreso corporal.
              </p>

              {/* En vez de dejar la pantalla vacía, se explica cómo usarla:
                  es la primera vez que se entra y no hay nada que mirar. */}
              <div className="mt-5 w-full flex flex-col gap-2 text-left">
                {[
                  {
                    icono: "⚖️",
                    titulo: "Pésate siempre igual",
                    detalle: "En ayunas y a la misma hora, una o dos veces por semana.",
                  },
                  {
                    icono: "📉",
                    titulo: "Mira la tendencia, no el día",
                    detalle: "El peso oscila ±1 kg al día; lo que importa es la línea a varias semanas.",
                  },
                  {
                    icono: "💪",
                    titulo: "Cruza con tus entrenos",
                    detalle: "Si subes peso corporal pero el volumen sube, es músculo, no grasa.",
                  },
                ].map((t) => (
                  <div
                    key={t.titulo}
                    className="flex items-start gap-2.5 rounded-xl bg-[var(--fx-inset)] p-3"
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      {t.icono}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{t.titulo}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[color:var(--text-tertiary)]">
                        {t.detalle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowInput(true);
                  haptics.light();
                }}
                className="mt-5 w-full h-12 rounded-2xl bg-primary text-sm font-bold text-black transition-all active:scale-95"
              >
                Registrar mi primer pesaje
              </button>
            </div>
          ) : (
            weights.map((entry, idx) => {
              const prev = weights[idx + 1];
              const diff = prev ? Number((entry.weight - prev.weight).toFixed(1)) : null;

              return (
                <div
                  key={entry.id}
                  className="fx-card rounded-2xl p-3.5 flex items-center justify-between transition-all dark:shadow-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {formatDate(entry.date).slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-semibold text-slate-900 dark:text-white">
                          {formatKg(entry.weight)}
                        </span>
                        <span className="text-xs font-bold text-slate-400 dark:text-zinc-400">kg</span>
                      </div>
                      <span className="text-[12px] text-slate-500 dark:text-zinc-400 block">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3"> {diff !== null && ( <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${ diff < 0 ?"text-primary-strong"
                            : diff > 0
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-slate-500 dark:text-zinc-400"
                        }`}
                      >
                        {diff < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : diff > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : null}
                        {formatSignedKg(diff)} kg
                      </span>
                    )}

                    {deleteConfirm === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[12px] text-slate-500 dark:text-zinc-400 px-1.5 py-1"
                        >
                          No
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-[12px] text-danger font-bold px-2 py-1 bg-danger-soft rounded-lg"
                        >
                          Borrar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="text-slate-400 dark:text-zinc-400 hover:text-danger p-1 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
