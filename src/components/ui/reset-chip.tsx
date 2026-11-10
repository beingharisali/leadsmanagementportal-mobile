import { Chip } from "./chip";

/** "Reset" next to a screen's filters; only shown while a filter is set. Filters are remembered until then. */
export function ResetChip({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null;
  return <Chip label="Reset" icon="close-outline" onPress={onReset} />;
}
