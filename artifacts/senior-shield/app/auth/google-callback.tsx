import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = "seniorshield_user";
const GOOGLE_AUTH_SIGNAL = "seniorshield_google_auth_complete";

export default function GoogleCallbackScreen() {
  const [error, setError] = useState("");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    async function handleGoogleRedirect() {
      try {
        const hash = window.location.hash;

        if (!hash || !hash.includes("access_token")) {
          return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");

        if (!accessToken) {
          setError("No access token received from Google.");
          return;
        }

        const domain = process.env.EXPO_PUBLIC_DOMAIN;
        const base = domain ? `https://${domain}` : "http://localhost:8080";
        const response = await fetch(`${base}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken, user_type: "senior" }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Google sign-in failed");
          return;
        }

        const userData = {
          user_id: data.user_id,
          token: data.token,
          user_type: data.user_type,
          first_name: data.first_name,
          last_name: data.last_name,
          onboarding_completed: data.onboarding_completed,
          email_verified: data.email_verified,
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        localStorage.setItem(GOOGLE_AUTH_SIGNAL, JSON.stringify(userData));

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: "google-auth-success", userData }, "*");
          } catch (e) {
          }
          setTimeout(() => window.close(), 200);
          return;
        }

        window.location.hash = "";
        if (data.onboarding_completed) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/onboarding/step1");
        }
      } catch (err: any) {
        console.error("[GoogleCallback] Error:", err);
        setError(err.message || "Something went wrong");
      }
    }

    const timer = setTimeout(handleGoogleRedirect, 150);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#06102E", padding: 24 }}>
        <Text style={{ color: "#FCA5A5", fontSize: 16, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Text
          style={{ color: "#60A5FA", fontSize: 14 }}
          onPress={() => router.replace("/auth/login")}
        >
          Back to Sign In
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#06102E" }}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={{ color: "#94A3B8", marginTop: 16, fontSize: 14 }}>Completing sign in...</Text>
    </View>
  );
}
