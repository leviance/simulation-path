"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Point } from "@/lib/labs/geometry";
import {
  insidePaint,
  maximumRawPoints,
  maximumStrokes,
  paintHeight,
  paintWidth,
  renderPaint,
  strokePresets,
} from "@/lib/labs/paint";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import { drawStrokeLab, strokeBoard } from "./stroke-lab-view";
import type { InteractiveLabMode } from "./types";

export default function StrokeLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<HTMLCanvasElement | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const brushOnly = mode === "stroke-brush";
  const samplingOnly = mode === "stroke-sampling";
  const initialPreset = brushOnly ? "dot" : mode === "stroke-validation" ? "separate" : "line";
  const initialInterpolation = !brushOnly && !samplingOnly;
  const [paths, setPaths] = useState<Point[][]>(strokePresets[initialPreset]);
  const pathsRef = useRef(paths);
  const owner = useRef<number | null>(null);
  const keyboardDrawing = useRef(false);
  const [preset, setPreset] = useState(initialPreset);
  const [interpolate, setInterpolate] = useState(initialInterpolation);
  const [radius, setRadius] = useState(brushOnly ? 2 : 6);
  const [sampleEvery, setSampleEvery] = useState(1);
  const [showSamples, setShowSamples] = useState(true);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");
  const [cursor, setCursor] = useState<Point>({ x: 160, y: 90 });

  const result = useMemo(
    () => renderPaint(paths, radius, sampleEvery, interpolate),
    [paths, radius, sampleEvery, interpolate],
  );

  const releasePointer = useCallback(() => {
    keyboardDrawing.current = false;
    const id = owner.current;
    owner.current = null;
    const canvas = canvasRef.current;
    if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }, []);

  const replacePaths = useCallback((next: Point[][]) => {
    pathsRef.current = next;
    setPaths(next);
  }, []);

  const eventPoint = useCallback(
    (event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement }): Point => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { x: -1, y: -1 };
      const x = ((event.clientX - rect.left) / rect.width) * size.width;
      const y = ((event.clientY - rect.top) / rect.height) * size.height;
      const board = strokeBoard(size);
      return { x: (x - board.ox) / board.scale, y: (y - board.oy) / board.scale };
    },
    [size],
  );

  const beginPath = useCallback(
    (point: Point): boolean => {
      const current = pathsRef.current;
      if (!insidePaint(point)) return false;
      if (current.length >= maximumStrokes || current.flat().length >= maximumRawPoints) {
        setMessage("Mẫu thử đã đầy (8 nét hoặc 128 điểm). Hãy xóa để tiếp tục.");
        return false;
      }
      replacePaths([...current, [point]]);
      setPreset("custom");
      setCursor(point);
      setMessage("");
      return true;
    },
    [replacePaths],
  );

  const appendPoint = useCallback(
    (point: Point, endpoint = false): boolean => {
      if (!insidePaint(point)) {
        releasePointer();
        setMessage("Đã ra ngoài vùng vẽ. Thả rồi nhấn lại để bắt đầu nét mới.");
        return false;
      }
      const current = pathsRef.current;
      const path = current.at(-1);
      const previous = path?.at(-1);
      if (!path || !previous || (point.x === previous.x && point.y === previous.y)) return false;
      const count = current.flat().length;
      // Dành một chỗ cho pointerup; không để thinning làm mất endpoint.
      if (count >= maximumRawPoints - (endpoint ? 0 : 1)) {
        if (endpoint) releasePointer();
        setMessage("Đã đủ số điểm của mẫu thử. Hãy xóa để vẽ tiếp.");
        return false;
      }
      replacePaths([...current.slice(0, -1), [...path, point]]);
      setCursor(point);
      return true;
    },
    [releasePointer, replacePaths],
  );

  const startStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (brushOnly || paused || event.button !== 0 || !event.isPrimary || owner.current !== null)
        return;
      const point = eventPoint(event);
      if (!beginPath(point)) return;
      keyboardDrawing.current = false;
      owner.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
    },
    [brushOnly, paused, eventPoint, beginPath],
  );

  const moveStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (paused || event.pointerId !== owner.current) return;
      if ((event.buttons & 1) === 0) {
        releasePointer();
        return;
      }
      appendPoint(eventPoint(event));
    },
    [paused, eventPoint, appendPoint, releasePointer],
  );

  const endStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, cancelled = false) => {
      if (event.pointerId !== owner.current) return;
      if (!cancelled && !paused) appendPoint(eventPoint(event), true);
      releasePointer();
    },
    [paused, eventPoint, appendPoint, releasePointer],
  );

  const reset = useCallback(() => {
    releasePointer();
    replacePaths(strokePresets[initialPreset]);
    setPreset(initialPreset);
    setInterpolate(initialInterpolation);
    setRadius(brushOnly ? 2 : 6);
    setSampleEvery(1);
    setShowSamples(true);
    setPaused(false);
    setCursor({ x: 160, y: 90 });
    setMessage("");
  }, [releasePointer, replacePaths, initialPreset, initialInterpolation, brushOnly]);

  const clear = useCallback(() => {
    releasePointer();
    replacePaths([]);
    setPreset("custom");
    setMessage("");
  }, [releasePointer, replacePaths]);

  const togglePaused = useCallback(() => {
    releasePointer();
    setPaused((value) => !value);
  }, [releasePointer]);

  useEffect(() => {
    const onBlur = () => releasePointer();
    const onHidden = () => {
      if (document.hidden) releasePointer();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHidden);
      releasePointer();
    };
  }, [releasePointer]);

  useEffect(() => {
    releasePointer();
  }, [size.width, size.height, releasePointer]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const bitmap = bitmapRef.current ?? document.createElement("canvas");
    bitmapRef.current = bitmap;
    bitmap.width = paintWidth;
    bitmap.height = paintHeight;
    const imageContext = bitmap.getContext("2d");
    if (!imageContext) return;
    const image = imageContext.createImageData(paintWidth, paintHeight);
    result.pixels.forEach((pixel, index) => {
      image.data[index * 4] = pixel >>> 24;
      image.data[index * 4 + 1] = (pixel >>> 16) & 255;
      image.data[index * 4 + 2] = (pixel >>> 8) & 255;
      image.data[index * 4 + 3] = pixel & 255;
    });
    imageContext.putImageData(image, 0, 0);
    drawStrokeLab(
      ctx,
      size,
      bitmap,
      result.input,
      showSamples,
      cursor,
      brushOnly ? radius : undefined,
    );
  }, [result, size, showSamples, cursor, brushOnly, radius]);

  const keyDown = useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Enter",
          "Escape",
          "Delete",
          " ",
          "r",
          "R",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      if (event.repeat) return;
      if (event.key === " ") {
        togglePaused();
        return;
      }
      if (event.key.toLowerCase() === "r") {
        reset();
        return;
      }
      if (paused) return;
      if (brushOnly) return;
      if (event.key === "Escape") {
        releasePointer();
        return;
      }
      if (event.key === "Delete") {
        clear();
        return;
      }
      if (event.key === "Enter") {
        const wasDrawing = keyboardDrawing.current;
        releasePointer();
        if (!wasDrawing) keyboardDrawing.current = beginPath(cursor);
        return;
      }
      const next = { ...cursor };
      if (event.key === "ArrowLeft") next.x -= 20;
      if (event.key === "ArrowRight") next.x += 20;
      if (event.key === "ArrowUp") next.y -= 20;
      if (event.key === "ArrowDown") next.y += 20;
      if (!insidePaint(next)) return;
      if (keyboardDrawing.current) appendPoint(next, true);
      else setCursor(next);
    },
    [cursor, paused, brushOnly, togglePaused, reset, releasePointer, clear, beginPath, appendPoint],
  );

  return (
    <div className="lab-body">
      <p>
        Ảnh thử 320×180 pixel dùng cùng công thức tô tròn và nội suy với C++ (960×540). Thay tham số
        sẽ vẽ lại mẫu để so sánh, không phải đổi màu các nét cũ trong Mini Paint.
        {!brushOnly && " Các chấm trắng chỉ đánh dấu input, không thuộc ảnh pixel."}
      </p>
      <div className="lab-controls">
        <label>
          Mẫu thử
          <select
            disabled={paused || brushOnly}
            value={preset}
            onChange={(event) => {
              releasePointer();
              setPreset(event.target.value);
              replacePaths(strokePresets[event.target.value]);
              setMessage("");
            }}
          >
            <option value="dot">Một chấm</option>
            <option value="line">Đường thẳng</option>
            <option value="corner">Góc gấp</option>
            <option value="separate">Hai nét rời</option>
            {preset === "custom" && <option value="custom">Tự vẽ</option>}
          </select>
        </label>
        {!brushOnly && (
          <label>
            Giữ 1 trên N mẫu
            <input
              disabled={paused}
              type="range"
              min="1"
              max="8"
              step="1"
              value={sampleEvery}
              onChange={(event) => {
                releasePointer();
                setSampleEvery(Number(event.target.value));
              }}
            />
            <output>1/{sampleEvery}</output>
          </label>
        )}
        {!brushOnly && (
          <label className="check">
            <input
              type="checkbox"
              disabled={paused || samplingOnly}
              checked={interpolate}
              onChange={(event) => {
                releasePointer();
                setInterpolate(event.target.checked);
              }}
            />
            Nội suy
          </label>
        )}
        <label>
          Bán kính bút
          <input
            disabled={paused}
            type="range"
            min="2"
            max="16"
            value={radius}
            onChange={(event) => {
              releasePointer();
              setRadius(Number(event.target.value));
            }}
          />
          <output>{radius} pixel ảnh</output>
        </label>
        {!brushOnly && (
          <label className="check">
            <input
              type="checkbox"
              checked={showSamples}
              onChange={(event) => setShowSamples(event.target.checked)}
            />
            Hiện mẫu chuột
          </label>
        )}
        <button onClick={togglePaused}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        <button onClick={reset}>Đặt lại</button>
        <button disabled={paused} onClick={clear}>
          Xóa
        </button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label={
          brushOnly
            ? "Canvas phóng to từng pixel của đầu bút tròn; đổi bán kính bằng thanh điều khiển"
            : "Canvas thử đầu bút và nội suy; Enter mở nét, mũi tên nối đoạn, Delete xóa, Space tạm dừng"
        }
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={(event) => endStroke(event)}
        onPointerCancel={(event) => endStroke(event, true)}
        onLostPointerCapture={(event) => {
          if (event.pointerId === owner.current) owner.current = null;
        }}
        onBlur={releasePointer}
        onKeyDown={keyDown}
      />
      <LabReadout
        items={[
          { label: "Số nét độc lập", value: paths.length },
          { label: "Mẫu được giữ", value: result.input.flat().length },
          { label: "Số dấu bút", value: result.stamps.flat().length },
          { label: "Khoảng input lớn nhất", value: result.inputGap.toFixed(2) + " px" },
          { label: "Khoảng dấu bút lớn nhất", value: result.stampGap.toFixed(2) + " px" },
          { label: "Ngưỡng spacing", value: (radius * 0.8).toFixed(2) + " px" },
          { label: "Pixel đã tô", value: result.markedPixels },
          { label: "Con trỏ bàn phím", value: cursor.x + ", " + cursor.y },
        ]}
      />
      <p role="status">{message}</p>
      <p>
        {brushOnly ? (
          "Chế độ này phóng to một đầu bút để đếm pixel; đổi bán kính để thử công thức đường tròn."
        ) : (
          <>
            Nội suy chỉ nối thẳng hai mẫu, không khôi phục đường cong đã mất. Click/kéo để thêm nét;
            ra ngoài vùng ảnh sẽ kết thúc nét. Với bàn phím: Enter bắt đầu/kết thúc nét; mũi tên
            dịch con trỏ cam 20 pixel và chỉ vẽ khi nét đang mở. Tab rời Canvas. Tạm dừng khóa việc
            vẽ và chỉnh mẫu.
          </>
        )}{" "}
        {reducedMotion && "Lab không tự chạy hoạt ảnh; các thao tác thủ công vẫn dùng được."}
      </p>
    </div>
  );
}
