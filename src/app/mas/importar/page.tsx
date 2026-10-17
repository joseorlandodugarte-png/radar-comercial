import { Download } from "lucide-react";

import { ImportWizard } from "@/components/business/import-wizard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Importar y exportar" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Importar y exportar"
        description="Carga negocios desde una hoja de cálculo. Detecto duplicados por Instagram, teléfono, Google o nombre parecido a menos de 100 m."
        crumbs={[{ label: "Más", href: "/mas" }, { label: "Importar" }]}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href="/api/exportar?estado=merida&formato=csv">
                <Download /> CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/api/exportar?estado=merida&formato=xlsx">
                <Download /> Excel
              </a>
            </Button>
          </>
        }
      />
      <ImportWizard />
    </div>
  );
}
