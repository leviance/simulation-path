"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  makeChunk,
  inspectFace,
  createCache,
  update,
  defaultCamera,
  orbit,
  zoom,
  presetNames,
  faceNames,
  audit,
  type Preset,
  type Vec3,
  type Cache,
  type Camera,
} from "@/lib/labs/voxel-hidden-faces";
import { pickCell } from "@/lib/labs/voxel-chunk/model";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw, layout } from "./voxel-hidden-faces/draw";
function FacesLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    reduced = useReducedMotion(),
    help = useId();
  const [preset, setPreset] = useState<Preset>(2),
    [culled, setCulled] = useState(stage >= 3),
    [slice, setSlice] = useState(15),
    [camera, setCamera] = useState(defaultCamera),
    [selected, setSelected] = useState<Vec3>([7, 7, 7]),
    [face, setFace] = useState(0),
    [paused, setPaused] = useState(true),
    [result, setResult] = useState("Chưa kiểm");
  const [resetVersion, setResetVersion] = useState(0),
    [view, setView] = useState<Cache | null>(null);
  const cache = useRef<Cache | null>(null),
    previous = useRef<{
      chunk: Uint8Array;
      culled: boolean;
      slice: number;
      camera: Camera;
      resetVersion: number;
    } | null>(null);
  const chunk = useMemo(() => makeChunk(preset, stage), [preset, stage]);
  useEffect(() => {
    if (!cache.current || previous.current?.resetVersion !== resetVersion)
      cache.current = createCache();
    const old = previous.current,
      c = cache.current;
    if (!old || old.chunk !== chunk || old.culled !== culled || old.slice !== slice) {
      c.meshDirty = true;
      c.frameDirty = true;
    }
    if (!old || old.camera !== camera) c.frameDirty = true;
    previous.current = { chunk, culled, slice, camera, resetVersion };
    if (update(c, chunk, culled, slice, camera, stage)) setView({ ...c });
  }, [chunk, culled, slice, camera, stage, resetVersion]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && view) draw(ctx, size, view, chunk, camera, stage, selected, face, slice);
  }, [view, size, chunk, camera, stage, selected, face, slice]);
  const pointer = useRef<{ id: number; x: number; y: number; grid: boolean } | null>(null);
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
  useEffect(() => {
    if (paused || reduced) return;
    let id = 0,
      previous = 0;
    const frame = (now: number) => {
      if (previous) {
        const dt = Math.min(0.05, (now - previous) / 1000);
        setCamera((c) => orbit(c, dt * 20, 0));
      }
      previous = now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [paused, reduced]);
  const reset = () => {
    stop();
    setPreset(2);
    setCulled(stage >= 3);
    setSlice(15);
    setCamera(defaultCamera);
    setSelected([7, 7, 7]);
    setFace(0);
    setResult("Chưa kiểm");
    setResetVersion((v) => v + 1);
  };
  const pick = (x: number, y: number) => {
    const b = layout(size),
      p = pickCell(x - b.gridX, y - b.gridY, selected[1]);
    if (p) setSelected(p);
    return p !== null;
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current) return;
    const p = canvasPoint(e, e.currentTarget),
      b = layout(size),
      grid = stage >= 6 && pick(p.x, p.y);
    if (
      !grid &&
      (p.x < b.left || p.y < b.top || p.x >= b.left + 320 * b.scale || p.y >= b.top + 240 * b.scale)
    )
      return;
    stop();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = { id: e.pointerId, x: p.x, y: p.y, grid };
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const n = canvasPoint(e, e.currentTarget);
    if (p.grid) pick(n.x, n.y);
    else {
      const dx = (n.x - p.x) * 0.5,
        dy = (n.y - p.y) * 0.5;
      setCamera((c) => orbit(c, dx, dy));
    }
    pointer.current = { ...p, x: n.x, y: n.y };
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => setCamera((c) => orbit(c, -8, 0)),
      ArrowRight: () => setCamera((c) => orbit(c, 8, 0)),
      ArrowUp: () => setCamera((c) => orbit(c, 0, -8)),
      ArrowDown: () => setCamera((c) => orbit(c, 0, 8)),
      "+": () => setCamera((c) => zoom(c, 1)),
      "=": () => setCamera((c) => zoom(c, 1)),
      "-": () => setCamera((c) => zoom(c, -1)),
      r: reset,
      " ": () => {
        release();
        if (!reduced) setPaused((v) => !v);
      },
    };
    if (stage >= 3)
      actions.m = () => {
        stop();
        setCulled((v) => !v);
      };
    if (stage >= 5) {
      actions.PageUp = () => {
        stop();
        setSlice((v) => Math.min(15, v + 1));
      };
      actions.PageDown = () => {
        stop();
        setSlice((v) => Math.max(0, v - 1));
      };
    }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (actions[k]) {
      e.preventDefault();
      actions[k]();
    }
  };
  const inspection = stage >= 6 ? inspectFace(chunk, selected, face, slice) : null;
  const baseline = 12 * (view?.built.solid ?? 0),
    triangles = view?.built.mesh.length ?? 0;
  return (
    <div className="interactive-lab" data-testid="voxel-hidden-faces-lab">
      <div className="lab-controls">
        <button onClick={reset}>Đặt lại</button>
        <label>
          Khối mẫu{" "}
          <select
            aria-label="Khối mẫu hidden faces"
            value={preset}
            onChange={(e) => {
              stop();
              setPreset(Number(e.target.value) as Preset);
              setResult("Chưa kiểm");
            }}
          >
            {presetNames.slice(0, stage >= 4 ? 7 : 3).map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {stage >= 3 && (
          <label>
            <input
              aria-label="Bỏ mặt tiếp giáp"
              type="checkbox"
              checked={culled}
              onChange={(e) => {
                stop();
                setCulled(e.target.checked);
              }}
            />
            Bỏ mặt tiếp giáp
          </label>
        )}
        <button
          disabled={reduced}
          onClick={() => {
            release();
            setPaused((v) => !v);
          }}
        >
          {paused ? "Chạy xoay" : "Tạm dừng"}
        </button>
        <button
          onClick={() => {
            stop();
            setCamera((c) => orbit(c, 8, 0));
          }}
        >
          Xoay một bước
        </button>
        <label>
          Zoom{" "}
          <input
            aria-label="Zoom hidden faces"
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={camera.zoom}
            onChange={(e) => {
              stop();
              const value = Number(e.target.value);
              setCamera((c) => ({ ...c, zoom: value }));
            }}
          />
        </label>
        {stage >= 5 && (
          <label>
            Cắt ở y{" "}
            <input
              aria-label="Cắt ở y"
              type="range"
              min="0"
              max="15"
              step="1"
              value={slice}
              onChange={(e) => {
                stop();
                setSlice(Number(e.target.value));
              }}
            />
          </label>
        )}
        {stage >= 6 && (
          <>
            {[0, 1, 2].map((axis) => (
              <label key={axis}>
                Block {"xyz"[axis]}{" "}
                <input
                  aria-label={`Block ${"xyz"[axis]}`}
                  type="number"
                  min="0"
                  max="15"
                  value={selected[axis]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (Number.isInteger(value) && value >= 0 && value < 16)
                      setSelected((p) => p.map((v, i) => (i === axis ? value : v)) as Vec3);
                  }}
                />
              </label>
            ))}
            <label>
              Hướng mặt{" "}
              <select
                aria-label="Hướng mặt"
                value={face}
                onChange={(e) => setFace(Number(e.target.value))}
              >
                {faceNames.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {stage >= 8 && (
          <button
            onClick={() => {
              stop();
              setResult(audit());
            }}
          >
            Kiểm chứng mặt voxel
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        style={{ width: "100%", height: 580, touchAction: "none" }}
        tabIndex={0}
        aria-label="Hidden Faces Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => {
          if (pointer.current?.id === e.pointerId) release();
        }}
        onPointerCancel={stop}
        onLostPointerCapture={() => {
          pointer.current = null;
        }}
        onBlur={stop}
      />
      <p id={help}>
        Kéo hình hoặc dùng mũi tên để xoay, +/− zoom, Space chạy/dừng, R đặt lại.{" "}
        {stage >= 3
          ? "M đổi baseline/culled; cả hai luôn bật Z-buffer. "
          : "Bản đầu còn đủ sáu mặt mỗi block. "}
        {stage >= 5 ? "PageUp/PageDown đổi lớp cắt. " : ""}
        {stage >= 6
          ? "Bảng x/z đọc tại Block y, độc lập với lớp cắt. Viền cam là debug vẽ đè cả mặt bị che, không phải ảnh nhìn thấy thật. "
          : ""}
        {reduced ? "Reduced motion: chỉ xoay thủ công." : "Mở bài ở trạng thái tạm dừng."}
      </p>
      <LabReadout
        items={[
          { label: "Block trong miền hiển thị", value: view?.built.solid ?? 0 },
          { label: "Baseline → đang vẽ (triangles)", value: `${baseline} → ${triangles}` },
          { label: "Quad được giữ", value: view?.built.keys.length ?? 0 },
          {
            label: "Giảm geometry",
            value: baseline
              ? `${((1 - triangles / baseline) * 100).toFixed(2)}%`
              : "Không có geometry để so",
          },
          ...(stage >= 3
            ? [{ label: "Kiểm neighbor", value: view?.built.neighborChecks ?? 0 }]
            : []),
          ...(inspection
            ? [
                {
                  label: "Quyết định của quy tắc culling",
                  value: inspection.reason + ` | neighbor (${inspection.neighbor.join(", ")})`,
                },
                {
                  label: "Đối chiếu chế độ",
                  value: !inspection.sourceSolid
                    ? "Không có mặt nguồn"
                    : culled
                      ? inspection.kept
                        ? "Mesh giữ mặt này"
                        : "Mesh bỏ mặt này"
                      : "Baseline vẫn giữ cả sáu mặt",
                },
              ]
            : []),
          ...(stage >= 7
            ? [
                {
                  label: "Rebuild / rasterize",
                  value: `${view?.rebuilds ?? 0} / ${view?.rasterizations ?? 0}`,
                },
              ]
            : []),
          ...(stage >= 8 ? [{ label: "Kiểm chứng", value: result }] : []),
        ]}
      />
      <p>
        Đây là loại mặt giữa hai block opaque, không back-face culling, không occlusion culling và
        chưa greedy meshing. Giảm tam giác không đồng nghĩa tăng FPS theo cùng tỷ lệ. Rasterizer CPU
        320×240 vẫn xử lý depth.
      </p>
    </div>
  );
}
export default function VoxelHiddenFacesLab({ mode }: { mode?: string }) {
  const match = mode?.match(/^faces59-([1-8])$/);
  return <FacesLab key={match?.[1] ?? 8} stage={match ? Number(match[1]) : 8} />;
}
