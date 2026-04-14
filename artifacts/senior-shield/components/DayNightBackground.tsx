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

function Cloud({
  left,
  top,
  width = 120,
  height = 50,
  opacity = 0.25,
  driftRange = 8,
  driftDuration = 8000,
}: {
  left: number;
  top: number;
  width?: number;
  height?: number;
  opacity?: number;
  driftRange?: number;
  driftDuration?: number;
}) {
  const cloudOpacity = useSharedValue(opacity);
  const translateX = useSharedValue(0);

  useEffect(() => {
    cloudOpacity.value = withRepeat(
      withSequence(
        withTiming(opacity * 0.5, { duration: driftDuration * 0.8, easing: Easing.inOut(Easing.ease) }),
        withTiming(opacity, { duration: driftDuration * 0.8, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(driftRange, { duration: driftDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(-driftRange, { duration: driftDuration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const cloudStyle = useAnimatedStyle(() => ({
    opacity: cloudOpacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
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
    { leftPct: -0.05, topPct: 0.05, width: 140, height: 45, opacity: 0.30, driftRange: 12, driftDuration: 10000 },
    { leftPct: 0.50, topPct: 0.12, width: 100, height: 35, opacity: 0.22, driftRange: 8, driftDuration: 9000 },
    { leftPct: 0.15, topPct: 0.30, width: 160, height: 55, opacity: 0.28, driftRange: 15, driftDuration: 12000 },
    { leftPct: 0.65, topPct: 0.42, width: 90, height: 30, opacity: 0.18, driftRange: 6, driftDuration: 7000 },
    { leftPct: 0.30, topPct: 0.55, width: 130, height: 42, opacity: 0.25, driftRange: 10, driftDuration: 11000 },
    { leftPct: 0.75, topPct: 0.68, width: 110, height: 38, opacity: 0.20, driftRange: 9, driftDuration: 8500 },
    { leftPct: 0.02, topPct: 0.75, width: 80, height: 28, opacity: 0.15, driftRange: 5, driftDuration: 7500 },
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
            <Cloud
              key={i}
              left={screenW * c.leftPct}
              top={300 * c.topPct}
              width={c.width}
              height={c.height}
              opacity={c.opacity}
              driftRange={c.driftRange}
              driftDuration={c.driftDuration}
            />
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
