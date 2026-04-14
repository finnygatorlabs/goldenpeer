import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View, Platform, Text } from "react-native";
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const FULL_SIZE = 176;
const COMPACT_SIZE = 100;

function PulseRing({ color, delay = 0, borderWidth = 1.5, duration = 2400 }: { color: string; delay?: number; borderWidth?: number; duration?: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(2.2, { duration, easing: Easing.out(Easing.quad) }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration, easing: Easing.out(Easing.quad) }), -1, false)
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[
        styles.pulseRing,
        style,
        { borderColor: color, borderWidth },
      ]}
    />
  );
}

function OrbVideo({ size }: { size: number }) {
  const videoRef = useRef<any>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    return () => { el.pause(); };
  }, []);

  if (Platform.OS === "web") {
    const renderSize = FULL_SIZE;
    const overflow = renderSize * 0.16;
    return (
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: renderSize + overflow * 2,
          height: renderSize + overflow * 2,
          objectFit: "cover",
          display: "block",
          position: "absolute" as any,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <source src="/orb.webm" type="video/webm" />
        <source src="/orb.mp4" type="video/mp4" />
      </video>
    );
  }

  return <NativeVideo size={size} />;
}

function NativeVideo({ size }: { size: number }) {
  const [Video, setVideo] = React.useState<any>(null);
  const [ResizeMode, setResizeMode] = React.useState<any>(null);

  useEffect(() => {
    import("expo-av").then(m => {
      setVideo(() => m.Video);
      setResizeMode(m.ResizeMode);
    });
  }, []);

  if (!Video || !ResizeMode) return null;

  return (
    <Video
      source={require("../public/orb.mov")}
      shouldPlay
      isLooping
      isMuted
      resizeMode={ResizeMode.COVER}
      style={{ width: size, height: size, borderRadius: size / 2, position: "absolute", top: 0, left: 0 }}
    />
  );
}

interface FluidOrbProps {
  onPress: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  audioReady: boolean;
  isIdle?: boolean;
}

export default function FluidOrb({ onPress, isListening, isSpeaking, audioReady, isIdle = false }: FluidOrbProps) {
  const iconScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const orbSize = useSharedValue(isIdle ? COMPACT_SIZE : FULL_SIZE);

  useEffect(() => {
    const target = isIdle ? COMPACT_SIZE : FULL_SIZE;
    orbSize.value = withTiming(target, { duration: 320, easing: Easing.inOut(Easing.ease) });
  }, [isIdle]);

  const accent = isListening ? "#10B981" : "#60A5FA";
  const accentAlt = isListening ? "#6EE7B7" : "#93C5FD";

  useEffect(() => {
    cancelAnimation(iconScale);
    cancelAnimation(glowOpacity);

    if (isListening) {
      iconScale.value = withRepeat(
        withSequence(withTiming(1.10, { duration: 400 }), withTiming(1.0, { duration: 400 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.25, { duration: 400 }), withTiming(0.08, { duration: 400 })),
        -1, false
      );
    } else if (isSpeaking) {
      iconScale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 700 }), withTiming(0.97, { duration: 700 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.18, { duration: 700 }), withTiming(0.05, { duration: 700 })),
        -1, false
      );
    } else {
      iconScale.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 2500 }), withTiming(0.98, { duration: 2500 })),
        -1, false
      );
      glowOpacity.value = withTiming(0);
    }
  }, [isListening, isSpeaking]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    width: orbSize.value,
    height: orbSize.value,
    borderRadius: orbSize.value / 2,
  }));

  const icon: any = isListening ? "stop-circle" : isSpeaking ? "volume-high" : "mic";
  const iconOpacity = isListening || isSpeaking ? 0.45 : 0.28;
  const iconSize = isIdle ? 28 : 44;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <Reanimated.View style={[styles.wrapper, wrapperStyle]}>
        <OrbVideo size={isIdle ? COMPACT_SIZE : FULL_SIZE} />

        <Reanimated.View
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: FULL_SIZE / 2, backgroundColor: accent },
            glowStyle,
          ]}
        />

        {(isListening || isSpeaking) && (
          <View style={StyleSheet.absoluteFillObject}>
            <PulseRing color={accentAlt} delay={0} borderWidth={1} duration={2800} />
            <PulseRing color={accent} delay={900} borderWidth={0.8} duration={2800} />
            <PulseRing color={accentAlt} delay={1800} borderWidth={0.6} duration={2800} />
          </View>
        )}

        <Reanimated.View style={[styles.iconWrap, iconStyle, { opacity: iconOpacity }]}>
          <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
        </Reanimated.View>
      </Reanimated.View>

      {isIdle && (
        <Text style={styles.compactLabel}>Tap to speak</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#04061A",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  stateOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: FULL_SIZE / 2,
  },
  rings: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: FULL_SIZE,
    height: FULL_SIZE,
    borderRadius: FULL_SIZE / 2,
  },
  iconWrap: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  compactLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
