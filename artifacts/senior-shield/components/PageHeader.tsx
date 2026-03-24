import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
}

// Ties into the orb's dark-navy + cyan palette
const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

export default function PageHeader({ showTagline = false }: PageHeaderProps) {
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrapper,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) },
      ]}
    >
      {/* Main row: logo | brand | protected */}
      <View style={styles.row}>

        {/* Logo — transparent PNG, no container tile */}
        <Image
          source={require("../assets/images/logo-shield.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Brand: app name + tagline stacked */}
        <View style={styles.brandCol}>
          <Text
            style={[styles.appName, { fontSize: ts.h1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            SeniorShield
          </Text>
          {showTagline && (
            <Text
              style={[styles.tagline, { fontSize: ts.sm }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              Your voice assistant for tech help and scam protection
            </Text>
          )}
        </View>

        {/* Protected — far right, top-aligned */}
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
          <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 48,
    height: 48,
    flexShrink: 0,
    backgroundColor: "transparent",
  },
  brandCol: {
    flex: 1,
    gap: 3,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    lineHeight: 17,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
