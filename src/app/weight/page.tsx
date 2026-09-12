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
import BottomNav from "@/components/ui/BottomNav";
import { SkeletonWeightEntry } from "@/components/ui/Skeleton";
import { saveWeight, getWeights, deleteWeight, getWeightStats, LocalWeightEntry } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";

const ESTIMATED_HEIGHT_M = 1.75;

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
  }, [loadWeights]);

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

  // BMI Calculation
  const bmi = useMemo(() => {
    if (!stats?.current) return null;
    const value = stats.current / (ESTIMATED_HEIGHT_M * ESTIMATED_HEIGHT_M);
    let category = "Normopeso";
    let color = "#00F59B";
    if (value < 18.5) {
      category = "Bajo peso";
      color = "#00F0FF";
    } else if (value >= 25 && value < 30) {
      category = "Muscular / Sobrepeso";
      color = "#CCFF00";
    } else if (value >= 30) {
      category = "Elevado";
      color = "#FF8000";
    }
    return { value: value.toFixed(1), category, color };
  }, [stats]);

  // SVG Trend Points
  const trendPoints = useMemo(() => {
    if (!stats || stats.history.length < 2) return null;
    const history = stats.history.slice(-14); // last 14 points max
    const weightsArr = history.map((h) => h.weight);
    const dataMin = Math.min(...weightsArr);
    const dataMax = Math.max(...weightsArr);
    const range = Math.max(0.5, dataMax - dataMin);
    const padding = { top: 16, right: 16, bottom: 20, left: 16 };
    const width = 300;
    const height = 110;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const toX = (idx: number) =>
      padding.left + (idx / Math.max(1, history.length - 1)) * chartW;
    const toY = (w: number) =>
      padding.top + chartH - ((w - (dataMin - range * 0.15)) / (range * 1.3)) * chartH;

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

    // 7-day moving average
    const maWindow = Math.min(7, history.length);
    const maPoints = points.map((pt, idx) => {
      const slice = weightsArr.slice(Math.max(0, idx - maWindow + 1), idx + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      return { x: pt.x, y: toY(avg) };
    });
    const maPath = smooth(maPoints);

    // Min/max positions
    const minIdx = weightsArr.indexOf(dataMin);
    const maxIdx = weightsArr.indexOf(dataMax);
    const minPt = points[minIdx];
    const maxPt = points[maxIdx];

    return { points, pathString, areaPath, maPath, width, height, minPt, maxPt, dataMin, dataMax };
  }, [stats]);

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

      <main className="w-full px-4 pt-4 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Header with User Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black font-mono tracking-tight text-white uppercase flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              CONTROL DE PESO
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Evolución de masa corporal y composición
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141a24] border border-white/10 rounded-full">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentUser?.avatarColor || "#00F59B" }}
            />
            <span className="text-[11px] font-mono font-bold text-white uppercase">
              {currentUser?.username || "XAM"}
            </span>
          </div>
        </div>

        {/* Current Weight Hero Card */}
        {stats && stats.current ? (
          <div className="bg-gradient-to-br from-[#121622] to-[#151b2a] border border-primary/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  Último Pesaje Registrado
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-black font-mono text-white tracking-tight">
                    {stats.current.toFixed(1)}
                  </span>
                  <span className="text-xl font-bold font-mono text-primary">kg</span>
                </div>
              </div>

              {/* Difference Badge */}
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold ${
                  stats.diff < 0
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : stats.diff > 0
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    : "bg-white/5 border-white/10 text-zinc-300"
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
                  {stats.diff > 0 ? `+${stats.diff}` : stats.diff} kg
                </span>
              </div>
            </div>

            {/* BMI & Stats Bar */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 relative z-10">
              <div className="text-center bg-[#0e121a] rounded-xl p-2.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">IMC Est.</span>
                <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                  {bmi ? bmi.value : "--"}
                </span>
              </div>
              <div className="text-center bg-[#0e121a] rounded-xl p-2.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Mínimo</span>
                <span className="text-sm font-bold font-mono text-cyan-400 mt-0.5 block">
                  {stats.min.toFixed(1)} kg
                </span>
              </div>
              <div className="text-center bg-[#0e121a] rounded-xl p-2.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Máximo</span>
                <span className="text-sm font-bold font-mono text-amber-400 mt-0.5 block">
                  {stats.max.toFixed(1)} kg
                </span>
              </div>
            </div>

            {/* Enhanced Trend SVG Chart */}
            {trendPoints && (
              <div className="mt-4 pt-3 border-t border-white/5 flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400 uppercase mb-2 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-primary" /> Evolución de peso
                </span>
                <svg
                  viewBox={`0 0 ${trendPoints.width} ${trendPoints.height}`}
                  className="w-full overflow-visible"
                  style={{ height: 110 }}
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D68F" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#00D68F" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00E1FF" />
                      <stop offset="100%" stopColor="#00D68F" />
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
                      d={trendPoints.maPath}
                      fill="none"
                      stroke="#00E1FF"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Data points */}
                  {trendPoints.points.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3"
                      className="fill-[#0f131a] stroke-[#00D68F]"
                      strokeWidth="1.8"
                    />
                  ))}

                  {/* Min marker */}
                  {trendPoints.minPt && (
                    <g>
                      <circle cx={trendPoints.minPt.x} cy={trendPoints.minPt.y} r="5" fill="#00E1FF" fillOpacity="0.2" stroke="#00E1FF" strokeWidth="1.5" />
                      <text x={trendPoints.minPt.x} y={trendPoints.minPt.y + 14} textAnchor="middle" fontSize="8" fill="#00E1FF" fontFamily="monospace" fontWeight="bold">
                        {trendPoints.dataMin.toFixed(1)}
                      </text>
                    </g>
                  )}

                  {/* Max marker */}
                  {trendPoints.maxPt && (
                    <g>
                      <circle cx={trendPoints.maxPt.x} cy={trendPoints.maxPt.y} r="5" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.5" />
                      <text x={trendPoints.maxPt.x} y={trendPoints.maxPt.y - 8} textAnchor="middle" fontSize="8" fill="#F59E0B" fontFamily="monospace" fontWeight="bold">
                        {trendPoints.dataMax.toFixed(1)}
                      </text>
                    </g>
                  )}
                </svg>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-1 self-end">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-primary rounded" />
                    <span className="text-[9px] font-mono text-zinc-500">Peso</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 border-t border-dashed border-cyan-400 opacity-60" />
                    <span className="text-[9px] font-mono text-zinc-500">Media 7d</span>
                  </div>
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
            className="w-full h-12 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-2xl shadow-neon hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Registrar Nuevo Pesaje
          </button>
        ) : (
          <div className="bg-[#121622] border-2 border-primary/50 rounded-3xl p-5 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Nuevo Registro
              </span>
              <button
                onClick={() => setShowInput(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            {/* Stepper Weight Display */}
            <div className="flex flex-col items-center my-3">
              <span className="text-5xl font-black font-mono text-white tracking-tight">
                {inputWeight.toFixed(1)} <span className="text-2xl text-primary font-bold">kg</span>
              </span>

              {/* Quick Stepper Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => adjustInput(-1.0)}
                  className="px-3 py-2 bg-[#171d2a] border border-white/10 rounded-xl text-xs font-mono font-bold text-zinc-300 hover:text-white active:scale-90 transition-all"
                >
                  -1 kg
                </button>
                <button
                  type="button"
                  onClick={() => adjustInput(-0.1)}
                  className="px-3 py-2 bg-[#171d2a] border border-white/10 rounded-xl text-xs font-mono font-bold text-zinc-300 hover:text-white active:scale-90 transition-all"
                >
                  -0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustInput(0.1)}
                  className="px-3 py-2 bg-[#171d2a] border border-white/10 rounded-xl text-xs font-mono font-bold text-zinc-300 hover:text-white active:scale-90 transition-all"
                >
                  +0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustInput(1.0)}
                  className="px-3 py-2 bg-[#171d2a] border border-white/10 rounded-xl text-xs font-mono font-bold text-zinc-300 hover:text-white active:scale-90 transition-all"
                >
                  +1 kg
                </button>
              </div>
            </div>

            {/* Date Picker */}
            <div className="mt-4">
              <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                Fecha de pesaje
              </label>
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="w-full h-11 bg-[#161c28] border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-xl shadow-neon hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? "Guardando..." : "Confirmar Pesaje"}
            </button>
          </div>
        )}

        {/* Weights History List */}
        <section className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
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
            <div className="bg-[#10141c] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center my-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 mb-2">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">Sin registros de peso</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Registra tu peso periódicamente para seguir tu progreso corporal.
              </p>
            </div>
          ) : (
            weights.map((entry, idx) => {
              const prev = weights[idx + 1];
              const diff = prev ? Number((entry.weight - prev.weight).toFixed(1)) : null;

              return (
                <div
                  key={entry.id}
                  className="bg-[#121620] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary font-mono font-bold text-xs">
                      {formatDate(entry.date).slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black font-mono text-white">
                          {entry.weight.toFixed(1)}
                        </span>
                        <span className="text-xs font-bold text-zinc-400">kg</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {diff !== null && (
                      <span
                        className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                          diff < 0
                            ? "text-emerald-400"
                            : diff > 0
                            ? "text-amber-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {diff < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : diff > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : null}
                        {diff > 0 ? `+${diff}` : diff} kg
                      </span>
                    )}

                    {deleteConfirm === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[10px] text-zinc-400 px-1.5 py-1"
                        >
                          No
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-[10px] text-red-400 font-bold px-2 py-1 bg-red-500/10 rounded-lg"
                        >
                          Borrar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
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
