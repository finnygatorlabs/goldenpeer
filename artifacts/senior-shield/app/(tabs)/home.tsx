import React, { useState, useRef, useEffect, useCallback } from "react";
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
import * as Haptics from "expo-haptics";
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
import { usePreferences } from "@/context/PreferencesContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isLoading?: boolean;
}

interface ConvTurn {
  role: "user" | "assistant";
  content: string;
}

function VoiceOrb({
  onPress,
  isListening,
  isSpeaking,
}: {
  onPress: () => void;
  isListening: boolean;
  isSpeaking: boolean;
}) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(withTiming(1.14, { duration: 420 }), withTiming(1.0, { duration: 420 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.9, { duration: 420 }), withTiming(0.3, { duration: 420 })),
        -1, false
      );
    } else if (isSpeaking) {
      scale.value = withRepeat(
        withSequence(withTiming(1.07, { duration: 600 }), withTiming(1.0, { duration: 600 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.55, { duration: 600 }), withTiming(0.2, { duration: 600 })),
        -1, false
      );
    } else {
      scale.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 1600 }), withTiming(1.0, { duration: 1600 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.35, { duration: 1600 }), withTiming(0.12, { duration: 1600 })),
        -1, false
      );
    }
  }, [isListening, isSpeaking]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  const orbColor = isListening ? "#DC2626" : "#2563EB";
  const glowColor = isListening ? "#DC2626" : "#2563EB";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.orbWrapper, pressed && { opacity: 0.85 }]}
    >
      <Reanimated.View style={[styles.orbGlow, { backgroundColor: glowColor }, glowStyle]} />
      <Reanimated.View style={[styles.orb, { backgroundColor: orbColor }, animStyle]}>
        <Ionicons
          name={isListening ? "stop-circle" : isSpeaking ? "volume-high" : "mic"}
          size={52}
          color="#FFFFFF"
        />
      </Reanimated.View>
    </Pressable>
  );
}

