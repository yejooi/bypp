"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed top-3 right-3 z-50 flex gap-1 bg-[var(--surface)] border-2 border-[var(--border)] rounded-full p-1 shadow-sm">
      <button
        onClick={() => setTheme("cozy")}
        title="Cozy Meadow Cart"
        className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
          theme === "cozy" ? "bg-[var(--primary)]" : "opacity-50"
        }`}
      >
        🌿
      </button>
      <button
        onClick={() => setTheme("strawberry")}
        title="Strawberry Cocoa Confection"
        className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
          theme === "strawberry" ? "bg-[var(--primary)]" : "opacity-50"
        }`}
      >
        🍓
      </button>
    </div>
  );
}
