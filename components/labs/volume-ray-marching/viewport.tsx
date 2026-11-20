"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  defaultCamera,
  limitCamera,
  type Camera,
  type Settings,
} from "@/lib/labs/volume-ray-marching/model";
import type { Volume } from "@/lib/labs/volume-ray-marching/volume";
import { sampleDensity } from "@/lib/labs/volume-ray-marching/volume";
import { cloudLandmarks, projectLandmark } from "@/lib/labs/volume-ray-marching/cloud";
import { useCanvasSize } from "../lab-shared";
import { usePreview } from "./use-preview";
import styles from "./volume-ray-marching.module.css";
interface Props {
  stage: number;
  volume: Volume | null;
  datasetKey: string;
  camera: Camera;
  settings: Settings;
  selected: { u: number; v: number };
  cancelVersion: number;
  dataReady: boolean;
  onCamera: Dispatch<SetStateAction<Camera>>;
  onPick: (u: number, v: number) => void;
  onAspect: (aspect: number) => void;
  stop: () => void;
}
export default function Viewport({
  stage,
  volume,
  datasetKey,
  camera,
  settings,
  selected,
  cancelVersion,
  dataReady,
  onCamera,
  onPick,
  onAspect,
  stop,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas);
  const help = "Kéo/mũi tên xoay camera; wheel hoặc +/- để zoom, Home đặt lại. Từ Bài 8, giữ Shift và click để chọn tia; cũng có hai thanh u/v bên dưới. Canvas tính theo batch nhỏ, không đại diện cho tốc độ GPU C++.";
  const aspect = size.width / size.height;
  const [interactive, setInteractive] = useState(false);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    latestX: number;
    latestY: number;
    time: number;
  } | null>(null);
  const buffer = useRef<HTMLCanvasElement | null>(null);
  const preview = usePreview(
    camera,
    volume,
    datasetKey,
    settings,
    stage,
    aspect,
    interactive,
    dataReady,
  );
  useEffect(() => onAspect(aspect), [aspect, onAspect]);
  useEffect(() => {
    const element = canvas.current;
    if (!element || stage < 2) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      stop();
      onCamera((old) =>
        limitCamera({ ...old, distance: old.distance * Math.exp(event.deltaY * 0.001) }),
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [stage, stop, onCamera]);
  const release = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (active && canvas.current?.hasPointerCapture(active.id))
      canvas.current.releasePointerCapture(active.id);
    setInteractive(false);
  }, []);
  useEffect(() => {
    const element = canvas.current;
    const reset = () => release();
    window.addEventListener("blur", reset);
    const frame = requestAnimationFrame(reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", reset);
      const active = drag.current;
      drag.current = null;
      if (active && element?.hasPointerCapture(active.id)) element.releasePointerCapture(active.id);
    };
  }, [cancelVersion, release]);
  useLayoutEffect(() => {
    const element = canvas.current,
      ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.fillStyle = "#0b1420";
    ctx.fillRect(0, 0, size.width, size.height);
    if (preview.image) {
      const image = preview.image;
      const offscreen = buffer.current ?? document.createElement("canvas");
      buffer.current = offscreen;
      offscreen.width = image.width;
      offscreen.height = image.height;
      const target = offscreen.getContext("2d");
      target?.putImageData(
        new ImageData(new Uint8ClampedArray(image.rgba), image.width, image.height),
        0,
        0,
      );
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offscreen, 0, 0, size.width, size.height);
    }
    if (
      stage >= 7 &&
      volume &&
      datasetKey.startsWith("cloud:") &&
      !camera.inside &&
      camera.distance >= 2
    ) {
      cloudLandmarks.forEach((item, i) => {
        const point = projectLandmark(item.point, camera, size.width, size.height);
        if (!point || point.x < 0 || point.x > size.width || point.y < 0 || point.y > size.height)
          return;
        let x = 14,
          y = 56;
        if (i === 1) y = size.height - 65;
        if (i === 2) {
          x = Math.max(14, size.width - 205);
          y = size.height - 65;
        }
        ctx.strokeStyle = "#517e8d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 28);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.fillStyle = "#79dbc7";
        ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
        ctx.fillStyle = "rgba(8,22,31,.88)";
        ctx.fillRect(x - 5, y - 15, 190, 45);
        ctx.font = "600 14px system-ui";
        ctx.fillStyle = "#f1eadc";
        ctx.fillText(item.label, x, y);
        ctx.font = "14px ui-monospace, monospace";
        ctx.fillStyle = "#79dbc7";
        ctx.fillText("Mật độ " + sampleDensity(volume, item.point).toFixed(3), x, y + 20);
      });
    }
    if (stage >= 8) {
      const x = selected.u * size.width,
        y = selected.v * size.height;
      ctx.strokeStyle = "#6fe0cc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 7, y);
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x, y + 7);
      ctx.stroke();
    }
    element.dataset.ready = preview.ready ? "true" : "false";
    element.dataset.camera = [
      camera.yaw,
      camera.pitch,
      camera.distance,
      Number(camera.inside),
    ].join(",");
  }, [size, preview.image, preview.ready, stage, selected, camera, volume, datasetKey]);
  const applyDrag = () => {
    const active = drag.current;
    if (!active) return;
    const dx = active.latestX - active.x,
      dy = active.latestY - active.y;
    active.x = active.latestX;
    active.y = active.latestY;
    active.time = performance.now();
    if (dx || dy)
      onCamera((old) =>
        limitCamera({ ...old, yaw: old.yaw + dx * 0.006, pitch: old.pitch + dy * 0.006 }),
      );
  };
  return (
    <figure className={styles.viewport}>
      <figcaption>
        <strong>Volume / góc nhìn 3D</strong>
        <span>
          Canvas CPU · {preview.image?.width ?? 0}×{preview.image?.height ?? 0} pixel ảnh ·{" "}
          {volume ? "dữ liệu " + volume.side + "³" : "chưa có volume"}
        </span>
      </figcaption>
      <canvas
        ref={canvas}
        className={styles.canvas}
        data-ready="false"
        aria-label="Volume Lightbox"
        aria-description={help}
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0 || stage < 2) return;
          event.currentTarget.focus();
          stop();
          if (event.shiftKey && stage >= 8) {
            const rect = event.currentTarget.getBoundingClientRect();
            onPick(
              (event.clientX - rect.left) / rect.width,
              (event.clientY - rect.top) / rect.height,
            );
            return;
          }
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            latestX: event.clientX,
            latestY: event.clientY,
            time: performance.now(),
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          setInteractive(true);
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (!active || active.id !== event.pointerId) return;
          if ((event.buttons & 1) === 0) {
            release();
            return;
          }
          active.latestX = event.clientX;
          active.latestY = event.clientY;
          if (performance.now() - active.time >= 180) applyDrag();
        }}
        onPointerUp={(event) => {
          if (drag.current?.id === event.pointerId) {
            drag.current.latestX = event.clientX;
            drag.current.latestY = event.clientY;
            applyDrag();
            release();
          }
        }}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onKeyDown={(event) => {
          if (
            stage < 2 ||
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "+", "=", "-"].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          stop();
          onCamera((old) => {
            const next = { ...old };
            if (event.key === "Home") return { ...defaultCamera };
            if (event.key === "ArrowLeft") next.yaw -= 0.1;
            if (event.key === "ArrowRight") next.yaw += 0.1;
            if (event.key === "ArrowUp") next.pitch += 0.1;
            if (event.key === "ArrowDown") next.pitch -= 0.1;
            if (["+", "="].includes(event.key)) next.distance *= 0.9;
            if (event.key === "-") next.distance /= 0.9;
            return limitCamera(next);
          });
        }}
      >
        Ảnh được tạo từ các ray perspective xuyên mảng scalar thật, không phải mesh hoặc ảnh quay
        sẵn.
      </canvas>
      <p className={styles.hint}>{help}</p>
      {!preview.ready && (
        <p role="status" className={styles.progress}>
          Đang tính ảnh CPU {Math.round(preview.progress * 100)}%… Ảnh trước được giữ tạm, chưa phải
          kết quả mới.
        </p>
      )}
      {preview.error && <p role="alert">Không tính được ảnh: {preview.error}</p>}
    </figure>
  );
}
