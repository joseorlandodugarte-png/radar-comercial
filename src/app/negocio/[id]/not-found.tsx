import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="No encontramos ese negocio"
      description="Puede que lo hayan borrado o que el enlace esté incompleto."
      action={
        <Button asChild variant="outline">
          <Link href="/explorar">Ir a Explorar</Link>
        </Button>
      }
    />
  );
}
