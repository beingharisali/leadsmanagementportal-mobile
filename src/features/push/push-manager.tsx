import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useCurrentUser } from "@/features/auth/auth-provider";
import { useUnreadCount } from "@/features/notifications/hooks";
import { openNotificationTarget } from "@/features/notifications/open";
import type { NotificationType } from "@/features/notifications/types";
import { useViewAsTarget } from "@/lib/view-as";

import { listenForPush, registerForPush, setAppBadge } from "./push";

/**
 * While signed in: registers this phone for pushes (asking for permission the
 * first time), opens the right screen when a push is tapped, refreshes alerts
 * when one arrives, and keeps the app icon's badge at the unread count.
 * Not while viewing as an agent or during a support session.
 */
export function PushManager() {
  const user = useCurrentUser();
  const viewingAs = useViewAsTarget();
  if (user.support || viewingAs) return null;
  return <Manager userId={user.id} />;
}

function Manager({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const unread = useUnreadCount().data;

  // Once per signed-in person: register (the API keeps one row per phone).
  useEffect(() => {
    registerForPush({ ask: true }).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    listenForPush({
      onOpen: (data) => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        openNotificationTarget({
          type: (data.type ?? "follow_up_due") as NotificationType,
          lead: data.leadId,
          task: data.taskId,
          project: data.projectId,
        });
      },
      onReceive: () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      },
    })
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [queryClient]);

  useEffect(() => {
    if (unread !== undefined) void setAppBadge(unread);
  }, [unread]);

  return null;
}
