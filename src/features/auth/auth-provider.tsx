import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiClientError, setAuthToken, setUnauthorizedHandler } from "@/lib/api-client";
import { authKeys, queryClient } from "@/lib/query-client";
import { tokenStorage } from "@/lib/token-storage";
import type { User } from "@/features/users/types";

import { authApi } from "./api";

type Status = "restoring" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: Status;
  /** Set once signed in and `/auth/me` has loaded */
  user: User | undefined;
  /** Why the last session ended on its own (idle sign-out, password changed…), for the sign-in screen */
  signedOutReason: string | null;
  /** Problem restoring a saved sign-in (offline, server down) — with a way to try again */
  restoreError: unknown;
  retryRestore: () => void;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("restoring");
  const [signedOutReason, setSignedOutReason] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<unknown>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  const me = useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled: status === "signedIn",
  });

  const forget = useCallback(async (reason: string | null) => {
    setAuthToken(null);
    await tokenStorage.clear();
    queryClient.clear();
    setSignedOutReason(reason);
    setStatus("signedOut");
  }, []);

  // The server ended the session (idle auto sign-out, password changed, account deactivated…).
  useEffect(() => {
    setUnauthorizedHandler((message) => void forget(message));
    return () => setUnauthorizedHandler(null);
  }, [forget]);

  // On start-up: pick up the saved sign-in and check it's still valid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await tokenStorage.get();
      if (!token) {
        if (!cancelled) setStatus("signedOut");
        return;
      }
      setAuthToken(token);
      try {
        const user = await authApi.me();
        if (cancelled) return;
        queryClient.setQueryData(authKeys.me, user);
        setRestoreError(null);
        setStatus("signedIn");
      } catch (error) {
        if (cancelled) return;
        // 401 already signed out through the handler; anything else (offline) can be retried.
        if (!(error instanceof ApiClientError && error.status === 401)) setRestoreError(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restoreAttempt]);

  const signIn = useCallback(async (token: string) => {
    setAuthToken(token);
    await tokenStorage.set(token);
    // The full profile (with the organization's plan and status) comes from /auth/me.
    queryClient.setQueryData(authKeys.me, await authApi.me());
    setSignedOutReason(null);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    // Best effort: the session should end on the server, but signing out must work offline too.
    await authApi.logout().catch(() => undefined);
    await forget(null);
  }, [forget]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: me.data,
      signedOutReason,
      restoreError,
      retryRestore: () => {
        setRestoreError(null);
        setRestoreAttempt((n) => n + 1);
      },
      signIn,
      signOut,
    }),
    [status, me.data, signedOutReason, restoreError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** The signed-in user, for screens behind sign-in (where it's always loaded). */
export function useCurrentUser() {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser used before the user loaded");
  return user;
}
