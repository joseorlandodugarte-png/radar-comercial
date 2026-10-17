import { PageHeader } from "@/components/page-header";
import { scoringConfig } from "@config/scoring";

export const metadata = { title: "Cómo se calculan los puntajes" };

const DH_LABELS: Record<keyof typeof scoringConfig.digitalHealth.weights, string> = {
  postingFrequency: `Frecuencia de publicaciones (meta: ${scoringConfig.digitalHealth.postsPer30dTarget} en 30 días)`,
  recency: `Última publicación (completa hasta ${scoringConfig.digitalHealth.recencyFullDays} días, cero a los ${scoringConfig.digitalHealth.recencyZeroDays})`,
  engagement: `Interacción (referencia: ${scoringConfig.digitalHealth.engagementRateTarget * 100} %)`,
  followersVsMedian: "Seguidores frente a la mediana de su categoría en el estado",
  reels: `Reels (meta: ${scoringConfig.digitalHealth.reelsPer30dTarget} en 30 días)`,
  profileCompleteness: "Perfil completo (bio, link, teléfono)",
  googleReputation: "Reputación en Google (ajustada por cantidad de reseñas)",
};

const OPP_LABELS: Record<keyof typeof scoringConfig.opportunity.strengthWeights, string> = {
  rating: "Calificación en Google",
  reviewVolume: "Cantidad de reseñas",
  mainRoad: "Ubicación en vía principal",
  visualCategory: "Rubro que vende con imágenes (comida, bares, belleza, hospedaje)",
};

export default function ScoringPage() {
  const c = scoringConfig;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Cómo se calculan los puntajes"
        description={`Configuración ${c.version}. Los pesos se cambian en config/scoring.ts.`}
        crumbs={[{ label: "Más", href: "/mas" }, { label: "Puntajes" }]}
      />
      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <Block title="Salud Digital (0-100)">
          <p>
            Mide cómo le va en redes. Cada factor vale de 0 a 1 y se multiplica por su peso. Si un
            factor no tiene dato, no cuenta como cero: su peso se reparte entre los demás. Si falta
            más del {c.digitalHealth.minWeightCoverage * 100} % del peso, el puntaje queda como
            “Datos insuficientes”.
          </p>
          <WeightTable
            rows={Object.entries(c.digitalHealth.weights).map(([k, w]) => [
              DH_LABELS[k as keyof typeof DH_LABELS],
              w,
            ])}
          />
        </Block>
        <Block title="Oportunidad (0-100)">
          <p>
            Busca negocios a los que les va bien pero cuyas redes no lo reflejan:{" "}
            {c.opportunity.strengthWeight * 100} % fortaleza del negocio y{" "}
            {c.opportunity.gapWeight * 100} % brecha en redes (100 − Salud Digital). Sin redes, la
            brecha es máxima.
          </p>
          <WeightTable
            rows={Object.entries(c.opportunity.strengthWeights).map(([k, w]) => [
              OPP_LABELS[k as keyof typeof OPP_LABELS],
              w,
            ])}
          />
        </Block>
        <Block title="Semáforo">
          <ul className="list-disc pl-5">
            <li>Rojo: Salud Digital menor a {c.trafficLight.red}</li>
            <li>
              Amarillo: de {c.trafficLight.red} a {c.trafficLight.yellow - 1}
            </li>
            <li>Verde: {c.trafficLight.yellow} o más</li>
            <li>Sin redes: no tiene Instagram, Facebook ni TikTok registrados</li>
            <li>Sin medir: tiene redes pero aún no hay mediciones</li>
          </ul>
        </Block>
        <Block title="Servicios sugeridos">
          <ul className="list-disc pl-5">
            <li>Sin Instagram → Crear redes (prioridad máxima) y Video</li>
            <li>Menos de {c.services.fewVideosThreshold} reels en 30 días → Video / reels</li>
            <li>Restaurante, café o bar sin menú digital → Menú digital</li>
            <li>Local en vía principal → Valla / pendón</li>
            <li>Etiquetas de promociones o eventos, o bio que los menciona → Flyers</li>
          </ul>
        </Block>
        <Block title="Fuentes de datos" id="fuentes">
          <p>
            Solo usamos fuentes legales: OpenStreetMap (Overpass, licencia ODbL), Google Places API
            oficial, Instagram Graph API (Business Discovery) y lo que cargas a mano o por CSV.
            Nunca se hace scraping. Cada medición guarda su fuente y fecha; si algo falta, se
            muestra “Sin dato”. Los negocios marcados DEMO son ficticios.
          </p>
        </Block>
      </div>
    </div>
  );
}

function Block({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="bg-card flex flex-col gap-3 rounded-xl border p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function WeightTable({ rows }: { rows: Array<[string, number]> }) {
  const total = rows.reduce((s, [, w]) => s + w, 0);
  return (
    <table className="w-full">
      <tbody>
        {rows.map(([label, w]) => (
          <tr key={label} className="border-t">
            <td className="py-2 pr-3">{label}</td>
            <td className="w-32 py-2">
              <div className="bg-muted h-1.5 rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${(w / total) * 100}%` }}
                />
              </div>
            </td>
            <td className="w-12 py-2 text-right font-medium tabular-nums">{w}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
