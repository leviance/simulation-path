"use client";
import { useClientReady } from "@/components/use-client-ready";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bankData,
  localIndex,
  spawn,
  tileNames,
  travel,
  type BankPreset,
  type View,
} from "@/lib/labs/voxel-expedition/bank";
import { bankImage } from "@/lib/labs/voxel-expedition/preview";
import { fieldCommand } from "@/lib/labs/voxel-expedition/keys";
import { VoxelFaceInspector } from "./voxel-face-inspector";

function BankLab({ stage }: { stage: number }) {
  const ready = useClientReady();
  const initial: BankPreset = stage >= 4 ? "bank" : stage === 3 ? "solid" : "stone";
  const [preset, setPreset] = useState<BankPreset>(initial);
  const [view, setView] = useState<View>(() => spawn(initial));
  const [slice, setSlice] = useState(4),
    [x, setX] = useState(7),
    [z, setZ] = useState(4);
  const [running, setRunning] = useState(false),
    [reduced, setReduced] = useState(false),
    [audit, setAudit] = useState("");
  const ref = useRef<HTMLCanvasElement>(null),
    drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const cells = useMemo(() => bankData(preset), [preset]);
  const count = useMemo(() => cells.reduce((s, b) => s + Number(b !== 0), 0), [cells]);
  const reset = useCallback((value: BankPreset) => {
    setPreset(value);
    setView(spawn(value));
    setRunning(false);
    setAudit("");
    setSlice(4);
    setX(7);
    setZ(4);
  }, []);
  const rotate = (dx: number, dy: number) =>
    setView((v) => ({
      ...v,
      yaw: v.yaw + dx,
      pitch: Math.max(-1.45, Math.min(1.45, v.pitch - dy)),
    }));
  useEffect(() => {
    const pref = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(pref.matches);
      if (pref.matches) setRunning(false);
    };
    const stop = () => {
      if (document.hidden) setRunning(false);
    };
    const blur = () => setRunning(false);
    change();
    pref.addEventListener("change", change);
    document.addEventListener("visibilitychange", stop);
    window.addEventListener("blur", blur);
    return () => {
      pref.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    if (!running || reduced) return;
    // Lượt quan sát hữu hạn, 12 thay đổi/giây; không chạy bù sau khi đổi tab.
    let last = performance.now(),
      elapsed = 0;
    const id = window.setInterval(() => {
      const now = performance.now(),
        dt = Math.min(0.16, (now - last) / 1000);
      last = now;
      elapsed += dt;
      setView((v) => ({ ...v, yaw: v.yaw + 0.12 * dt }));
      if (elapsed >= 6) setRunning(false);
    }, 90);
    return () => clearInterval(id);
  }, [running, reduced]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const buffer = document.createElement("canvas");
    buffer.width = 256;
    buffer.height = 144;
    const mini = buffer.getContext("2d");
    if (!mini) return;
    let frame = 0,
      imageReady = false;
    const draw = () => {
      if (!imageReady) {
        const image = mini.createImageData(buffer.width, buffer.height);
        image.data.set(bankImage(cells, view, buffer.width, buffer.height));
        mini.putImageData(image, 0, 0);
        imageReady = true;
      }
      const cssWidth = canvas.getBoundingClientRect().width;
      if (cssWidth < 1) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1),
        width = Math.round(cssWidth * dpr),
        height = Math.round(((cssWidth * 9) / 16) * dpr);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      context.imageSmoothingEnabled = false;
      context.drawImage(buffer, 0, 0, width, height);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas.parentElement!);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [cells, view]);
  function key(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const k = fieldCommand(event.key, event.repeat);
    if (!k) return;
    if (k === "handled") {
      event.preventDefault();
      return;
    }
    if (k === "reset") {
      event.preventDefault();
      reset(initial);
      return;
    }
    if (stage < 5) return;
    const moves: Record<string, [number, number, number]> = {
      w: [0.5, 0, 0],
      s: [-0.5, 0, 0],
      a: [0, -0.5, 0],
      d: [0, 0.5, 0],
      q: [0, 0, -0.5],
      e: [0, 0, 0.5],
    };
    if (moves[k]) {
      event.preventDefault();
      setView((v) => travel(v, ...moves[k]));
    }
    if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) {
      event.preventDefault();
      rotate(
        Number(k === "arrowright") * 0.08 - Number(k === "arrowleft") * 0.08,
        Number(k === "arrowdown") * 0.08 - Number(k === "arrowup") * 0.08,
      );
    }
    if (k === "pause" && !reduced) {
      event.preventDefault();
      setRunning((v) => !v);
    }
  }
  const index = localIndex(x, slice, z);
  return (
    <fieldset
      className="voxel-walklab"
      data-ready={ready}
      disabled={!ready}
      inert={!ready}
      style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setRunning(false);
      }}
    >
      <div style={{ width: "100%", aspectRatio: "16/9" }}>
        <canvas
          ref={ref}
          tabIndex={0}
          aria-label="Bờ suối nhìn từ camera"
          onKeyDown={key}
          onPointerDown={(e) => {
            if (stage < 5 || drag.current) return;
            e.currentTarget.focus();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const p = drag.current;
            if (!p || p.id !== e.pointerId) return;
            rotate((e.clientX - p.x) * 0.006, (e.clientY - p.y) * 0.006);
            p.x = e.clientX;
            p.y = e.clientY;
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            touchAction: stage >= 5 ? "none" : "auto",
          }}
        >
          Ảnh phối cảnh bên bờ suối. Các nút bên dưới cũng điều khiển được vị trí mắt.
        </canvas>
      </div>
      <p>
        {stage >= 5
          ? "Nhấn W/A/S/D để đi, Q/E để đổi độ cao; kéo để nhìn hoặc dùng các phím mũi tên."
          : "Nhìn các mặt gần, xa và hướng của họa tiết. Từ bài 05 bạn sẽ tự di chuyển camera."}{" "}
        Canvas lấy mẫu ảnh thu nhỏ; bộ đếm bên dưới là số tam giác của mesh C++ chưa tối ưu.
      </p>
      <div className="lab-controls">
        {stage >= 4 && (
          <label>
            Cảnh mẫu{" "}
            <select
              aria-label="Cảnh mẫu"
              value={preset}
              onChange={(e) => reset(e.target.value as BankPreset)}
            >
              <option value="bank">Bờ suối</option>
              <option value="stone">Một viên đá</option>
              <option value="solid">Khối đặc</option>
              <option value="empty">Toàn không khí</option>
            </select>
          </label>
        )}
        {stage >= 5 && (
          <>
            <button type="button" onClick={() => setView((v) => travel(v, 0.75, 0))}>
              Bước tới
            </button>
            <button type="button" onClick={() => rotate(0.14, 0)}>
              Nhìn sang phải
            </button>
            <button
              type="button"
              disabled={reduced}
              aria-pressed={running}
              onClick={() => setRunning((v) => !v)}
            >
              {running ? "Tạm dừng" : "Quan sát tự động"}
            </button>
          </>
        )}
        <button type="button" onClick={() => reset(initial)}>
          Đặt lại
        </button>
        {stage >= 7 && (
          <button
            type="button"
            onClick={() => {
              const full = bankData("solid"),
                empty = bankData("empty");
              setAudit(
                full.every((b) => b === 3) && empty.every((b) => b === 0)
                  ? "Đạt: khối đặc 49.152 tam giác, không khí 0."
                  : "Không đạt",
              );
            }}
          >
            Kiểm chứng
          </button>
        )}
      </div>
      {stage >= 6 && (
        <fieldset>
          <legend>Đọc một ô, không sửa đất</legend>
          {(
            [
              ["Ô x", x, setX],
              ["Lớp y", slice, setSlice],
              ["Ô z", z, setZ],
            ] as const
          ).map(([label, value, change]) => (
            <label key={label}>
              {label}{" "}
              <input
                aria-label={label}
                type="range"
                min="0"
                max="15"
                value={value}
                onChange={(e) => change(Number(e.target.value))}
              />{" "}
              {value}{" "}
            </label>
          ))}
          <p>
            Ô ({x}, {slice}, {z}) · index {index} · {tileNames[cells[index]]}.
          </p>
        </fieldset>
      )}
      <dl className="lab-readout">
        <div>
          <dt>Block đặc</dt>
          <dd>{count}</dd>
        </div>
        <div>
          <dt>Tam giác của mesh</dt>
          <dd>{count * 12}</dd>
        </div>
        <div>
          <dt>Vị trí mắt</dt>
          <dd>{view.eye.map((n) => n.toFixed(2)).join(", ")}</dd>
        </div>
        <div>
          <dt>Góc nhìn ngang</dt>
          <dd>{view.yaw.toFixed(2)} rad</dd>
        </div>
      </dl>
      {audit && <p role="status">{audit}</p>}
      {stage === 1 && <VoxelFaceInspector />}
    </fieldset>
  );
}

export default function VoxelChunkLab({ mode }: { mode?: string }) {
  const match = mode?.match(/^voxel58-([1-7])$/);
  const stage = match ? Number(match[1]) : 7;
  return <BankLab key={stage} stage={stage} />;
}
