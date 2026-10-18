"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  createPixelBuffer,
  packRgba,
  packedHex,
  paintPixelPattern,
  pixelIndex,
  putPixel,
  unpackRgba,
  type PixelPattern,
  type RgbaChannels,
} from "@/lib/labs/pixel-memory";
import { LabReadout, canvasPoint, setupCanvas, useCanvasSize } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function PixelLab({ mode }: { mode?: InteractiveLabMode }) {
  return <PixelMemoryLab key={mode ?? "overview"} mode={mode} />;
}

function PixelMemoryLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<number | null>(null);
  const descriptionId = useId();
  const size = useCanvasSize(canvasRef);
  const memoryOnly = mode === "pixel-memory";
  const rgbaOnly = mode === "pixel-rgba";
  const initialPattern: PixelPattern = memoryOnly || rgbaOnly ? "solid" : "gradient";
  const [pattern, setPattern] = useState<PixelPattern>(initialPattern);
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(9);
  const [cell, setCell] = useState(2);
  const [seed, setSeed] = useState(17);
  const [channels, setChannels] = useState<RgbaChannels>({ r: 83, g: 240, b: 174, a: 255 });
  const [selected, setSelected] = useState({ x: 4, y: 3 });
  const [probe, setProbe] = useState({ x: 4, y: 3 });
  const [written, setWritten] = useState<{ x: number; y: number; color: number } | null>(null);
  const [message, setMessage] = useState("Chưa ghi thử pixel.");
  const [paused, setPaused] = useState(false);
  const writeColor = packRgba(channels.r, channels.g, channels.b, channels.a);
  const buffer = useMemo(() => {
    const next = createPixelBuffer(width, height);
    let color = writeColor;
    if (memoryOnly || rgbaOnly) color = packRgba(11, 16, 32);
    paintPixelPattern(next, pattern, { color, cell, seed });
    if (written) putPixel(next, written.x, written.y, written.color);
    return next;
  }, [width, height, pattern, writeColor, cell, seed, written, memoryOnly, rgbaOnly]);
  const index = pixelIndex(width, selected.x, selected.y);
  const color = unpackRgba(buffer.pixels[index]);
  const metrics = useMemo(() => {
    const pixelSize = Math.min((size.width - 32) / width, (size.height - 32) / height);
    return {
      pixelSize,
      ox: (size.width - width * pixelSize) / 2,
      oy: (size.height - height * pixelSize) / 2,
    };
  }, [size, width, height]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const { pixelSize, ox, oy } = metrics;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = unpackRgba(buffer.pixels[pixelIndex(width, x, y)]);
        // Giống SDL_BLENDMODE_NONE: alpha được lưu nhưng không dùng để pha nền.
        ctx.fillStyle = "rgb(" + value.r + "," + value.g + "," + value.b + ")";
        ctx.fillRect(
          ox + x * pixelSize,
          oy + y * pixelSize,
          Math.max(1, pixelSize - 1),
          Math.max(1, pixelSize - 1),
        );
        if (memoryOnly && pixelSize >= 20) {
          ctx.fillStyle = "#bac9e7";
          ctx.font = "12px ui-monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            String(pixelIndex(width, x, y)),
            ox + (x + 0.5) * pixelSize,
            oy + (y + 0.5) * pixelSize,
          );
        }
      }
    }
    ctx.strokeStyle = paused ? "#ffb454" : "#53f0ae";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + selected.x * pixelSize, oy + selected.y * pixelSize, pixelSize, pixelSize);
  }, [buffer, height, width, selected, memoryOnly, metrics, paused, size]);

  function releasePointer() {
    const canvas = canvasRef.current;
    const pointer = pointerRef.current;
    pointerRef.current = null;
    if (canvas && pointer !== null && canvas.hasPointerCapture(pointer))
      canvas.releasePointerCapture(pointer);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const release = () => {
      const pointer = pointerRef.current;
      pointerRef.current = null;
      if (canvas && pointer !== null && canvas.hasPointerCapture(pointer)) {
        canvas.releasePointerCapture(pointer);
      }
    };
    window.addEventListener("blur", release);
    return () => {
      release();
      window.removeEventListener("blur", release);
    };
  }, []);

  function selectPointer(event: PointerEvent<HTMLCanvasElement>) {
    if (paused || !event.isPrimary) return;
    if (pointerRef.current !== null && pointerRef.current !== event.pointerId) return;
    const point = canvasPoint(event, event.currentTarget);
    const x = Math.floor((point.x - metrics.ox) / metrics.pixelSize);
    const y = Math.floor((point.y - metrics.oy) / metrics.pixelSize);
    if (x >= 0 && x < width && y >= 0 && y < height) setSelected({ x, y });
  }

  function endPointer(event: PointerEvent<HTMLCanvasElement>, cancelled = false) {
    if (pointerRef.current !== event.pointerId) return;
    if (!cancelled) selectPointer(event);
    releasePointer();
  }

  function changeSize(nextWidth: number, nextHeight: number) {
    releasePointer();
    setWidth(nextWidth);
    setHeight(nextHeight);
    setSelected((current) => ({
      x: Math.min(current.x, nextWidth - 1),
      y: Math.min(current.y, nextHeight - 1),
    }));
    setWritten(null);
    setMessage("Đã tạo lại buffer; pixel ghi thử trước đó không được giữ.");
  }

  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (paused || event.altKey || event.ctrlKey || event.metaKey) return;
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = Math.min(index + 1, buffer.pixels.length - 1);
    else if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    else if (event.key === "ArrowDown")
      nextIndex = Math.min(index + width, buffer.pixels.length - 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - width);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = buffer.pixels.length - 1;
    else return;
    event.preventDefault();
    setSelected({ x: nextIndex % width, y: Math.floor(nextIndex / width) });
  }

  function writeProbe() {
    const candidate = { ...buffer, pixels: buffer.pixels.slice() };
    if (putPixel(candidate, probe.x, probe.y, writeColor)) {
      setWritten({ ...probe, color: writeColor });
      setSelected(probe);
      setMessage(
        "Đã ghi vào pixels[" +
          pixelIndex(width, probe.x, probe.y) +
          "]; các phần tử khác giữ nguyên.",
      );
    } else {
      setMessage("Bỏ qua tọa độ ngoài biên; không phần tử nào bị thay đổi.");
    }
  }

  function reset() {
    releasePointer();
    setPattern(initialPattern);
    setWidth(16);
    setHeight(9);
    setCell(2);
    setSeed(17);
    setChannels({ r: 83, g: 240, b: 174, a: 255 });
    setSelected({ x: 4, y: 3 });
    setProbe({ x: 4, y: 3 });
    setWritten(null);
    setMessage("Chưa ghi thử pixel.");
    setPaused(false);
  }

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Kích thước mẫu
          <select
            defaultValue=""
            disabled={paused}
            onChange={(event) => {
              const [w, h] = event.target.value.split("x").map(Number);
              changeSize(w, h);
              event.target.value = "";
            }}
          >
            <option value="" disabled>
              Chọn preset
            </option>
            <option value="4x3">4 × 3 — tính tay index</option>
            <option value="1x1">1 × 1 — trường hợp biên</option>
            <option value="16x9">16 × 9 — xem mẫu hình</option>
          </select>
        </label>
        <label>
          Width
          <input
            type="range"
            min="1"
            max="32"
            value={width}
            disabled={paused}
            onChange={(event) => changeSize(Number(event.target.value), height)}
          />
          <output>{width}</output>
        </label>
        <label>
          Height
          <input
            type="range"
            min="1"
            max="18"
            value={height}
            disabled={paused}
            onChange={(event) => changeSize(width, Number(event.target.value))}
          />
          <output>{height}</output>
        </label>
        {!memoryOnly && !rgbaOnly && (
          <label>
            Scene
            <select
              value={pattern}
              disabled={paused}
              onChange={(event) => {
                setPattern(event.target.value as PixelPattern);
                setWritten(null);
              }}
            >
              <option value="solid">1 — Solid</option>
              <option value="gradient">2 — Gradient</option>
              <option value="checker">3 — Checkerboard</option>
              <option value="noise">4 — Noise</option>
            </select>
          </label>
        )}
        {pattern === "checker" && (
          <label>
            Cell
            <input
              type="range"
              min="1"
              max="16"
              value={cell}
              disabled={paused}
              onChange={(event) => {
                setCell(Number(event.target.value));
                setWritten(null);
              }}
            />
            <output>{cell}</output>
          </label>
        )}
        {pattern === "noise" && (
          <label>
            Seed
            <input
              type="number"
              min="0"
              max="4294967295"
              value={seed}
              disabled={paused}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isInteger(value) && value >= 0 && value <= 4294967295) {
                  setSeed(value);
                  setWritten(null);
                }
              }}
            />
          </label>
        )}
        {!memoryOnly &&
          (rgbaOnly || pattern === "solid") &&
          (["r", "g", "b", "a"] as const).map((channel) => (
            <label key={channel}>
              {channel.toUpperCase()}
              <input
                type="range"
                min="0"
                max="255"
                value={channels[channel]}
                disabled={paused}
                onChange={(event) =>
                  setChannels((current) => ({ ...current, [channel]: Number(event.target.value) }))
                }
              />
              <output>{channels[channel]}</output>
            </label>
          ))}
        <button
          onClick={() => {
            releasePointer();
            setPaused((value) => !value);
          }}
        >
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <p id={descriptionId}>
        Mỗi ô phóng to là một pixel nguồn. Chọn bằng chuột, phím mũi tên, Home hoặc End; các số đọc
        bên dưới cũng dùng được khi không nhìn Canvas. Thí nghiệm không tự chuyển động.
      </p>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label={"Lưới pixel " + width + " nhân " + height}
        aria-describedby={descriptionId}
        onPointerDown={(event) => {
          if (paused || !event.isPrimary || event.button !== 0) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          pointerRef.current = event.pointerId;
          selectPointer(event);
        }}
        onPointerMove={selectPointer}
        onPointerUp={(event) => endPointer(event)}
        onPointerCancel={(event) => endPointer(event, true)}
        onLostPointerCapture={(event) => {
          if (pointerRef.current === event.pointerId) pointerRef.current = null;
        }}
        onBlur={releasePointer}
        onKeyDown={keyDown}
      />
      <LabReadout
        items={[
          { label: "Pixel đang chọn", value: "(" + selected.x + ", " + selected.y + ")" },
          {
            label: "Linear index",
            value: selected.y + " × " + width + " + " + selected.x + " = " + index,
          },
          { label: "Số phần tử", value: width + " × " + height + " = " + buffer.pixels.length },
          { label: "Pitch (byte)", value: width + " × 4 = " + width * 4 },
          { label: "Byte offset", value: index + " × 4 = " + index * 4 },
          ...(!memoryOnly
            ? [
                {
                  label: "RGBA",
                  value: color.r + ", " + color.g + ", " + color.b + ", " + color.a,
                },
                { label: "Packed 0xRRGGBBAA", value: packedHex(buffer.pixels[index]) },
                {
                  label: "Byte trên CPU little-endian",
                  value: [color.a, color.b, color.g, color.r]
                    .map((v) => v.toString(16).toUpperCase().padStart(2, "0"))
                    .join(" "),
                },
              ]
            : []),
        ]}
      />
      {!memoryOnly && (
        <>
          <div className="lab-controls">
            <label>
              X ghi thử
              <input
                type="number"
                min="-1"
                max={width}
                value={probe.x}
                disabled={paused}
                onChange={(event) => {
                  const x = Number(event.target.value);
                  if (Number.isInteger(x)) setProbe((current) => ({ ...current, x }));
                }}
              />
            </label>
            <label>
              Y ghi thử
              <input
                type="number"
                min="-1"
                max={height}
                value={probe.y}
                disabled={paused}
                onChange={(event) => {
                  const y = Number(event.target.value);
                  if (Number.isInteger(y)) setProbe((current) => ({ ...current, y }));
                }}
              />
            </label>
            <button disabled={paused} onClick={writeProbe}>
              Thử putPixel
            </button>
            <output>Màu sẽ ghi: {packedHex(writeColor)}</output>
          </div>
          <p role="status">{message}</p>
          <p>
            Alpha vẫn nằm trong số màu. Bản C++ dùng SDL_BLENDMODE_NONE nên không pha màu với nền;
            Canvas này cũng giữ RGB trực tiếp.
          </p>
        </>
      )}
    </div>
  );
}
