import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
  greeting?: string;
}

const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

function DecoCircle({ size, top, left, right, opacity }: { size: number; top?: number; left?: number; right?: number; opacity: number }) {
  return (
    <View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        right,
      }}
    />
  );
}

function DecoLine({ width, top, left, rotate, opacity }: { width: number; top: number; left: number; rotate: string; opacity: number }) {
  return (
    <View
      style={{
        position: "absolute",
        width,
        height: 1,
        backgroundColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        transform: [{ rotate }],
      }}
    />
  );
}

export default function PageHeader({ showTagline = false, greeting }: PageHeaderProps) {
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  const topPad = insets.top + (Platform.OS === "web" ? 52 : 0);

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrapper, { paddingTop: topPad + 14 }]}
    >
      {/* Abstract decorative elements */}
      <DecoCircle size={160} top={-40} right={-50} opacity={0.06} />
      <DecoCircle size={90} top={10} right={30} opacity={0.04} />
      <DecoCircle size={200} top={-80} left={-100} opacity={0.04} />
      <DecoLine width={180} top={20} left={-40} rotate="-25deg" opacity={0.05} />
      <DecoLine width={120} top={55} left={220} rotate="15deg" opacity={0.04} />
      <View style={styles.decoDotsRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.decoDot} />
        ))}
      </View>

      {/* Top row: logo + brand name + badge */}
      <View style={styles.topRow}>
        <Image
          source={require("../assets/images/logo-shield.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.brandCol}>
          <Text
            style={[styles.appName, { fontSize: ts.h1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            SeniorShield{"\u2122"}
          </Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={12} color="#34D399" />
          <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
        </View>
      </View>

      {/* Tagline — own row, full width, never competes with the badge */}
      {showTagline && (
        <Text
          style={[styles.tagline, { fontSize: ts.sm, marginTop: 4, paddingLeft: 64 }]}
          numberOfLines={2}
        >
          Your voice assistant for tech help and scam protection
        </Text>
      )}

      {/* Greeting row */}
      {!!greeting && (
        <View style={[styles.greetingRow, { marginTop: showTagline ? 6 : 10 }]}>
          <View style={styles.greetingDivider} />
          <Text
            style={[styles.greeting, { fontSize: ts.md }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {greeting}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 52,
    height: 52,
    flexShrink: 0,
  },
  brandCol: {
    flex: 1,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.2)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 64,
    gap: 0,
  },
  greetingDivider: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "rgba(96,165,250,0.6)",
    marginRight: 8,
  },
  greeting: {
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 24,
  },
  decoDotsRow: {
    position: "absolute",
    bottom: 8,
    right: 16,
    flexDirection: "row",
    gap: 6,
  },
  decoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
});
