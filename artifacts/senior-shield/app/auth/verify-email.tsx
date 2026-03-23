import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const displayEmail = email || user?.first_name || "your email";

  async function resendVerification() {
    if (!email && !user) return;
    setResending(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      await fetch(`${base}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || "" }),
      });
      setResent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function continueAnyway() {
    router.replace("/onboarding/step1");
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={["#1D4ED8", "#2563EB", "#3B82F6"]}
        style={styles.topBand}
      />

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.iconWrapper}>
          <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="mail" size={48} color="#2563EB" />
          </View>
          {!resent && (
            <View style={styles.checkBadge}>
              <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
            </View>
          )}
          {resent && (
            <View style={[styles.checkBadge, { backgroundColor: "#10B981" }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          We sent a verification link to
        </Text>
        <Text style={[styles.emailText, { color: "#2563EB" }]}>{displayEmail}</Text>

        <Text style={[styles.instruction, { color: theme.textSecondary }]}>
          Open the link in your email to verify your account. If you don't see it, check your spam or junk folder.
        </Text>

        <View style={[styles.tipCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="information-circle" size={20} color="#2563EB" />
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            You can still use SeniorShield while waiting to verify your email.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
          onPress={continueAnyway}
        >
          <Text style={styles.continueButtonText}>Continue to App</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={styles.resendRow}>
          <Text style={[styles.resendLabel, { color: theme.textSecondary }]}>Didn't receive it?</Text>
          {resending ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : resent ? (
            <Text style={styles.resentText}>Sent! Check your inbox.</Text>
          ) : (
            <Pressable onPress={resendVerification} hitSlop={10}>
              <Text style={styles.resendLink}>Resend email</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBand: { position: "absolute", top: 0, left: 0, right: 0, height: 180 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  iconWrapper: { marginBottom: 32, position: "relative" },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  checkBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emailText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  instruction: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 32,
    width: "100%",
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  continueButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resendLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  resendLink: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#2563EB",
  },
  resentText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#10B981",
  },
});
