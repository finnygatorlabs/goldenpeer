import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
}

export default function PageHeader({ pageTitle, pageSubtitle }: PageHeaderProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  const firstName = user?.first_name || "Friend";

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8),
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary, fontSize: ts.xs }]}>
            Good day, {firstName}
          </Text>
          <Text style={[styles.pageTitle, { color: theme.text, fontSize: ts.h2 }]}>
            {pageTitle}
          </Text>
        </View>
        <View style={styles.shieldBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#2563EB" />
          <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
        </View>
      </View>
      {pageSubtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: ts.sm }]}>
          {pageSubtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    marginBottom: 1,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
  },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#2563EB",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 20,
  },
});
