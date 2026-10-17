"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export type { MapPoint } from "./business-map";

/** MapLibre only runs in the browser; load it lazily with a skeleton. */
export const BusinessMapLazy = dynamic(() => import("./business-map").then((m) => m.BusinessMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[60dvh] w-full rounded-xl" />,
});
