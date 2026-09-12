"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function Skeleton({ className, rounded = "xl" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-[#161c28] via-[#1e2738] to-[#161c28] bg-[length:200%_100%] animate-shimmer",
        `rounded-${rounded}`,
        className
      )}
    />
  );
}

// Pre-built skeleton cards
export function SkeletonStatCard() {
  return (
    <div className="bg-[#121620] border border-white/10 rounded-2xl p-3.5">
      <div className="flex justify-between mb-3">
        <Skeleton className="h-3 w-20" rounded="full" />
        <Skeleton className="h-7 w-7" rounded="lg" />
      </div>
      <Skeleton className="h-8 w-24 mb-1" rounded="md" />
      <Skeleton className="h-3 w-32" rounded="full" />
    </div>
  );
}

export function SkeletonSessionCard() {
  return (
    <div className="bg-[#121620] border border-white/10 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        {/* Mode icon placeholder */}
        <Skeleton className="w-10 h-10 flex-shrink-0" rounded="xl" />
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-32" rounded="full" />
            <Skeleton className="h-4 w-16" rounded="full" />
          </div>
          <Skeleton className="h-3 w-28 mb-3" rounded="full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" rounded="md" />
            <Skeleton className="h-5 w-16" rounded="md" />
            <Skeleton className="h-5 w-16" rounded="md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonWeightEntry() {
  return (
    <div className="bg-[#121620] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" rounded="xl" />
        <div>
          <Skeleton className="h-5 w-16 mb-1.5" rounded="full" />
          <Skeleton className="h-3 w-20" rounded="full" />
        </div>
      </div>
      <Skeleton className="h-6 w-14" rounded="lg" />
    </div>
  );
}
