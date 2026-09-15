"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import type { Point, ViewportSize } from "@/lib/labs/geometry";

export type CanvasSize = ViewportSize & { dpr: number };

function subscribeReducedMotion(callback: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function useCanvasSize(canvasRef: RefObject<HTMLCanvasElement | null>): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({ width: 760, height: 340, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let pendingFrame: number | null = null;

    const sync = () => {
      pendingFrame = null;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
      const width = Math.max(280, Math.round(rect.width));
      const height = Math.max(260, Math.round(rect.height));
      const bitmapWidth = Math.round(width * dpr);
      const bitmapHeight = Math.round(height * dpr);

      // Changing width/height clears the canvas. More importantly, doing it on
      // every ResizeObserver delivery can make the canvas resize itself again
      // when its CSS size is not yet available.
      if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
      if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;

      setSize((current) =>
        current.width === width && current.height === height && current.dpr === dpr
          ? current
          : { width, height, dpr },
      );
    };

    const scheduleSync = () => {
      if (pendingFrame !== null) return;
      // ResizeObserver callbacks run during layout. Defer bitmap writes until
      // the next frame so they cannot create an observer-delivery loop.
      pendingFrame = requestAnimationFrame(sync);
    };

    scheduleSync();
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(canvas);
    window.addEventListener("resize", scheduleSync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleSync);
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    };
  }, [canvasRef]);

  return size;
}

export function canvasPoint(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function setupCanvas(ctx: CanvasRenderingContext2D, size: CanvasSize) {
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, size.width, size.height);
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  color: string,
  width = 1,
) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function LabReadout({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="lab-readout" aria-live="polite">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
