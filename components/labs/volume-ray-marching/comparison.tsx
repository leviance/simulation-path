"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Camera, Mode, Settings } from "@/lib/labs/volume-ray-marching/model";
import type { Volume } from "@/lib/labs/volume-ray-marching/volume";
import type { Preview } from "@/lib/labs/volume-ray-marching/jobs";
import styles from "./volume-ray-marching.module.css";

const modes: { mode: Mode; title: string; question: string; explanation: string }[] = [
  {
    mode: "mip",
    title: "MIP",
    question: "Vùng đậm nhất nằm ở đâu?",
    explanation: "Giữ mật độ lớn nhất gặp trên mỗi tia.",
  },
  {
    mode: "average",
    title: "Average",
    question: "Cả đường đi đậm đến mức nào?",
    explanation: "Lấy trung bình mật độ theo độ dài đoạn tia.",
  },
  {
    mode: "alpha",
    title: "Alpha",
    question: "Lớp trước che lớp sau thế nào?",
    explanation: "Tích lũy màu theo thứ tự, có phần truyền qua.",
  },
];
function ComparisonImage({ image, current }: { image: Preview | null; current: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1, dpr: 1 });
  const buffer = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const rect = element.getBoundingClientRect();
        const next = {
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
          dpr: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
        };
        const width = Math.round(next.width * next.dpr),
          height = Math.round(next.height * next.dpr);
        if (element.width !== width) element.width = width;
        if (element.height !== height) element.height = height;
        setSize((old) =>
          old.width === next.width && old.height === next.height && old.dpr === next.dpr
            ? old
            : next,
        );
      });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
  useLayoutEffect(() => {
    const element = canvas.current,
      context = element?.getContext("2d");
    if (!element || !context) return;
    context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    context.fillStyle = "#0b1420";
    context.fillRect(0, 0, size.width, size.height);
    if (image) {
      const offscreen = buffer.current ?? document.createElement("canvas");
      buffer.current = offscreen;
      offscreen.width = image.width;
      offscreen.height = image.height;
      offscreen
        .getContext("2d")
        ?.putImageData(
          new ImageData(new Uint8ClampedArray(image.rgba), image.width, image.height),
          0,
          0,
        );
      const scale = Math.min(size.width / image.width, size.height / image.height);
      const width = image.width * scale,
        height = image.height * scale;
      context.drawImage(
        offscreen,
        (size.width - width) / 2,
        (size.height - height) / 2,
        width,
        height,
      );
    }
    element.dataset.ready = image && current ? "true" : "false";
  }, [image, current, size]);
  return <canvas ref={canvas} className={styles.comparisonCanvas} aria-hidden="true" />;
}

export function ComparisonStrip({
  volume,
  datasetKey,
  camera,
  settings,
  stage,
  enabled,
  onMode,
}: {
  volume: Volume;
  datasetKey: string;
  camera: Camera;
  settings: Settings;
  stage: number;
  enabled: boolean;
  onMode: (mode: Mode) => void;
}) {
  const { stepLength, sigma, cutoff, palette, early, lighting } = settings;
  const shared = useMemo(
    () => ({ stepLength, sigma, cutoff, palette, early, lighting }),
    [stepLength, sigma, cutoff, palette, early, lighting],
  );
  const key = JSON.stringify([datasetKey, camera, shared, stage]);
  const [stored, setStored] = useState<{
    key: string;
    images: { mode: Mode; image: Preview }[];
  } | null>(null);
  const [failure, setFailure] = useState({ key: "", message: "" });
  const current = enabled && stored?.key === key;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const watchdog = setTimeout(() => {
      controller.abort(new Error("Comparison exceeded its 20-second budget"));
      setFailure({
        key,
        message: "Ba ảnh vượt ngân sách 20 giây. Đổi một tham số hoặc đặt lại để thử lại.",
      });
    }, 20000);
    const timer = setTimeout(() => {
      void import("@/lib/labs/volume-ray-marching/jobs")
        .then(async ({ renderPreview }) => {
          const images: { mode: Mode; image: Preview }[] = [];
          for (const item of modes) {
            controller.signal.throwIfAborted();
            if (item.mode === "alpha" && stage < 6) continue;
            const image = await renderPreview(
              camera,
              volume,
              { ...shared, mode: item.mode },
              stage,
              96,
              60,
              controller.signal,
            );
            images.push({ mode: item.mode, image });
          }
          if (!controller.signal.aborted) {
            setStored({ key, images });
            setFailure({ key: "", message: "" });
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) setFailure({ key, message: String(error) });
        })
        .finally(() => clearTimeout(watchdog));
    }, 180);
    return () => {
      clearTimeout(timer);
      clearTimeout(watchdog);
      controller.abort();
    };
  }, [volume, camera, shared, stage, key, enabled]);
  return (
    <section
      className={styles.comparison}
      aria-label="So sánh ba cách nhìn cùng dữ liệu"
      data-comparison-ready={current ? "true" : "false"}
    >
      <h4>Cùng dữ liệu, ba câu hỏi khác nhau</h4>
      <p>
        Ba ảnh giữ cùng dữ liệu, vị trí camera và tham số. Chọn một ảnh để xem lớn; đổi camera sẽ
        cập nhật cả ba. Đây là preview CPU, không phải số đo GPU C++.
      </p>
      <div className={styles.comparisonGrid}>
        {modes.map((item) => (
          <button
            key={item.mode}
            type="button"
            className={styles.comparisonCard}
            aria-label={`${item.title}: ${item.question}`}
            aria-pressed={settings.mode === item.mode}
            disabled={item.mode === "alpha" && stage < 6}
            onClick={() => onMode(item.mode)}
          >
            <strong>{item.title}</strong>
            <ComparisonImage
              image={stored?.images.find((value) => value.mode === item.mode)?.image ?? null}
              current={current}
            />
            <span>{item.question}</span>
            <small>{item.explanation}</small>
          </button>
        ))}
      </div>
      {!current && (
        <p role="status">
          Đang cập nhật ba ảnh… Ảnh cũ chỉ được giữ tạm, chưa phải kết quả của tham số mới.
        </p>
      )}
      {failure.key === key && <p role="alert">Không tính được ảnh so sánh: {failure.message}</p>}
    </section>
  );
}
