import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { PipelineEditor } from "@/features/settings/components/pipeline-editor";
import { StageResetForm } from "@/features/settings/components/stage-reset-form";

/** Owners and admins: the stages every lead moves through, and the daily reset. */
export default function PipelineSettingsScreen() {
  return (
    <Screen>
      <AppText muted>
        The steps every lead moves through, in the pipeline, in reports and on each lead. Rename, recolor and reorder them
        to match how your team sells.
      </AppText>
      <Card>
        <PipelineEditor />
      </Card>
      <Card>
        <AppText variant="heading">Daily reset</AppText>
        <AppText variant="small" muted>
          Move leads on automatically the next day: for example Not picked back to New so agents call again, or Not
          Interested to Lost.
        </AppText>
        <StageResetForm />
      </Card>
    </Screen>
  );
}
