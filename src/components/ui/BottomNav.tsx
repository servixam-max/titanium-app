"use client";

import { Home, History, Scale, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <nav className="fixed bottom-0 w-full z-50 bg-surface border-t border-surface-container-highest shadow-rest max-w-app left-1/2 -translate-x-1/2">
      <div className="flex justify-around items-center h-[72px] px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center h-touch-target-min w-touch-target-min gap-1 transition-all duration-200 active:scale-90 ${
                isActive
                  ? "text-primary-container font-bold"
                  : "text-secondary-fixed-dim hover:text-primary-fixed-dim"
              }`}
            >
              {isActive && (
                <div className="absolute -top-2 w-1 h-1 bg-primary-container rounded-full shadow-[0_0_4px_#c3f400]" />
              )}
              <Icon
                className="w-6 h-6"
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="font-label-caps text-label-caps mt-1">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}