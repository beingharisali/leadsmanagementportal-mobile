import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { PipelineEditor } from "@/features/settings/components/pipeline-editor";

/** Owners and admins: the stages every lead moves through. */
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
    </Screen>
  );
}
