import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { formatDuration, formatTime, stateColors, stateLabels } from "../format";
import type { PresenceState, TimelineSegment } from "../types";

const HOUR = 3_600_000;
/** Neighbouring segments this close together are drawn as one block. */
const MERGE_GAP_MS = 90_000;

interface Block {
  state: PresenceState;
  start: number;
  end: number;
  leads: string[];
}

/** Collapses consecutive same-state segments (e.g. active on two leads) into one block, like the website. */
function toBlocks(segments: TimelineSegment[]) {
  const blocks: Block[] = [];
  for (const s of segments) {
    const start = new Date(s.startedAt).getTime();
    const end = new Date(s.endedAt).getTime();
    const last = blocks[blocks.length - 1];
    if (last && last.state === s.state && start - last.end <= MERGE_GAP_MS) {
      last.end = Math.max(last.end, end);
      if (s.lead && !last.leads.includes(s.lead.label)) last.leads.push(s.lead.label);
    } else {
      blocks.push({ state: s.state, start, end, leads: s.lead ? [s.lead.label] : [] });
    }
  }
  return blocks;
}

/**
 * The day on one track: active / idle / background time, with gaps where
 * they were offline. Tap a block (or a row of the list under it) for details.
 */
export function DayTimeline({ segments, timeZone }: { segments: TimelineSegment[]; timeZone: string }) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);

  if (segments.length === 0) {
    return <AppText muted>No tracked activity on this day.</AppText>;
  }

  const blocks = toBlocks(segments);
  const first = blocks[0]!.start;
  const last = Math.max(...blocks.map((b) => b.end));
  const hourStart = (t: number) => t - (((t % HOUR) + HOUR) % HOUR);
  const windowStart = hourStart(first);
  const windowEnd = Math.max(hourStart(last) + HOUR, windowStart + 2 * HOUR);
  const span = windowEnd - windowStart;
  const hours = span / HOUR;
  const tickEvery = hours > 12 ? 4 : hours > 6 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = windowStart; t <= windowEnd; t += tickEvery * HOUR) ticks.push(t);
  const pct = (t: number) => ((t - windowStart) / span) * 100;
  const time = (t: number) => formatTime(new Date(t), timeZone);
  const chosen = selected !== null ? blocks[selected] : undefined;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        {blocks.map((block, index) => (
          <Pressable
            key={`${block.state}-${block.start}`}
            accessibilityRole="button"
            accessibilityLabel={`${stateLabels[block.state]} ${time(block.start)} to ${time(block.end)}`}
            onPress={() => setSelected(selected === index ? null : index)}
            style={[
              styles.block,
              {
                left: `${pct(block.start)}%`,
                width: `${Math.max(0.8, pct(block.end) - pct(block.start))}%`,
                backgroundColor: stateColors[block.state],
                borderColor: selected === index ? colors.text : colors.card,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.ticks}>
        {ticks.map((t, i) => (
          <AppText
            key={t}
            variant="small"
            muted
            style={[
              styles.tick,
              { left: `${pct(t)}%` },
              i === 0 ? styles.tickFirst : i === ticks.length - 1 ? styles.tickLast : styles.tickMiddle,
            ]}
          >
            {time(t)}
          </AppText>
        ))}
      </View>

      <View style={styles.legend}>
        {(Object.keys(stateLabels) as PresenceState[]).map((state) => (
          <View key={state} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: stateColors[state] }]} />
            <AppText variant="small" muted>
              {stateLabels[state]}
            </AppText>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.border }]} />
          <AppText variant="small" muted>
            Offline
          </AppText>
        </View>
      </View>

      {chosen && (
        <View style={[styles.detail, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <AppText weight="600">
            {stateLabels[chosen.state]} · {formatDuration(chosen.end - chosen.start)}
          </AppText>
          <AppText variant="small" muted>
            {time(chosen.start)} – {time(chosen.end)}
          </AppText>
          {chosen.leads.length > 0 && (
            <AppText variant="small">
              On: {chosen.leads.slice(0, 3).join(", ")}
              {chosen.leads.length > 3 ? ` +${chosen.leads.length - 3} more` : ""}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  track: { height: 36, borderRadius: radius.sm, overflow: "hidden" },
  block: { position: "absolute", top: 4, bottom: 4, borderRadius: 3, borderLeftWidth: 1, borderRightWidth: 1, minWidth: 3 },
  ticks: { height: 18 },
  tick: { position: "absolute", fontSize: 11 },
  tickFirst: {},
  tickMiddle: { transform: [{ translateX: -16 }] },
  tickLast: { transform: [{ translateX: -34 }] },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  detail: { gap: 2, padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
});
