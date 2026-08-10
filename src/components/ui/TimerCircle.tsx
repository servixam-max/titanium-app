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
    <div className={cn("relative flex items-center justify-center", breathe && !urgent && "animate-breathe", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1c1c1c"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? "#ffb4ab" : "#ccff00"}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span
              className={cn(
                "font-display-timer text-[56px] leading-none tabular-nums",
                urgent ? "animate-urgent" : "text-primary-container neon-glow"
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
