import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { useLeadOptions } from "@/features/customization/hooks";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { leadRatingLabels, leadSortLabels } from "../config";
import { useLeadTags } from "../hooks";
import { LEAD_RATINGS, LEAD_SORTS, type LeadRating, type LeadSort } from "../types";

export interface LeadFilters {
  status: string[];
  source: string[];
  /** One tag, or "" */
  tag: string;
  rating: LeadRating[];
  stale: boolean;
  sort: LeadSort;
}

export const NO_FILTERS: LeadFilters = { status: [], source: [], tag: "", rating: [], stale: false, sort: "-createdAt" };

/** How many filters are on (the sort order doesn't count). */
export function countFilters(filters: LeadFilters) {
  return (
    filters.status.length + filters.source.length + filters.rating.length + (filters.tag ? 1 : 0) + (filters.stale ? 1 : 0)
  );
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface LeadFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  /** Shown on the close button */
  total?: number;
}

/** Stage, rating, "needs attention" and sort order for the leads list. Applies as you tap. */
export function LeadFiltersSheet({ open, onClose, filters, onChange, total }: LeadFiltersSheetProps) {
  const { colors } = useTheme();
  const { stages, sources, tags: companyTags } = useLeadOptions();
  const usedTags = useLeadTags().data ?? [];
  const tags = [...new Set([...companyTags.map((t) => t.name), ...usedTags])];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter leads"
      footer={
        <>
          <Button title={total === undefined ? "Show leads" : `Show ${total} lead${total === 1 ? "" : "s"}`} onPress={onClose} />
          {countFilters(filters) > 0 && (
            <Button
              title="Clear filters"
              variant="ghost"
              onPress={() => onChange({ ...NO_FILTERS, sort: filters.sort })}
            />
          )}
        </>
      }
    >
      <Section title="Stage">
        {stages.map((stage) => (
          <Chip
            key={stage.key}
            label={stage.label}
            selected={filters.status.includes(stage.key)}
            onPress={() => onChange({ ...filters, status: toggle(filters.status, stage.key) })}
          />
        ))}
      </Section>

      <Section title="Source">
        {sources.map((source) => (
          <Chip
            key={source.key}
            label={source.label}
            selected={filters.source.includes(source.key)}
            onPress={() => onChange({ ...filters, source: toggle(filters.source, source.key) })}
          />
        ))}
      </Section>

      {tags.length > 0 && (
        <Section title="Tag">
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected={filters.tag === tag}
              onPress={() => onChange({ ...filters, tag: filters.tag === tag ? "" : tag })}
            />
          ))}
        </Section>
      )}

      <Section title="Rating">
        {LEAD_RATINGS.map((rating) => (
          <Chip
            key={rating}
            label={leadRatingLabels[rating]}
            selected={filters.rating.includes(rating)}
            onPress={() => onChange({ ...filters, rating: toggle(filters.rating, rating) })}
          />
        ))}
      </Section>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <AppText variant="label">Needs attention</AppText>
          <AppText variant="small" muted>
            Open leads nobody has contacted for a while
          </AppText>
        </View>
        <Switch
          value={filters.stale}
          onValueChange={(stale) => onChange({ ...filters, stale })}
          trackColor={{ true: colors.primary }}
          accessibilityLabel="Needs attention"
        />
      </View>

      <Section title="Sort by">
        {LEAD_SORTS.map((sort) => (
          <Chip
            key={sort}
            label={leadSortLabels[sort]}
            selected={filters.sort === sort}
            onPress={() => onChange({ ...filters, sort })}
          />
        ))}
      </Section>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label">{title}</AppText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
