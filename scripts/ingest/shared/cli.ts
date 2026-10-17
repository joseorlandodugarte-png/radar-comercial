export type CliOptions = {
  dryRun: boolean;
  state: string;
  municipality: string | null;
  limit: number | null;
  flags: Set<string>;
  values: Map<string, string>;
};

/** Tiny argv parser: --dry-run, --state=merida, --municipality=libertador, --limit=50, --any-flag. */
export function parseCli(argv = process.argv.slice(2)): CliOptions {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (const arg of argv) {
    const m = arg.match(/^--([\w-]+)(?:=(.*))?$/);
    if (!m) continue;
    if (m[2] === undefined) flags.add(m[1]!);
    else values.set(m[1]!, m[2]);
  }
  const limit = values.get("limit");
  return {
    dryRun: flags.has("dry-run"),
    state: values.get("state") ?? "merida",
    municipality: values.get("municipality") ?? null,
    limit: limit ? Number(limit) : null,
    flags,
    values,
  };
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✖ Falta ${name} en .env. Mira docs/api-keys.md para obtenerla.`);
    process.exit(1);
  }
  return v;
}

export const log = {
  info: (msg: string) => console.log(`• ${msg}`),
  ok: (msg: string) => console.log(`✔ ${msg}`),
  warn: (msg: string) => console.warn(`! ${msg}`),
  dry: (msg: string) => console.log(`[dry-run] ${msg}`),
};
