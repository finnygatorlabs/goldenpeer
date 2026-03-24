import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
}

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
      <View style={styles.row}>
        {/* Logo — background-stripped PNG, white checkmark intact */}
        <Image
          source={require("../assets/images/logo-shield.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Brand column: app name + tagline */}
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
              style={[styles.tagline, { fontSize: ts.xs }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
            >
              Your voice assistant for tech help and scam protection
            </Text>
          )}
        </View>

        {/* Protected — raised 5 px above center */}
        <View style={[styles.badge, { marginBottom: 5 }]}>
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
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 58,
    height: 58,
    flexShrink: 0,
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
    color: "rgba(255,255,255,0.80)",
    lineHeight: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
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
