"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(pathname === "/buscar" ? (params.get("q") ?? "") : "");

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/buscar?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar negocio, @instagram, sector o municipio"
        aria-label="Buscar"
        className="bg-muted/50 placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-ring/30 h-11 w-full rounded-full border pr-4 pl-10 text-base shadow-xs outline-none focus:ring-[3px] md:text-sm"
      />
    </form>
  );
}
