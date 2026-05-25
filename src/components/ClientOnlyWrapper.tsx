"use client";

import { useEffect, useState } from "react";

export default function ClientOnlyWrapper({
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-container/20 border-t-primary-container rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
