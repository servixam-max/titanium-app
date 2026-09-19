"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  active?: boolean;
  barCount?: number;
  className?: string;
  color?: string;
  secondaryColor?: string;
  height?: number;
}

export default function AudioWaveform({
  active = true,
  barCount = 18,
  className,
  color = "#A3E635",
  secondaryColor = "#10B981",
  height = 36,
}: AudioWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 py-1 px-3 rounded-full bg-black/40 border border-white/5 backdrop-blur-md",
        className
      )}
      style={{ height: `${height + 12}px` }}
    >
      {bars.map((i) => {
        // Create organic wave shape with center bias
        const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
        const maxHeightFactor = 1 - centerDistance * 0.45;
        const barHeight = Math.max(6, height * maxHeightFactor);
        const isCyan = i % 3 === 0;

        return (
          <motion.div
            key={i}
            className="w-1 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: isCyan ? secondaryColor : color,
              boxShadow: active
                ? `0 0 8px ${isCyan ? secondaryColor : color}99`
                : "none",
            }}
            animate={
              active
                ? {
                    height: [
                      4,
                      Math.floor(barHeight * (0.35 + (i % 5) * 0.15)),
                      Math.floor(barHeight * 0.95),
                      Math.floor(barHeight * 0.2),
                      4,
                    ],
                    opacity: [0.5, 0.9, 1, 0.7, 0.5],
                  }
                : {
                    height: 4,
                    opacity: 0.3,
                  }
            }
            transition={
              active
                ? {
                    duration: 1.1 + (i % 4) * 0.18,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: (i * 0.05) % 0.4,
                  }
                : { duration: 0.4 }
            }
          />
        );
      })}
    </div>
  );
}
