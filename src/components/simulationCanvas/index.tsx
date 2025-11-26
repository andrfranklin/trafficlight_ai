"use client";

import { useEffect, useRef } from "react";
import { Direction } from "@/types/direction";
import { SubState } from "@/types/light-state";

export interface SimulatorCanvasProps {
  width: number;
  height: number;
  counts: Record<Direction, number>;
  waitTimes: Record<Direction, number>;
  phase: Direction;
  subState: SubState;
  timer: number;
  simTime: number;
  served: number;
  avgWait: number;
}

export default function SimulatorCanvas(props: SimulatorCanvasProps) {
  const {
    width,
    height,
    counts,
    waitTimes,
    phase,
    subState,
    timer,
    simTime,
    served,
    avgWait,
  } = props;

  const ref = useRef<HTMLCanvasElement>(null);

  const light = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    on: boolean,
    color: string,
    defaultColor?: string
  ) => {
    ctx.fillStyle = on ? color : defaultColor || "#253041";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    const W = cvs.width,
      H = cvs.height;
    const cx = W / 2,
      cy = H / 2,
      laneW = 60,
      stopDist = 90;

    // background
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, W, H);

    // roads
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, cy - laneW, W, laneW * 2);
    ctx.fillRect(cx - laneW, 0, laneW * 2, H);

    // stop lines
    ctx.strokeStyle = "#334155";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - stopDist, cy - laneW);
    ctx.lineTo(cx - stopDist, cy + laneW);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + stopDist, cy - laneW);
    ctx.lineTo(cx + stopDist, cy + laneW);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - laneW, cy - stopDist);
    ctx.lineTo(cx + laneW, cy - stopDist);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - laneW, cy + stopDist);
    ctx.lineTo(cx + laneW, cy + stopDist);
    ctx.stroke();
    ctx.setLineDash([]);

    // lights
    const isGreen = (d: Direction) => subState === "green" && phase === d;
    const isYellow = subState === "yellow";

    light(ctx, cx - laneW * 0.5, cy - stopDist - 24, isGreen("N"), "#22c55e");
    light(ctx, cx + stopDist + 24, cy - laneW * 0.5, isGreen("E"), "#22c55e");
    light(ctx, cx + laneW * 0.5, cy + stopDist + 24, isGreen("S"), "#22c55e");
    light(ctx, cx - stopDist - 24, cy + laneW * 0.5, isGreen("W"), "#22c55e");
    light(ctx, cx, cy, isYellow, "#f59e0b");

    // counts
    ctx.fillStyle = "#e7eefc";
    ctx.font = "14px ui-monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(counts.N), cx, cy - stopDist - 48);
    ctx.fillText(String(counts.E), cx + stopDist + 48, cy);
    ctx.fillText(String(counts.S), cx, cy + stopDist + 48);
    ctx.fillText(String(counts.W), cx - stopDist - 48, cy);

    // ⬅⬅ NOVO: tempos de espera
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px ui-monospace";

    ctx.fillText(`${waitTimes.N.toFixed(1)}s`, cx, cy - stopDist - 30);
    ctx.fillText(`${waitTimes.E.toFixed(1)}s`, cx + stopDist + 30, cy + 20);
    ctx.fillText(`${waitTimes.S.toFixed(1)}s`, cx, cy + stopDist + 30);
    ctx.fillText(`${waitTimes.W.toFixed(1)}s`, cx - stopDist - 30, cy + 20);

    // HUD
    ctx.fillStyle = "rgba(15,23,42,.7)";
    ctx.fillRect(12, 12, 290, 124);

    ctx.fillStyle = "#cdd5e1";
    ctx.textAlign = "left";
    ctx.fillText(`Fase: ${phase} (${subState})`, 22, 36);
    ctx.fillText(`Tempo restante: ${timer.toFixed(1)}s`, 22, 56);
    ctx.fillText(`Tempo simulado: ${simTime.toFixed(0)}s`, 22, 76);
    ctx.fillText(`Servidos: ${served}`, 22, 96);
    ctx.fillText(`Espera média: ${avgWait.toFixed(2)}s`, 22, 116);
  }, [
    width,
    height,
    counts,
    waitTimes,  // ⬅ REDESENHA QUANDO TEMPO MUDA
    phase,
    subState,
    timer,
    simTime,
    served,
    avgWait,
  ]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ display: "block", height: "auto" }}
    />
  );
}
