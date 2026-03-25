import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/context/PreferencesContext";

const CONTACT_EMAIL = "admin@finnygator.com";

const PAGES: Record<string, { title: string; icon: any; content: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    icon: "lock-closed",
    content: [
      "Effective Date: January 1, 2025",
      "SeniorShield (\"we\", \"our\", \"us\") is committed to protecting the privacy of our users, particularly seniors aged 65 and older. This Privacy Policy explains how we collect, use, and safeguard your information.",
      "Information We Collect:",
      "Account information (name, email address) when you sign up.",
      "Device information (device type, operating system version) to provide accurate technical assistance.",
      "Voice interactions and conversation history to deliver personalized help. Conversations are stored for up to 30 days and then automatically deleted.",
      "Messages you submit for scam detection analysis.",
      "Usage data to improve our services (if you opt in).",
      "How We Use Your Information:",
      "To provide voice-guided technical assistance tailored to your device.",
      "To analyze messages for potential scams and protect you from fraud.",
      "To send family alerts when high-risk scams are detected (with your permission).",
      "To improve our AI assistant and scam detection accuracy.",
      "We never sell your personal information to third parties.",
      "Data Security:",
      "All data is encrypted in transit using TLS/SSL. Your conversation history is automatically deleted after 30 days. You can delete your account and all associated data at any time from the Settings screen.",
      "Your Rights:",
      "You can access, update, or delete your personal data at any time through the app. You can opt out of usage analytics in Settings. You can request a copy of your data by emailing us.",
      `Contact us at ${CONTACT_EMAIL} with any privacy questions or concerns.`,
    ],
  },
  terms: {
    title: "Terms of Service",
    icon: "document-text",
    content: [
      "Effective Date: January 1, 2025",
      "Welcome to SeniorShield. By using our app, you agree to these Terms of Service.",
      "About SeniorShield:",
      "SeniorShield is a voice-guided assistant designed to help seniors with technology and protect against scams. It is not a substitute for professional medical, legal, or financial advice.",
      "Your Account:",
      "You must provide accurate information when creating your account. You are responsible for maintaining the security of your login credentials. You must be at least 13 years old to use SeniorShield.",
      "Acceptable Use:",
      "Use SeniorShield only for its intended purpose of receiving technology help and scam protection. Do not attempt to misuse, reverse engineer, or interfere with our services.",
      "Subscriptions and Billing:",
      "SeniorShield offers a free tier and a paid Pro plan. Pro subscriptions are billed monthly or annually through Stripe. You can cancel your subscription at any time. Refunds are handled on a case-by-case basis.",
      "Limitations:",
      "SeniorShield provides general technology guidance and scam detection. We do not guarantee 100% accuracy in scam detection. We are not responsible for actions taken based on our guidance. Always consult professionals for medical, legal, or financial decisions.",
      "Termination:",
      "We reserve the right to suspend or terminate accounts that violate these terms. You can delete your account at any time from Settings.",
      "Changes to Terms:",
      "We may update these terms from time to time. We will notify you of significant changes through the app.",
      `Questions? Contact us at ${CONTACT_EMAIL}.`,
    ],
  },
  cookies: {
    title: "Cookie Policy",
    icon: "information-circle",
    content: [
      "Effective Date: January 1, 2025",
      "SeniorShield uses minimal cookies and local storage to provide you with the best experience.",
      "What We Use:",
      "Authentication tokens stored securely on your device to keep you logged in.",
      "User preferences (theme, text size, voice settings) stored locally for a personalized experience.",
      "Session data to maintain your conversation context during active use.",
      "What We Do Not Use:",
      "We do not use third-party advertising cookies. We do not use tracking cookies to follow you across websites. We do not sell cookie data to any third party.",
      "Managing Your Data:",
      "You can clear all locally stored data by logging out of the app. Deleting your account removes all server-side data associated with your profile.",
      `For questions about our cookie practices, contact ${CONTACT_EMAIL}.`,
    ],
  },
  contact: {
    title: "Contact Us",
    icon: "mail",
    content: [
      "We would love to hear from you! Whether you have questions, feedback, or need assistance, our team is here to help.",
      "Email:",
      `${CONTACT_EMAIL}`,
      "We aim to respond to all inquiries within 24-48 business hours.",
      "What to Include:",
      "Your name and the email associated with your SeniorShield account.",
      "A clear description of your question, issue, or feedback.",
      "Screenshots if relevant (for technical issues).",
      "Common Reasons to Contact Us:",
      "Account issues (login problems, password reset).",
      "Billing questions (subscription, charges, refunds).",
      "Bug reports or app issues.",
      "Feature suggestions.",
      "Privacy or data requests.",
      "General feedback or questions.",
      "For emergencies, please call 911 or use the Emergency button in the app. Our team cannot provide real-time emergency assistance via email.",
    ],
  },
};

export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const { theme } = useTheme();
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();
  const data = PAGES[page || "privacy"];

  if (!data) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 52 : 0) + 12, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Ionicons name={data.icon} size={22} color="#2563EB" />
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: ts.md }]}>{data.title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {data.content.map((paragraph, i) => {
          const isHeading = paragraph.endsWith(":");
          const isEmail = paragraph === CONTACT_EMAIL;
          return (
            <Text
              key={i}
              style={[
                isHeading ? styles.heading : isEmail ? styles.emailLink : styles.paragraph,
                {
                  color: isEmail ? "#2563EB" : isHeading ? theme.text : theme.textSecondary,
                  fontSize: isHeading ? ts.base : ts.sm,
                },
              ]}
              onPress={isEmail ? () => Linking.openURL(`mailto:${CONTACT_EMAIL}`) : undefined}
            >
              {paragraph}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { marginRight: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  heading: { fontFamily: "Inter_700Bold", marginTop: 8 },
  paragraph: { fontFamily: "Inter_400Regular", lineHeight: 22 },
  emailLink: { fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
});
