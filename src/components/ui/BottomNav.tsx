"use client";

import { Home, History, Scale, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide during active workout to prevent accidental navigation
  if (pathname.startsWith("/workout")) return null;

  const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/history", label: "Historial", icon: History },
    { href: "/stats", label: "Stats", icon: BarChart3 },
    { href: "/weight", label: "Peso", icon: Scale },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-30 bg-[#090c12]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_35px_rgba(0,0,0,0.8)] max-w-app left-1/2 -translate-x-1/2 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex justify-around items-center h-[70px] px-3 relative">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center h-12 w-16 gap-1 transition-colors duration-200 ${
                isActive
                  ? "text-primary font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute -top-1 w-9 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-primary rounded-full shadow-[0_0_12px_rgba(0,245,155,0.8)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className="w-5 h-5 transition-transform duration-200 active:scale-90"
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className="font-label-caps text-[10px] tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
