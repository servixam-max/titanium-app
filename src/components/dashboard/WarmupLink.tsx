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
      className="group flex h-[52px] items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#121620] to-[#151b28] px-4 shadow-md transition-all hover:border-cyan-400/40 active:scale-[0.98]"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-400 transition-colors group-hover:bg-cyan-400 group-hover:text-black">
        <Zap className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-white transition-colors group-hover:text-cyan-400">
          Calentamiento y Movilidad Articular
        </span>
      </div>
      <span className="text-[11px] text-zinc-400 transition-colors group-hover:text-white">
        {exerciseCount} ej (30s)
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-400 transition-colors group-hover:text-white" />
    </Link>
  );
}
