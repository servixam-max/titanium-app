"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Calendar, Weight, Trash2, Activity, Minus, BarChart3 } from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { saveWeight, getWeights, deleteWeight, getWeightStats } from "@/lib/db";
import { apiUrl } from "@/lib/api-config";
import { WeightEntry } from "@/lib/types";

// Estimated height for BMI calculation (configurable in settings later)
const ESTIMATED_HEIGHT_M = 1.75;

function safeFormatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const datePart = dateStr.split("T")[0] || dateStr;
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "?";
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-ES", options || { day: "numeric", month: "short" });
}

export default function WeightPage() {
  const router = useRouter();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [stats, setStats] = useState<{
    entries: number;
    min: number;
    max: number;
    average: number;
    current: number;
    previous: number;
    diff: number;
    history: WeightEntry[];
  } | null>(null);
  const [inputWeight, setInputWeight] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadWeights = useCallback(async () => {
    try {
      const localWeights = await getWeights();
      setWeights(localWeights);
      const localStats = await getWeightStats();
      setStats(localStats);
    } catch (err) {
      console.error("Error loading weights:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeights();
  }, [loadWeights]);

  const handleSave = async () => {
    const w = Number(inputWeight);
    if (!w || w <= 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const entry: WeightEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        weight: w,
        date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      };
      await saveWeight(entry);

      // Best-effort server sync
      try {
        await fetch(apiUrl("weight"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight: w, date: entry.date }),
        });
      } catch (err) {
        console.warn("Weight server sync failed:", err);
      }

      setInputWeight("");
      setShowInput(false);
      loadWeights();
    } catch (err) {
      setSaveError("Error guardando peso localmente");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWeight(id);
      setDeleteConfirm(null);
      loadWeights();
    } catch (err) {
      console.error("Error deleting weight:", err);
    }
  };

  const latest = weights[0];
  const previous = weights[1];
  const diff = latest && previous ? Number((latest.weight - previous.weight).toFixed(1)) : 0;
  const isLosing = diff < 0;

  const bmi = stats?.current ? stats.current / (ESTIMATED_HEIGHT_M * ESTIMATED_HEIGHT_M) : null;
  const bmiCategory = bmi ? (bmi < 18.5 ? "Bajo" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obeso") : null;

  const chartData = [...weights].reverse();

  return (
    <div className="min-h-screen pb-[120px] bg-background">
      <TopAppBar
        title="REGISTRO PESO"
        showBack
        backHref="/"
      />

      <main className="w-full px-container-padding pt-4 flex flex-col gap-section-gap">
        <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4 text-center">
          {latest ? (
            <>
              <span className="font-label-caps text-label-caps text-on-surface-variant">PESO ACTUAL</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Weight className="w-6 h-6 text-primary-container" />
                <span className="font-display-timer text-[48px] text-primary-container leading-none">
                  {latest.weight}
                </span>
                <span className="font-headline-md text-on-surface">kg</span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2">
                {diff !== 0 && (
                  <>
                    {isLosing ? (
                      <TrendingDown className="w-4 h-4 text-primary-container" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-error" />
                    )}
                    <span className={`font-body-md font-bold ${isLosing ? "text-primary-container" : "text-error"}`}>
                      {isLosing ? "" : "+"}{diff} kg
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="text-on-surface-variant font-body-md">No hay registros de peso</p>
          )}
        </div>

        {stats && stats.entries > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-primary-container" />
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant block">MEDIA</span>
                <span className="font-headline-md text-headline-md font-bold">{stats.average.toFixed(1)} kg</span>
              </div>
            </div>
            <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                <Minus className="w-5 h-5 text-primary-container" />
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant block">MÍN / MÁX</span>
                <span className="font-headline-md text-headline-md font-bold">{stats.min} / {stats.max} kg</span>
              </div>
            </div>
          </div>
        )}

        {bmi && (
          <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-container" />
                <span className="font-headline-md text-headline-md">IMC</span>
              </div>
              <div className="text-right">
                <span className="font-headline-lg text-headline-lg text-primary-container">{bmi.toFixed(1)}</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant ml-2">
                  {bmiCategory}
                </span>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden bg-surface-container-highest relative">
              <div
                className="absolute h-full"
                style={{
                  left: `${Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100))}%`,
                  width: "4px",
                  background: "#ccff00",
                  borderRadius: "2px",
                }}
              />
            </div>
            <div className="flex justify-between mt-1 font-label-caps text-[9px] text-on-surface-variant">
              <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
            </div>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4">
            <h3 className="font-headline-md text-headline-md mb-3">Evolución</h3>
            <Chart data={chartData} />
          </div>
        )}

        <div className="bg-surface-container-low border border-surface-container-highest rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-container-highest">
            <h3 className="font-headline-md text-headline-md">Historial</h3>
          </div>
          {isLoading ? (
            <div className="p-4 text-center text-on-surface-variant">Cargando...</div>
          ) : weights.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant">
              No hay registros. Toca + para añadir tu primer peso.
            </div>
          ) : (
            <div className="divide-y divide-surface-container-highest">
              {weights.map((entry) => (
                <div key={entry.id} className="px-4 py-3 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-on-surface-variant" />
                    <span className="font-body-md text-on-surface capitalize">
                      {safeFormatDate(entry.date, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary-container">{entry.weight} kg</span>
                    {deleteConfirm === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-error text-xs font-bold px-2 py-1 hover:opacity-80"
                        >
                          SÍ
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-on-surface-variant text-xs font-bold px-2 py-1 hover:opacity-80"
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showInput && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mx-auto mb-6">
              <Weight className="w-8 h-8 text-primary-container" />
            </div>
            <h2 className="font-headline-lg text-headline-lg text-center mb-2">
              Nuevo Peso
            </h2>
            <p className="text-on-surface-variant text-center mb-6 text-sm capitalize">
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                className="flex-1 bg-surface-container-high border border-surface-container-highest rounded-xl h-[56px] text-center font-bold text-on-surface text-2xl focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                type="number"
                placeholder="0"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
                step="0.1"
              />
              <span className="font-bold text-on-surface-variant text-lg">kg</span>
            </div>
            {saveError && (
              <div className="mb-4 p-3 bg-error/10 border border-error rounded-xl text-error text-sm text-center">
                {saveError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="flex-1 h-[52px] bg-surface-container-high text-on-surface font-bold rounded-xl border border-surface-container-highest active:scale-95 transition-transform"
                onClick={() => { setShowInput(false); setSaveError(null); }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                onClick={handleSave}
                disabled={!inputWeight || Number(inputWeight) <= 0 || isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function Chart({ data }: { data: WeightEntry[] }) {
  const width = 400;
  const height = 220;
  const padding = { top: 60, bottom: 25, left: 15, right: 15 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const weights = data.map((d) => Number(d.weight));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const paddedMin = minW - range * 0.2;
  const paddedMax = maxW + range * 0.2;
  const paddedRange = paddedMax - paddedMin || 1;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (w: number) => padding.top + chartHeight - ((w - paddedMin) / paddedRange) * chartHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(Number(d.weight))}`).join(" ");

  const maxLabels = data.length <= 4 ? data.length : 3;
  const step = Math.max(1, Math.floor((data.length - 1) / (maxLabels - 1)));
  const labelIndices: number[] = [];
  for (let i = 0; i < data.length; i += step) {
    labelIndices.push(i);
  }
  if (labelIndices[labelIndices.length - 1] !== data.length - 1) {
    labelIndices.push(data.length - 1);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 220 }}>
      <defs>
        <clipPath id="chart-clip">
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>

      {[0, 1, 2, 3].map((i) => {
        const y = padding.top + (i / 3) * chartHeight;
        return <line key={`h${i}`} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#262626" strokeWidth="1" />;
      })}

      <polyline
        points={points}
        fill="none"
        stroke="#ccff00"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <polygon
        points={`${points} ${getX(data.length - 1)},${height - padding.bottom} ${getX(0)},${height - padding.bottom}`}
        fill="rgba(204,255,0,0.05)"
      />

      <g clipPath="url(#chart-clip)">
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(Number(d.weight));
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          const isMinOrMax = d.weight === minW || d.weight === maxW;
          const showLabel = isFirst || isLast || isMinOrMax || data.length <= 5;

          return (
            <g key={d.id}>
              <circle cx={x} cy={y} r="4" fill="#131313" stroke="#ccff00" strokeWidth="2" />
              {showLabel && (
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill="#ccff00"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {d.weight}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {labelIndices.map((i) => {
        const x = getX(i);
        const d = data[i];
        return (
          <text key={`label${i}`} x={x} y={height - 8} textAnchor="middle" fill="#666" fontSize="8">
            {safeFormatDate(d.date)}
          </text>
        );
      })}
    </svg>
  );
}
