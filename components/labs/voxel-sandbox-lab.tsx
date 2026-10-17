"use client";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  createSandbox,
  cameraRay,
  cameraVolume,
  traceWorld,
  editRay,
  history,
  flushEdits,
  serialize,
  importSnapshot,
  auditLabel,
  type ResidentAudit,
  type Trace,
} from "@/lib/labs/voxel-sandbox";
import {
  pump,
  movePlayer,
  presets,
  presetNames,
  streamingCamera,
  sceneMesh,
  raster,
  orbit,
  zoom,
  verifySurface,
  verifySchedule,
  type Camera,
} from "@/lib/labs/voxel-chunk-streaming";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw, pixelAt } from "./voxel-sandbox/draw";
import { verifyTriangles } from "@/lib/labs/voxel-chunk-streaming/mesh-audit";
function SandboxLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [state, setState] = useState(() => createSandbox(stage)),
    [version, setVersion] = useState(0);
  const [camera, setCamera] = useState<Camera>({ ...streamingCamera, scale: 2 }),
    [aim, setAim] = useState({ x: 160, y: 120 });
  const [material, setMaterial] = useState(1),
    [paused, setPaused] = useState(true),
    [preset, setPreset] = useState(0);
  const [message, setMessage] = useState("Tải vùng quanh nhân vật trước khi thử phá/đặt."),
    [text, setText] = useState(""),
    [replace, setReplace] = useState(false);
  const [auditResult, setAuditResult] = useState<ResidentAudit | null>(null);
  const topologyRevision = useRef(0);
  const pointer = useRef<{ id: number; x: number; y: number; orbit: boolean } | null>(null);
  const pickDirty = useRef(true),
    queries = useRef(0),
    rasters = useRef(0);
  const cached = useRef<{
    state: typeof state;
    camera: Camera;
    aim: typeof aim;
    pixels: Uint8ClampedArray;
    trace: Trace;
  } | null>(null);
  const [view, setView] = useState<typeof cached.current>(null);
  const release = useCallback(() => {
    const p = pointer.current;
    pointer.current = null;
    if (p && canvas.current?.hasPointerCapture(p.id)) canvas.current.releasePointerCapture(p.id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, [stop, release]);
  const publish = useCallback((changed = true) => {
    if (changed) {
      pickDirty.current = true;
      topologyRevision.current++;
    }
    setVersion((v) => v + 1);
  }, []);
  const tickOnce = useCallback(() => {
    const jobs = pump(state.world);
    publish(jobs > 0);
    if (!state.world.pending.length) setPaused(true);
  }, [state, publish]);
  useEffect(() => {
    if (paused || reduced) return;
    let frame = 0,
      before = 0,
      elapsed = 0;
    const tick = (now: number) => {
      if (before) elapsed += Math.min(0.1, (now - before) / 1000);
      before = now;
      if (elapsed >= 0.2) {
        elapsed = 0;
        tickOnce();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, tickOnce]);
  useEffect(() => {
    flushEdits(state);
    const old = cached.current;
    const volume = cameraVolume(state.world, camera);
    let pixels = old?.pixels,
      trace = old?.trace ?? { hit: null, blocked: false, path: [] };
    let changed = false;
    if (!old || old.state !== state || old.camera !== camera || state.world.frameDirty) {
      pixels = raster(sceneMesh(state.world), camera, true, stage >= 2 ? volume : undefined).pixels;
      state.world.frameDirty = false;
      rasters.current++;
      changed = true;
    }
    if (
      !old ||
      old.state !== state ||
      old.camera !== camera ||
      old.aim !== aim ||
      pickDirty.current
    ) {
      if (stage >= 3) {
        trace = traceWorld(
          state.world,
          cameraRay(camera, state.world.player, aim.x, aim.y, volume.near),
        );
        queries.current++;
      }
      pickDirty.current = false;
      changed = true;
    }
    if (changed && pixels) {
      cached.current = { state, camera, aim, pixels, trace };
      setView(cached.current);
    }
  }, [state, version, camera, aim, stage]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && view) draw(ctx, size, view.pixels, state.world, camera, aim, view.trace, stage);
  }, [size, state, version, camera, aim, view, stage]);
  function move(dx: number, dz: number) {
    stop();
    const p = state.world.player;
    movePlayer(
      state.world,
      Math.max(-512, Math.min(512, p.x + dx)),
      Math.max(-512, Math.min(512, p.z + dz)),
    );
    publish();
  }
  function reset() {
    stop();
    setState(createSandbox(stage));
    setCamera({ ...streamingCamera, scale: 2 });
    setAim({ x: 160, y: 120 });
    setMaterial(1);
    setPreset(0);
    setReplace(false);
    setText("");
    setMessage("Đã xóa phiên và trở về terrain gốc.");
    setAuditResult(null);
    queries.current = 0;
    rasters.current = 0;
    cached.current = null;
    publish();
  }
  function action(place: boolean, at = aim) {
    stop();
    const changed = editRay(
      state,
      cameraRay(camera, state.world.player, at.x, at.y, cameraVolume(state.world, camera).near),
      place,
      material,
    );
    setMessage(
      changed
        ? "Đã sửa đúng một cell."
        : "Không sửa: kiểm hit, vùng resident, ô đặt và giới hạn delta.",
    );
    publish(changed);
  }
  function undo(redo = false) {
    stop();
    const changed = history(state, redo);
    setMessage(changed ? "Đã áp dụng lịch sử theo tọa độ world." : "Không có lệnh phù hợp.");
    publish(changed);
  }
  function keyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    const key = e.key.toLowerCase();
    if (
      ![
        " ",
        "n",
        "r",
        "w",
        "a",
        "s",
        "d",
        "f",
        "g",
        "z",
        "y",
        "1",
        "2",
        "3",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        "+",
        "-",
      ].includes(key)
    )
      return;
    e.preventDefault();
    if (e.repeat && !key.startsWith("arrow")) return;
    if (key === " ") {
      release();
      if (!reduced && state.world.pending.length) setPaused((v) => !v);
      return;
    }
    if (key === "n") {
      stop();
      tickOnce();
    }
    if (key === "r") reset();
    if (key === "w") move(0, -4);
    if (key === "s") move(0, 4);
    if (key === "a") move(-4, 0);
    if (key === "d") move(4, 0);
    if (stage >= 4 && key === "f") action(false);
    if (stage >= 4 && key === "g") action(true);
    if (stage >= 4 && ["1", "2", "3"].includes(key)) {
      stop();
      setMaterial(Number(key));
    }
    if (stage >= 7 && key === "z") undo();
    if (stage >= 7 && key === "y") undo(true);
    if (key.startsWith("arrow")) {
      stop();
      let dx = 0,
        dy = 0;
      if (key === "arrowleft") dx = -8;
      if (key === "arrowright") dx = 8;
      if (key === "arrowup") dy = -8;
      if (key === "arrowdown") dy = 8;
      setCamera((c) => orbit(c, dx, dy));
    }
    if (key === "+" || key === "-") {
      stop();
      setCamera((c) => zoom(c, key === "+" ? 1 : -1));
    }
  }
  function audit() {
    stop();
    flushEdits(state);
    try {
      verifySchedule(state.world);
      const faces = verifySurface(state.world);
      verifyTriangles(state.world);
      setAuditResult({
        revision: topologyRevision.current,
        message: `PASS bề mặt resident: ${faces} mặt đơn vị. Không thay toàn bộ suite hành trình.`,
      });
    } catch (e) {
      setAuditResult({ revision: topologyRevision.current, message: `FAIL: ${String(e)}` });
    }
    publish(false);
  }
  return (
    <div
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
    >
      <div className="lab-controls">
        <button
          type="button"
          disabled={reduced || !state.world.pending.length}
          onClick={() => {
            release();
            setPaused((v) => !v);
          }}
        >
          {paused ? "Chạy tải chunk" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => {
            stop();
            tickOnce();
          }}
        >
          Một tick
        </button>
        <button type="button" onClick={reset}>
          Đặt lại (xóa phiên)
        </button>
        <button type="button" onClick={() => move(-4, 0)}>
          Đi trái
        </button>
        <button type="button" onClick={() => move(4, 0)}>
          Đi phải
        </button>
        <button type="button" onClick={() => move(0, -4)}>
          Đi lên
        </button>
        <button type="button" onClick={() => move(0, 4)}>
          Đi xuống
        </button>
        <label>
          Pixel ngắm X
          <input
            type="number"
            min={0}
            max={319}
            value={aim.x}
            onChange={(e) => {
              const x = Number(e.target.value);
              if (Number.isInteger(x) && x >= 0 && x < 320) {
                stop();
                setAim({ ...aim, x });
              }
            }}
          />
        </label>
        <label>
          Pixel ngắm Y
          <input
            type="number"
            min={0}
            max={239}
            value={aim.y}
            onChange={(e) => {
              const y = Number(e.target.value);
              if (Number.isInteger(y) && y >= 0 && y < 240) {
                stop();
                setAim({ ...aim, y });
              }
            }}
          />
        </label>
        {stage >= 4 && (
          <>
            <label>
              Vật liệu đặt
              <select
                value={material}
                onChange={(e) => {
                  stop();
                  setMaterial(Number(e.target.value));
                }}
              >
                <option value={1}>1 — Grass</option>
                <option value={2}>2 — Dirt</option>
                <option value={3}>3 — Stone</option>
              </select>
            </label>
            <button type="button" onClick={() => action(false)}>
              Phá một block
            </button>
            <button type="button" onClick={() => action(true)}>
              Đặt một block
            </button>
          </>
        )}
        {stage >= 7 && (
          <>
            <button type="button" disabled={!state.undo.length} onClick={() => undo()}>
              Undo
            </button>
            <button type="button" disabled={!state.redo.length} onClick={() => undo(true)}>
              Redo
            </button>
          </>
        )}
        {stage >= 9 && (
          <label>
            Vị trí mẫu sandbox
            <select
              value={preset}
              onChange={(e) => {
                stop();
                const n = Number(e.target.value),
                  p = presets[n];
                setPreset(n);
                movePlayer(state.world, p.x, p.z);
                publish();
              }}
            >
              {presetNames.map((n, i) => (
                <option value={i} key={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        {stage >= 10 && (
          <button type="button" onClick={audit}>
            Kiểm bề mặt resident
          </button>
        )}
      </div>
      {stage >= 8 && (
        <div className="lab-controls">
          <button
            type="button"
            onClick={() => {
              stop();
              setText(serialize(state));
              setMessage("Đã xuất VXL1. Sao chép text ra file để giữ sau reload.");
            }}
          >
            Xuất bản lưu
          </button>
          <label>
            Bản lưu VXL1
            <textarea
              rows={5}
              maxLength={32768}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            Cho phép thay thế phiên đang có thay đổi
          </label>
          <button
            type="button"
            disabled={state.edits.size > 0 && !replace}
            onClick={() => {
              stop();
              try {
                const next = importSnapshot(state, text);
                setState(next);
                setReplace(false);
                setMessage("Đã nhập toàn bộ bản lưu; lịch sử cũ được xóa.");
                publish();
              } catch (e) {
                setMessage(`Không nhập, phiên cũ giữ nguyên: ${String(e)}`);
              }
            }}
          >
            Nhập bản lưu
          </button>
        </div>
      )}
      <p id={help}>
        WASD di chuyển; mũi tên hoặc kéo chuột giữa xoay camera; +/− zoom. N tải tối đa hai job,
        Space chạy/dừng tải, R xóa phiên. Ngắm bằng chuột hoặc ô X/Y. Từ bài 04: click trái/F phá,
        phải/G đặt, 1–3 chọn vật liệu; giữ chuột không vẽ liên tục. Z/Y undo/redo từ bài 07. Pause
        chỉ dừng queue; sửa tay vẫn dùng được. {reduced && "Reduced motion: dùng Một tick."}
      </p>
      <canvas
        ref={canvas}
        width={760}
        height={720}
        style={{ width: "100%", height: 720, touchAction: "none" }}
        tabIndex={0}
        aria-label="Voxel Sandbox Lab"
        aria-describedby={help}
        onKeyDown={keyDown}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (![0, 1, 2].includes(e.button) || pointer.current !== null) return;
          const p = canvasPoint(e, e.currentTarget),
            at = pixelAt(size, p.x, p.y);
          if (!at) return;
          e.preventDefault();
          stop();
          setAim((current) => (current.x === at.x && current.y === at.y ? current : at));
          pointer.current = { id: e.pointerId, ...p, orbit: e.button === 1 };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus();
          if (stage >= 4 && e.button !== 1) action(e.button === 2, at);
        }}
        onPointerMove={(e) => {
          const p = canvasPoint(e, e.currentTarget),
            held = pointer.current;
          if (held && held.id !== e.pointerId) return;
          if (held?.orbit) setCamera((c) => orbit(c, (p.x - held.x) * 0.5, (p.y - held.y) * 0.5));
          else {
            const at = pixelAt(size, p.x, p.y);
            if (at) setAim((current) => (current.x === at.x && current.y === at.y ? current : at));
          }
          if (held) pointer.current = { ...held, ...p };
        }}
        onPointerUp={(e) => {
          if (pointer.current?.id === e.pointerId) release();
        }}
        onPointerCancel={(e) => {
          if (pointer.current?.id === e.pointerId) release();
        }}
        onLostPointerCapture={(e) => {
          if (pointer.current?.id === e.pointerId) pointer.current = null;
        }}
      />
      <LabReadout
        items={[
          {
            label: "Resident / job chờ",
            value: `${state.world.chunks.size} / ${state.world.pending.length}`,
          },
          {
            label: "Hit world",
            value:
              view?.trace.hit?.cell.join(",") ??
              (view?.trace.blocked ? "Chunk chưa tải" : "Không hit"),
          },
          {
            label: "Normal / số cell DDA",
            value: `${view?.trace.hit?.normal.join(",") ?? "—"} / ${view?.trace.path.length ?? 0}`,
          },
          {
            label: "Delta / Undo / Redo",
            value: `${state.edits.size} / ${state.undo.length} / ${state.redo.length}`,
          },
          {
            label: "Query / raster / edit mesh",
            value: `${queries.current} / ${rasters.current} / ${state.editRebuilds}`,
          },
          { label: "Trạng thái", value: message },
          ...(stage >= 2
            ? [
                {
                  label: "Near / far (world depth)",
                  value: `${cameraVolume(state.world, camera).near} / ${cameraVolume(state.world, camera).far}`,
                },
              ]
            : []),
          ...(stage >= 10
            ? [{ label: "Kiểm bề mặt", value: auditLabel(auditResult, topologyRevision.current) }]
            : []),
        ]}
      />
      <p>
        Thay đổi chỉ nằm trong RAM cho tới khi bạn xuất text và tự lưu lại. Reload trang không giữ
        sandbox bằng localStorage; tiến độ bài học vẫn là tính năng riêng. Capped frontier trong ảnh
        không biến chunk chưa tải thành block có thể sửa. Bản demo không có FPS controller,
        collision hay crafting.
      </p>
    </div>
  );
}
export default function VoxelSandboxLab({ mode }: { mode?: string }) {
  const parsed = Number(mode?.split("-").at(-1)),
    stage = Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 10;
  return <SandboxLab key={stage} stage={stage} />;
}