function MessageBubble({
  message,
  theme,
  ts,
  onSpeak,
}: {
  message: Message;
  theme: any;
  ts: any;
  onSpeak?: (text: string) => void;
}) {
  if (message.isUser) {
    return (
      <View style={styles.userBubbleWrapper}>
        <View style={styles.userBubble}>
          <Text style={[styles.bubbleText, { fontSize: ts.base, lineHeight: ts.base * 1.5, color: "#fff" }]}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.assistantBubbleWrapper}>
      <View style={[styles.assistantIcon, { backgroundColor: "#DBEAFE" }]}>
        <Ionicons name="shield-checkmark" size={15} color="#2563EB" />
      </View>
      <View style={[styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {message.isLoading ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={[styles.bubbleText, { color: theme.textSecondary, fontSize: ts.sm }]}>
              {" "}Thinking…
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.bubbleText, { color: theme.text, fontSize: ts.base, lineHeight: ts.base * 1.55 }]}>
              {message.text}
            </Text>
            {onSpeak && (
              <Pressable onPress={() => onSpeak(message.text)} style={styles.replayBtn}>
                <Ionicons name="volume-medium-outline" size={13} color="#2563EB" />
                <Text style={[styles.replayText, { fontSize: ts.xs }]}>Replay</Text>
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

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { prefs, ts } = usePreferences();

  const assistantName = prefs.assistant_name;
  const apiBase = (() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    return domain ? `https://${domain}` : "";
  })();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConvTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [greeted, setGreeted] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoRestartRef = useRef(false);

  // Speak text; calls onFinished when audio ends
  const speakText = useCallback(async (text: string, onFinished?: () => void) => {
    if (!text.trim()) { onFinished?.(); return; }
    setIsSpeaking(true);

    if (Platform.OS === "web") {
      try {
        const voice = prefs.preferred_voice === "female" ? "nova" : "onyx";
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ text: text.slice(0, 800), voice }),
        });
        if (res.ok) {
          const { audio } = await res.json();
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          const el = new Audio(`data:audio/mpeg;base64,${audio}`);
          audioRef.current = el;
          el.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            onFinished?.();
          };
          el.onerror = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            onFinished?.();
          };
          await el.play();
          return;
        }
      } catch {}
      // Fallback: browser TTS
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.92;
        utter.onend = () => { setIsSpeaking(false); onFinished?.(); };
        window.speechSynthesis.speak(utter);
        return;
      }
    } else {
      try {
        const { Audio } = await import("expo-av");
        const voice = prefs.preferred_voice === "female" ? "nova" : "onyx";
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ text: text.slice(0, 800), voice }),
        });
        if (res.ok) {
          const { audio } = await res.json();
          const { sound } = await Audio.Sound.createAsync(
            { uri: `data:audio/mpeg;base64,${audio}` },
            { shouldPlay: true }
          );
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) {
              sound.unloadAsync();
              setIsSpeaking(false);
              onFinished?.();
            }
          });
          return;
        }
      } catch {}
      const Speech = await import("expo-speech");
      Speech.default.stop();
      Speech.default.speak(text, {
        rate: 0.92,
        pitch: prefs.preferred_voice === "female" ? 1.05 : 0.92,
        onDone: () => { setIsSpeaking(false); onFinished?.(); },
        onError: () => { setIsSpeaking(false); onFinished?.(); },
      });
      return;
    }
    setIsSpeaking(false);
    onFinished?.();
  }, [prefs.preferred_voice, apiBase, user?.token]);

  const stopSpeaking = useCallback(() => {
    autoRestartRef.current = false;
    if (Platform.OS === "web") {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis?.cancel();
    } else {
      import("expo-speech").then(m => m.default.stop()).catch(() => {});
    }
    setIsSpeaking(false);
  }, []);

  // Start voice recognition
  const startVoiceRecognition = useCallback(() => {
    const SpeechRecognition = getWebSpeech();
    if (!SpeechRecognition) {
      setShowTextInput(true);
      return;
    }
    stopSpeaking();
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
          return "";
        });
      };
      recognition.onerror = (e: any) => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText("");
        // Only fall to text mode for serious errors, not "no-speech"
        if (e.error !== "no-speech" && e.error !== "aborted") {
          setShowTextInput(true);
        }
      };
      recognition.start();
    } catch {
      setShowTextInput(true);
    }
  }, [stopSpeaking]);

  const stopRecognition = useCallback(() => {
    autoRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Greeting on mount — then auto-start listening when done
  useEffect(() => {
    if (!greeted && assistantName) {
      const greeting = `Hi ${user?.first_name || "there"}! I'm ${assistantName}. I'm here whenever you need me — just speak and I'll listen.`;
      setMessages([{ id: "0", text: greeting, isUser: false }]);
      setConversationHistory([{ role: "assistant", content: greeting }]);
      setGreeted(true);
      autoRestartRef.current = true;
      setTimeout(() => {
        speakText(greeting, () => {
          // Auto-start listening once greeting finishes
          if (autoRestartRef.current) startVoiceRecognition();
        });
      }, 600);
    }
  }, [assistantName, greeted]);

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;
    stopSpeaking();
    stopRecognition();

    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), isUser: true };
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = { id: loadingId, text: "", isUser: false, isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInputText("");
    setInterimText("");
    setIsSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const updatedHistory: ConvTurn[] = [
      ...conversationHistory,
      { role: "user", content: text.trim() },
    ];

    try {
      const res = await fetch(`${apiBase}/api/voice/process-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          request_text: text.trim(),
          conversation_history: updatedHistory.slice(-12),
        }),
      });
      const data = await res.json();
      const replyText =
        data.response_text || "I'm sorry, I had a little trouble. Could you try again?";

      setMessages(prev =>
        prev.map(m => (m.id === loadingId ? { ...m, text: replyText, isLoading: false } : m))
      );
      const newHistory: ConvTurn[] = [
        ...updatedHistory,
        { role: "assistant", content: replyText },
      ];
      setConversationHistory(newHistory);

      // Speak reply, then auto-restart listening
      autoRestartRef.current = true;
      speakText(replyText, () => {
        if (autoRestartRef.current && !showTextInput) {
          startVoiceRecognition();
        }
      });
    } catch {
      const errText = "I couldn't connect just now. Please check your internet and try again!";
      setMessages(prev =>
        prev.map(m => (m.id === loadingId ? { ...m, text: errText, isLoading: false } : m))
      );
      speakText(errText);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  function handleOrbPress() {
    if (isListening) {
      stopRecognition();
    } else if (isSpeaking) {
      stopSpeaking();
    } else {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startVoiceRecognition();
    }
  }

  const firstName = user?.first_name || "Friend";

  const orbStatusText = isListening
    ? `Listening…`
    : isSpeaking
    ? `${assistantName} is speaking`
    : `Tap to speak`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary, fontSize: ts.xs }]}>
            Good day,
          </Text>
          <Text style={[styles.name, { color: theme.text, fontSize: ts.h2 }]}>
            {firstName}
          </Text>
        </View>
        <View style={[styles.shieldBadge, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
          <Text style={[styles.shieldText, { fontSize: ts.xs }]}>Protected</Text>
        </View>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[styles.messagesContent]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            theme={theme}
            ts={ts}
            onSpeak={!msg.isUser && !msg.isLoading ? speakText : undefined}
          />
        ))}
      </ScrollView>

      {/* ── Orb footer (NOT absolutely positioned) ── */}
      {!showTextInput && (
        <View
          style={[
            styles.orbFooter,
            { borderTopColor: theme.border, paddingBottom: insets.bottom + 12 },
          ]}
        >
          {/* Interim text (what mic heard so far) */}
          {isListening && interimText ? (
            <View style={[styles.interimBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.interimText, { color: theme.text, fontSize: ts.sm }]} numberOfLines={2}>
                {interimText}
              </Text>
            </View>
          ) : (
            <Text
              style={[styles.orbStatusText, { color: isListening ? "#DC2626" : theme.textSecondary, fontSize: ts.xs }]}
              numberOfLines={1}
            >
              {orbStatusText}
            </Text>
          )}

          <VoiceOrb onPress={handleOrbPress} isListening={isListening} isSpeaking={isSpeaking} />

          <Pressable
            onPress={() => {
              stopRecognition();
              stopSpeaking();
              setShowTextInput(true);
            }}
            hitSlop={10}
          >
            <Text style={[styles.typeInstead, { color: theme.textSecondary, fontSize: ts.xs }]}>
              Type instead
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Text input bar ── */}
      {showTextInput && (
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              setShowTextInput(false);
              setInputText("");
              setInterimText("");
              autoRestartRef.current = true;
              startVoiceRecognition();
            }}
            style={styles.micButton}
          >
            <Ionicons name="mic" size={26} color="#2563EB" />
          </Pressable>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: ts.base,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Ask ${assistantName}…`}
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
            style={({ pressed }) => [
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
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
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  greeting: { fontFamily: "Inter_400Regular" },
  name: { fontFamily: "Inter_700Bold" },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shieldText: { fontFamily: "Inter_600SemiBold", color: "#2563EB" },

  messages: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 16,
    gap: 10,
  },

  userBubbleWrapper: { alignItems: "flex-end" },
  userBubble: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "80%",
  },
  assistantBubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    maxWidth: "90%",
  },
  assistantIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  assistantBubble: {
    flex: 1,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleText: { fontFamily: "Inter_400Regular" },
  replayBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  replayText: { fontFamily: "Inter_500Medium", color: "#2563EB" },
  typingRow: { flexDirection: "row", alignItems: "center" },

  // ── Orb footer ──
  orbFooter: {
    alignItems: "center",
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  orbStatusText: {
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1,
  },
  interimBubble: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 7,
    maxWidth: "80%",
  },
  interimText: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
  typeInstead: {
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
    paddingBottom: 2,
  },

  orbWrapper: { alignItems: "center", justifyContent: "center" },
  orbGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  orb: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },

  // ── Text input bar ──
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    lineHeight: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#94A3B8" },
});
