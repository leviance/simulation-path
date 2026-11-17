"use client";
import { useEffect, useRef } from "react";
import type { histogram } from "@/lib/labs/volume-slicer/statistics";
import type { Window } from "@/lib/labs/volume-slicer";
import { setupCanvas, useCanvasSize } from "../lab-shared";
import { drawHistogram } from "./context";

export function VolumeHistogram({
  stats,
  window,
}: {
  stats: ReturnType<typeof histogram>;
  window: Window;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    drawHistogram(ctx, stats, window.level, window.width, {
      x: 8,
      y: 8,
      width: size.width - 16,
      height: size.height - 16,
    });
  }, [size, stats, window.level, window.width]);
  return (
    <details>
      <summary>Histogram dữ liệu gốc · đếm đủ {stats.samples.toLocaleString("en-US")} mẫu</summary>
      <canvas
        ref={canvas}
        className="lab-canvas"
        style={{ height: 260 }}
        aria-label="Histogram volume"
      >
        Scalar nhỏ nhất {stats.minimum}, lớn nhất {stats.maximum}; tổng số mẫu {stats.samples}.
      </canvas>
    </details>
  );
}
