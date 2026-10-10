import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { markInput } from "@/features/tracking/activity";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

/**
 * A number that goes up each time `open` turns on. Use it as the `key` of a
 * sheet's contents so their fields start fresh every time it opens.
 */
export function useOpenKey(open: boolean) {
  const [state, setState] = useState({ open, key: 0 });
  if (open !== state.open) setState({ open, key: open ? state.key + 1 : state.key });
  return state.key;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned under the scrolling content, e.g. the Save button */
  footer?: ReactNode;
}

/** A panel that slides up from the bottom: pickers and short forms. Tap outside to close. */
export function Sheet({ open, onClose, title, subtitle, children, footer }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* A modal is its own window on Android: report its touches too. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        onTouchStart={markInput}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.panel,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <AppText variant="heading">{title}</AppText>
              {subtitle && (
                <AppText variant="small" muted numberOfLines={2}>
                  {subtitle}
                </AppText>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.mutedText} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: {
    maxHeight: "88%",
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: radius.pill, marginTop: spacing.sm },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
});
