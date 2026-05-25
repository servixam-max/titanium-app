"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Calendar, Weight } from "lucide-react";
import BottomNav from "@/components/ui/BottomNav";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  created_at: string;
}

// Safe date formatting from ISO or date string
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
  const [inputWeight, setInputWeight] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadWeights = useCallback(async () => {
    try {
      const res = await fetch("/api/weight");
      if (res.ok) {
        const data = await res.json();
        setWeights(data.weights || []);
      }
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

    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: w, date: new Date().toISOString().split("T")[0] }),
      });

      if (res.ok) {
        setInputWeight("");
        setShowInput(false);
        loadWeights();
      }
    } catch (err) {
      console.error("Error saving weight:", err);
    }
  };

  // Stats
  const latest = weights[0];
  const previous = weights[1];
  const diff = latest && previous ? Number((latest.weight - previous.weight).toFixed(1)) : 0;
  const isLosing = diff < 0;

  // Chart data: chronological order (oldest first for left-to-right)
  const chartData = [...weights].reverse();

  return (
    <div className="min-h-screen pb-[100px] bg-background">
      {/* Header */}
      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md">
        <button
          onClick={() => router.push("/")}
          className="flex items-center justify-center w-10 h-10 text-on-surface hover:opacity-80 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary-container uppercase tracking-wider">
          REGISTRO PESO
        </h1>
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center justify-center w-10 h-10 text-primary-container hover:opacity-80 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Current Weight Card */}
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

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-4">
            <h3 className="font-headline-md text-headline-md mb-3">Evolución</h3>
            <Chart data={chartData} />
          </div>
        )}

        {/* History List */}
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
                <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-on-surface-variant" />
                    <span className="font-body-md text-on-surface">
                      {safeFormatDate(entry.date, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                  <span className="font-bold text-primary-container">{entry.weight} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Input Modal */}
      {showInput && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mx-auto mb-6">
              <Weight className="w-8 h-8 text-primary-container" />
            </div>
            <h2 className="font-headline-lg text-headline-lg text-center mb-2">
              Nuevo Peso
            </h2>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
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
            <div className="flex gap-2">
              <button
                className="flex-1 h-[52px] bg-surface-container-high text-on-surface font-bold rounded-xl border border-surface-container-highest active:scale-95 transition-transform"
                onClick={() => setShowInput(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                onClick={handleSave}
                disabled={!inputWeight || Number(inputWeight) <= 0}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// Separate Chart component for cleaner SVG rendering
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

  // Add 20% padding to range
  const paddedMin = minW - range * 0.2;
  const paddedMax = maxW + range * 0.2;
  const paddedRange = paddedMax - paddedMin || 1;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (w: number) => padding.top + chartHeight - ((w - paddedMin) / paddedRange) * chartHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(Number(d.weight))}`).join(" ");

  // Show fewer labels when crowded
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
      {/* Clip path to keep everything inside */}
      <defs>
        <clipPath id="chart-clip">
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>

      {/* Grid lines - horizontal */}
      {[0, 1, 2, 3].map((i) => {
        const y = padding.top + (i / 3) * chartHeight;
        return <line key={`h${i}`} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#262626" strokeWidth="1" />;
      })}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#ccff00"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Area under line */}
      <polygon
        points={`${points} ${getX(data.length - 1)},${height - padding.bottom} ${getX(0)},${height - padding.bottom}`}
        fill="rgba(204,255,0,0.05)"
      />

      {/* Points with value labels */}
      <g clipPath="url(#chart-clip)">
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(Number(d.weight));
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          // Show label for first, last, and min/max points
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

      {/* Date labels at bottom */}
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
