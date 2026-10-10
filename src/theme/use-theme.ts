import { useColorScheme } from "react-native";

import { palettes } from "./colors";

/** Colours for the phone's light or dark mode. */
export function useTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, colors: palettes[scheme] } as const;
}
