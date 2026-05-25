"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function WorkoutRedirect() {
  const router = useRouter();
  const { activeWorkout } = useAppStore();

  useEffect(() => {
    // If there's an active workout, redirect to it
    if (activeWorkout.routine) {
      router.push(`/workout/${activeWorkout.mode}`);
    } else {
      // Otherwise go to dashboard to select a routine
      router.push("/");
    }
  }, [activeWorkout.routine, activeWorkout.mode, router]);

  return null;
}
