import {
  Activity,
  Apple,
  BedDouble,
  Beer,
  Briefcase,
  Coffee,
  Croissant,
  Dumbbell,
  Gift,
  Hammer,
  HeartPulse,
  Hotel,
  IceCreamCone,
  Music,
  Pill,
  Sandwich,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Smile,
  Sparkles,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Activity,
  Apple,
  BedDouble,
  Beer,
  Briefcase,
  Coffee,
  Croissant,
  Dumbbell,
  Gift,
  Hammer,
  HeartPulse,
  Hotel,
  IceCreamCone,
  Music,
  Pill,
  Sandwich,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Smile,
  Sparkles,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Wrench,
};

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = CATEGORY_ICONS[name] ?? Store;
  return <Icon aria-hidden {...props} />;
}

type SvgProps = React.SVGProps<SVGSVGElement>;

/** Simplified Instagram glyph (lucide v1 dropped brand icons). */
export function InstagramIcon(props: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function WhatsAppIcon(props: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z" />
      <path
        d="M9 8.8c0 3 2.2 5.7 5.3 6.2l1.2-1.3-1.8-1-1 .8a4 4 0 0 1-2.2-2.2l.8-1-1-1.8z"
        fill="currentColor"
        strokeWidth={1}
      />
    </svg>
  );
}

export function FacebookIcon(props: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h2.5l.5-4h-3V7.5a.5.5 0 0 1 .5-.5H15z" />
    </svg>
  );
}

export function TikTokIcon(props: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.4 2.6 2.2 4.4 5 4.6" />
    </svg>
  );
}
