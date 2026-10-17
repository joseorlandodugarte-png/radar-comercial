import {
  ChevronRight,
  ClipboardCheck,
  Download,
  Gauge,
  KeyRound,
  Plus,
  Upload,
} from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { getReviewQueue } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Más" };

export default async function MorePage() {
  const pending = (await getReviewQueue()).length;
  const items = [
    {
      href: "/agregar",
      icon: Plus,
      title: "Agregar negocio",
      text: "Desde la calle, con tu ubicación o un link",
    },
    {
      href: "/mas/importar",
      icon: Upload,
      title: "Importar CSV o Excel",
      text: "Con detección de duplicados",
    },
    {
      href: "/api/exportar?estado=merida&formato=xlsx",
      icon: Download,
      title: "Exportar Mérida a Excel",
      text: "Todos los negocios con sus puntajes",
      download: true,
    },
    {
      href: "/mas/revision",
      icon: ClipboardCheck,
      title: "Revisión manual",
      text: pending ? `${pending} pendientes` : "Nada pendiente",
    },
    {
      href: "/mas/puntajes",
      icon: Gauge,
      title: "Cómo se calculan los puntajes",
      text: "Pesos, umbrales y reglas de servicios",
    },
    {
      href: "/mas/puntajes#fuentes",
      icon: KeyRound,
      title: "Fuentes de datos",
      text: "Solo fuentes legales y oficiales",
    },
  ];
  return (
    <>
      <PageHeader title="Más" />
      <ul className="bg-card divide-y rounded-2xl border">
        {items.map((i) => (
          <li key={i.href}>
            {i.download ? (
              <a href={i.href} className="hover:bg-accent flex items-center gap-3 p-4">
                <Row {...i} />
              </a>
            ) : (
              <Link href={i.href} className="hover:bg-accent flex items-center gap-3 p-4">
                <Row {...i} />
              </Link>
            )}
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 p-4">
          <span>
            <span className="block font-medium">Modo claro u oscuro</span>
            <span className="text-muted-foreground block text-sm">
              Sigue al sistema hasta que lo cambies
            </span>
          </span>
          <ThemeToggle />
        </li>
      </ul>
    </>
  );
}

function Row({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <>
      <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground block text-sm">{text}</span>
      </span>
      <ChevronRight className="text-muted-foreground size-4" />
    </>
  );
}
