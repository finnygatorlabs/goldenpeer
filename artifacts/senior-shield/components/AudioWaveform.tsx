import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  isSpeaking: boolean;
  isListening: boolean;
  width?: number;
  height?: number;
}

const DISPLAY_BARS = 48;

export default function AudioWaveform({
  analyser,
  isSpeaking,
  isListening,
  width = 280,
  height = 48,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const fadeRef = useRef(0);
  const isSpeakingRef = useRef(isSpeaking);
  const isListeningRef = useRef(isListening);
  const runningRef = useRef(false);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dataRef = useRef<{
    dataArray: Uint8Array;
    mapped: Float32Array;
    smoothed: Float32Array;
  } | null>(null);

  isSpeakingRef.current = isSpeaking;
  isListeningRef.current = isListening;

  if (Platform.OS !== "web") return null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    dataRef.current = {
      dataArray: new Uint8Array(bufferLength),
      mapped: new Float32Array(DISPLAY_BARS).fill(0),
      smoothed: new Float32Array(DISPLAY_BARS).fill(0),
    };

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [analyser, width, height]);

  useEffect(() => {
    const active = isSpeaking || isListening;

    if (active && !runningRef.current) {
      runningRef.current = true;
      startLoop();
    }

    if (!active && runningRef.current && fadeRef.current < 0.005) {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [isSpeaking, isListening]);

  function mapFrequencyData(raw: Uint8Array, out: Float32Array) {
    const srcLen = raw.length;
    const focus = Math.floor(srcLen * 0.45);

    for (let i = 0; i < DISPLAY_BARS; i++) {
      const t = i / DISPLAY_BARS;
      const srcPos = t < 0.6
        ? (t / 0.6) * focus
        : focus + ((t - 0.6) / 0.4) * (srcLen - focus);

      const lo = Math.floor(srcPos);
      const hi = Math.min(lo + 1, srcLen - 1);
      const frac = srcPos - lo;
      const val = (raw[lo] * (1 - frac) + raw[hi] * frac) / 255;

      const boost = 1 + (1 - t) * 0.4;
      const minFloor = 0.08 + Math.sin(t * Math.PI) * 0.06;
      out[i] = Math.max(val * boost, minFloor);
    }
  }

  function startLoop() {
    function draw() {
      const ctx = ctxRef.current;
      const d = dataRef.current;
      if (!ctx || !d) return;

      const active = isSpeakingRef.current || isListeningRef.current;

      if (analyser && active) {
        analyser.getByteFrequencyData(d.dataArray);
        mapFrequencyData(d.dataArray, d.mapped);
      } else if (!active) {
        d.mapped.fill(0);
      }

      const targetFade = active ? 1 : 0;
      fadeRef.current += (targetFade - fadeRef.current) * 0.06;

      ctx.clearRect(0, 0, width, height);

      if (fadeRef.current < 0.005) {
        if (!active) {
          runningRef.current = false;
          return;
        }
      }

      for (let i = 0; i < DISPLAY_BARS; i++) {
        d.smoothed[i] += (d.mapped[i] - d.smoothed[i]) * 0.22;
      }

      const centerY = height / 2;
      const sliceW = width / DISPLAY_BARS;
      const now = Date.now() * 0.0025;
      const fade = fadeRef.current;

      const layers = [
        { color: [139, 92, 246], alpha: 0.3, scale: 0.6, lineW: 4, phaseOff: 0, speed: 1.0, waves: 4 },
        { color: [96, 165, 250], alpha: 0.5, scale: 0.8, lineW: 2.5, phaseOff: 1.5, speed: 1.3, waves: 3.5 },
        { color: [210, 190, 255], alpha: 0.9, scale: 1.0, lineW: 1.8, phaseOff: 3.0, speed: 0.8, waves: 5 },
      ];

      for (const layer of layers) {
        const { color, alpha, scale, lineW, phaseOff, speed, waves } = layer;
        const [r, g, b] = color;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * fade})`;
        ctx.lineWidth = lineW;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < DISPLAY_BARS; i++) {
          const x = i * sliceW;
          const amp = d.smoothed[i] * scale * fade;
          const travelWave = Math.sin((i / DISPLAY_BARS) * Math.PI * waves + now * speed + phaseOff);
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.7 + i * 0.15 + phaseOff);
          const y = centerY + travelWave * amp * (height * 0.44) * (0.7 + pulse * 0.3);
          points.push({ x, y });
        }

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const cpx = (prev.x + curr.x) / 2;
          const cpy = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
        }
        ctx.stroke();
      }

      const grd = ctx.createLinearGradient(0, 0, 0, height);
      grd.addColorStop(0, `rgba(139,92,246,${0.08 * fade})`);
      grd.addColorStop(0.5, `rgba(96,165,250,${0.14 * fade})`);
      grd.addColorStop(1, `rgba(139,92,246,${0.08 * fade})`);
      ctx.fillStyle = grd;

      ctx.beginPath();
      for (let i = 0; i < DISPLAY_BARS; i++) {
        const x = i * sliceW;
        const amp = d.smoothed[i] * fade;
        const y = centerY - amp * (height * 0.35);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = DISPLAY_BARS - 1; i >= 0; i--) {
        const x = i * sliceW;
        const amp = d.smoothed[i] * fade;
        const y = centerY + amp * (height * 0.35);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
  }

  if (typeof document === "undefined") return null;

  return (
    <View style={[waveStyles.container, { width, height }]}>
      <canvas
        ref={canvasRef}
        style={{ width, height, display: "block" }}
      />
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
