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
    <nav className="fixed bottom-0 w-full z-30 glass-titanium border-t border-white/10 dark:shadow-[0_-10px_35px_rgba(0,0,0,0.8)] shadow-[0_-4px_25px_rgba(0,0,0,0.06)] max-w-app left-1/2 -translate-x-1/2 pb-[env(safe-area-inset-bottom,0px)]">
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
              className={`relative flex-col items-center justify-center h-12 w-16 gap-1 transition-colors duration-200 flex ${
                isActive
                  ? "text-primary font-black drop-shadow-[0_0_10px_rgba(212,255,0,0.75)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-primary to-emerald-400 rounded-full shadow-neon-strong"
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
