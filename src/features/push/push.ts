import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { apiClient } from "@/lib/api-client";
import { APP_VERSION } from "@/lib/config";

/**
 * Push notifications through Expo's service: the API sends one for every
 * alert (server/src/core/push/push-sender.ts) to each phone registered with
 * `POST /devices`. Needs a real build of the app: Expo Go can't receive this
 * app's pushes, so there everything here quietly does nothing.
 */

const TOKEN_KEY = "getclosewise.push-token";

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: "expo-go" | "simulator" | "no-project" };

/** The EAS project id, set by `eas init` (app.json → expo.extra.eas.projectId). */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export function pushSupport(): PushSupport {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return { supported: false, reason: "expo-go" };
  if (!Device.isDevice) return { supported: false, reason: "simulator" };
  if (!projectId()) return { supported: false, reason: "no-project" };
  return { supported: true };
}

/** Loaded only in real builds, so Expo Go never touches the module. */
async function notifications() {
  return import("expo-notifications");
}

let configured = false;

/** How notifications show while the app is open, and Android's channel (the server sends to "default"). */
async function configure() {
  if (configured) return;
  configured = true;
  const Notifications = await notifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Alerts",
      description: "New leads, mentions, due follow-ups and handover requests",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    });
  }
}

export type PermissionState = "granted" | "denied" | "undetermined";

export async function permissionState(): Promise<PermissionState> {
  if (!pushSupport().supported) return "denied";
  const Notifications = await notifications();
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/**
 * Asks for permission if it hasn't been answered yet, then registers this
 * phone with the API. Safe to call on every start: the API keeps one row per
 * token. Returns whether pushes will arrive.
 */
export async function registerForPush({ ask }: { ask: boolean }) {
  if (!pushSupport().supported) return false;
  await configure();
  const Notifications = await notifications();

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && ask) ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return false;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  await apiClient.post("/devices", {
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
    appVersion: APP_VERSION,
  });
  await SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => undefined);
  return true;
}

/** On signing out on purpose: this phone stops getting the user's pushes (the API also forgets it). */
export async function unregisterFromPush() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  if (!token) return;
  await apiClient.post("/devices/unregister", { token }, { timeoutMs: 10_000, asSelf: true }).catch(() => undefined);
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
}

/** What a push carries (server/src/modules/notifications/notification.service.ts). */
export interface PushData {
  type?: string;
  leadId?: string | null;
  /** Only on task and project notifications */
  taskId?: string;
  projectId?: string;
}

/**
 * Calls `onOpen` when a notification is tapped, including the one that
 * launched the app. `onReceive` runs when one arrives while the app is open.
 */
export async function listenForPush({ onOpen, onReceive }: { onOpen: (data: PushData) => void; onReceive: () => void }) {
  if (!pushSupport().supported) return () => undefined;
  await configure();
  const Notifications = await notifications();

  const launched = Notifications.getLastNotificationResponse();
  if (launched && launched.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    onOpen(launched.notification.request.content.data as PushData);
    Notifications.clearLastNotificationResponse();
  }

  const opened = Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    onOpen(response.notification.request.content.data as PushData);
    Notifications.clearLastNotificationResponse();
  });
  const received = Notifications.addNotificationReceivedListener(() => onReceive());
  return () => {
    opened.remove();
    received.remove();
  };
}

/** The number on the app icon: unread alerts (iOS and most Android launchers). */
export async function setAppBadge(count: number) {
  if (!pushSupport().supported) return;
  const Notifications = await notifications();
  await Notifications.setBadgeCountAsync(count).catch(() => undefined);
}
