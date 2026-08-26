"use client";

import { cn } from "@/lib/utils";

interface SectionTitleProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  align?: "left" | "center";
  accent?: boolean;
}

export default function SectionTitle({
  children,
  icon,
  subtitle,
  className,
  align = "left",
  accent = true,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          align === "center" && "justify-center",
        )}
      >
        {icon && <span className="text-primary-container">{icon}</span>}
        <h2
          className={cn(
            "font-headline-md text-headline-md uppercase tracking-wider",
            accent && "text-primary-container",
          )}
        >
          {children}
        </h2>
      </div>
      {subtitle && (
        <p className="text-on-surface-variant text-sm mt-1">{subtitle}</p>
      )}
    </div>
  );
}
