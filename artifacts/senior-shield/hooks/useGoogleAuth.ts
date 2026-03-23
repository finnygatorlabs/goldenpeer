import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: clientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const isConfigured = !!clientId;

  return {
    request,
    response,
    promptAsync,
    isConfigured,
  };
}
