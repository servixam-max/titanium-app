"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number; // in seconds
  decimalPlaces?: number;
  suffix?: string;
  prefix?: string;
}

export default function NumberTicker({
  value,
  direction = "up",
  className,
  delay = 0,
  decimalPlaces = 0,
  suffix = "",
  prefix = "",
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const initialValue = direction === "down" ? value : 0;
  const motionValue = useMotionValue(initialValue);

  const springValue = useSpring(motionValue, {
    damping: 26,
    stiffness: 120,
    mass: 0.8,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      motionValue.set(value);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, delay, value]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${latest.toFixed(decimalPlaces)}${suffix}`;
      }
    });
  }, [springValue, decimalPlaces, prefix, suffix]);

  return (
    <span
      className={cn("inline-block tabular-nums tracking-tight font-mono", className)}
      ref={ref}
    >
      {prefix}
      {value.toFixed(decimalPlaces)}
      {suffix}
    </span>
  );
}
