"use client";

import { cn } from "@/lib/utils";

interface TimerCircleProps {
  seconds: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  urgent?: boolean;
  label?: string;
  children?: React.ReactNode;
  className?: string;
  breathe?: boolean;
}

export default function TimerCircle({
  seconds,
  total,
  size = 288,
  strokeWidth = 10,
  urgent = false,
  label,
  children,
  className,
  breathe = true,
}: TimerCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        breathe && !urgent && "animate-breathe",
        className,
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id="timerNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="timerUrgentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-white/10"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? "url(#timerUrgentGrad)" : "url(#timerNeonGrad)"}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-1000 ease-linear",
            urgent
              ? "drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]"
              : "drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span
              className={cn(
                "font-mono font-semibold text-6xl leading-none tabular-nums tracking-tight",
                urgent ? "text-red-500 animate-pulse drop-shadow-sm" : "text-primary drop-shadow-sm",
              )}
            >
              {seconds}
            </span>
            {label && (
              <span className="text-slate-500 dark:text-zinc-400 font-bold tracking-[0.2em] text-xs mt-2">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
