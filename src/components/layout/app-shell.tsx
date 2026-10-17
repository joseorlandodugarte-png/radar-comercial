import { Suspense } from "react";

import { AddFab, BottomNav, Logo, Sidebar } from "./app-nav";
import { GlobalSearch } from "./global-search";
import { ParticleField } from "./particle-field";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <ParticleField />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/75 sticky top-0 z-30 border-b backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <Suspense fallback={<div className="bg-muted/50 h-11 w-full rounded-full" />}>
              <GlobalSearch />
            </Suspense>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
          <span className="scanline" aria-hidden />
        </header>
        <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-4 pb-28 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
      <AddFab />
    </div>
  );
}
