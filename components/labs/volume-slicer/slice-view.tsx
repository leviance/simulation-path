"use client";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { axesFor, type Vec3, type Grid, extent, clampPoint } from "@/lib/labs/volume-slicer";
import { canvasPoint, setupCanvas, useCanvasSize } from "../lab-shared";
import styles from "./volume-slicer.module.css";
const colors = ["#f1a567", "#6daee0", "#73ccab"];
export function fitImage(grid: Grid, view: number, width: number, height: number) {
  const axes = axesFor(view),
    size = extent(grid);
  const scale = Math.min((width - 24) / size[axes.horizontal], (height - 24) / size[axes.vertical]);
  return {
    x: (width - size[axes.horizontal] * scale) / 2,
    y: (height - size[axes.vertical] * scale) / 2,
    width: size[axes.horizontal] * scale,
    height: size[axes.vertical] * scale,
  };
}
interface Props {
  grid: Grid;
  view: number;
  probe: Vec3;
  rgba: Uint8ClampedArray;
  stage: number;
  cancelVersion: number;
  onProbe: (point: Vec3) => void;
  onSelect: (view: number) => void;
  stop: () => void;
}
export function SliceView({
  grid,
  view,
  probe,
  rgba,
  stage,
  cancelVersion,
  onProbe,
  onSelect,
  stop,
}: Props) {
  const helpId = useId();
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    drag = useRef<number | null>(null);
  const image = fitImage(grid, view, size.width, size.height),
    axes = axesFor(view),
    physical = extent(grid);
  const buffer = useRef<{ canvas: HTMLCanvasElement; rgba: Uint8ClampedArray } | null>(null);
  useEffect(() => {
    const element = canvas.current,
      context = element?.getContext("2d");
    if (!element || !context) return;
    setupCanvas(context, size);
    if (rgba.length === 256 * 256 * 4) {
      if (buffer.current?.rgba !== rgba) {
        const offscreen = document.createElement("canvas");
        offscreen.width = 256;
        offscreen.height = 256;
        offscreen
          .getContext("2d")!
          .putImageData(new ImageData(new Uint8ClampedArray(rgba), 256, 256), 0, 0);
        buffer.current = { canvas: offscreen, rgba };
      }
      context.imageSmoothingEnabled = false;
      context.drawImage(buffer.current.canvas, image.x, image.y, image.width, image.height);
    }
    const x =
      image.x +
      ((probe[axes.horizontal] - grid.origin[axes.horizontal]) / physical[axes.horizontal]) *
        image.width;
    const y =
      image.y +
      (1 - (probe[axes.vertical] - grid.origin[axes.vertical]) / physical[axes.vertical]) *
        image.height;
    context.strokeStyle = colors[view];
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, image.y);
    context.lineTo(x, image.y + image.height);
    context.moveTo(image.x, y);
    context.lineTo(image.x + image.width, y);
    context.stroke();
    context.strokeRect(x - 4, y - 4, 8, 8);
  }, [
    rgba,
    grid,
    probe,
    axes.horizontal,
    axes.vertical,
    physical,
    image.x,
    image.y,
    image.width,
    image.height,
    size,
    view,
  ]);
  useEffect(() => {
    const element = canvas.current;
    const release = () => {
      if (drag.current !== null && element?.hasPointerCapture(drag.current))
        element.releasePointerCapture(drag.current);
      drag.current = null;
    };
    window.addEventListener("blur", release);
    return () => {
      release();
      window.removeEventListener("blur", release);
    };
  }, [cancelVersion]);
  const pick = (clientX: number, clientY: number, clamp: boolean) => {
    if (!canvas.current || stage < 7) return false;
    const p = canvasPoint({ clientX, clientY }, canvas.current);
    if (
      !clamp &&
      (p.x < image.x ||
        p.y < image.y ||
        p.x >= image.x + image.width ||
        p.y >= image.y + image.height)
    )
      return false;
    const u = Math.max(0, Math.min(1, (p.x - image.x) / image.width)),
      v = Math.max(0, Math.min(1, 1 - (p.y - image.y) / image.height));
    const point: Vec3 = [...probe];
    point[axes.horizontal] = grid.origin[axes.horizontal] + u * physical[axes.horizontal];
    point[axes.vertical] = grid.origin[axes.vertical] + v * physical[axes.vertical];
    onProbe(clampPoint(grid, point));
    return true;
  };
  const keyboard = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (
      stage < 7 ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    stop();
    onSelect(view);
    const point: Vec3 = [...probe];
    if (event.key === "ArrowLeft") point[axes.horizontal] -= grid.spacing[axes.horizontal];
    if (event.key === "ArrowRight") point[axes.horizontal] += grid.spacing[axes.horizontal];
    if (event.key === "ArrowUp") point[axes.vertical] += grid.spacing[axes.vertical];
    if (event.key === "ArrowDown") point[axes.vertical] -= grid.spacing[axes.vertical];
    if (event.key === "PageUp") point[axes.fixed] += grid.spacing[axes.fixed];
    if (event.key === "PageDown") point[axes.fixed] -= grid.spacing[axes.fixed];
    onProbe(clampPoint(grid, point));
  };
  return (
    <figure className={styles.slice} style={{ borderColor: colors[view] }}>
      <figcaption>
        <strong>{["XY", "XZ", "YZ"][view]}</strong>
        <span>
          {["x → / y ↑", "x → / z ↑", "y → / z ↑"][view]} · {["z", "y", "x"][view]} ={" "}
          {probe[axes.fixed].toFixed(2)} mm
        </span>
      </figcaption>
      <canvas
        ref={canvas}
        className={styles.sliceCanvas}
        aria-label={"Lát cắt " + ["XY", "XZ", "YZ"][view]}
        aria-describedby={helpId}
        tabIndex={0}
        onKeyDown={keyboard}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.focus();
          onSelect(view);
          stop();
          if (pick(event.clientX, event.clientY, false)) {
            drag.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (drag.current === event.pointerId) pick(event.clientX, event.clientY, true);
        }}
        onPointerUp={(event) => {
          if (drag.current === event.pointerId) {
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        Ảnh lấy mẫu từ volume thật; từ Bài 7, mũi tên dời điểm, PageUp/Down dời lát. Khoảng trống
        ngoài ảnh không nhận điểm chọn.
      </canvas>
      <p id={helpId} className={styles.hint}>
        Từ Bài 7: click/drag hoặc mũi tên dời điểm; PageUp/Down dời mặt cắt. Trục vuông góc giữ
        nguyên khi chọn trên ảnh.
      </p>
    </figure>
  );
}
