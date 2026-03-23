import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isLoading?: boolean;
}

interface AssistantPrefs {
  preferred_voice: "female" | "male";
  voice_speed: number;
  assistant_name: string;
}

const DEFAULT_NAMES: Record<string, string> = {
  female: "Aria",
  male: "Max",
};

function VoiceOrb({ onPress, isListening }: { onPress: () => void; isListening: boolean }) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 500 }), withTiming(1.0, { duration: 500 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 500 }), withTiming(0.3, { duration: 500 })),
        -1, false
      );
    } else {
      scale.value = withSpring(1);
      glowOpacity.value = withTiming(0.3);
    }
  }, [isListening]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.orbWrapper, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <Reanimated.View style={[styles.orbGlow, glowStyle]} />
      <Reanimated.View style={[styles.orb, animStyle]}>
        <Ionicons name={isListening ? "stop-circle" : "mic"} size={52} color="#FFFFFF" />
      </Reanimated.View>
    </Pressable>
  );
}

function MessageBubble({ message, theme, onSpeak }: { message: Message; theme: any; onSpeak?: (text: string) => void }) {
  if (message.isUser) {
    return (
      <View style={styles.userBubbleWrapper}>
        <View style={styles.userBubble}>
          <Text style={styles.userBubbleText}>{message.text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.assistantBubbleWrapper}>
      <View style={[styles.assistantIcon, { backgroundColor: "#DBEAFE" }]}>
        <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
      </View>
      <View style={[styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {message.isLoading ? (
          <View style={styles.typingDots}>
            <Text style={[styles.assistantBubbleText, { color: theme.textSecondary }]}>Thinking...</Text>
            <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 8 }} />
          </View>
        ) : (
          <>
            <Text style={[styles.assistantBubbleText, { color: theme.text }]}>{message.text}</Text>
            {onSpeak && !message.isLoading && (
              <Pressable onPress={() => onSpeak(message.text)} style={styles.replayButton}>
                <Ionicons name="volume-medium-outline" size={16} color="#2563EB" />
                <Text style={styles.replayText}>Replay</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function getWebSpeech(): any {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function speakText(text: string, prefs: AssistantPrefs) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = prefs.voice_speed || 1.0;
    utter.pitch = prefs.preferred_voice === "female" ? 1.2 : 0.85;

    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const gender = prefs.preferred_voice;
        const femaleKeywords = ["female", "woman", "girl", "zira", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "veena", "aria", "jenny", "siri"];
        const maleKeywords = ["male", "man", "boy", "david", "mark", "alex", "daniel", "thomas", "fred", "jorge", "diego", "guy", "max"];
        const keywords = gender === "female" ? femaleKeywords : maleKeywords;
        const match = voices.find(v =>
          keywords.some(k => v.name.toLowerCase().includes(k))
        );
        if (match) utter.voice = match;
      }
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = trySpeak;
    }
  } else {
    Speech.stop();
    Speech.speak(text, {
      rate: prefs.voice_speed || 1.0,
      pitch: prefs.preferred_voice === "female" ? 1.2 : 0.85,
    });
  }
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<AssistantPrefs>({
    preferred_voice: "female",
    voice_speed: 1.0,
    assistant_name: "Aria",
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!getWebSpeech()) setVoiceSupported(false);
    loadPrefs();
  }, []);

  async function loadPrefs() {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const res = await fetch(`${base}/api/user/preferences`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (!data.error) {
        const gender: "female" | "male" = data.preferred_voice === "male" ? "male" : "female";
        const name = data.assistant_name || DEFAULT_NAMES[gender];
        const loadedPrefs: AssistantPrefs = {
          preferred_voice: gender,
          voice_speed: parseFloat(data.voice_speed) || 1.0,
          assistant_name: name,
        };
        setPrefs(loadedPrefs);
        const greeting = `Hello${user?.first_name ? `, ${user.first_name}` : ""}! I'm ${name}, your SeniorShield assistant. Tap the microphone and ask me anything — like "How do I send a photo?" or "How do I connect to WiFi?"`;
        const welcomeMsg: Message = { id: "0", text: greeting, isUser: false };
        setMessages([welcomeMsg]);
        setPrefsLoaded(true);
        setTimeout(() => speakText(greeting, loadedPrefs), 600);
      }
    } catch {}
    if (!prefsLoaded) {
      const name = DEFAULT_NAMES["female"];
      const greeting = `Hello${user?.first_name ? `, ${user.first_name}` : ""}! I'm ${name}, your SeniorShield assistant. Tap the microphone and ask me anything!`;
      setMessages([{ id: "0", text: greeting, isUser: false }]);
      setPrefsLoaded(true);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;

    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), isUser: true };
    const loadingMsg: Message = { id: (Date.now() + 1).toString(), text: "", isUser: false, isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInputText("");
    setInterimText("");
    setIsSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/voice/process-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ request_text: text.trim() }),
      });
      const data = await response.json();
      const replyText = data.response_text || "I'm sorry, I had trouble with that. Please try again.";

      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id ? { ...m, text: replyText, isLoading: false } : m)
      );
      speakText(replyText, prefs);
    } catch {
      const errText = "I'm sorry, I couldn't connect. Please check your internet and try again.";
      setMessages(prev =>
        prev.map(m => m.id === loadingMsg.id ? { ...m, text: errText, isLoading: false } : m)
      );
      speakText(errText, prefs);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function stopRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function startVoiceRecognition() {
    const SpeechRecognition = getWebSpeech();
    if (!SpeechRecognition) {
      setShowTextInput(true);
      return;
    }
    if (Platform.OS === "web") {
      window.speechSynthesis?.cancel();
    } else {
      Speech.stop();
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText("");
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        setInterimText(final || interim);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText(prev => {
          if (prev.trim()) {
            sendMessage(prev);
            return "";
          }
          setShowTextInput(true);
          return "";
        });
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText("");
        setShowTextInput(true);
      };

      recognition.start();
    } catch {
      setShowTextInput(true);
      setVoiceSupported(false);
    }
  }

  function handleOrbPress() {
    if (isListening) {
      stopRecognition();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startVoiceRecognition();
    }
  }

  function handleMicInInputBar() {
    setShowTextInput(false);
    setInputText("");
    setInterimText("");
    startVoiceRecognition();
  }

  const firstName = user?.first_name || "Friend";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Good day,</Text>
          <Text style={[styles.name, { color: theme.text }]}>{firstName}</Text>
        </View>
        <View style={[styles.shieldBadge, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
          <Text style={styles.shieldText}>Protected</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[styles.messagesContent, { paddingBottom: tabBarHeight + (showTextInput ? 80 : 220) }]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            theme={theme}
            onSpeak={!msg.isUser && !msg.isLoading ? (t) => speakText(t, prefs) : undefined}
          />
        ))}
      </ScrollView>

      {!showTextInput && (
        <View style={[styles.orbSection, { bottom: tabBarHeight + insets.bottom + 20 }]}>
          {isListening && interimText ? (
            <View style={[styles.interimBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.interimText, { color: theme.text }]}>{interimText}</Text>
            </View>
          ) : (
            <Text style={[styles.orbHint, { color: theme.textSecondary }]}>
              {isListening ? `Listening… speak to ${prefs.assistant_name}` : `Tap to ask ${prefs.assistant_name}`}
            </Text>
          )}
          <VoiceOrb onPress={handleOrbPress} isListening={isListening} />
          {!voiceSupported && (
            <Text style={[styles.voiceUnsupported, { color: theme.textTertiary }]}>
              Voice not available in this browser
            </Text>
          )}
          <Pressable onPress={() => { setShowTextInput(true); stopRecognition(); }} style={styles.keyboardToggle}>
            <Ionicons name="keyboard-outline" size={18} color={theme.textTertiary} />
            <Text style={[styles.keyboardToggleText, { color: theme.textTertiary }]}>Type instead</Text>
          </Pressable>
        </View>
      )}

      {showTextInput && (
        <View style={[styles.inputBar, {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: tabBarHeight + (Platform.OS === "web" ? 34 : insets.bottom) + 8,
        }]}>
          <Pressable onPress={handleMicInInputBar} style={styles.micButton}>
            <Ionicons name="mic" size={24} color="#2563EB" />
          </Pressable>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Ask ${prefs.assistant_name} anything…`}
            placeholderTextColor={theme.placeholder}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
            autoFocus
          />
          <Pressable
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isSending}
            style={({ pressed }) => [styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled, pressed && styles.pressed]}
          >
            {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  name: { fontSize: 24, fontFamily: "Inter_700Bold" },
  shieldBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  shieldText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  userBubbleWrapper: { alignItems: "flex-end" },
  userBubble: { backgroundColor: "#2563EB", borderRadius: 20, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12, maxWidth: "80%" },
  userBubbleText: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#FFFFFF", lineHeight: 22 },
  assistantBubbleWrapper: { flexDirection: "row", alignItems: "flex-start", gap: 10, maxWidth: "90%" },
  assistantIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 4 },
  assistantBubble: { flex: 1, borderRadius: 20, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1 },
  assistantBubbleText: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24 },
  replayButton: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  replayText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#2563EB" },
  typingDots: { flexDirection: "row", alignItems: "center" },
  orbSection: { position: "absolute", left: 0, right: 0, alignItems: "center", gap: 10 },
  orbHint: { fontSize: 15, fontFamily: "Inter_400Regular" },
  interimBox: { marginHorizontal: 24, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, borderWidth: 1, maxWidth: 320 },
  interimText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", fontStyle: "italic" },
  voiceUnsupported: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  keyboardToggle: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 12 },
  keyboardToggleText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  orbWrapper: { alignItems: "center", justifyContent: "center" },
  orbGlow: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "#2563EB" },
  orb: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", shadowColor: "#2563EB", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  inputBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: 1 },
  micButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  textInput: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_400Regular", maxHeight: 100, lineHeight: 22 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: "#94A3B8" },
  pressed: { opacity: 0.85 },
});
