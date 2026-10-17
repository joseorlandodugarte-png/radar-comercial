"use client";

import { Plus, Radar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { isActive, NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-semibold tracking-tight"
      aria-label="Radar Comercial, inicio"
    >
      <span className="bg-primary text-primary-foreground relative flex size-9 items-center justify-center rounded-lg">
        <span
          className="radar-ping border-primary absolute inset-0 rounded-lg border"
          aria-hidden
        />
        <Radar className="relative size-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          Radar Comercial
          <span className="eyebrow block">VE · Prospección</span>
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-background/60 sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r px-3 py-5 md:flex">
      <div className="px-2">
        <Logo />
      </div>
      <Button asChild size="lg" className="mx-1">
        <Link href="/agregar">
          <Plus /> Agregar negocio
        </Link>
      </Button>
      <nav className="flex flex-col gap-1" aria-label="Principal">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:bg-accent hover:text-foreground relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-current" aria-hidden />}
            </Link>
          );
        })}
      </nav>
      <div className="text-muted-foreground mt-auto flex items-center justify-between px-2 text-xs">
        <span className="eyebrow">OSM · Google · IG</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-muted-foreground relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active && "text-foreground",
                )}
              >
                {active && (
                  <span
                    className="bg-foreground absolute top-0 h-0.5 w-8 rounded-full"
                    aria-hidden
                  />
                )}
                <item.icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Floating "+" on mobile for adding a business from the street. */
export function AddFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/agregar") || pathname.startsWith("/negocio")) return null;
  return (
    <Link
      href="/agregar"
      aria-label="Agregar negocio"
      className="bg-primary text-primary-foreground ring-primary/20 fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-xl shadow-lg ring-4 transition-transform active:scale-95 md:hidden"
    >
      <Plus className="size-7" />
    </Link>
  );
}
