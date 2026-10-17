"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateNotes } from "@/server/actions/businesses";

export function NotesEditor({
  businessId,
  initial,
}: {
  businessId: number;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value !== (initial ?? "");
  return (
    <div className="grid gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Horario, quién decide, qué le interesa, ideas para su contenido…"
        aria-label="Notas"
      />
      {dirty && (
        <Button
          size="sm"
          className="justify-self-end"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await updateNotes(businessId, value);
              toast.success("Notas guardadas");
            })
          }
        >
          Guardar notas
        </Button>
      )}
    </div>
  );
}
