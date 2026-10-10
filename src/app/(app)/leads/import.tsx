import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Screen } from "@/components/ui/screen";
import { useLeadOptions } from "@/features/customization/hooks";
import { MappingStep, ResultStep, ReviewStep, UploadStep } from "@/features/leads/components/import-steps";
import { useImportLeads } from "@/features/leads/hooks";
import {
  autoMapColumns,
  buildDraftRows,
  type ColumnMapping,
  type DraftRow,
  type ImportLeadRow,
  type ImportResult,
  type ParsedSheet,
} from "@/features/leads/import";
import { useAssignableUsers } from "@/features/users/hooks";
import { getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type Step = "upload" | "map" | "review" | "importing" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "File" },
  { key: "map", label: "Columns" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

/** Managers: spreadsheet → leads, in four steps, like the website's import page. */
export default function ImportLeadsScreen() {
  const users = useAssignableUsers().data ?? [];
  const importLeads = useImportLeads();
  const { sources, customFields } = useLeadOptions();

  const [step, setStep] = useState<Step>("upload");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [chosenSource, setChosenSource] = useState("");
  // "Other" when the company has it, otherwise its first source.
  const defaultSource =
    sources.find((s) => s.key === chosenSource)?.key ??
    sources.find((s) => s.key === "other")?.key ??
    sources[0]?.key ??
    "";
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [tag, setTag] = useState<string>();

  function restart() {
    setStep("upload");
    setSheet(null);
    setMapping(null);
    setDrafts([]);
    setResult(null);
    setProgress(0);
    setTag(undefined);
  }

  function runImport(rows: ImportLeadRow[], batchTag?: string) {
    setTag(batchTag);
    setProgress(0);
    setStep("importing");
    importLeads.mutate(
      { rows, onProgress: setProgress },
      {
        onSuccess: (res) => {
          setResult(res);
          setStep("done");
        },
        onError: (error) => {
          Alert.alert("Couldn't import", getErrorMessage(error));
          setStep("review");
        },
      },
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.key === (step === "importing" ? "done" : step));

  return (
    <Screen>
      <StepDots activeIndex={activeIndex} />

      {step === "upload" && (
        <UploadStep
          onLoaded={(parsed) => {
            setSheet(parsed);
            setMapping(autoMapColumns(parsed.headers, customFields));
            setStep("map");
          }}
        />
      )}

      {step === "map" && sheet && mapping && (
        <MappingStep
          sheet={sheet}
          mapping={mapping}
          onMappingChange={setMapping}
          defaultSource={defaultSource}
          onDefaultSourceChange={setChosenSource}
          onBack={restart}
          onContinue={() => {
            setDrafts(buildDraftRows(sheet, mapping, { defaultSource, sources, users, customFields }));
            setStep("review");
          }}
        />
      )}

      {step === "review" && sheet && (
        <ReviewStep fileName={sheet.fileName} drafts={drafts} users={users} onBack={() => setStep("map")} onImport={runImport} />
      )}

      {step === "importing" && (
        <Card>
          <AppText variant="heading">Importing leads…</AppText>
          <ProgressBar percent={progress * 100} label="Import progress" height={8} />
          <AppText muted>{Math.round(progress * 100)}% · keep the app open until it finishes.</AppText>
        </Card>
      )}

      {step === "done" && result && <ResultStep result={result} drafts={drafts} tag={tag} onRestart={restart} />}
    </Screen>
  );
}

function StepDots({ activeIndex }: { activeIndex: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.steps}>
      {STEPS.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <View key={s.key} style={styles.step}>
            <View
              style={[
                styles.dot,
                {
                  borderColor: done || active ? colors.primary : colors.border,
                  backgroundColor: done ? colors.primary : "transparent",
                },
              ]}
            >
              <AppText variant="small" weight="600" color={done ? colors.primaryText : active ? colors.primary : colors.mutedText}>
                {i + 1}
              </AppText>
            </View>
            <AppText variant="small" weight={active ? "600" : "400"} muted={!active}>
              {s.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", justifyContent: "space-between" },
  step: { alignItems: "center", gap: spacing.xs, flex: 1 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
