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

function CloudPuff({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <View
      style={{
        position: "absolute",
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: "rgba(255, 255, 255, 0.6)",
      }}
    />
  );
}

const CLOUD_SHAPES: { cx: number; cy: number; r: number }[][] = [
  [
    { cx: 18, cy: 36, r: 16 },
    { cx: 38, cy: 26, r: 22 },
    { cx: 62, cy: 20, r: 26 },
    { cx: 86, cy: 25, r: 18 },
    { cx: 50, cy: 38, r: 20 },
    { cx: 74, cy: 35, r: 17 },
  ],
  [
    { cx: 15, cy: 30, r: 14 },
    { cx: 35, cy: 22, r: 20 },
    { cx: 55, cy: 18, r: 24 },
    { cx: 78, cy: 22, r: 22 },
    { cx: 100, cy: 28, r: 16 },
    { cx: 45, cy: 34, r: 18 },
    { cx: 68, cy: 32, r: 20 },
    { cx: 90, cy: 34, r: 14 },
  ],
  [
    { cx: 22, cy: 32, r: 20 },
    { cx: 48, cy: 22, r: 28 },
    { cx: 75, cy: 26, r: 22 },
    { cx: 36, cy: 38, r: 18 },
    { cx: 60, cy: 36, r: 22 },
  ],
  [
    { cx: 12, cy: 28, r: 12 },
    { cx: 28, cy: 20, r: 18 },
    { cx: 48, cy: 16, r: 22 },
    { cx: 68, cy: 20, r: 20 },
    { cx: 85, cy: 26, r: 15 },
    { cx: 38, cy: 30, r: 16 },
    { cx: 58, cy: 30, r: 18 },
    { cx: 76, cy: 32, r: 13 },
  ],
  [
    { cx: 20, cy: 34, r: 18 },
    { cx: 42, cy: 24, r: 24 },
    { cx: 66, cy: 20, r: 20 },
    { cx: 54, cy: 36, r: 16 },
  ],
  [
    { cx: 16, cy: 30, r: 15 },
    { cx: 34, cy: 22, r: 20 },
    { cx: 56, cy: 18, r: 26 },
    { cx: 80, cy: 22, r: 20 },
    { cx: 98, cy: 30, r: 14 },
    { cx: 44, cy: 34, r: 18 },
    { cx: 70, cy: 32, r: 20 },
  ],
];

function Cloud({
  left,
  top,
  scale = 1,
  opacity = 0.8,
  driftRange = 8,
  driftDuration = 8000,
  variant = 0,
}: {
  left: number;
  top: number;
  scale?: number;
  opacity?: number;
  driftRange?: number;
  driftDuration?: number;
  variant?: number;
}) {
  const cloudOpacity = useSharedValue(opacity);
  const translateX = useSharedValue(0);

  useEffect(() => {
    cloudOpacity.value = withRepeat(
      withSequence(
        withTiming(opacity * 0.6, { duration: driftDuration * 0.8, easing: Easing.inOut(Easing.ease) }),
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
    transform: [{ translateX: translateX.value }, { scale }],
  }));

  const puffs = CLOUD_SHAPES[variant % CLOUD_SHAPES.length];

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          left,
          top,
          width: 120,
          height: 60,
        },
        cloudStyle,
      ]}
    >
      {puffs.map((p, i) => (
        <CloudPuff key={i} cx={p.cx} cy={p.cy} r={p.r} />
      ))}
    </Reanimated.View>
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
    { leftPct: 0.55, topPct: 0.06, scale: 1.1, opacity: 0.30, driftRange: 20, driftDuration: 18000, variant: 0 },
    { leftPct: -0.05, topPct: 0.22, scale: 0.8, opacity: 0.25, driftRange: 25, driftDuration: 22000, variant: 1 },
    { leftPct: 0.35, topPct: 0.40, scale: 1.3, opacity: 0.28, driftRange: 18, driftDuration: 20000, variant: 2 },
    { leftPct: 0.70, topPct: 0.55, scale: 0.7, opacity: 0.22, driftRange: 22, driftDuration: 16000, variant: 3 },
    { leftPct: 0.10, topPct: 0.70, scale: 1.0, opacity: 0.25, driftRange: 15, driftDuration: 24000, variant: 4 },
    { leftPct: 0.50, topPct: 0.82, scale: 0.9, opacity: 0.20, driftRange: 20, driftDuration: 19000, variant: 5 },
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
              scale={c.scale}
              opacity={c.opacity}
              driftRange={c.driftRange}
              driftDuration={c.driftDuration}
              variant={c.variant}
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
