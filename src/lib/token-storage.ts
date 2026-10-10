import * as SecureStore from "expo-secure-store";

/** The sign-in token lives in the phone's keychain / keystore, never in plain storage. */
const TOKEN_KEY = "getclosewise.token";

export const tokenStorage = {
  async get() {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      // Unreadable (e.g. restored from a backup onto another phone): sign in again.
      return null;
    }
  },
  set(token: string) {
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Nothing stored.
    }
  },
};
