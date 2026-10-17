"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setReviewStatus } from "@/server/actions/businesses";

export function ReviewActions({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => startTransition(() => setReviewStatus(id, "resolved").then(() => undefined))}
      >
        Resuelto
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(() => setReviewStatus(id, "dismissed").then(() => undefined))
        }
      >
        Descartar
      </Button>
    </div>
  );
}
