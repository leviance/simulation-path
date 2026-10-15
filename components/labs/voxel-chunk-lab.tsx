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
  audit,
  defaultCamera,
  index,
  orbit,
  pickCell,
  scene,
  solidCount,
  zoom,
  type Preset,
  type Vec3,
} from "@/lib/labs/voxel-chunk";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw, layout, renderScene } from "./voxel-chunk/draw";

function ChunkLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    reduced = useReducedMotion(),
    help = useId();
  const initialPreset: Preset = stage >= 4 ? 2 : stage >= 3 ? 1 : 0;
  const [preset, setPreset] = useState<Preset>(initialPreset),
    [slice, setSlice] = useState(stage < 3 ? 7 : 15),
    [selected, setSelected] = useState<Vec3>([7, 7, 7]);
  const initialCamera = useMemo(
    () => ({ ...defaultCamera, ...(stage < 3 ? { center: 7.5, scale: 60 } : {}) }),
    [stage],
  );
  const [camera, setCamera] = useState(initialCamera),
    [paused, setPaused] = useState(true),
    [depth, setDepth] = useState(true),
    [result, setResult] = useState("Chưa kiểm");
  const pointer = useRef<{ id: number; x: number; y: number; kind: "orbit" | "grid" } | null>(null);
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
    if (paused || reduced || stage < 5) return;
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
  }, [paused, reduced, stage]);
  const data = useMemo(() => scene(stage, preset, slice), [stage, preset, slice]);
  const image = useMemo(() => renderScene(data.mesh, camera, depth), [data.mesh, camera, depth]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, size, image, data.chunk, stage, slice, selected);
  }, [size, image, data.chunk, stage, slice, selected]);
  const reset = () => {
    stop();
    setPreset(initialPreset);
    setCamera(initialCamera);
    setSlice(stage < 3 ? 7 : 15);
    setSelected([7, 7, 7]);
    setDepth(true);
    setResult("Chưa kiểm");
  };
  const pick = (x: number, y: number) => {
    const box = layout(size),
      cell = pickCell(x - box.gridX, y - box.gridY, slice);
    if (cell) setSelected(cell);
    return cell !== null;
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current) return;
    const p = canvasPoint(e, e.currentTarget),
      grid = stage >= 6 && pick(p.x, p.y);
    if (!grid && stage < 5) return;
    const box = layout(size);
    if (
      !grid &&
      (p.x < box.left ||
        p.x >= box.left + 320 * box.scale ||
        p.y < box.top ||
        p.y >= box.top + 240 * box.scale)
    )
      return;
    stop();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = { id: e.pointerId, x: p.x, y: p.y, kind: grid ? "grid" : "orbit" };
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const next = canvasPoint(e, e.currentTarget);
    if (p.kind === "grid") pick(next.x, next.y);
    else {
      const dx = (next.x - p.x) * 0.5,
        dy = (next.y - p.y) * 0.5;
      setCamera((c) => orbit(c, dx, dy));
    }
    pointer.current = { ...p, x: next.x, y: next.y };
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      reset();
      return;
    }
    if (stage < 5) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => setCamera((c) => orbit(c, -8, 0)),
      ArrowRight: () => setCamera((c) => orbit(c, 8, 0)),
      ArrowUp: () => setCamera((c) => orbit(c, 0, -8)),
      ArrowDown: () => setCamera((c) => orbit(c, 0, 8)),
      "+": () => setCamera((c) => zoom(c, 1)),
      "=": () => setCamera((c) => zoom(c, 1)),
      "-": () => setCamera((c) => zoom(c, -1)),
      " ": () => {
        release();
        if (!reduced) setPaused((v) => !v);
      },
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };
  const currentIndex = index(selected[0], slice, selected[2]);
  return (
    <div className="interactive-lab" data-testid="voxel-chunk-lab">
      <div className="lab-controls">
        <button onClick={reset}>Đặt lại</button>
        {stage >= 4 && (
          <label>
            Khối mẫu{" "}
            <select
              aria-label="Khối mẫu"
              value={preset}
              onChange={(e) => {
                stop();
                setPreset(Number(e.target.value) as Preset);
                setResult("Chưa kiểm");
              }}
            >
              <option value={0}>Một block</option>
              <option value={1}>Khối đặc 16³</option>
              <option value={2}>Đất bậc thang</option>
              <option value={3}>Toàn Air</option>
            </select>
          </label>
        )}
        {stage < 4 && <button onClick={reset}>Preset của bài</button>}
        {stage >= 5 && (
          <>
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
                aria-label="Zoom"
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
            <label>
              <input type="checkbox" checked={depth} onChange={(e) => setDepth(e.target.checked)} />
              Z-buffer
            </label>
          </>
        )}
        {stage >= 6 && (
          <>
            <label>
              Lớp y{" "}
              <input
                aria-label="Lớp y"
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
            <label>
              Ô x{" "}
              <input
                aria-label="Ô x"
                type="number"
                min="0"
                max="15"
                value={selected[0]}
                onChange={(e) => {
                  const x = Number(e.target.value);
                  if (Number.isInteger(x) && x >= 0 && x < 16) setSelected((p) => [x, p[1], p[2]]);
                }}
              />
            </label>
            <label>
              Ô z{" "}
              <input
                aria-label="Ô z"
                type="number"
                min="0"
                max="15"
                value={selected[2]}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  if (Number.isInteger(z) && z >= 0 && z < 16) setSelected((p) => [p[0], p[1], z]);
                }}
              />
            </label>
          </>
        )}
        {stage >= 7 && (
          <button
            onClick={() => {
              stop();
              setResult(audit());
            }}
          >
            Kiểm chứng
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        style={{ width: "100%", height: 580, touchAction: "none" }}
        tabIndex={0}
        aria-label="Voxel Chunk Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={stop}
        onLostPointerCapture={() => {
          pointer.current = null;
        }}
        onBlur={stop}
      />
      <p id={help}>
        Trên: hình chiếu trực giao với Z-buffer CPU 320×240. Dưới: lớp dữ liệu x/z, Air là ô tối.{" "}
        {stage >= 5
          ? "Kéo hình hoặc dùng phím mũi tên để xoay, +/− để zoom, Space để chạy/dừng. "
          : "Camera cố định ở các bài đầu. "}
        {stage >= 6
          ? "Chọn ô trong bảng hoặc nhập x/z; đây không phải ray picking hay thao tác phá block. "
          : ""}
        R đặt lại.{" "}
        {reduced ? "Reduced motion: chỉ xoay thủ công." : "Mở bài ở trạng thái tạm dừng."}
      </p>
      <LabReadout
        items={[
          { label: "Block đặc trong dữ liệu", value: solidCount(data.chunk) },
          { label: "Tam giác đang gửi rasterizer", value: data.mesh.length },
          { label: "Mặt quad", value: data.mesh.length / 2 },
          {
            label: "Ô đang đọc",
            value: `(${selected[0]}, ${slice}, ${selected[2]}) → index ${currentIndex}, block ${data.chunk[currentIndex]}`,
          },
          {
            label: "Camera",
            value: `yaw ${camera.yaw.toFixed(2)}, pitch ${camera.pitch.toFixed(2)}, zoom ${camera.zoom.toFixed(2)}`,
          },
          { label: "Kiểm chứng", value: result },
        ]}
      />
      <p>
        Mesh vẫn chứa mặt bên trong và mặt quay lưng. Z-buffer chỉ quyết định pixel được thấy, không
        làm giảm số tam giác. Màu đậm/nhạt theo hướng mặt là quy ước minh họa, không phải ánh sáng
        vật lý.
      </p>
    </div>
  );
}
export default function VoxelChunkLab({ mode }: { mode?: string }) {
  const match = mode?.match(/^voxel58-([1-7])$/);
  const stage = match ? Number(match[1]) : 7;
  return <ChunkLab key={stage} stage={stage} />;
}
