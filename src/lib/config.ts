import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/** The backend shared with the website. Override in `.env.local` to use a local server. */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://leadsmanagementportal-node.onrender.com/api/v1"
).replace(/\/+$/, "");

/** The website, for things the app sends people to (billing, imports). Empty until it's set. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/+$/, "");

/** This build's version, from app.json — compared with the API's minimum on start-up. */
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

/**
 * Sent with every request so the login history says "GetCloseWise app" with
 * the phone's system, e.g. `GetCloseWise/1.0.0 (Android 14; Mobile)`.
 * The format is parsed by the API (server/src/core/utils/user-agent.ts).
 */
export const USER_AGENT = (() => {
  const tablet = Device.deviceType === Device.DeviceType.TABLET;
  const version = Device.osVersion ?? "";
  if (Platform.OS === "ios") return `GetCloseWise/${APP_VERSION} (iOS ${version}; ${tablet ? "iPad" : "iPhone"})`;
  return `GetCloseWise/${APP_VERSION} (Android ${version}; ${tablet ? "Tablet" : "Mobile"})`;
})();
