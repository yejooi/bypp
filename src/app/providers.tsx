"use client";

import { AppProvider, useApp } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { ProgressRunner } from "@/components/ProgressRunner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserBar } from "@/components/UserBar";
import { AuthGate } from "@/components/AuthGate";

function DbErrorBanner() {
  const { dbError } = useApp();
  if (!dbError) return null;
  return (
    <div className="w-full bg-[var(--accent-light)] border-b border-[var(--border)] py-2 px-4 text-center text-xs sm:text-sm font-medium text-[var(--accent-hover)] flex items-center justify-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
      <span>{dbError}</span>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
          <ThemeToggle />
          <UserBar />
          <DbErrorBanner />
          <AuthGate>{children}</AuthGate>
          <ProgressRunner />
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
