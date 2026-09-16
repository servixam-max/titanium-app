"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  size?: number; // length of the laser segment in px
  borderRadius?: number;
}

export default function BorderBeam({
  className,
  duration = 5,
  colorFrom = "#D4FF00",
  colorTo = "#00F59B",
  borderWidth = 2,
  size = 160,
  borderRadius = 24,
}: BorderBeamProps) {
  const id = useId().replace(/:/g, "_");
  const gradId = `beam-grad-${id}`;
  const filterId = `beam-filter-${id}`;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-10",
        className
      )}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} stopOpacity="1" />
            <stop offset="50%" stopColor={colorTo} stopOpacity="1" />
            <stop offset="100%" stopColor={colorFrom} stopOpacity="0" />
          </linearGradient>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient base stroke */}
        <rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke={colorFrom}
          strokeOpacity="0.15"
          strokeWidth={borderWidth}
        />

        {/* Animated Laser Beam */}
        <motion.rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={borderWidth}
          strokeDasharray={`${size} 1200`}
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          animate={{
            strokeDashoffset: [0, -1360],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </svg>
    </div>
  );
}
