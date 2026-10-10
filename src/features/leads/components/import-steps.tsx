import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useLeadOptions } from "@/features/customization/hooks";
import { UserPickerSheet } from "@/features/users/components/user-picker-sheet";
import type { AssignableUser } from "@/features/users/hooks";
import { linkParams } from "@/lib/link-params";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import {
  customMappingKey,
  downloadImportTemplate,
  downloadSkippedRows,
  IMPORT_FIELDS,
  MAX_IMPORT_ROWS,
  readSpreadsheet,
  type ColumnMapping,
  type DraftRow,
  type ImportLeadRow,
  type ImportResult,
  type ParsedSheet,
} from "../import";

// ---- 1. Upload ----

export function UploadStep({ onLoaded }: { onLoaded: (sheet: ParsedSheet) => void }) {
  const { customFields } = useLeadOptions();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    if (!/\.(xlsx|xls|csv)$/i.test(asset.name)) {
      setError("Choose an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    setError(null);
    setReading(true);
    try {
      onLoaded(await readSpreadsheet({ uri: asset.uri, name: asset.name }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read this file.");
    } finally {
      setReading(false);
    }
  }

  return (
    <Card>
      <AppText variant="heading">Choose a spreadsheet</AppText>
      <AppText muted>
        Excel or CSV with one lead per row and column headers in the first row. Up to{" "}
        {MAX_IMPORT_ROWS.toLocaleString()} rows per file. Only phone and a name (contact or business) are required.
      </AppText>
      <Button title={reading ? "Reading file…" : "Choose file"} icon="document-outline" loading={reading} onPress={() => void pick()} />
      {error && <Banner tone="danger" message={error} />}
      <Button
        title="Get the template"
        variant="ghost"
        icon="download-outline"
        onPress={() => downloadImportTemplate(customFields).catch(() => Alert.alert("Couldn't create the template"))}
      />
    </Card>
  );
}

// ---- 2. Match columns ----

const NOT_IN_FILE = "none";

/** Phone and at least one name column must be matched. */
export function isMappingComplete(mapping: ColumnMapping) {
  return mapping.phone !== null && (mapping.name !== null || mapping.businessName !== null);
}

export function MappingStep({
  sheet,
  mapping,
  onMappingChange,
  defaultSource,
  onDefaultSourceChange,
  onBack,
  onContinue,
}: {
  sheet: ParsedSheet;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  defaultSource: string;
  onDefaultSourceChange: (source: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { sources, customFields } = useLeadOptions();
  const fields: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
    ...IMPORT_FIELDS.map((f) => ({
      key: f.key,
      label: f.label,
      required: f.key === "phone" || f.key === "name" || f.key === "businessName",
    })),
    ...customFields.map((f) => ({ key: customMappingKey(f.key), label: f.label, required: false })),
  ];
  const sample = sheet.rows[0]?.cells ?? [];
  const complete = isMappingComplete(mapping);
  const mappedCount = Object.values(mapping).filter((v) => v !== null && v !== undefined).length;
  const columns = [
    { value: NOT_IN_FILE, label: "— Not in file —" },
    ...sheet.headers.map((header, i) => ({ value: String(i), label: header })),
  ];

  return (
    <>
      <Card>
        <AppText variant="heading">Match your columns</AppText>
        <AppText muted>
          {sheet.fileName} · {sheet.rows.length} rows · {sheet.headers.length} columns. {mappedCount} matched
          automatically; check them and fix any that are wrong.
        </AppText>
      </Card>
      <Card>
        {fields.map((field) => {
          const index = mapping[field.key] ?? null;
          return (
            <View key={field.key}>
              <SelectField
                label={`${field.label}${field.required ? " *" : ""}`}
                value={index === null ? NOT_IN_FILE : String(index)}
                options={columns}
                onChange={(v) => onMappingChange({ ...mapping, [field.key]: v === NOT_IN_FILE ? null : Number(v) })}
              />
              {index !== null && sample[index] ? (
                <AppText variant="small" muted numberOfLines={1}>
                  e.g. {sample[index]}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </Card>
      <Card>
        <SelectField
          label="Source for rows without one"
          value={defaultSource}
          options={sources.map((s) => ({ value: s.key, label: s.label }))}
          onChange={onDefaultSourceChange}
        />
        <AppText variant="small" muted>
          Rows with no requirement are saved as &ldquo;Not specified&rdquo;.
        </AppText>
      </Card>
      {!complete && <Banner tone="danger" message="Match the Phone column and at least one of Contact name or Business name." />}
      <View style={styles.buttons}>
        <Button title="Other file" variant="secondary" icon="arrow-back" onPress={onBack} style={styles.flex} />
        <Button title="Review rows" icon="arrow-forward" disabled={!complete} onPress={onContinue} style={styles.flex} />
      </View>
    </>
  );
}

// ---- 3. Review & assign ----

const PAGE_SIZE = 40;
type ReviewView = "all" | "ready" | "problems";
const isReady = (d: DraftRow) => d.errors.length === 0;

export function ReviewStep({
  fileName,
  drafts,
  users,
  onBack,
  onImport,
}: {
  fileName: string;
  drafts: DraftRow[];
  users: AssignableUser[];
  onBack: () => void;
  onImport: (rows: ImportLeadRow[], batchTag?: string) => void;
}) {
  const { sourceLabel } = useLeadOptions();
  const [selected, setSelected] = useState(() => new Set(drafts.filter(isReady).map((d) => d.row)));
  const [assignees, setAssignees] = useState<Record<number, string>>(() =>
    Object.fromEntries(drafts.map((d) => [d.row, d.assigneeId])),
  );
  const [batchTag, setBatchTag] = useState("");
  const [view, setView] = useState<ReviewView>("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [picking, setPicking] = useState(false);

  const userNames = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const readyCount = drafts.filter(isReady).length;
  const errorCount = drafts.length - readyCount;
  const warningCount = drafts.filter((d) => isReady(d) && d.warnings.length > 0).length;
  const visible = drafts.filter((d) =>
    view === "ready" ? isReady(d) : view === "problems" ? d.errors.length > 0 || d.warnings.length > 0 : true,
  );

  /** How many selected rows go to each person, as a final check. */
  const assigneeSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of selected) {
      const id = assignees[row] ?? "";
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ name: id ? (userNames.get(id) ?? "Unknown") : "Unassigned", count }))
      .sort((a, b) => b.count - a.count);
  }, [selected, assignees, userNames]);

  function toggle(row: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }

  function assignSelected(userId: string | null) {
    setAssignees((prev) => {
      const next = { ...prev };
      selected.forEach((row) => (next[row] = userId ?? ""));
      return next;
    });
    setPicking(false);
  }

  function submit() {
    const tag = batchTag.trim().toLowerCase().slice(0, 30);
    onImport(
      drafts
        .filter((d) => selected.has(d.row))
        .map((d) => ({
          ...d.lead,
          tags: tag ? [...new Set([...d.lead.tags, tag])] : d.lead.tags,
          assignedTo: assignees[d.row] || null,
        })),
      tag || undefined,
    );
  }

  return (
    <>
      <Card>
        <AppText variant="heading" numberOfLines={1}>
          {fileName}
        </AppText>
        <View style={styles.badges}>
          <Badge label={`${drafts.length} rows`} />
          <Badge label={`${readyCount} ready`} color="emerald" />
          {warningCount > 0 && <Badge label={`${warningCount} with warnings`} color="amber" />}
          {errorCount > 0 && <Badge label={`${errorCount} can't be imported`} color="rose" />}
        </View>
      </Card>

      <Card>
        <AppText weight="600">
          {selected.size} of {readyCount} ready rows selected
        </AppText>
        <View style={styles.buttons}>
          <Button
            title="Select all ready"
            variant="secondary"
            onPress={() => setSelected(new Set(drafts.filter(isReady).map((d) => d.row)))}
            style={styles.flex}
          />
          <Button title="Clear" variant="ghost" onPress={() => setSelected(new Set())} />
        </View>
        <Button
          title={`Assign ${selected.size} selected to…`}
          variant="secondary"
          icon="person-add-outline"
          disabled={selected.size === 0}
          onPress={() => setPicking(true)}
        />
      </Card>

      <SegmentedControl
        value={view}
        onChange={(v) => {
          setView(v);
          setShown(PAGE_SIZE);
        }}
        segments={[
          { value: "all", label: "All", count: drafts.length },
          { value: "ready", label: "Ready", count: readyCount },
          { value: "problems", label: "Problems", count: errorCount + warningCount, urgent: errorCount > 0 },
        ]}
      />

      {visible.length === 0 ? (
        <AppText muted style={styles.center}>
          No rows in this view.
        </AppText>
      ) : (
        <View style={styles.rows}>
          {visible.slice(0, shown).map((d) => (
            <DraftRowItem
              key={d.row}
              draft={d}
              selected={selected.has(d.row)}
              onToggle={() => toggle(d.row)}
              assigneeName={assignees[d.row] ? (userNames.get(assignees[d.row]!) ?? "Unknown") : "Unassigned"}
              sourceLabel={sourceLabel(d.lead.source)}
            />
          ))}
          {visible.length > shown && (
            <Button title={`Show ${Math.min(PAGE_SIZE, visible.length - shown)} more`} variant="ghost" onPress={() => setShown(shown + PAGE_SIZE)} />
          )}
        </View>
      )}

      <Card>
        <AppText variant="label">Who gets them</AppText>
        {assigneeSummary.length === 0 ? (
          <AppText muted>Select at least one row to import.</AppText>
        ) : (
          <View style={styles.badges}>
            {assigneeSummary.map((a) => (
              <Badge key={a.name} label={`${a.name}: ${a.count}`} />
            ))}
          </View>
        )}
        <TextField
          label="Tag this batch (optional)"
          value={batchTag}
          onChangeText={setBatchTag}
          placeholder="e.g. expo-sept"
          maxLength={30}
          autoCapitalize="none"
        />
      </Card>
      <View style={styles.buttons}>
        <Button title="Columns" variant="secondary" icon="arrow-back" onPress={onBack} style={styles.flex} />
        <Button
          title={`Import ${selected.size}`}
          icon="cloud-upload-outline"
          disabled={selected.size === 0}
          onPress={submit}
          style={styles.flex}
        />
      </View>

      <UserPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        title={`Assign ${selected.size} row${selected.size === 1 ? "" : "s"} to`}
        value={null}
        onSelect={assignSelected}
      />
    </>
  );
}

function DraftRowItem({
  draft,
  selected,
  onToggle,
  assigneeName,
  sourceLabel,
}: {
  draft: DraftRow;
  selected: boolean;
  onToggle: () => void;
  assigneeName: string;
  sourceLabel: string;
}) {
  const { colors } = useTheme();
  const ready = isReady(draft);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !ready }}
      disabled={!ready}
      onPress={onToggle}
      style={[
        styles.draft,
        {
          backgroundColor: ready ? colors.card : colors.dangerSoft,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons
        name={!ready ? "close-circle-outline" : selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={!ready ? colors.danger : selected ? colors.primary : colors.mutedText}
      />
      <View style={styles.flex}>
        <AppText weight="600" numberOfLines={1}>
          {draft.lead.name || "—"}
          {draft.lead.businessName !== draft.lead.name ? (
            <AppText muted>{` · ${draft.lead.businessName}`}</AppText>
          ) : null}
        </AppText>
        <AppText variant="small" muted numberOfLines={1}>
          Row {draft.row} · {draft.lead.phone || "no phone"} · {sourceLabel}
          {draft.lead.city ? ` · ${draft.lead.city}` : ""}
        </AppText>
        <AppText variant="small" muted>
          {assigneeName}
        </AppText>
        {draft.errors.map((e) => (
          <AppText key={e} variant="small" color={colors.danger}>
            {e}
          </AppText>
        ))}
        {draft.warnings.map((w) => (
          <AppText key={w} variant="small" color={colors.warning}>
            {w}
          </AppText>
        ))}
      </View>
    </Pressable>
  );
}

// ---- 4. Done ----

const STATUS_LABELS = { duplicate: "Duplicate", invalid: "Invalid", failed: "Not sent" } as const;

export function ResultStep({
  result,
  drafts,
  tag,
  onRestart,
}: {
  result: ImportResult;
  drafts: DraftRow[];
  /** Batch tag, to open the imported leads */
  tag?: string;
  onRestart: () => void;
}) {
  const { colors } = useTheme();
  const { sourceLabel, customFields } = useLeadOptions();
  const byRow = new Map(drafts.map((d) => [d.row, d]));
  const skipped = result.results.filter((r) => r.status !== "created");

  const stats = [
    { label: "Imported", value: result.created, color: colors.success },
    { label: "Duplicates skipped", value: result.duplicates, color: colors.warning },
    { label: "Invalid", value: result.invalid, color: colors.danger },
    ...(result.failed > 0 ? [{ label: "Not sent (error)", value: result.failed, color: colors.danger }] : []),
  ];

  return (
    <>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="title" color={s.color}>
              {s.value}
            </AppText>
            <AppText variant="small" muted>
              {s.label}
            </AppText>
          </View>
        ))}
      </View>
      <Button
        title={tag ? `View leads tagged "${tag}"` : "View leads"}
        icon="people-outline"
        onPress={() => {
          router.back();
          router.navigate({ pathname: "/leads", params: linkParams(tag ? { tag } : {}) });
        }}
      />
      {skipped.length > 0 && (
        <Button
          title="Share skipped rows as Excel"
          variant="secondary"
          icon="download-outline"
          onPress={() =>
            downloadSkippedRows(
              skipped.map((r) => ({
                row: r.row,
                reason: r.message ?? STATUS_LABELS[r.status as keyof typeof STATUS_LABELS],
                lead: byRow.get(r.row)?.lead,
              })),
              sourceLabel,
              customFields,
            ).catch(() => Alert.alert("Couldn't create the file"))
          }
        />
      )}
      <Button title="Import another file" variant="ghost" icon="refresh" onPress={onRestart} />

      {skipped.length > 0 && (
        <Card>
          <AppText variant="heading">Not imported ({skipped.length})</AppText>
          {skipped.slice(0, 100).map((r) => {
            const lead = byRow.get(r.row)?.lead;
            return (
              <View key={r.row} style={styles.skipped}>
                <AppText variant="small" weight="600">
                  Row {r.row} · {lead?.name ?? "—"} · {lead?.phone ?? "—"}
                </AppText>
                <AppText variant="small" muted>
                  {STATUS_LABELS[r.status as keyof typeof STATUS_LABELS]}
                  {r.message ? ` · ${r.message}` : ""}
                </AppText>
              </View>
            );
          })}
          {skipped.length > 100 && (
            <AppText variant="small" muted>
              …and {skipped.length - 100} more in the Excel file.
            </AppText>
          )}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  buttons: { flexDirection: "row", gap: spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  rows: { gap: spacing.sm },
  draft: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: { flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  skipped: { gap: 2, paddingVertical: spacing.xs },
});
