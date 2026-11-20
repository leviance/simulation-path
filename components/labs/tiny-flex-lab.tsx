"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { bases, gap, shareLine } from "@/lib/labs/tiny-flex-space";
import { useCanvasSize } from "./lab-shared";
import { useClientReady } from "@/components/use-client-ready";

const min = 40,
  max = 220;
const clampWidth = (px: number) => Math.min(max, Math.max(min, Math.round(px)));
const digits = (value: number) =>
  new Intl.NumberFormat("vi", { maximumFractionDigits: 1 }).format(value);

// No animation: every position on the ruler is a fully settled layout, including overflow.
export default function TinyFlexLab({ mode }: { mode?: string }) {
  const [width, setWidth] = useState(150);
  const [grow, setGrow] = useState(2);
  const canvas = useRef<HTMLCanvasElement>(null);
  const owner = useRef<number | null>(null);
  const ready = useClientReady();
  const size = useCanvasSize(canvas);
  const { first, second, remainder, overflow } = shareLine(width, grow);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h, dpr } = size;
    const scale = (w - 56) / max;
    const at = (x: number) => 28 + x * scale;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#152932";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "14px system-ui";
    ctx.fillStyle = "#dceced";
    ctx.fillText("Chiều rộng dành cho hai nút", 28, 32);
    ctx.strokeStyle = "#67858b";
    ctx.beginPath();
    ctx.moveTo(at(0), 62);
    ctx.lineTo(at(max), 62);
    ctx.stroke();
    for (let n = 0; n <= max; n += 20) {
      ctx.fillStyle = "#8ca8ad";
      ctx.fillRect(at(n), 57, 1, 11);
      if (n % 40 === 0) ctx.fillText(String(n), at(n) - 4, 86);
    }
    function block(start: number, base: number, total: number, tint: string) {
      if (!ctx) return;
      ctx.fillStyle = "#667e89";
      ctx.fillRect(at(start), 108, base * scale, 41);
      ctx.fillStyle = tint;
      ctx.fillRect(at(start + base), 108, (total - base) * scale, 41);
      ctx.strokeStyle = "#d7e5e9";
      ctx.strokeRect(at(start), 108, total * scale, 41);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(at(0), 102, width * scale, 55);
    ctx.clip();
    block(0, bases[0], first, "#76dabe");
    block(first + gap, bases[1], second, "#edb778");
    ctx.restore();
    const boundary = at(width);
    ctx.strokeStyle = "#f8de82";
    ctx.beginPath();
    ctx.moveTo(boundary, 49);
    ctx.lineTo(boundary, 164);
    ctx.stroke();
    ctx.fillStyle = "#f8de82";
    ctx.fillRect(boundary - 5, 49, 10, 12);
    ctx.fillText("Khung: " + width + " px", 28, 190);
    ctx.fillStyle = "#bccfd3";
    ctx.fillText("Xám: basis   ·   Màu: phần chia thêm", 28, 218);
    if (overflow > 0) {
      ctx.fillStyle = "#ffc2ac";
      ctx.fillText("Bị cắt ở mép: " + overflow + " px", 28, 244);
    }
  }, [size, width, first, second, overflow]);
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width)
      setWidth(
        clampWidth(
          ((((e.clientX - rect.left) * size.width) / rect.width - 28) * max) / (size.width - 56),
        ),
      );
  }
  function end(e: PointerEvent<HTMLCanvasElement>) {
    if (owner.current !== e.pointerId) return;
    owner.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return (
    <fieldset className="lab-controls" data-flex-ruler={mode} disabled={!ready} inert={!ready}>
      <legend>Thước chia chỗ trống · không có hoạt ảnh tự chạy</legend>
      <canvas
        ref={canvas}
        width={640}
        height={260}
        style={{ width: "100%", height: 260, display: "block", touchAction: "pan-y" }}
        aria-label="Thước hai nút. Kéo mép vàng hoặc dùng thanh chiều rộng bên dưới."
        onPointerDown={(e) => {
          if (e.button !== 0 || owner.current !== null) return;
          owner.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          point(e);
        }}
        onPointerMove={(e) => {
          if (owner.current === e.pointerId) point(e);
        }}
        onPointerUp={(e) => {
          if (owner.current === e.pointerId) point(e);
          end(e);
        }}
        onLostPointerCapture={end}
        onPointerCancel={end}
      />
      <label>
        Chiều rộng (px){" "}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
      </label>
      <label>
        Grow của nút B{" "}
        <select value={grow} onChange={(e) => setGrow(Number(e.target.value))}>
          <option>0</option>
          <option>1</option>
          <option>2</option>
          <option>3</option>
        </select>
      </label>
      <button type="button" onClick={() => setWidth(50)}>
        Thử khung hẹp 50 px
      </button>
      <button
        type="button"
        onClick={() => {
          setWidth(150);
          setGrow(2);
        }}
      >
        Đặt lại ví dụ 1:2
      </button>
      <p aria-live="polite" aria-atomic="true">
        Khung {width} px. Hai basis 20 và 30 px, cách nhau {gap} px. Dư {digits(remainder)} px. Nút
        A: {digits(first)} px; nút B: {digits(second)} px.
        {overflow > 0 ? " Tràn " + overflow + " px, không tự thu nhỏ nút." : ""}
      </p>
    </fieldset>
  );
}
