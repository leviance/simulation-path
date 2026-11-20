"use client";
import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Dataset } from "@/lib/labs/volume-slicer/dataset";
import { defaultCamera, limitCamera, type Camera } from "@/lib/labs/volume-slicer/camera";
import type { Vec3, DisplayWindow } from "@/lib/labs/volume-slicer";
import { useCanvasSize } from "../lab-shared";
import styles from "./volume-slicer.module.css";
interface Props {
  data: Dataset;
  probe: Vec3;
  slices: Float32Array[];
  window: DisplayWindow;
  colored: boolean;
  linear: boolean;
  camera: Camera;
  cut: boolean;
  cancelVersion: number;
  setCamera: Dispatch<SetStateAction<Camera>>;
  stop: () => void;
}
export function SceneView({
  data,
  probe,
  slices,
  window: displayWindow,
  colored,
  linear,
  camera,
  cut,
  cancelVersion,
  setCamera,
  stop,
}: Props) {
  const helpId = useId();
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [interactive, setInteractive] = useState(false),
    [error, setError] = useState(""),
    [paintedKey, setPaintedKey] = useState("");
  const key = [
    data.preset,
    data.side,
    ...probe,
    camera.yaw,
    camera.pitch,
    camera.distance,
    cut,
    colored,
    linear,
    displayWindow.level,
    displayWindow.width,
    size.width,
    size.height,
    size.dpr,
    interactive,
  ].join(",");
  const rawXY = slices[0],
    rawXZ = slices[1],
    rawYZ = slices[2];
  useEffect(() => {
    if (!data.mesh || !rawXY.length || !rawXZ.length || !rawYZ.length) return;
    let cancelled = false,
      frame = 0;
    void import("@/lib/labs/volume-slicer/context-render")
      .then(({ renderContext }) => {
        if (cancelled) return;
        frame = requestAnimationFrame(() => {
          if (cancelled || !canvas.current) return;
          try {
            const width = interactive ? 280 : 440,
              height = Math.min(640, Math.max(180, Math.round((width * size.height) / size.width)));
            const rgba = renderContext(
              data.mesh!,
              data.volume,
              probe,
              [rawXY, rawXZ, rawYZ],
              displayWindow,
              colored,
              camera,
              cut,
              width,
              height,
            );
            const offscreen = document.createElement("canvas");
            offscreen.width = width;
            offscreen.height = height;
            offscreen
              .getContext("2d")!
              .putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
            const element = canvas.current,
              context = element.getContext("2d")!;
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, element.width, element.height);
            context.imageSmoothingEnabled = true;
            context.drawImage(offscreen, 0, 0, element.width, element.height);
            setError("");
            setPaintedKey(key);
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : String(failure));
          }
        });
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(String(failure));
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [
    data,
    probe,
    rawXY,
    rawXZ,
    rawYZ,
    displayWindow,
    colored,
    camera,
    cut,
    size,
    interactive,
    key,
  ]);
  useEffect(() => {
    const element = canvas.current;
    const release = () => {
      if (drag.current && element?.hasPointerCapture(drag.current.id))
        element.releasePointerCapture(drag.current.id);
      drag.current = null;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setCamera((old) =>
        limitCamera({ ...old, distance: old.distance * Math.exp(event.deltaY * 0.001) }),
      );
    };
    const blur = () => {
      release();
      setInteractive(false);
    };
    element?.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", blur);
    return () => {
      release();
      element?.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", blur);
    };
  }, [cancelVersion, data, setCamera]);
  return (
    <figure className={styles.scene}>
      <figcaption>
        <strong>Khối mẫu / góc nhìn 3D</strong>
        <span>Vỏ iso 0.12, stride 2 · dữ liệu đo không lấy từ vỏ</span>
      </figcaption>
      <canvas
        ref={canvas}
        className={styles.sceneCanvas}
        data-scene-ready={paintedKey === key ? "true" : "false"}
        aria-label="Khối mẫu cắt mở 3D"
        aria-describedby={helpId}
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0 || drag.current) return;
          event.currentTarget.focus();
          stop();
          setInteractive(true);
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const previous = drag.current;
          if (!previous || previous.id !== event.pointerId) return;
          const dx = event.clientX - previous.x,
            dy = event.clientY - previous.y;
          previous.x = event.clientX;
          previous.y = event.clientY;
          setCamera((old) =>
            limitCamera({ ...old, yaw: old.yaw + dx * 0.008, pitch: old.pitch + dy * 0.008 }),
          );
        }}
        onPointerUp={(event) => {
          if (drag.current?.id === event.pointerId) {
            drag.current = null;
            setInteractive(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          setInteractive(false);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
          setInteractive(false);
        }}
        onKeyDown={(event) => {
          if (
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "+", "-", "="].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          stop();
          setCamera((old) => {
            const next = { ...old };
            if (event.key === "Home") return { ...defaultCamera };
            if (event.key === "ArrowLeft") next.yaw -= 0.08;
            if (event.key === "ArrowRight") next.yaw += 0.08;
            if (event.key === "ArrowUp") next.pitch += 0.08;
            if (event.key === "ArrowDown") next.pitch -= 0.08;
            if (["+", "="].includes(event.key)) next.distance *= 0.9;
            if (event.key === "-") next.distance /= 0.9;
            return limitCamera(next);
          });
        }}
      >
        Khối được cắt theo ba tọa độ của probe; kéo hoặc mũi tên chỉ xoay camera, wheel/+/- zoom,
        Home đặt lại góc nhìn.
      </canvas>
      <p id={helpId} className={styles.hint}>
        Kéo/mũi tên xoay góc nhìn, wheel/+/- zoom, Home đặt lại. Các thao tác này không đổi điểm đo.
        Vỏ 3D không phải phép đo mật độ dọc tia.
      </p>
      {error && <p role="alert">Không vẽ được khối: {error}</p>}
    </figure>
  );
}
