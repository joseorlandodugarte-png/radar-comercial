import { Compass, Ellipsis, House, Map, SquareKanban, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/explorar", label: "Explorar", icon: Compass },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/pipeline", label: "Pipeline", icon: SquareKanban },
  { href: "/mas", label: "Más", icon: Ellipsis },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
