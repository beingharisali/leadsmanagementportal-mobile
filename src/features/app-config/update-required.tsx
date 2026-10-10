import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/config";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { MobileConfig } from "./api";

/** Shown instead of the app when this version is too old to work with the API. */
export function UpdateRequired({ config }: { config: MobileConfig }) {
  const { colors } = useTheme();
  const storeUrl = Platform.OS === "ios" ? config.storeUrls.ios : config.storeUrls.android;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.body}>
        <Ionicons name="cloud-download-outline" size={56} color={colors.primary} />
        <AppText variant="title" style={styles.center}>
          Please update GetCloseWise
        </AppText>
        <AppText muted style={styles.center}>
          This version ({APP_VERSION}) no longer works. Install version {config.latestVersion} to keep using the app.
        </AppText>
        {storeUrl && (
          <Button
            title={Platform.OS === "ios" ? "Open the App Store" : "Open Google Play"}
            icon="open-outline"
            onPress={() => void Linking.openURL(storeUrl)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xl },
  center: { textAlign: "center" },
});
