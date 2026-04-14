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
        backgroundColor: "rgba(255, 255, 255, 0.85)",
      }}
    />
  );
}

function Cloud({
  left,
  top,
  scale = 1,
  opacity = 0.8,
  driftRange = 8,
  driftDuration = 8000,
}: {
  left: number;
  top: number;
  scale?: number;
  opacity?: number;
  driftRange?: number;
  driftDuration?: number;
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
      <CloudPuff cx={20} cy={35} r={18} />
      <CloudPuff cx={40} cy={25} r={22} />
      <CloudPuff cx={60} cy={20} r={26} />
      <CloudPuff cx={82} cy={24} r={20} />
      <CloudPuff cx={100} cy={32} r={16} />
      <CloudPuff cx={50} cy={38} r={20} />
      <CloudPuff cx={72} cy={36} r={18} />
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
    { leftPct: -0.08, topPct: 0.05, scale: 1.2, opacity: 0.85, driftRange: 12, driftDuration: 10000 },
    { leftPct: 0.50, topPct: 0.15, scale: 0.8, opacity: 0.70, driftRange: 8, driftDuration: 9000 },
    { leftPct: 0.12, topPct: 0.35, scale: 1.4, opacity: 0.75, driftRange: 15, driftDuration: 12000 },
    { leftPct: 0.62, topPct: 0.50, scale: 0.7, opacity: 0.60, driftRange: 6, driftDuration: 7000 },
    { leftPct: 0.28, topPct: 0.65, scale: 1.0, opacity: 0.70, driftRange: 10, driftDuration: 11000 },
    { leftPct: 0.72, topPct: 0.78, scale: 0.9, opacity: 0.55, driftRange: 9, driftDuration: 8500 },
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
