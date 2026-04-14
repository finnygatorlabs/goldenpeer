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

interface WispStroke {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  opacity: number;
}

interface CirrusWisp {
  strokes: WispStroke[];
  width: number;
  height: number;
}

const CIRRUS_WISPS: CirrusWisp[] = [
  {
    width: 200, height: 60,
    strokes: [
      { x: 0, y: 28, w: 80, h: 6, rotate: -12, opacity: 0.5 },
      { x: 30, y: 22, w: 90, h: 5, rotate: -8, opacity: 0.6 },
      { x: 70, y: 18, w: 100, h: 7, rotate: -15, opacity: 0.45 },
      { x: 110, y: 25, w: 70, h: 4, rotate: -5, opacity: 0.4 },
      { x: 50, y: 35, w: 60, h: 5, rotate: -10, opacity: 0.35 },
      { x: 140, y: 20, w: 55, h: 4, rotate: -18, opacity: 0.3 },
    ],
  },
  {
    width: 180, height: 70,
    strokes: [
      { x: 10, y: 40, w: 70, h: 5, rotate: -20, opacity: 0.55 },
      { x: 40, y: 30, w: 100, h: 6, rotate: -10, opacity: 0.5 },
      { x: 80, y: 22, w: 80, h: 5, rotate: -25, opacity: 0.45 },
      { x: 20, y: 50, w: 50, h: 4, rotate: -5, opacity: 0.35 },
      { x: 100, y: 35, w: 65, h: 4, rotate: -15, opacity: 0.4 },
    ],
  },
  {
    width: 220, height: 50,
    strokes: [
      { x: 0, y: 25, w: 110, h: 5, rotate: -6, opacity: 0.5 },
      { x: 60, y: 18, w: 90, h: 6, rotate: -12, opacity: 0.55 },
      { x: 120, y: 22, w: 80, h: 4, rotate: -8, opacity: 0.4 },
      { x: 30, y: 32, w: 70, h: 5, rotate: -3, opacity: 0.35 },
      { x: 160, y: 15, w: 55, h: 4, rotate: -18, opacity: 0.3 },
      { x: 90, y: 30, w: 60, h: 3, rotate: -10, opacity: 0.3 },
      { x: 10, y: 38, w: 45, h: 4, rotate: -14, opacity: 0.25 },
    ],
  },
  {
    width: 160, height: 55,
    strokes: [
      { x: 5, y: 35, w: 60, h: 5, rotate: -22, opacity: 0.5 },
      { x: 35, y: 25, w: 80, h: 6, rotate: -15, opacity: 0.55 },
      { x: 75, y: 18, w: 70, h: 5, rotate: -28, opacity: 0.4 },
      { x: 50, y: 40, w: 55, h: 4, rotate: -8, opacity: 0.35 },
      { x: 100, y: 30, w: 50, h: 3, rotate: -12, opacity: 0.3 },
    ],
  },
  {
    width: 240, height: 65,
    strokes: [
      { x: 0, y: 35, w: 100, h: 6, rotate: -10, opacity: 0.5 },
      { x: 50, y: 25, w: 120, h: 5, rotate: -8, opacity: 0.55 },
      { x: 100, y: 18, w: 90, h: 6, rotate: -14, opacity: 0.45 },
      { x: 150, y: 25, w: 75, h: 4, rotate: -6, opacity: 0.4 },
      { x: 30, y: 42, w: 80, h: 4, rotate: -4, opacity: 0.3 },
      { x: 120, y: 35, w: 60, h: 4, rotate: -18, opacity: 0.35 },
      { x: 180, y: 20, w: 50, h: 3, rotate: -20, opacity: 0.25 },
      { x: 70, y: 48, w: 55, h: 3, rotate: -12, opacity: 0.25 },
    ],
  },
  {
    width: 170, height: 50,
    strokes: [
      { x: 10, y: 30, w: 75, h: 5, rotate: -18, opacity: 0.5 },
      { x: 50, y: 20, w: 85, h: 5, rotate: -12, opacity: 0.5 },
      { x: 90, y: 15, w: 65, h: 4, rotate: -22, opacity: 0.4 },
      { x: 30, y: 38, w: 50, h: 4, rotate: -6, opacity: 0.35 },
      { x: 110, y: 28, w: 55, h: 3, rotate: -15, opacity: 0.3 },
      { x: 60, y: 40, w: 40, h: 3, rotate: -8, opacity: 0.25 },
    ],
  },
  {
    width: 190, height: 60,
    strokes: [
      { x: 5, y: 38, w: 85, h: 5, rotate: -16, opacity: 0.5 },
      { x: 45, y: 28, w: 95, h: 6, rotate: -10, opacity: 0.55 },
      { x: 90, y: 20, w: 80, h: 5, rotate: -20, opacity: 0.45 },
      { x: 130, y: 28, w: 55, h: 4, rotate: -8, opacity: 0.35 },
      { x: 20, y: 45, w: 60, h: 4, rotate: -5, opacity: 0.3 },
      { x: 70, y: 42, w: 50, h: 3, rotate: -14, opacity: 0.28 },
      { x: 150, y: 22, w: 38, h: 3, rotate: -25, opacity: 0.25 },
    ],
  },
];

function CirrusCloud({
  left,
  top,
  scale = 1,
  opacity = 0.8,
  driftRange = 15,
  driftDuration = 20000,
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
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(driftRange, { duration: driftDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(-driftRange, { duration: driftDuration * 1.1, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale }],
  }));

  const wisp = CIRRUS_WISPS[variant % CIRRUS_WISPS.length];

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          left,
          top,
          width: wisp.width,
          height: wisp.height,
          opacity,
        },
        animStyle,
      ]}
    >
      {wisp.strokes.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.w,
            height: s.h,
            borderRadius: s.h,
            backgroundColor: `rgba(255, 255, 255, ${s.opacity})`,
            transform: [{ rotate: `${s.rotate}deg` }],
          }}
        />
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

  const wisps = useMemo(() => [
    { leftPct: 0.50, topPct: 0.02, scale: 1.0, opacity: 0.55, driftRange: 18, driftDuration: 22000, variant: 0 },
    { leftPct: -0.10, topPct: 0.15, scale: 0.85, opacity: 0.50, driftRange: 22, driftDuration: 26000, variant: 1 },
    { leftPct: 0.25, topPct: 0.30, scale: 1.2, opacity: 0.50, driftRange: 16, driftDuration: 20000, variant: 2 },
    { leftPct: 0.60, topPct: 0.45, scale: 0.75, opacity: 0.45, driftRange: 20, driftDuration: 18000, variant: 3 },
    { leftPct: 0.05, topPct: 0.58, scale: 1.1, opacity: 0.48, driftRange: 14, driftDuration: 28000, variant: 4 },
    { leftPct: 0.40, topPct: 0.72, scale: 0.9, opacity: 0.45, driftRange: 18, driftDuration: 24000, variant: 5 },
    { leftPct: 0.70, topPct: 0.85, scale: 0.8, opacity: 0.42, driftRange: 20, driftDuration: 21000, variant: 6 },
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
          {wisps.map((w, i) => (
            <CirrusCloud
              key={i}
              left={screenW * w.leftPct}
              top={300 * w.topPct}
              scale={w.scale}
              opacity={w.opacity}
              driftRange={w.driftRange}
              driftDuration={w.driftDuration}
              variant={w.variant}
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
