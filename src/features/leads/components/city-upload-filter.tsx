import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { formatDateTime } from "@/lib/format";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useLeadCities, useLeadUploads } from "../hooks";
import type { CityUploadParams } from "../types";
import { DatePresetSection, presetRange, type AssignedPreset } from "./assigned-date-filter";

/** City, uploaded file and upload date. `upload` "" means any file; `uploaded` "" any date. */
export interface CityUploadFilter {
  cities: string[];
  upload: string;
  uploaded: AssignedPreset | "";
  uploadedFrom: string;
  uploadedUntil: string;
}

export const NO_CITY_UPLOAD: CityUploadFilter = {
  cities: [],
  upload: "",
  uploaded: "",
  uploadedFrom: "",
  uploadedUntil: "",
};

/** How many of these filters are on. */
export function countCityUpload(value: CityUploadFilter) {
  return value.cities.length + (value.upload ? 1 : 0) + (value.uploaded ? 1 : 0);
}

/** The filters as API params. `today` is the company's today. */
export function cityUploadParams(value: CityUploadFilter, today: string): CityUploadParams {
  const { from, until } = presetRange(value.uploaded, value.uploadedFrom, value.uploadedUntil, today);
  return {
    city: value.cities.length > 0 ? value.cities : undefined,
    upload: value.upload || undefined,
    uploadedFrom: from,
    uploadedUntil: until,
  };
}

/**
 * The city, uploaded-file and upload-date sections of a filter sheet. Each
 * only shows once there's something to pick, or while it's in use.
 */
export function CityUploadSections({
  value,
  onChange,
}: {
  value: CityUploadFilter;
  onChange: (value: CityUploadFilter) => void;
}) {
  const { colors } = useTheme();
  const cities = useLeadCities().data ?? [];
  const uploads = useLeadUploads().data ?? [];
  const isPicked = (name: string) => value.cities.some((c) => c.toLowerCase() === name.toLowerCase());
  const showUploads = uploads.length > 0 || value.upload !== "" || value.uploaded !== "";

  function toggleCity(name: string) {
    onChange({
      ...value,
      cities: isPicked(name)
        ? value.cities.filter((c) => c.toLowerCase() !== name.toLowerCase())
        : [...value.cities, name],
    });
  }

  return (
    <>
      {(cities.length > 0 || value.cities.length > 0) && (
        <View style={styles.section}>
          <AppText variant="label">City</AppText>
          <View style={styles.chips}>
            {cities.map((city) => (
              <Chip
                key={city.name}
                label={`${city.name} (${city.count})`}
                selected={isPicked(city.name)}
                onPress={() => toggleCity(city.name)}
              />
            ))}
          </View>
        </View>
      )}

      {showUploads && (
        <>
          <View style={styles.section}>
            <AppText variant="label">Uploaded file</AppText>
            {uploads.map((upload) => {
              const selected = value.upload === upload.id;
              return (
                <Pressable
                  key={upload.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onChange({ ...value, upload: selected ? "" : upload.id })}
                  style={({ pressed }) => [
                    styles.file,
                    {
                      backgroundColor: selected ? colors.primarySoft : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={selected ? colors.primary : colors.mutedText}
                  />
                  <View style={styles.flex}>
                    <AppText weight={selected ? "600" : "500"} color={selected ? colors.primary : undefined} numberOfLines={1}>
                      {upload.fileName}
                    </AppText>
                    <AppText variant="small" muted>
                      {formatDateTime(upload.uploadedAt)} · {upload.leadCount} lead{upload.leadCount === 1 ? "" : "s"}
                    </AppText>
                  </View>
                  {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
          <DatePresetSection
            title="Upload date"
            preset={value.uploaded}
            from={value.uploadedFrom}
            until={value.uploadedUntil}
            onChange={({ preset, from, until }) =>
              onChange({ ...value, uploaded: preset, uploadedFrom: from, uploadedUntil: until })
            }
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
