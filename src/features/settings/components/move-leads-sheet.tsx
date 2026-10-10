import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet, useOpenKey } from "@/components/ui/sheet";
import { spacing } from "@/theme/colors";

export interface RemovedWithLeads {
  key: string;
  label: string;
  count: number;
}

interface MoveLeadsSheetProps {
  /** `null` closes it */
  removed: RemovedWithLeads[] | null;
  targets: { key: string; label: string }[];
  /** "stage" or "source" */
  what: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (moveLeads: Record<string, string>) => void;
}

export function MoveLeadsSheet(props: MoveLeadsSheetProps) {
  return <MoveLeadsBody key={useOpenKey(!!props.removed)} {...props} />;
}

/** Leads can't stay in a stage or source that's being removed: asks where each one's leads go. */
function MoveLeadsBody({ removed, targets, what, pending, onCancel, onConfirm }: MoveLeadsSheetProps) {
  const [moves, setMoves] = useState<Record<string, string>>({});
  const complete = !!removed && removed.every((r) => moves[r.key]);

  return (
    <Sheet
      open={!!removed}
      onClose={onCancel}
      title="Move leads first"
      subtitle={`Some ${what}s you removed still have leads. Choose where they go; each move is recorded in the lead's history.`}
      footer={
        <Button title="Move leads and save" loading={pending} disabled={!complete} onPress={() => onConfirm(moves)} />
      }
    >
      {removed?.map((r) => (
        <View key={r.key} style={styles.group}>
          <AppText variant="label">
            {r.count} {r.count === 1 ? "lead" : "leads"} in &ldquo;{r.label}&rdquo; move to
          </AppText>
          <View style={styles.chips}>
            {targets.map((t) => (
              <Chip key={t.key} label={t.label} selected={moves[r.key] === t.key} onPress={() => setMoves((m) => ({ ...m, [r.key]: t.key }))} />
            ))}
          </View>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
