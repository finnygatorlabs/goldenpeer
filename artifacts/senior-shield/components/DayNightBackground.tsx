import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, useWindowDimensions, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

const cirrusClouds = require("../assets/images/cirrus-clouds.png");

interface DayNightBackgroundProps {
  isDark?: boolean;
  children?: React.ReactNode;
}

function CloudLayer({
  left,
  top,
  width,
  height,
  opacity = 0.5,
  driftRange = 15,
  driftDuration = 20000,
  flipX = false,
  flipY = false,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity?: number;
  driftRange?: number;
  driftDuration?: number;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(driftRange, { duration: driftDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(-driftRange, { duration: driftDuration * 1.15, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scaleX: flipX ? -1 : 1 },
      { scaleY: flipY ? -1 : 1 },
    ],
  }));

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          left,
          top,
          width,
          height,
          opacity,
        },
        animStyle,
      ]}
    >
      <Image
        source={cirrusClouds}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
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

  const cloudLayers = useMemo(() => {
    const layerH = 90;
    return [
      { leftPct: -0.15, topPct: 0.02, widthPct: 0.85, opacity: 0.45, driftRange: 12, driftDuration: 28000, flipX: false, flipY: false },
      { leftPct: 0.35, topPct: 0.18, widthPct: 0.80, opacity: 0.38, driftRange: 18, driftDuration: 32000, flipX: true, flipY: false },
      { leftPct: -0.05, topPct: 0.40, widthPct: 0.75, opacity: 0.35, driftRange: 14, driftDuration: 25000, flipX: false, flipY: true },
      { leftPct: 0.30, topPct: 0.60, widthPct: 0.70, opacity: 0.30, driftRange: 16, driftDuration: 30000, flipX: true, flipY: true },
      { leftPct: 0.10, topPct: 0.80, widthPct: 0.65, opacity: 0.28, driftRange: 10, driftDuration: 26000, flipX: false, flipY: false },
    ];
  }, []);

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
          {cloudLayers.map((c, i) => (
            <CloudLayer
              key={i}
              left={screenW * c.leftPct}
              top={300 * c.topPct}
              width={screenW * c.widthPct}
              height={90}
              opacity={c.opacity}
              driftRange={c.driftRange}
              driftDuration={c.driftDuration}
              flipX={c.flipX}
              flipY={c.flipY}
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
