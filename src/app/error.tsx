"use client";

import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Algo salió mal"
      description={
        error.message.includes("DATABASE_URL") || error.message.includes("ECONNREFUSED")
          ? "No hay conexión con la base de datos. ¿Está corriendo docker compose up -d?"
          : "Intenta de nuevo. Si sigue pasando, revisa la consola del servidor."
      }
      action={<Button onClick={reset}>Reintentar</Button>}
    />
  );
}
