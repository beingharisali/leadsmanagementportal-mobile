import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Modal, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useAuth, useCurrentUser } from "@/features/auth/auth-provider";
import { useLeadOptions } from "@/features/customization/hooks";
import { apiClient } from "@/lib/api-client";
import { radius, spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { getLastInputAt, markInput, onInputResumed } from "./activity";

/** Keep in sync with server/src/modules/tracking/tracking.constants.ts */
const HEARTBEAT_INTERVAL_MS = 60_000;
/** Warn this long before the inactivity sign-out (same as the website). */
const LOGOUT_WARNING_MS = 2 * 60_000;
const TICK_MS = 5_000;
const LEAD_PATH = /^\/leads\/([a-f\d]{24})$/i;

type PresenceState = "active" | "idle" | "away";

/** One id per app launch: the API keeps each open app / browser tab apart. */
const APP_RUN_ID = `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Time with the app open counts as work time, like a browser tab on the
 * website: a heartbeat every minute (and at once when the state or the open
 * lead changes), "idle" after the company's idle time without a touch, "away"
 * while the app is in the background. After the company's auto sign-out time
 * without a touch the user is signed out, with a warning two minutes before.
 * Not during a Heapware support session.
 */
export function PresenceTracker() {
  const user = useCurrentUser();
  if (user.support) return null;
  return <Tracker />;
}

function Tracker() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const { tracking } = useLeadOptions();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Read by the long-lived timer, so changes apply without restarting it.
  const idleAfterMs = useRef(tracking.idleAfterMinutes * 60_000);
  const autoLogoutMs = useRef(tracking.autoLogoutMinutes * 60_000);
  const leadId = useRef<string | null>(null);
  const lastSent = useRef<{ state: PresenceState; leadId: string | null; at: number } | null>(null);
  const signingOut = useRef(false);
  const tickRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    idleAfterMs.current = tracking.idleAfterMinutes * 60_000;
    autoLogoutMs.current = tracking.autoLogoutMinutes * 60_000;
  }, [tracking.idleAfterMinutes, tracking.autoLogoutMinutes]);

  // The lead on screen is the one being worked on; reported as soon as it changes.
  useEffect(() => {
    leadId.current = LEAD_PATH.exec(pathname)?.[1] ?? null;
    tickRef.current();
  }, [pathname]);

  useEffect(() => {
    const currentState = (): PresenceState => {
      if (AppState.currentState !== "active") return "away";
      return Date.now() - getLastInputAt() >= idleAfterMs.current ? "idle" : "active";
    };

    const send = (state = currentState()) => {
      lastSent.current = { state, leadId: leadId.current, at: Date.now() };
      // A 401 (session ended elsewhere) signs out through the API client's handler.
      apiClient
        .post("/tracking/heartbeat", {
          tabId: APP_RUN_ID,
          state,
          leadId: state === "away" ? null : leadId.current,
          lastInputAt: new Date(getLastInputAt()).toISOString(),
        })
        .catch(() => undefined);
    };

    const signOutIdle = () => {
      signingOut.current = true;
      setSecondsLeft(null);
      void signOut("idle_timeout");
    };

    const tick = () => {
      if (signingOut.current || AppState.currentState !== "active") return;
      const idleFor = Date.now() - getLastInputAt();
      if (idleFor >= autoLogoutMs.current) return signOutIdle();

      setSecondsLeft(
        idleFor >= autoLogoutMs.current - LOGOUT_WARNING_MS
          ? Math.ceil((autoLogoutMs.current - idleFor) / 1000)
          : null,
      );

      const state = currentState();
      const last = lastSent.current;
      if (!last || last.state !== state || last.leadId !== leadId.current || Date.now() - last.at >= HEARTBEAT_INTERVAL_MS) {
        send(state);
      }
    };
    tickRef.current = tick;

    const appState = AppState.addEventListener("change", (status) => {
      if (signingOut.current) return;
      if (status === "active") {
        // Away longer than the sign-out time (phone locked, app in the background): the session is over.
        if (Date.now() - getLastInputAt() >= autoLogoutMs.current) return signOutIdle();
        // Opening the app is using it.
        markInput();
        tick();
      } else if (status === "background") {
        // Timers stop in the background: report "away" now rather than going silent.
        send("away");
      }
    });
    const stopListening = onInputResumed(() => tickRef.current());
    const timer = setInterval(tick, TICK_MS);
    markInput();
    send();

    return () => {
      appState.remove();
      stopListening();
      clearInterval(timer);
    };
    // Set up once; changing values are read through refs.
  }, [signOut]);

  function staySignedIn() {
    markInput();
    setSecondsLeft(null);
    tickRef.current();
  }

  const minutes = Math.floor((secondsLeft ?? 0) / 60);
  const seconds = String((secondsLeft ?? 0) % 60).padStart(2, "0");

  return (
    <Modal visible={secondsLeft !== null} transparent animationType="fade" onRequestClose={staySignedIn} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.card }]} accessibilityRole="alert">
          <AppText variant="heading">Are you still there?</AppText>
          <AppText muted>
            You haven&apos;t used the app for a while. For security you&apos;ll be signed out in{" "}
            <AppText weight="700">
              {minutes}:{seconds}
            </AppText>
            .
          </AppText>
          <Button title="Stay signed in" onPress={staySignedIn} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialog: { width: "100%", maxWidth: 400, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
});
