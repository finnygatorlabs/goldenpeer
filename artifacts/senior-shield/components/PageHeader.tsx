import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
}

const BURNT_ORANGE = "#D95F0E";
const HEADER_BLUE  = "#1E4CC8";   // slightly deeper than primary so text pops

export default function PageHeader({ showTagline = false }: PageHeaderProps) {
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10) },
      ]}
    >
      <View style={styles.row}>
        {/* Burnt-orange logo tile */}
        <View style={styles.logoMark}>
          <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
        </View>

        {/* Brand name + tagline */}
        <View style={styles.brandText}>
          <Text style={[styles.appName, { fontSize: ts.h2 }]} numberOfLines={1} adjustsFontSizeToFit>
            SeniorShield
          </Text>
          {showTagline && (
            <Text
              style={[styles.tagline, { fontSize: ts.xs }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Your voice assistant for tech help and scam protection
            </Text>
          )}
        </View>

        {/* Protected badge */}
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
          <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: HEADER_BLUE,
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: BURNT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: BURNT_ORANGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  brandText: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.80)",
    lineHeight: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
