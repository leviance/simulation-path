"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { Point, ViewportSize } from "@/lib/labs/geometry";
import { rasterPointFromEvent, type RasterGridMetrics } from "./raster-grid";

// Các lab dùng chung quy tắc owner/capture; pointercancel không giả làm pointerup.
export function useRasterDrag(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  size: ViewportSize,
  grid: RasterGridMetrics,
  columns: number,
  rows: number,
  paused: boolean,
  begin: (point: Point) => void,
  move: (point: Point) => void,
) {
  const owner = useRef<number | null>(null);
  const release = useCallback(() => {
    const id = owner.current;
    owner.current = null;
    const canvas = canvasRef.current;
    if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }, [canvasRef]);
  const eventPoint = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) =>
      rasterPointFromEvent(event, grid, { maxX: columns - 1, maxY: rows - 1 }, size),
    [grid, columns, rows, size],
  );

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (paused || event.button !== 0 || !event.isPrimary || owner.current !== null) return;
      const point = eventPoint(event);
      if (!point) return;
      owner.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
      begin(point);
    },
    [paused, eventPoint, begin],
  );

  const moveDrag = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (paused || event.pointerId !== owner.current) return;
      const point = eventPoint(event);
      if (!point || (event.buttons & 1) === 0) {
        release();
        return;
      }
      move(point);
    },
    [paused, eventPoint, move, release],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, cancelled = false) => {
      if (event.pointerId !== owner.current) return;
      if (!cancelled && event.button !== 0) return;
      if (!paused && !cancelled) {
        const point = eventPoint(event);
        if (point) move(point);
      }
      release();
    },
    [paused, eventPoint, move, release],
  );

  useEffect(() => {
    release();
  }, [paused, size.width, size.height, release]);
  useEffect(() => {
    const onBlur = () => release();
    const onHidden = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHidden);
      release();
    };
  }, [release]);
  return { startDrag, moveDrag, endDrag, release };
}
