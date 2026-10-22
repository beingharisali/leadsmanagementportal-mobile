import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { useCurrentUser } from "@/features/auth/auth-provider";
import { useUnreadCount } from "@/features/notifications/hooks";
import { worksLeads } from "@/features/users/types";
import { useTheme } from "@/theme/use-theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

export default function TabsLayout() {
  const user = useCurrentUser();
  const { colors } = useTheme();
  const unread = useUnreadCount().data ?? 0;
  // Team members with a custom role don't work leads: those tabs are hidden (href: null).
  const leads = worksLeads(user.role);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen
        name="leads"
        options={{
          title: user.role === "agent" ? "My Leads" : "Leads",
          tabBarIcon: icon("people-outline"),
          ...(!leads && { href: null }),
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{ title: "Follow-ups", tabBarIcon: icon("alarm-outline"), ...(!leads && { href: null }) }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: icon("notifications-outline"),
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: "#FFFFFF" },
        }}
      />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: icon("menu-outline") }} />
    </Tabs>
  );
}
