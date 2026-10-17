import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Esta página no existe"
      description="Revisa el enlace o vuelve al inicio."
      action={
        <Button asChild>
          <Link href="/">Ir al inicio</Link>
        </Button>
      }
    />
  );
}
