"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clamp } from "@/lib/labs/geometry";
import { LabReadout, canvasPoint, setupCanvas, useCanvasSize } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function PixelLab({ mode: lessonMode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const initialPattern =
    lessonMode === "pixel-rgba" || lessonMode === "pixel-memory" ? "solid" : "checker";
  const [mode, setMode] = useState(initialPattern);
  const [columns, setColumns] = useState(16);
  const [channels, setChannels] = useState({ r: 83, g: 240, b: 174, a: 255 });
  const [hover, setHover] = useState({ x: 4, y: 3 });
  const [paused, setPaused] = useState(false);
  const rows = 9;
  const memoryOnly = lessonMode === "pixel-memory";
  const rgbaOnly = lessonMode === "pixel-rgba";

  const metrics = useMemo(() => {
    const panelWidth = size.width >= 560 ? 245 : 125;
    const cell = Math.max(
      4,
      Math.min((size.width - panelWidth - 42) / columns, (size.height - 48) / rows),
    );
    return { columns, rows, cell, ox: 20, oy: 24 };
  }, [columns, size]);

  const colorAt = useCallback(
    (x: number, y: number) => {
      if (mode === "solid") return [channels.r, channels.g, channels.b, channels.a];
      if (mode === "gradient") {
        return [
          Math.floor((x / Math.max(1, columns - 1)) * 255),
          Math.floor((y / Math.max(1, rows - 1)) * 255),
          180,
          255,
        ];
      }
      if (mode === "noise") {
        let state = 17;
        const linearIndex = y * columns + x;
        for (let index = 0; index <= linearIndex; index += 1) {
          state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        }
        const value = state >>> 24;
        return [value, Math.floor(value / 2), 255 - value, 255];
      }
      return (x + y) % 2 ? [31, 43, 68, 255] : [83, 240, 174, 255];
    },
    [channels, columns, mode],
  );
  const selectedColor = useMemo(() => colorAt(hover.x, hover.y), [colorAt, hover.x, hover.y]);
  const [selectedR, selectedG, selectedB, selectedA] = selectedColor;
  const selectedPacked =
    (((selectedR << 24) >>> 0) | (selectedG << 16) | (selectedB << 8) | selectedA) >>> 0;
  const selectedPackedHex = selectedPacked.toString(16).toUpperCase().padStart(8, "0");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    const { columns, rows, cell, ox, oy } = metrics;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const [r, g, b, a] = colorAt(x, y);
        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
      }
    }
    ctx.strokeStyle = paused ? "#ffb454" : "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + hover.x * cell, oy + hover.y * cell, cell, cell);

    const [r, g, b, a] = selectedColor;
    const tx = ox + columns * cell + 18;
    ctx.fillStyle = "#9aa6c1";
    ctx.font = "11px ui-monospace";
    ctx.fillText("COORDINATE", tx, 52);
    ctx.fillStyle = "#fff";
    ctx.font = "700 18px ui-monospace";
    ctx.fillText(`(${hover.x}, ${hover.y})`, tx, 76);
    ctx.fillStyle = "#9aa6c1";
    ctx.font = "11px ui-monospace";
    ctx.fillText("LINEAR INDEX", tx, 112);
    ctx.fillStyle = "#53f0ae";
    ctx.font = "700 15px ui-monospace";
    ctx.fillText(`${hover.y} × ${columns} + ${hover.x}`, tx, 135);
    ctx.fillText(`= ${hover.y * columns + hover.x}`, tx, 157);
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    ctx.fillRect(tx, 187, 28, 28);
    ctx.fillStyle = "#fff";
    ctx.font = "12px ui-monospace";
    ctx.fillText(`${r}, ${g}, ${b}, ${a}`, tx, 235);
    ctx.fillText(`0x${selectedPackedHex}`, tx, 257);
  }, [colorAt, columns, hover, metrics, paused, selectedColor, selectedPackedHex, size]);

  const updatePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const point = canvasPoint(event, event.currentTarget);
    const { columns, rows, cell, ox, oy } = metrics;
    const x = Math.floor((point.x - ox) / cell);
    const y = Math.floor((point.y - oy) / cell);
    if (x >= 0 && x < columns && y >= 0 && y < rows) setHover({ x, y });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (paused || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    setHover((point) => ({
      x: clamp(
        point.x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0),
        0,
        columns - 1,
      ),
      y: clamp(point.y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0), 0, 8),
    }));
  };

  const reset = () => {
    setMode(initialPattern);
    setColumns(16);
    setChannels({ r: 83, g: 240, b: 174, a: 255 });
    setHover({ x: 4, y: 3 });
    setPaused(false);
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        {!memoryOnly && !rgbaOnly && (
          <label>
            Preset
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              disabled={paused}
            >
              <option value="checker">Checkerboard</option>
              <option value="gradient">Gradient</option>
              <option value="noise">Deterministic noise</option>
              <option value="solid">RGBA tùy chỉnh</option>
            </select>
          </label>
        )}
        <label>
          Cột
          <input
            type="range"
            min="4"
            max="24"
            value={columns}
            onChange={(event) => {
              const value = Number(event.target.value);
              setColumns(value);
              setHover((point) => ({ ...point, x: clamp(point.x, 0, value - 1) }));
            }}
            disabled={paused}
          />
          <output>{columns}</output>
        </label>
        {!memoryOnly &&
          mode === "solid" &&
          (["r", "g", "b", "a"] as const).map((channel) => (
            <label key={channel}>
              {channel.toUpperCase()}
              <input
                type="range"
                min="0"
                max="255"
                value={channels[channel]}
                onChange={(event) =>
                  setChannels((current) => ({ ...current, [channel]: Number(event.target.value) }))
                }
                disabled={paused}
              />
              <output>{channels[channel]}</output>
            </label>
          ))}
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={(event) => {
          if (paused) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          updatePointer(event);
        }}
        onPointerMove={updatePointer}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label={`Lưới pixel ${columns} nhân ${rows}; rê chuột hoặc dùng phím mũi tên để xem tọa độ, linear index và RGBA`}
      />
      <LabReadout
        items={[
          { label: "Pixel đang chọn", value: `(${hover.x}, ${hover.y})` },
          {
            label: "Linear index",
            value: `${hover.y} × ${columns} + ${hover.x} = ${hover.y * columns + hover.x}`,
          },
          ...(memoryOnly
            ? []
            : [
                { label: "RGBA", value: `${selectedR}, ${selectedG}, ${selectedB}, ${selectedA}` },
                { label: "Packed 0xRRGGBBAA", value: `0x${selectedPackedHex}` },
                {
                  label: "Byte trên CPU little-endian",
                  value:
                    `${selectedA.toString(16).padStart(2, "0")} ${selectedB.toString(16).padStart(2, "0")} ${selectedG.toString(16).padStart(2, "0")} ${selectedR.toString(16).padStart(2, "0")}`.toUpperCase(),
                },
              ]),
        ]}
      />
    </div>
  );
}
