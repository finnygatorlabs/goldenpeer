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

interface DayNightBackgroundProps {
  isDark?: boolean;
  children?: React.ReactNode;
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
        <Image
          source={require("../public/clouds.png")}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
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
