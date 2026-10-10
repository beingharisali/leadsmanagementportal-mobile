import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { useDismissAnnouncement, useMyAnnouncements, type AnnouncementLevel } from "@/features/announcements/hooks";
import { useAuth, useCurrentUser } from "@/features/auth/auth-provider";
import { useDeleteSampleData } from "@/features/onboarding/hooks";
import { isManagerRole } from "@/features/users/types";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { authKeys } from "@/lib/query-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { useResendVerification } from "./hooks";

/**
 * While Heapware staff are signed in as this user (support session): who,
 * that it's read-only, until when, and a way out. Shown on every screen.
 */
export function SupportBanner() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [exiting, setExiting] = useState(false);
  if (!user?.support) return null;

  async function exit() {
    setExiting(true);
    const result = await apiClient
      .post<{ restored: boolean }>("/auth/support/exit")
      .catch(() => ({ restored: false }));
    if (!result.restored) return void signOut();
    // Back as the staff account: nothing from the customer's workspace stays cached.
    queryClient.clear();
    await queryClient.refetchQueries({ queryKey: authKeys.me });
    setExiting(false);
  }

  return (
    <Banner
      tone="info"
      title="Support session"
      message={`You're signed in as ${user.name}${user.organization ? ` at ${user.organization.name}` : ""}. Read-only, ends ${formatDateTime(user.support.expiresAt)}.`}
    >
      <Button title="Exit support session" variant="ghost" loading={exiting} onPress={() => void exit()} style={styles.inline} />
    </Banner>
  );
}

/** Until an owner who signed up confirms their email, with a way to send the link again. */
export function VerifyEmailBanner() {
  const user = useCurrentUser();
  const resend = useResendVerification();
  if (user.emailVerified !== false) return null;
  return (
    <Banner tone="warning" title="Please confirm your email" message={`We sent a link to ${user.email}. Open it to verify your address.`}>
      <Button
        title="Send the link again"
        variant="ghost"
        loading={resend.isPending}
        onPress={() =>
          resend.mutate(undefined, {
            onSuccess: () => Alert.alert("Link sent", `We sent a new link to ${user.email}.`),
            onError: (error) => Alert.alert("Couldn't send it", getErrorMessage(error)),
          })
        }
        style={styles.inline}
      />
    </Banner>
  );
}

/** Owners and admins exploring with the sample leads: a reminder and a way to remove them. */
export function SampleDataBanner() {
  const user = useCurrentUser();
  const remove = useDeleteSampleData();
  if (!isManagerRole(user.role) || !user.organization?.hasSampleData) return null;

  function confirm() {
    Alert.alert(
      "Delete all sample data?",
      'Every lead tagged "sample" is removed for good, with its notes and history. Your own leads aren\'t touched.',
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete sample data",
          style: "destructive",
          onPress: () =>
            remove.mutate(undefined, {
              onSuccess: ({ deleted }) => Alert.alert("Sample data removed", deleted > 0 ? `Deleted ${deleted} sample leads.` : ""),
              onError: (error) => Alert.alert("Couldn't delete it", getErrorMessage(error)),
            }),
        },
      ],
    );
  }

  return (
    <Banner tone="info" message={`You're exploring with sample leads (tagged "sample"). Remove them when you're ready.`}>
      <Button title="Delete sample data" variant="ghost" loading={remove.isPending} onPress={confirm} style={styles.inline} />
    </Banner>
  );
}

const LEVEL_TONES: Record<AnnouncementLevel, "info" | "success" | "warning"> = {
  info: "info",
  success: "success",
  warning: "warning",
};

/** Messages from Heapware, until each person closes them (not during support sessions). */
export function AnnouncementBanners() {
  const { colors } = useTheme();
  const user = useCurrentUser();
  const announcements = useMyAnnouncements(!user.support);
  const dismiss = useDismissAnnouncement();
  const list = announcements.data ?? [];
  if (user.support || list.length === 0) return null;

  return (
    <View style={styles.list}>
      {list.map((announcement) => (
        <View key={announcement.id}>
          <Banner tone={LEVEL_TONES[announcement.level] ?? "info"} title={announcement.title} message={announcement.body} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close "${announcement.title}"`}
            hitSlop={10}
            onPress={() => dismiss.mutate(announcement.id)}
            style={[styles.close, { backgroundColor: colors.card }]}
          >
            <Ionicons name="close" size={16} color={colors.mutedText} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { alignSelf: "flex-start", minHeight: 32, paddingHorizontal: 0 },
  list: { gap: spacing.sm },
  close: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
