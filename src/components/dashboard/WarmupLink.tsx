"use client";

import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface WarmupLinkProps {
  exerciseCount: number;
}

export default function WarmupLink({ exerciseCount }: WarmupLinkProps) {
  return (
    <Link
      href="/warmup"
      onClick={() => haptics.selection()}
      className="fx-inset fx-press group flex min-h-[56px] items-center gap-3 px-4"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/12 text-cyan-600 dark:text-cyan-400">
        <Zap className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">
          Calentamiento
        </span>
      </span>
      <span className="fx-label-sm flex-shrink-0">{exerciseCount} ejercicios</span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-[color:var(--text-tertiary)]" />
    </Link>
  );
}
