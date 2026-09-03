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
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="50%" stopColor="#00F59B" />
            <stop offset="100%" stopColor="#CCFF00" />
          </linearGradient>
          <linearGradient id="timerUrgentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF2A55" />
            <stop offset="100%" stopColor="#FF708F" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#14181f"
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
              ? "drop-shadow-[0_0_16px_rgba(255,42,85,0.6)]"
              : "drop-shadow-[0_0_16px_rgba(0,245,155,0.5)]"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span
              className={cn(
                "font-mono font-black text-6xl leading-none tabular-nums tracking-tight",
                urgent ? "text-error animate-pulse drop-shadow-[0_0_12px_rgba(255,42,85,0.8)]" : "text-primary drop-shadow-[0_0_16px_rgba(0,245,155,0.6)]",
              )}
            >
              {seconds}
            </span>
            {label && (
              <span className="text-on-surface-variant font-label-caps tracking-[0.2em] text-xs mt-2 uppercase">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
