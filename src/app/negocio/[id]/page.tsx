import { CircleAlert, ExternalLink, MapPin, PartyPopper } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  FacebookIcon,
  CategoryIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { LeadPanel } from "@/components/business/lead-panel";
import { FollowersChart } from "@/components/business/metrics-history";
import { NotesEditor } from "@/components/business/notes-editor";
import { QuickActions } from "@/components/business/quick-actions";
import { ScoreBreakdown } from "@/components/business/score-breakdown";
import { Breadcrumbs } from "@/components/page-header";
import { DemoBadge, TrafficLightBadge } from "@/components/score-badges";
import { Button } from "@/components/ui/button";
import { getBusinessDetail, type BusinessDetail } from "@/db/queries";
import {
  formatBool,
  formatDate,
  formatNumber,
  formatPercent,
  formatRating,
  formatRelative,
  SIN_DATO,
} from "@/lib/format";
import { PRIORITY_LABEL, SERVICE_LABEL, SOURCE_LABEL, TRAFFIC_LIGHT_HINT } from "@/lib/labels";
import { facebookUrl, instagramUrl, tiktokUrl } from "@/lib/links/social";
import { whatsappMessage, whatsappUrl } from "@/lib/links/whatsapp";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SENDER = process.env.NEXT_PUBLIC_SENDER_NAME || "tu productor de confianza";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = Number.isInteger(Number(id)) ? await getBusinessDetail(Number(id)) : null;
  return { title: b?.name ?? "Negocio" };
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  const b = await getBusinessDetail(numericId);
  if (!b) notFound();

  const muniHref = b.municipalitySlug
    ? `/explorar/${b.stateSlug}/${b.municipalitySlug}`
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        items={[
          { label: b.stateName, href: `/explorar/${b.stateSlug}` },
          ...(b.municipalityName ? [{ label: b.municipalityName, href: muniHref }] : []),
          ...(b.sector && muniHref
            ? [{ label: b.sector, href: `${muniHref}?sector=${encodeURIComponent(b.sector)}` }]
            : []),
          { label: b.name },
        ]}
      />

      {nuevo && (
        <div className="border-light-green/30 bg-light-green/10 flex items-center gap-2 rounded-xl border p-3 text-sm">
          <PartyPopper className="text-light-green size-4" /> Negocio guardado. Ya tiene puntajes y
          servicios sugeridos.
        </div>
      )}
      {b.pendingReview.length > 0 && (
        <div className="border-light-yellow/40 bg-light-yellow/10 flex items-start gap-2 rounded-xl border p-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            En revisión manual: {b.pendingReview.map((r) => r.reason).join("; ")}.{" "}
            <Link href="/mas/revision" className="underline">
              Ver cola
            </Link>
          </span>
        </div>
      )}

      <header className="bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="bg-accent text-accent-foreground flex size-14 shrink-0 items-center justify-center rounded-xl">
            <CategoryIcon name={b.categoryIcon} className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl leading-tight font-semibold tracking-tight">
              {b.name} <DemoBadge source={b.source} />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{b.categoryName}</p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-sm">
              <MapPin className="size-3.5 shrink-0" />
              {b.address ?? ([b.sector, b.municipalityName].filter(Boolean).join(", ") || SIN_DATO)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TrafficLightBadge light={b.trafficLight} />
          <span className="text-muted-foreground text-xs">
            {TRAFFIC_LIGHT_HINT[b.trafficLight]}
          </span>
          {b.tags.map((t) => (
            <span key={t.slug} className="bg-secondary rounded-full px-2 py-0.5 text-xs">
              {t.name}
            </span>
          ))}
        </div>
        <QuickActions business={b} />
        {b.source === "seed" && (
          <p className="text-muted-foreground text-xs">
            Negocio ficticio de demostración: sus datos y teléfono no son reales.
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Services b={b} />
          <ScoreBreakdown
            title="Oportunidad"
            variant="opportunity"
            result={b.breakdown?.opportunity ?? null}
            description="Qué tan buen prospecto es: el negocio funciona bien pero sus redes no lo reflejan."
          />
          <ScoreBreakdown
            title="Salud digital"
            variant="health"
            result={b.breakdown?.digitalHealth ?? null}
            description="Cómo le va en redes: frecuencia, recencia, interacción, seguidores, reels, perfil y reputación."
          />
          <SocialMetrics b={b} />
          <BusinessData b={b} />
          {b.scoreComputedAt && (
            <p className="text-muted-foreground text-xs">
              Puntajes calculados el {formatDate(b.scoreComputedAt)} con la configuración{" "}
              {b.scoreConfigVersion}.{" "}
              <Link href="/mas/puntajes" className="underline">
                ¿Cómo se calculan?
              </Link>
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
          <Section title="Seguimiento">
            <LeadPanel
              businessId={b.id}
              stage={b.lead?.stage ?? null}
              nextActionAt={b.lead?.nextActionAt ?? null}
              nextActionNote={b.lead?.nextActionNote ?? null}
              interactions={b.lead?.interactions ?? []}
            />
          </Section>
          <Section title="Notas">
            <NotesEditor businessId={b.id} initial={b.notes} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-card hud-frame rounded-xl border p-4 backdrop-blur-sm", className)}>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Services({ b }: { b: BusinessDetail }) {
  if (b.services.length === 0) {
    return (
      <Section title="Servicios sugeridos">
        <p className="text-muted-foreground text-sm">
          Ninguna regla se activó: sus redes y su local están bien cubiertos.
        </p>
      </Section>
    );
  }
  return (
    <Section title="Servicios sugeridos">
      <ul className="flex flex-col gap-2">
        {b.services.map((s) => {
          const wa = whatsappUrl(
            b.whatsapp ?? b.phone,
            whatsappMessage({
              businessName: b.name,
              service: s.service,
              senderName: SENDER,
              municipality: b.municipalityName,
            }),
          );
          return (
            <li key={s.id} className="bg-muted/50 flex items-center gap-3 rounded-xl p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {SERVICE_LABEL[s.service]}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      s.priority === "max" && "bg-light-red text-white",
                      s.priority === "high" && "bg-primary/15 text-primary",
                      (s.priority === "medium" || s.priority === "low") &&
                        "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {PRIORITY_LABEL[s.priority]}
                  </span>
                </p>
                <p className="text-muted-foreground text-sm">{s.reason}</p>
              </div>
              {wa && (
                <Button asChild variant="outline" size="icon" className="shrink-0 rounded-full">
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ofrecer ${SERVICE_LABEL[s.service]} por WhatsApp`}
                  >
                    <WhatsAppIcon className="text-whatsapp size-5" />
                  </a>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          value === SIN_DATO && "text-muted-foreground text-base font-normal",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

function SocialMetrics({ b }: { b: BusinessDetail }) {
  const latest =
    [...b.socialHistory].reverse().find((s) => s.platform === "instagram") ??
    b.socialHistory.at(-1) ??
    null;
  const review = b.reviewHistory.at(-1) ?? null;
  const igHistory = b.socialHistory.filter((s) => s.platform === (latest?.platform ?? "instagram"));
  return (
    <Section title="Métricas">
      {latest ? (
        <p className="text-muted-foreground mb-3 text-xs">
          {latest.platform === "instagram"
            ? "Instagram"
            : latest.platform === "facebook"
              ? "Facebook"
              : "TikTok"}{" "}
          · Fuente: {SOURCE_LABEL[latest.source]} · Medido el {formatDate(latest.capturedAt)}
        </p>
      ) : (
        <p className="text-muted-foreground mb-3 text-sm">
          {b.instagram
            ? "Tiene Instagram pero aún no se ha medido. Corre pnpm ingest:instagram."
            : "Sin redes registradas."}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Seguidores" value={formatNumber(latest?.followers)} />
        <Metric label="Posts últimos 30 días" value={formatNumber(latest?.postsLast30d)} />
        <Metric label="Reels últimos 30 días" value={formatNumber(latest?.reelsLast30d)} />
        <Metric
          label="Último post"
          value={latest?.lastPostAt ? formatRelative(latest.lastPostAt) : SIN_DATO}
        />
        <Metric label="Engagement" value={formatPercent(latest?.engagementRate)} />
        <Metric label="Usa reels" value={formatBool(latest?.usesReels)} />
        <Metric label="Bio completa" value={formatBool(latest?.bioComplete)} />
        <Metric label="Link en la bio" value={formatBool(latest?.hasLinkInBio)} />
        <Metric
          label="Google"
          value={formatRating(review?.rating)}
          hint={
            review
              ? `${formatNumber(review.reviewCount)} reseñas · ${SOURCE_LABEL[review.source]}, ${formatDate(review.capturedAt)}`
              : undefined
          }
        />
      </div>
      {igHistory.length > 1 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium">Seguidores en el tiempo</h3>
          <FollowersChart
            points={igHistory.map((s) => ({
              date: s.capturedAt.toISOString(),
              followers: s.followers,
            }))}
          />
          <details className="mt-2 text-sm">
            <summary className="text-primary cursor-pointer">
              Ver todas las mediciones ({igHistory.length})
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground text-left">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Fecha</th>
                    <th className="py-1 pr-3 font-medium">Seguidores</th>
                    <th className="py-1 pr-3 font-medium">Posts 30d</th>
                    <th className="py-1 pr-3 font-medium">Reels 30d</th>
                    <th className="py-1 pr-3 font-medium">Engagement</th>
                    <th className="py-1 font-medium">Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {[...igHistory].reverse().map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="py-1 pr-3">{formatDate(s.capturedAt)}</td>
                      <td className="py-1 pr-3 tabular-nums">{formatNumber(s.followers)}</td>
                      <td className="py-1 pr-3 tabular-nums">{formatNumber(s.postsLast30d)}</td>
                      <td className="py-1 pr-3 tabular-nums">{formatNumber(s.reelsLast30d)}</td>
                      <td className="py-1 pr-3 tabular-nums">{formatPercent(s.engagementRate)}</td>
                      <td className="py-1">{SOURCE_LABEL[s.source]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </Section>
  );
}

function BusinessData({ b }: { b: BusinessDetail }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Teléfono", b.phone ?? SIN_DATO],
    ["WhatsApp", b.whatsapp ?? SIN_DATO],
    [
      "Instagram",
      b.instagram ? (
        <a
          href={instagramUrl(b.instagram)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1"
        >
          <InstagramIcon className="size-3.5" />@{b.instagram}
        </a>
      ) : (
        SIN_DATO
      ),
    ],
    [
      "Facebook",
      b.facebook ? (
        <a
          href={facebookUrl(b.facebook)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1"
        >
          <FacebookIcon className="size-3.5" />
          {b.facebook}
        </a>
      ) : (
        SIN_DATO
      ),
    ],
    [
      "TikTok",
      b.tiktok ? (
        <a
          href={tiktokUrl(b.tiktok)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1"
        >
          <TikTokIcon className="size-3.5" />
          {b.tiktok}
        </a>
      ) : (
        SIN_DATO
      ),
    ],
    [
      "Web",
      b.website ? (
        <a
          href={b.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1"
        >
          {b.website.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
        </a>
      ) : (
        SIN_DATO
      ),
    ],
    ["En vía principal", formatBool(b.onMainRoad)],
    ["Menú digital", formatBool(b.hasDigitalMenu)],
    ["Fuente", `${SOURCE_LABEL[b.source]} · agregado el ${formatDate(b.createdAt)}`],
    [
      "Ubicación",
      b.lat !== null && b.lng !== null ? `${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}` : SIN_DATO,
    ],
  ];
  if (b.googlePlaceId) rows.push(["Google Place ID", b.googlePlaceId]);
  if (b.osmId) rows.push(["OpenStreetMap", b.osmId]);
  return (
    <Section title="Datos del negocio">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={cn("min-w-0 break-words", v === SIN_DATO && "text-muted-foreground")}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
