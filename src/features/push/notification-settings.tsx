import { useEffect, useState } from "react";
import { AppState, Linking } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { permissionState, pushSupport, registerForPush, type PermissionState } from "./push";

const UNSUPPORTED: Record<string, string> = {
  "expo-go": "Push notifications don't work in Expo Go. Install the GetCloseWise app build to get them. Alerts still show in the Alerts tab.",
  simulator: "Push notifications need a real phone.",
  "no-project": "This build isn't set up for push notifications yet.",
};

/** Whether this phone gets push notifications, with a way to turn them on. */
export function NotificationSettingsCard() {
  const support = pushSupport();
  const [state, setState] = useState<PermissionState | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!support.supported) return;
    const refresh = () => void permissionState().then(setState);
    refresh();
    // Coming back from the phone's settings: show the new answer.
    const sub = AppState.addEventListener("change", (status) => status === "active" && refresh());
    return () => sub.remove();
  }, [support.supported]);

  async function turnOn() {
    setWorking(true);
    try {
      await registerForPush({ ask: true });
    } finally {
      setState(await permissionState());
      setWorking(false);
    }
  }

  return (
    <Card>
      <AppText variant="heading">Notifications</AppText>
      {!support.supported ? (
        <AppText muted>{UNSUPPORTED[support.reason]}</AppText>
      ) : state === "granted" ? (
        <AppText muted>
          On. You get a notification for new leads, mentions, due follow-ups and handover requests, like the Alerts tab.
        </AppText>
      ) : state === "denied" ? (
        <>
          <AppText muted>Off. Turn them on for GetCloseWise in your phone&apos;s settings.</AppText>
          <Button title="Open phone settings" variant="secondary" icon="settings-outline" onPress={() => void Linking.openSettings()} />
        </>
      ) : state === "undetermined" ? (
        <>
          <AppText muted>Get a notification when a lead is given to you, someone mentions you, or a follow-up is due.</AppText>
          <Button title="Turn on notifications" icon="notifications-outline" loading={working} onPress={() => void turnOn()} />
        </>
      ) : (
        <AppText muted>Checking…</AppText>
      )}
    </Card>
  );
}
