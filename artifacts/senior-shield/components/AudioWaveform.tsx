import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  isSpeaking: boolean;
  isListening: boolean;
  width?: number;
  height?: number;
}

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
  const dataRef = useRef<{ dataArray: Uint8Array; smoothed: Float32Array } | null>(null);

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
      smoothed: new Float32Array(bufferLength).fill(0),
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

  function startLoop() {
    function draw() {
      const ctx = ctxRef.current;
      const d = dataRef.current;
      if (!ctx || !d) return;

      const active = isSpeakingRef.current || isListeningRef.current;

      if (analyser && active) {
        analyser.getByteFrequencyData(d.dataArray);
      } else if (!active) {
        for (let i = 0; i < d.dataArray.length; i++) d.dataArray[i] = 0;
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

      const centerY = height / 2;
      const usableBins = Math.min(d.dataArray.length, 80);
      const sliceW = width / usableBins;
      const now = Date.now() * 0.002;

      for (let i = 0; i < usableBins; i++) {
        const raw = d.dataArray[i] / 255;
        d.smoothed[i] += (raw - d.smoothed[i]) * 0.3;
      }

      const layers = [
        { color: [139, 92, 246], alpha: 0.35, scale: 0.65, lineW: 3.5, phaseOff: 0 },
        { color: [96, 165, 250], alpha: 0.55, scale: 0.82, lineW: 2.5, phaseOff: 1.2 },
        { color: [200, 180, 255], alpha: 0.85, scale: 1.0, lineW: 1.8, phaseOff: 2.4 },
      ];

      for (const layer of layers) {
        const { color, alpha, scale, lineW, phaseOff } = layer;
        const [r, g, b] = color;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * fadeRef.current})`;
        ctx.lineWidth = lineW;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < usableBins; i++) {
          const x = i * sliceW;
          const amp = d.smoothed[i] * scale * fadeRef.current;
          const phase = (i / usableBins) * Math.PI * 3 + now + phaseOff;
          const y = centerY + Math.sin(phase) * amp * (height * 0.42);
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
      grd.addColorStop(0, `rgba(139,92,246,${0.06 * fadeRef.current})`);
      grd.addColorStop(0.5, `rgba(96,165,250,${0.1 * fadeRef.current})`);
      grd.addColorStop(1, `rgba(139,92,246,${0.06 * fadeRef.current})`);
      ctx.fillStyle = grd;

      ctx.beginPath();
      for (let i = 0; i < usableBins; i++) {
        const x = i * sliceW;
        const amp = d.smoothed[i] * fadeRef.current;
        const y = centerY - amp * (height * 0.3);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = usableBins - 1; i >= 0; i--) {
        const x = i * sliceW;
        const amp = d.smoothed[i] * fadeRef.current;
        const y = centerY + amp * (height * 0.3);
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
