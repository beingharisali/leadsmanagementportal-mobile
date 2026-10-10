import type { ColorName } from "@/features/customization/types";

/**
 * The colours companies pick for stages and tags (the website's Tailwind
 * names): a strong shade for light mode and a lighter one for dark mode.
 */
const ACCENTS: Record<ColorName, { light: string; dark: string }> = {
  slate: { light: "#475569", dark: "#94A3B8" },
  sky: { light: "#0284C7", dark: "#38BDF8" },
  blue: { light: "#2563EB", dark: "#60A5FA" },
  indigo: { light: "#4F46E5", dark: "#818CF8" },
  violet: { light: "#7C3AED", dark: "#A78BFA" },
  fuchsia: { light: "#C026D3", dark: "#E879F9" },
  pink: { light: "#DB2777", dark: "#F472B6" },
  rose: { light: "#E11D48", dark: "#FB7185" },
  orange: { light: "#EA580C", dark: "#FB923C" },
  amber: { light: "#D97706", dark: "#FBBF24" },
  yellow: { light: "#A16207", dark: "#FACC15" },
  lime: { light: "#4D7C0F", dark: "#A3E635" },
  emerald: { light: "#059669", dark: "#34D399" },
  teal: { light: "#0D9488", dark: "#2DD4BF" },
  cyan: { light: "#0891B2", dark: "#22D3EE" },
};

export function accentColor(name: ColorName, scheme: "light" | "dark") {
  return (ACCENTS[name] ?? ACCENTS.slate)[scheme];
}

/** `#RRGGBB` → the same colour at `alpha` (0–1), for soft badge backgrounds. */
export function withAlpha(hex: string, alpha: number) {
  const value = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}
