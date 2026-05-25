"use client";

import { useEffect, useState } from "react";

export default function ClientOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-app mx-auto px-container-padding pt-[80px] space-y-4">
          <div className="h-8 bg-surface-container-high rounded animate-pulse" />
          <div className="h-24 bg-surface-container-high rounded animate-pulse" />
          <div className="h-24 bg-surface-container-high rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
