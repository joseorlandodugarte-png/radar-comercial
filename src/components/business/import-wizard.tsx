"use client";

import { CheckCircle2, FileSpreadsheet, Loader2, TriangleAlert, Upload } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { IMPORT_COLUMNS } from "@/lib/import/columns";
import { cn } from "@/lib/utils";
import { commitImport, previewImport, type PreviewRow } from "@/server/actions/import";

type Decision = "create" | "merge" | "skip";

export function ImportWizard() {
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; merged: number; skipped: number } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const valid = rows?.filter((r) => r.ok) ?? [];
  const invalid = rows?.filter((r) => !r.ok) ?? [];
  const dupes = valid.filter((r) => r.duplicate);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await previewImport(fd);
      if (!res.ok) {
        setError(res.message);
        setRows(null);
        return;
      }
      setRows(res.rows);
      // Default: duplicates are skipped (or merged when they match an existing business), new rows are created.
      setDecisions(
        Object.fromEntries(
          res.rows
            .filter((r) => r.ok)
            .map((r) => [r.line, r.duplicate ? (r.duplicate.id ? "merge" : "skip") : "create"]),
        ),
      );
    });
  };

  const commit = () =>
    startTransition(async () => {
      const payload = valid.map((r) => ({
        decision: decisions[r.line] ?? "skip",
        duplicateId: r.duplicate?.id ?? null,
        data: r.data,
        resolved: r.resolved,
      }));
      const res = await commitImport(payload);
      setResult(res);
      setRows(null);
      toast.success(`Importación lista: ${res.created} nuevos, ${res.merged} completados`);
    });

  return (
    <div className="flex flex-col gap-5">
      <label
        className={cn(
          "hover:bg-accent/50 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {pending ? (
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        ) : (
          <Upload className="text-muted-foreground size-8" />
        )}
        <span className="font-medium">Elige un archivo .csv o .xlsx</span>
        <span className="text-muted-foreground text-sm">
          Primera fila con encabezados. Máximo 2000 filas.
        </span>
        <input
          type="file"
          accept=".csv,.xlsx,text/csv"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      <details className="bg-muted/50 rounded-xl p-3 text-sm">
        <summary className="cursor-pointer font-medium">Columnas que entiendo</summary>
        <p className="text-muted-foreground mt-2">
          {IMPORT_COLUMNS.join(", ")}. Obligatorias: <strong>nombre</strong> y{" "}
          <strong>categoria</strong> (por ejemplo restaurantes, cafes, barberias). Si no hay estado,
          se usa Mérida. Para vía principal y menú digital escribe sí o no.
        </p>
        <a
          href="/plantilla-negocios.csv"
          download
          className="text-primary mt-2 inline-flex items-center gap-1 underline"
        >
          <FileSpreadsheet className="size-4" /> Descargar plantilla
        </a>
      </details>

      {error && (
        <p className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{error}</p>
      )}

      {result && (
        <div className="border-light-green/30 bg-light-green/10 flex items-center gap-3 rounded-xl border p-4 text-sm">
          <CheckCircle2 className="text-light-green size-5" />
          <span>
            {result.created} negocios nuevos, {result.merged} existentes completados,{" "}
            {result.skipped} omitidos.{" "}
            <Link href="/" className="underline">
              Ver dashboard
            </Link>
          </span>
        </div>
      )}

      {rows && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Stat label="Filas válidas" value={valid.length} />
            <Stat label="Posibles duplicados" value={dupes.length} warn={dupes.length > 0} />
            <Stat label="Con errores" value={invalid.length} warn={invalid.length > 0} />
          </div>

          {dupes.length > 0 && (
            <section className="bg-card rounded-2xl border">
              <h3 className="border-b p-3 font-medium">Posibles duplicados: decide qué hacer</h3>
              <ul className="divide-y">
                {dupes.map((r) => (
                  <li key={r.line} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{r.data?.nombre}</span>{" "}
                      <span className="text-muted-foreground">
                        (línea {r.line}) · {r.duplicate?.reason}
                        {r.duplicate?.id && (
                          <>
                            {" con "}
                            <Link
                              href={`/negocio/${r.duplicate.id}`}
                              className="underline"
                              target="_blank"
                            >
                              {r.duplicate.name}
                            </Link>
                          </>
                        )}
                      </span>
                    </span>
                    <div className="bg-muted inline-flex rounded-lg p-1">
                      {(
                        [
                          ["merge", "Completar existente", !!r.duplicate?.id],
                          ["create", "Crear nuevo", true],
                          ["skip", "Omitir", true],
                        ] as const
                      )
                        .filter(([, , show]) => show)
                        .map(([d, label]) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDecisions((prev) => ({ ...prev, [r.line]: d }))}
                            className={cn(
                              "h-7 rounded-md px-2.5 text-xs",
                              decisions[r.line] === d
                                ? "bg-background font-medium shadow-sm"
                                : "text-muted-foreground",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {invalid.length > 0 && (
            <section className="bg-card rounded-2xl border">
              <h3 className="flex items-center gap-2 border-b p-3 font-medium">
                <TriangleAlert className="size-4 text-amber-600" /> Filas con errores (no se
                importan)
              </h3>
              <ul className="max-h-64 divide-y overflow-y-auto">
                {invalid.map((r) => (
                  <li key={r.line} className="p-3 text-sm">
                    Línea {r.line}: <span className="text-destructive">{r.errors.join("; ")}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button size="lg" onClick={commit} disabled={pending || valid.length === 0}>
            {pending && <Loader2 className="animate-spin" />} Importar{" "}
            {valid.filter((r) => decisions[r.line] !== "skip").length} negocios
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1",
        warn && "border-light-yellow/50 bg-light-yellow/10",
      )}
    >
      {label}: <strong className="tabular-nums">{value}</strong>
    </span>
  );
}
