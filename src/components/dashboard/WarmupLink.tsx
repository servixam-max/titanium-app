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
      className="group flex h-[52px] items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131626] px-4 shadow-sm transition-all hover:border-cyan-400/50 active:scale-[0.98]"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 transition-colors group-hover:bg-cyan-500 group-hover:text-white">
        <Zap className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-slate-900 dark:text-white transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
          Calentamiento y Movilidad Articular
        </span>
      </div>
      <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono font-medium transition-colors group-hover:text-slate-900 dark:group-hover:text-white">
        {exerciseCount} ej (30s)
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-400 transition-colors group-hover:text-slate-700 dark:group-hover:text-white" />
    </Link>
  );
}
