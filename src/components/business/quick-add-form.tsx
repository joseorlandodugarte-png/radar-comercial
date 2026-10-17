"use client";

import { Link2, Loader2, LocateFixed, MapPin, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState, useTransition } from "react";

import { CategoryIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseInstagramHandle } from "@/lib/links/social";
import { cn } from "@/lib/utils";
import {
  createBusiness,
  resolveMapsLink,
  type CreateBusinessState,
} from "@/server/actions/businesses";

type CategoryOption = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  servesFood: boolean;
  children: { id: number; name: string }[];
};
type Option = { id: number; name: string };
type MunicipalityOption = Option & { stateId: number };

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";

export function QuickAddForm({
  categories,
  states,
  municipalities,
  defaultStateId,
}: {
  categories: CategoryOption[];
  states: Option[];
  municipalities: MunicipalityOption[];
  defaultStateId: number;
}) {
  const [state, formAction, submitting] = useActionState<CreateBusinessState, FormData>(
    createBusiness,
    { status: "idle" },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const forceRef = useRef<HTMLInputElement>(null);

  const [link, setLink] = useState("");
  const [linkInfo, setLinkInfo] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [rootSlug, setRootSlug] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [stateId, setStateId] = useState(defaultStateId);

  const root = categories.find((c) => c.slug === rootSlug) ?? null;
  const munis = useMemo(
    () => municipalities.filter((m) => m.stateId === stateId),
    [municipalities, stateId],
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const readLink = (value: string) => {
    const v = value.trim();
    if (!v) return setLinkInfo(null);
    const handle = parseInstagramHandle(v);
    if (handle && (v.includes("instagram") || v.startsWith("@"))) {
      setInstagram(handle);
      setLinkInfo(`Instagram detectado: @${handle}`);
      return;
    }
    startResolve(async () => {
      const parsed = await resolveMapsLink(v);
      if (!parsed) {
        setLinkInfo("No reconocí el link. Pega un perfil de Instagram o un link de Google Maps.");
        return;
      }
      if (parsed.name && !name) setName(parsed.name);
      if (parsed.placeId) setPlaceId(parsed.placeId);
      if (parsed.lat !== null && parsed.lng !== null)
        setCoords({ lat: parsed.lat, lng: parsed.lng });
      setLinkInfo(
        parsed.lat !== null
          ? `Google Maps: ${parsed.name ?? "ubicación"} detectada`
          : "No pude leer la ubicación de ese link; usa tu ubicación actual.",
      );
    });
  };

  const locate = () => {
    if (!("geolocation" in navigator)) return setGeoError("Tu navegador no permite ubicación");
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado"
            : "No se pudo obtener tu ubicación",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="force" ref={forceRef} defaultValue="" />
      <input type="hidden" name="lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      <input type="hidden" name="googlePlaceId" value={placeId} />
      <input type="hidden" name="categoryId" value={categoryId ?? ""} />

      <div className="bg-card grid gap-2 rounded-xl border p-4">
        <Label htmlFor="link" className="flex items-center gap-1.5">
          <Link2 className="size-4" /> Pega el link de Instagram o Google Maps
        </Label>
        <div className="flex gap-2">
          <Input
            id="link"
            value={link}
            inputMode="url"
            placeholder="instagram.com/negocio o maps.app.goo.gl/…"
            onChange={(e) => setLink(e.target.value)}
            onPaste={(e) => readLink(e.clipboardData.getData("text"))}
            onBlur={() => readLink(link)}
          />
          {resolving && (
            <Loader2 className="text-muted-foreground size-5 shrink-0 animate-spin self-center" />
          )}
        </div>
        {linkInfo && <p className="text-muted-foreground text-xs">{linkInfo}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Usar mi ubicación
            actual
          </Button>
          {coords && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="text-primary size-3.5" />
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              {coords.accuracy ? ` (±${Math.round(coords.accuracy)} m)` : ""}
            </span>
          )}
          {geoError && <span className="text-destructive text-xs">{geoError}</span>}
        </div>
      </div>

      <FieldBlock label="Nombre del negocio" error={errors.name} htmlFor="name">
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="off"
          aria-invalid={!!errors.name}
        />
      </FieldBlock>

      <FieldBlock label="Categoría" error={errors.categoryId}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={rootSlug === c.slug}
              onClick={() => {
                setRootSlug(c.slug);
                setCategoryId(c.children[0]?.id ?? c.id);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition-colors",
                rootSlug === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <CategoryIcon name={c.icon} className="size-5" />
              {c.name}
            </button>
          ))}
        </div>
        {root && root.children.length > 0 && (
          <select
            aria-label="Tipo"
            className={cn(selectClass, "mt-2")}
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(Number(e.target.value))}
          >
            {root.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </FieldBlock>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldBlock label="Estado" htmlFor="stateId">
          <select
            id="stateId"
            name="stateId"
            className={selectClass}
            value={stateId}
            onChange={(e) => setStateId(Number(e.target.value))}
          >
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FieldBlock>
        <FieldBlock label="Municipio" htmlFor="municipalityId">
          <select id="municipalityId" name="municipalityId" className={selectClass} defaultValue="">
            <option value="">{coords ? "Detectar por la ubicación" : "Elegir…"}</option>
            {munis.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </FieldBlock>
        <FieldBlock label="Sector o urbanización" htmlFor="sector">
          <Input id="sector" name="sector" placeholder="Ej.: Belén, Centro, Las Américas" />
        </FieldBlock>
        <FieldBlock label="Instagram" error={errors.instagram} htmlFor="instagram">
          <Input
            id="instagram"
            name="instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@usuario"
            autoCapitalize="none"
          />
        </FieldBlock>
        <FieldBlock label="Teléfono / WhatsApp" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="0414-1234567" />
        </FieldBlock>
        <FieldBlock label="Dirección" htmlFor="address">
          <Input id="address" name="address" placeholder="Opcional" />
        </FieldBlock>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TriState name="onMainRoad" label="¿Está en una vía principal?" />
        {root?.servesFood && <TriState name="hasDigitalMenu" label="¿Tiene menú digital?" />}
      </div>

      <FieldBlock label="Notas" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} placeholder="Quién atiende, horario, ideas…" />
      </FieldBlock>

      {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}
      {state.status === "duplicate" && (
        <div className="border-light-yellow/50 bg-light-yellow/10 flex flex-col gap-3 rounded-xl border p-4">
          <p className="flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>
              Parece que ya existe: <strong>{state.match.name}</strong> ({state.match.reason}).
            </span>
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/negocio/${state.match.id}`}>Ver ficha existente</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (forceRef.current) forceRef.current.value = "1";
                formRef.current?.requestSubmit();
              }}
            >
              Es otro negocio, guardar
            </Button>
          </div>
        </div>
      )}

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="animate-spin" />} Guardar negocio
      </Button>
    </form>
  );
}

function FieldBlock({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function TriState({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState("");
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="bg-muted inline-flex rounded-lg p-1">
        {[
          ["si", "Sí"],
          ["no", "No"],
          ["", "No sé"],
        ].map(([v, l]) => (
          <button
            key={l}
            type="button"
            aria-pressed={value === v}
            onClick={() => setValue(v!)}
            className={cn(
              "h-8 flex-1 rounded-md px-4 text-sm",
              value === v ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
