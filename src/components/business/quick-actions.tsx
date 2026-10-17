import { Map as MapIcon, Phone } from "lucide-react";

import { InstagramIcon, WhatsAppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Service } from "@/db/schema";
import { googleMapsUrl, instagramUrl } from "@/lib/links/social";
import { normalizeVePhone, whatsappMessage, whatsappUrl } from "@/lib/links/whatsapp";
import { cn } from "@/lib/utils";

export type QuickActionsBusiness = {
  name: string;
  whatsapp: string | null;
  phone: string | null;
  instagram: string | null;
  lat: number | null;
  lng: number | null;
  googlePlaceId?: string | null;
  municipalityName: string | null;
  topService: Service | null;
};

const SENDER = process.env.NEXT_PUBLIC_SENDER_NAME || "tu productor de confianza";

export function whatsappLinkFor(b: QuickActionsBusiness) {
  const message = whatsappMessage({
    businessName: b.name,
    service: b.topService,
    senderName: SENDER,
    municipality: b.municipalityName,
  });
  return whatsappUrl(b.whatsapp ?? b.phone, message);
}

/** The four big buttons: WhatsApp (pre-filled per suggested service), Instagram, Maps, Call. */
export function QuickActions({
  business: b,
  size = "lg",
  className,
}: {
  business: QuickActionsBusiness;
  size?: "lg" | "sm";
  className?: string;
}) {
  const wa = whatsappLinkFor(b);
  const tel = normalizeVePhone(b.phone ?? b.whatsapp);
  const actions = [
    { key: "wa", label: "WhatsApp", href: wa, icon: WhatsAppIcon, variant: "whatsapp" as const },
    {
      key: "ig",
      label: "Instagram",
      href: b.instagram ? instagramUrl(b.instagram) : null,
      icon: InstagramIcon,
      variant: "outline" as const,
    },
    {
      key: "map",
      label: "Maps",
      href: b.lat !== null && b.lng !== null ? googleMapsUrl(b.lat, b.lng, b.googlePlaceId) : null,
      icon: MapIcon,
      variant: "outline" as const,
    },
    {
      key: "tel",
      label: "Llamar",
      href: tel ? `tel:+${tel}` : null,
      icon: Phone,
      variant: "outline" as const,
    },
  ];
  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {actions.map((a) =>
        a.href ? (
          <Button
            key={a.key}
            asChild
            variant={a.variant}
            size={size}
            className={cn("h-auto flex-col gap-1 py-2.5 text-xs", size === "sm" && "py-1.5")}
          >
            <a
              href={a.href}
              target={a.key === "tel" ? undefined : "_blank"}
              rel="noopener noreferrer"
            >
              <a.icon className="size-5" />
              {a.label}
            </a>
          </Button>
        ) : (
          <Button
            key={a.key}
            variant="outline"
            size={size}
            disabled
            className={cn("h-auto flex-col gap-1 py-2.5 text-xs", size === "sm" && "py-1.5")}
            title="Sin dato"
          >
            <a.icon className="size-5" />
            {a.label}
          </Button>
        ),
      )}
    </div>
  );
}
