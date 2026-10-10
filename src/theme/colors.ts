/** The website's palette (client/app/globals.css): indigo primary on neutral greys. */
const light = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  mutedText: "#64748B",
  border: "#E2E8F0",
  input: "#FFFFFF",
  primary: "#4F46E5",
  primaryText: "#FFFFFF",
  primarySoft: "#EEF2FF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  warning: "#B45309",
  warningSoft: "#FFFBEB",
  success: "#15803D",
  successSoft: "#F0FDF4",
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  background: "#0B1120",
  card: "#111827",
  text: "#F1F5F9",
  mutedText: "#94A3B8",
  border: "#1F2937",
  input: "#0F172A",
  primary: "#818CF8",
  primaryText: "#0B1120",
  primarySoft: "#1E1B4B",
  danger: "#F87171",
  dangerSoft: "#2A1215",
  warning: "#FBBF24",
  warningSoft: "#2A2110",
  success: "#4ADE80",
  successSoft: "#0F2A1A",
};

export const palettes = { light, dark };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
