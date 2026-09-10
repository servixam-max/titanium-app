const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  "src/components/workout/WorkoutShell.tsx",
  "src/components/workout/SetLogger.tsx",
  "src/components/workout/ExitConfirmModal.tsx",
  "src/components/workout/RestOverlay.tsx",
  "src/components/ui/RestTimer.tsx",
  "src/components/ui/WorkTimer.tsx",
  "src/components/ui/SettingsModal.tsx",
  "src/components/ui/UpdateChecker.tsx",
  "src/components/ui/InstallPrompt.tsx",
  "src/components/ui/RoutineCard.tsx",
  "src/components/ui/ExerciseCard.tsx",
  "src/components/ui/TopAppBar.tsx",
  "src/components/ui/DayCarouselSelector.tsx",
  "src/components/ui/SectionTitle.tsx",
  "src/components/dashboard/ActiveWorkoutBanner.tsx",
  "src/components/dashboard/RecommendedRoutineCard.tsx",
  "src/components/dashboard/DashboardHeader.tsx",
  "src/components/dashboard/WarmupLink.tsx",
  "src/components/auth/AuthModal.tsx",
  "src/components/ClientOnly.tsx",
  "src/components/ui/ExerciseImage.tsx",
  "src/app/not-found.tsx",
  "src/app/page.tsx",
  "src/app/workout/complete/page.tsx",
  "src/app/workout/individual/page.tsx",
  "src/app/workout/guided/page.tsx",
  "src/app/routine/[day]/RoutinePage.tsx",
  "src/app/audio/page.tsx",
  "src/app/warmup/page.tsx",
  "src/app/history/page.tsx",
  "src/app/stats/page.tsx",
  "src/app/weight/page.tsx",
].map((p) => path.resolve(ROOT, p));

const REPLACEMENTS = [
  // Inputs / containers chicos
  { from: /bg-surface-container-high/g, to: "bg-[#161e2e]" },
  { from: /bg-surface-container-lowest/g, to: "bg-[#0a0d13]" },
  { from: /bg-surface-container/g, to: "bg-[#121620]" },
  { from: /bg-surface/g, to: "bg-[#0e121a]" },
  { from: /border-surface-container-highest/g, to: "border-white/10" },
  { from: /border-surface-variant/g, to: "border-white/10" },
  { from: /border-surface/g, to: "border-white/10" },
  // Textos
  { from: /text-on-surface-variant/g, to: "text-zinc-400" },
  { from: /text-on-surface/g, to: "text-white" },
  { from: /text-on-primary-container/g, to: "text-black" },
  { from: /text-error/g, to: "text-red-400" },
  // Botones primarios antiguos
  { from: /bg-emerald-600 hover:bg-emerald-500 text-white/g, to: "bg-gradient-to-r from-primary to-emerald-400 hover:brightness-110 text-black" },
  { from: /bg-emerald-600 hover:bg-emerald-500/g, to: "bg-gradient-to-r from-primary to-emerald-400 hover:brightness-110" },
  { from: /bg-emerald-600/g, to: "bg-gradient-to-r from-primary to-emerald-400" },
  { from: /hover:bg-emerald-500/g, to: "hover:brightness-110" },
  { from: /border-emerald-400\/30/g, to: "border-primary/40" },
  // Contenedores primarios
  { from: /bg-primary-container text-black/g, to: "bg-gradient-to-r from-primary to-emerald-400 text-black" },
  { from: /bg-primary-container\/20 text-primary-container/g, to: "bg-primary/20 text-primary" },
  { from: /bg-primary-container\/20/g, to: "bg-primary/20" },
  { from: /bg-primary-container\/10/g, to: "bg-primary/10" },
  { from: /bg-primary-container\/12/g, to: "bg-primary/10" },
  { from: /bg-primary-container\/15/g, to: "bg-primary/15" },
  { from: /bg-primary-container\/30/g, to: "bg-primary/30" },
  { from: /text-primary-container/g, to: "text-primary" },
  { from: /border-primary-container\/30/g, to: "border-primary/30" },
  { from: /border-primary-container/g, to: "border-primary" },
  // Error sutil
  { from: /bg-error\/15/g, to: "bg-red-500/15" },
  { from: /bg-error\/10/g, to: "bg-red-500/10" },
];

for (const filePath of TARGETS) {
  if (!fs.existsSync(filePath)) {
    console.warn("Missing", filePath);
    continue;
  }
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  for (const { from, to } of REPLACEMENTS) {
    content = content.replace(from, to);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Updated", path.relative(ROOT, filePath));
  }
}
console.log("Done");
