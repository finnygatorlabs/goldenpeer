import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

interface DayNightBackgroundProps {
  isDark?: boolean;
  children?: React.ReactNode;
}

function Cloud({ left, top, opacity = 0.25 }: { left: number; top: number; opacity?: number }) {
  const cloudOpacity = useSharedValue(opacity);
  const cloudScale = useSharedValue(1);

  useEffect(() => {
    cloudOpacity.value = withRepeat(
      withSequence(
        withTiming(opacity * 0.6, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(opacity, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    cloudScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const cloudStyle = useAnimatedStyle(() => ({
    opacity: cloudOpacity.value,
    transform: [{ scale: cloudScale.value }],
  }));

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          width: 120,
          height: 50,
          borderRadius: 25,
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          left,
          top,
        },
        cloudStyle,
      ]}
    />
  );
}

function Star({ x, y, duration = 3000 }: { x: number; y: number; duration?: number }) {
  const starOpacity = useSharedValue(0.3 + Math.random() * 0.4);

  useEffect(() => {
    starOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9 + Math.random() * 0.1, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const starStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          width: 2,
          height: 2,
          borderRadius: 1,
          backgroundColor: "#FFFFFF",
          left: x,
          top: y,
        },
        starStyle,
      ]}
    />
  );
}

export default function DayNightBackground({
  isDark: isDarkProp,
  children,
}: DayNightBackgroundProps) {
  const { width: screenW } = useWindowDimensions();

  const isDark = useMemo(() => {
    if (isDarkProp !== undefined) return isDarkProp;
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  }, [isDarkProp]);

  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 35; i++) {
      arr.push({
        xPct: Math.random(),
        yPct: Math.random() * 0.7,
        duration: 2500 + Math.random() * 2500,
      });
    }
    return arr;
  }, []);

  const clouds = useMemo(() => [
    { leftPct: 0.05, topPct: 0.10, opacity: 0.15 },
    { leftPct: 0.55, topPct: 0.25, opacity: 0.12 },
    { leftPct: 0.20, topPct: 0.50, opacity: 0.18 },
    { leftPct: 0.70, topPct: 0.65, opacity: 0.10 },
  ], []);

  const bgOpacity = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    bgOpacity.value = withTiming(isDark ? 1 : 0, {
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isDark]);

  const nightStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const dayStyle = useAnimatedStyle(() => ({
    opacity: 1 - bgOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Reanimated.View style={[styles.background, dayStyle]}>
        <LinearGradient
          colors={["#87CEEB", "#E0F6FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        >
          {clouds.map((c, i) => (
            <Cloud key={i} left={screenW * c.leftPct} top={300 * c.topPct} opacity={c.opacity} />
          ))}
        </LinearGradient>
      </Reanimated.View>

      <Reanimated.View style={[styles.background, nightStyle]}>
        <LinearGradient
          colors={["#0B1A2B", "#000814"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        >
          {stars.map((s, i) => (
            <Star
              key={i}
              x={screenW * s.xPct}
              y={300 * s.yPct}
              duration={s.duration}
            />
          ))}
        </LinearGradient>
      </Reanimated.View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
});
