"use client";
import { useClientReady } from "@/components/use-client-ready";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  bankData,
  spawn,
  tileNames,
  trace,
  travel,
  type BankPreset,
  type Point,
} from "@/lib/labs/voxel-expedition/bank";
import {
  clamp,
  marks,
  markZ,
  meshCounts,
  oceanAt,
  flowPhase,
  windAt,
  sunAt,
  planStream,
  pump,
} from "@/lib/labs/voxel-expedition/field";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "../lab-shared";
import { fieldCommand } from "@/lib/labs/voxel-expedition/keys";
import { VoxelFaceInspector } from "../voxel-face-inspector";
import type { Rect } from "@/lib/labs/voxel-expedition/field";
import { bankSurface, drawField } from "./field-draw";

const notes: Record<number, string> = {
  59: "Bật, tắt loại mặt khuất: ảnh bờ suối cần giữ nguyên, số quad mới là thứ thay đổi. Thử khối đặc để dễ đếm bằng tay.",
  60: "Dấu cộng phát một tia từ mắt. Hãy nhìn vào nước rồi ngẩng lên: bạn chỉ đọc vật liệu, không sửa đất.",
  61: "Nhìn đáy và đầu cùng một ngọn cỏ. Tạm dừng ở một nhịp gió, sau đó đổi cường độ để so với gió bằng 0.",
  62: "Bản đồ nhìn từ trên cho thấy hàng nạp thật ở quy mô 5×5. Chọn bước sang chunk khác trước khi hàng cũ hoàn tất. Bầu trời phía trên lấy mẫu theo vị trí thế giới.",
  63: "Canvas tách mặt cắt sông và biển để bạn nhìn rõ điều khó thấy từ trên cao. Dùng chính mỏm đá làm thước khi thay đổi thời gian.",
  64: "Đây là hình cắt minh họa các hiệu ứng, không phải ảnh trò chơi. Tạm dừng để phân biệt việc mắt di chuyển với chuyển động của trời, nước và tuyết.",
};
export default function FieldLab({ id, stage }: { id: number; stage: number }) {
  const ready = useClientReady();
  const [preset, setPreset] = useState<BankPreset>(id === 61 && stage === 1 ? "solid" : "bank"),
    [view, setView] = useState(() => spawn("bank"));
  const [clock, setClock] = useState(0),
    [running, setRunning] = useState(false),
    [wind, setWind] = useState(1),
    [angle, setAngle] = useState(0.48),
    [hour, setHour] = useState(9);
  const [mark, setMark] = useState(
    id === 64 ? (stage === 4 ? 4 : 3) : id === 63 && stage === 3 ? 1 : 0,
  );
  const [clouds, setClouds] = useState(true),
    [snow, setSnow] = useState(true),
    [wire, setWire] = useState(true),
    [probe, setProbe] = useState(true);
  const [held, setHeld] = useState<string | null>(null),
    [stream, setStream] = useState(() => pump(planStream(undefined, 0, 0)));
  const [budget, setBudget] = useState(1);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvas);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  const cells = useMemo(() => bankData(preset), [preset]),
    geometry = useMemo(() => {
      const rects: Rect[] = [];
      const counts = meshCounts(preset, rects);
      return { rects, counts };
    }, [preset]);
  const counts = geometry.counts;
  const bank = useMemo(
    () => (typeof document !== "undefined" && id <= 60 ? bankSurface(cells, view) : null),
    [id, cells, view],
  );
  const heading = useMemo<Point>(
    () => [
      Math.sin(view.yaw) * Math.cos(view.pitch),
      Math.sin(view.pitch),
      Math.cos(view.yaw) * Math.cos(view.pitch),
    ],
    [view],
  );
  const hit = id === 60 ? trace(cells, view.eye, heading) : undefined;
  const measured = hit
    ? tileNames[hit.block] +
      " · (" +
      [hit.x, hit.y, hit.z].join(", ") +
      ") · " +
      hit.t.toFixed(2) +
      " block"
    : "Không gặp block trong cảnh mẫu";
  const tick = useCallback(
    (dt: number) => {
      setClock((v) => v + dt);
      if (id <= 60) setView((v) => ({ ...v, yaw: v.yaw + dt * 0.32 }));
      if (id === 62) setStream((v) => pump(v, budget));
    },
    [id, budget],
  );
  useEffect(() => {
    if (!running || reduced) return;
    let last = performance.now();
    const end = last + 20000;
    const stop = () => setRunning(false),
      hidden = () => {
        if (document.hidden) stop();
      };
    const timer = setInterval(() => {
      const now = performance.now();
      if (document.hidden || now >= end) {
        stop();
        return;
      }
      tick(Math.min(0.16, (now - last) / 1000));
      last = now;
    }, 90);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [running, reduced, tick]);
  const stopForReducedMotion = useCallback(() => setRunning(false), []);
  usePauseOnReducedMotion(stopForReducedMotion);
  const sceneHour = (hour + clock / 25) % 24;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx)
      drawField(
        ctx,
        {
          id,
          stage,
          rects: geometry.rects,
          time: clock,
          wind,
          angle,
          hour: sceneHour,
          mark,
          clouds,
          snow,
          wire,
          probe,
          view,
          stream,
        },
        bank,
      );
  }, [
    id,
    stage,
    size,
    geometry,
    clock,
    wind,
    angle,
    sceneHour,
    mark,
    clouds,
    snow,
    wire,
    probe,
    view,
    stream,
    bank,
  ]);
  function choose(p: BankPreset) {
    setPreset(p);
    setView(spawn(p));
    setHeld(null);
  }
  function reset() {
    choose(id === 61 && stage === 1 ? "solid" : "bank");
    setMark(id === 64 ? (stage === 4 ? 4 : 3) : id === 63 && stage === 3 ? 1 : 0);
    setRunning(false);
    setClock(0);
    setWind(1);
    setAngle(0.48);
    setHour(9);
    setClouds(true);
    setSnow(true);
    setWire(true);
    setProbe(true);
    setBudget(1);
    setStream(pump(planStream(undefined, 0, 0)));
  }
  function rotate(dx: number, dy: number) {
    setView((v) => ({ ...v, yaw: v.yaw + dx, pitch: clamp(v.pitch - dy, -1.4, 1.4) }));
  }
  function finishDrag(e: React.PointerEvent<HTMLCanvasElement>) {
    if (pointer.current?.id !== e.pointerId) return;
    pointer.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function move(dx: number, dz: number) {
    if (id === 62) {
      setStream((v) => planStream(v, clamp(v.x + dx, -1000, 1000), clamp(v.z + dz, -1000, 1000)));
      return;
    }
    setView((v) => travel(v, dz, dx));
  }
  function onKey(e: KeyboardEvent<HTMLCanvasElement>) {
    const k = fieldCommand(e.key, e.repeat);
    if (!k) return;
    e.preventDefault();
    if (k === "handled") return;
    if (k === "pause") {
      if (!reduced) setRunning((v) => !v);
      return;
    }
    if (k === "reset") {
      reset();
      return;
    }
    if (k === "step") {
      tick(0.25);
      return;
    }
    if (k === "mesh") {
      setWire((v) => !v);
      return;
    }
    if (k === "w" || k === "s" || k === "a" || k === "d") {
      move(Number(k === "d") - Number(k === "a"), Number(k === "w") - Number(k === "s"));
      return;
    }
    rotate(
      0.12 * (Number(k === "arrowright") - Number(k === "arrowleft")),
      0.1 * (Number(k === "arrowdown") - Number(k === "arrowup")),
    );
  }
  const items: { label: string; value: string | number }[] = [];
  if (id === 59 || id === 61)
    items.push(
      {
        label: "Quad đang so",
        value:
          id === 61
            ? wire
              ? counts.greedy
              : counts.visible
            : wire
              ? counts.visible
              : counts.naive,
      },
      { label: "Block đặc", value: counts.solid },
    );
  if (id === 60)
    items.push(
      { label: "Ống ngắm", value: probe ? (held ?? measured) : "Đã tắt" },
      { label: "Vị trí mắt", value: view.eye.map((v) => v.toFixed(1)).join(", ") },
    );
  if (id === 61 || id === 64) {
    const g = windAt(3, 7, clock, angle, wind);
    items.push(
      { label: "Độ lệch gốc", value: "0.00" },
      { label: "Độ lệch ngọn mẫu", value: (g * 0.42).toFixed(3) + " block" },
    );
  }
  if (id === 62)
    items.push(
      { label: "Chunk tâm", value: stream.x + ", " + stream.z },
      { label: "Đã nạp", value: stream.resident.size },
      { label: "Chờ nạp", value: stream.wanted.length },
      { label: "Đã gỡ", value: stream.unloaded },
    );
  const campfireBuilt = id === 64 && stage >= 4;
  const landmarkName = (i: number) =>
    i === 4 && !campfireBuilt ? "Chỗ nghỉ trong rừng" : marks[i];
  if (id >= 63)
    items.push(
      { label: "Mốc", value: landmarkName(mark) },
      { label: "Cao độ sóng mẫu", value: oceanAt(2, -6, clock).height.toFixed(3) + " block" },
      { label: "Pha vệt sông", value: flowPhase(8, clock).toFixed(3) },
    );
  if (id === 64) items.push({ label: "Hướng nắng X", value: sunAt(sceneHour).x.toFixed(3) });
  items.push({ label: "Thời gian cảnh", value: clock.toFixed(2) + " s" });
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
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label={"Thực địa voxel " + id}
        style={{
          width: "100%",
          aspectRatio: "2/1",
          height: "auto",
          minHeight: 0,
          display: "block",
          touchAction: "none",
        }}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (e.button !== 0 || pointer.current) return;
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const p = pointer.current;
          if (p && p.id === e.pointerId) {
            rotate((e.clientX - p.x) * 0.009, (e.clientY - p.y) * 0.008);
            p.x = e.clientX;
            p.y = e.clientY;
          }
        }}
        onPointerUp={finishDrag}
        onLostPointerCapture={finishDrag}
        onPointerCancel={finishDrag}
      >
        {notes[id]}
      </canvas>
      <p>{notes[id]}</p>
      <div className="lab-controls">
        {id <= 61 && (
          <label>
            Cảnh mẫu{" "}
            <select
              aria-label="Cảnh mẫu"
              value={preset}
              onChange={(e) => choose(e.target.value as BankPreset)}
            >
              <option value="bank">Bờ suối</option>
              <option value="stone">Một viên đá</option>
              <option value="solid">Khối đặc</option>
              <option value="empty">Toàn không khí</option>
            </select>
          </label>
        )}
        {(id === 59 || id === 61) && (
          <button type="button" aria-pressed={wire} onClick={() => setWire((v) => !v)}>
            {id === 59 ? "Bỏ mặt khuất" : "Gộp mặt đất"}
          </button>
        )}
        {id === 60 && (
          <>
            <button type="button" aria-pressed={probe} onClick={() => setProbe((v) => !v)}>
              Hiện ống ngắm
            </button>
            {stage >= 3 && (
              <button
                type="button"
                aria-pressed={held !== null}
                onClick={() => setHeld((h) => (h === null ? measured : null))}
              >
                Giữ phép đo
              </button>
            )}
          </>
        )}
        {id <= 60 && (
          <>
            <button type="button" onClick={() => move(0, 1)}>
              Bước tới
            </button>
            <button type="button" onClick={() => rotate(0.2, 0)}>
              Nhìn sang phải
            </button>
          </>
        )}
        {id === 62 && (
          <>
            <button type="button" onClick={() => move(-1, 0)}>
              Sang chunk âm X
            </button>
            <button type="button" onClick={() => move(1, 0)}>
              Sang chunk dương X
            </button>
            {stage >= 2 && (
              <label>
                Ngân sách{" "}
                <select
                  aria-label="Ngân sách"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                >
                  <option value="1">1 cột</option>
                  <option value="2">2 cột</option>
                </select>
              </label>
            )}
          </>
        )}
        {id >= 63 && (
          <label>
            Điểm quan sát{" "}
            <select
              aria-label="Điểm quan sát"
              value={mark}
              onChange={(e) => setMark(Number(e.target.value))}
            >
              {marks.map((m, i) => (
                <option key={m} value={i}>
                  {landmarkName(i)} · z={markZ[i]}
                </option>
              ))}
            </select>
          </label>
        )}
        {((id === 61 && stage >= 2) || id === 64) && (
          <>
            <label>
              Gió{" "}
              <input
                aria-label="Cường độ gió"
                type="range"
                min="0"
                max="3"
                step="0.25"
                value={wind}
                onChange={(e) => setWind(Number(e.target.value))}
              />
              {wind.toFixed(2)}
            </label>
            <button type="button" onClick={() => setAngle((v) => v + Math.PI / 4)}>
              Đổi hướng gió
            </button>
          </>
        )}
        {((id === 62 && stage >= 3) || id >= 63) && (
          <button type="button" aria-pressed={clouds} onClick={() => setClouds((v) => !v)}>
            Hiện mây
          </button>
        )}
        {id === 64 && (
          <>
            <label>
              Giờ{" "}
              <input
                aria-label="Giờ trong ngày"
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
              />
              {sceneHour.toFixed(1)}
            </label>
            <button type="button" aria-pressed={snow} onClick={() => setSnow((v) => !v)}>
              Hiện tuyết
            </button>
          </>
        )}
        <button
          type="button"
          disabled={reduced}
          aria-pressed={running}
          onClick={() => setRunning((v) => !v)}
        >
          {running ? "Tạm dừng" : id <= 60 ? "Quét góc nhìn" : "Cho thời gian chạy"}
        </button>
        <button type="button" onClick={() => tick(0.25)}>
          Tiến một nhịp
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout items={items} />
      {id === 59 && stage === 1 && <VoxelFaceInspector />}
    </fieldset>
  );
}
