"use client";

import { AppProvider, useApp } from "@/lib/store";
import { ProgressRunner } from "@/components/ProgressRunner";

function DbErrorBanner() {
  const { dbError } = useApp();
  if (!dbError) return null;
  return (
    <div className="bg-orange-100 text-orange-700 text-xs text-center py-1 px-2">{dbError}</div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <DbErrorBanner />
      {children}
      <ProgressRunner />
    </AppProvider>
  );
}
