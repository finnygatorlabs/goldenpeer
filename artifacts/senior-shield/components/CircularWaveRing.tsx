import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";

interface CircularWaveRingProps {
  size: number;
  isListening: boolean;
  isSpeaking: boolean;
  analyser: AnalyserNode | null;
}

const RING_BINS = 64;
const BASE_RADIUS_RATIO = 0.5;
const MAX_DEFORM = 0.15;

export default function CircularWaveRing({
  size,
  isListening,
  isSpeaking,
  analyser,
}: CircularWaveRingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const fadeRef = useRef(0);
  const runningRef = useRef(false);
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);
  const smoothedRef = useRef(new Float32Array(RING_BINS).fill(0));

  isListeningRef.current = isListening;
  isSpeakingRef.current = isSpeaking;

  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (!isWeb) return;
    const active = isListening || isSpeaking;
    if (active && !runningRef.current) {
      runningRef.current = true;
      startLoop();
    }
  }, [isListening, isSpeaking]);

  useEffect(() => {
    if (!isWeb) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [size]);

  function startLoop() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : new Uint8Array(64);
    const smoothed = smoothedRef.current;

    function draw() {
      if (!ctx) return;

      const active = isListeningRef.current || isSpeakingRef.current;
      const targetFade = active ? 1 : 0;
      fadeRef.current += (targetFade - fadeRef.current) * 0.07;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      if (fadeRef.current < 0.003 && !active) {
        runningRef.current = false;
        return;
      }

      if (analyser && active) {
        analyser.getByteFrequencyData(dataArray);
      }

      const srcLen = dataArray.length;
      for (let i = 0; i < RING_BINS; i++) {
        const srcI = Math.floor((i / RING_BINS) * srcLen * 0.5);
        const raw = dataArray[srcI] / 255;
        const target = active ? raw : 0;
        smoothed[i] += (target - smoothed[i]) * 0.18;
      }

      const cx = size / 2;
      const cy = size / 2;
      const baseR = size * BASE_RADIUS_RATIO;
      const now = Date.now() * 0.001;
      const fade = fadeRef.current;

      const isListen = isListeningRef.current;
      const isSpeak = isSpeakingRef.current;

      const layers = isListen ? [
        { r: 103, g: 232, b: 249, alpha: 0.25, lineW: 4, deformScale: 0.7, radiusOff: 6, phaseOff: 0, speed: 1.8 },
        { r: 165, g: 243, b: 252, alpha: 0.5, lineW: 2.5, deformScale: 0.85, radiusOff: 3, phaseOff: 1.0, speed: 2.2 },
        { r: 207, g: 250, b: 254, alpha: 0.8, lineW: 1.5, deformScale: 1.0, radiusOff: 0, phaseOff: 2.0, speed: 1.5 },
      ] : [
        { r: 139, g: 92, b: 246, alpha: 0.2, lineW: 4, deformScale: 0.6, radiusOff: 7, phaseOff: 0, speed: 1.2 },
        { r: 96, g: 165, b: 250, alpha: 0.45, lineW: 2.5, deformScale: 0.8, radiusOff: 3.5, phaseOff: 1.3, speed: 1.6 },
        { r: 147, g: 197, b: 253, alpha: 0.75, lineW: 1.5, deformScale: 1.0, radiusOff: 0, phaseOff: 2.6, speed: 1.0 },
      ];

      for (const layer of layers) {
        const { r, g, b, alpha, lineW, deformScale, radiusOff, phaseOff, speed } = layer;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * fade})`;
        ctx.lineWidth = lineW;
        ctx.lineJoin = "round";

        const points: { x: number; y: number }[] = [];
        const segments = 120;

        for (let s = 0; s <= segments; s++) {
          const angle = (s / segments) * Math.PI * 2;
          const binIndex = Math.floor((s / segments) * RING_BINS) % RING_BINS;

          const mirrorIndex = (RING_BINS - binIndex) % RING_BINS;
          const amp = (smoothed[binIndex] + smoothed[mirrorIndex]) * 0.5;

          const wave1 = Math.sin(angle * 6 + now * speed + phaseOff) * 0.3;
          const wave2 = Math.sin(angle * 3 - now * speed * 0.7 + phaseOff * 1.5) * 0.2;
          const wave3 = Math.sin(angle * 9 + now * speed * 1.3 + phaseOff * 0.7) * 0.15;
          const organic = wave1 + wave2 + wave3;

          const organicWeight = isListen ? 0.55 : 0.15;
          const deform = (amp * deformScale + organic * organicWeight) * MAX_DEFORM * fade;
          const r2 = baseR + radiusOff + deform * baseR;

          points.push({
            x: cx + Math.cos(angle) * r2,
            y: cy + Math.sin(angle) * r2,
          });
        }

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const cpx = (prev.x + curr.x) / 2;
          const cpy = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
        }
        ctx.closePath();
        ctx.stroke();

        if (layer === layers[layers.length - 1]) {
          const grad = ctx.createRadialGradient(cx, cy, baseR * 0.8, cx, cy, baseR + 12);
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
          grad.addColorStop(0.7, `rgba(${r},${g},${b},${0.04 * fade})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
  }

  if (!isWeb || typeof document === "undefined") return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        position: "absolute" as any,
        top: 0,
        left: 0,
        pointerEvents: "none" as any,
      }}
    />
  );
}
