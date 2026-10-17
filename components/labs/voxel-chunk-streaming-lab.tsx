"use client";
import { BatchHistory } from "./voxel-chunk-streaming/batch-history";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  createWorld,
  movePlayer,
  settings,
  pump,
  route,
  presets,
  presetNames,
  centerOf,
  splitAxis,
  keyOf,
  distance,
  loadRadius,
  keepRadius,
  targetCenter,
  hashChunk,
  verifySchedule,
  sceneMesh,
  streamingCamera,
  raster,
  orbit,
  zoom,
  type Camera,
  type Key,
} from "@/lib/labs/voxel-chunk-streaming";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw, layout, picked } from "./voxel-chunk-streaming/draw";
function StreamingLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [world, setWorld] = useState(() => createWorld(stage)),
    [version, setVersion] = useState(0);
  const initialCamera = { ...streamingCamera, scale: stage < 3 ? 5 : 2 };
  const [camera, setCamera] = useState<Camera>(initialCamera),
    [selected, setSelected] = useState<Key>({ x: 0, z: 0 });
  const [preset, setPreset] = useState(0),
    [paused, setPaused] = useState(true),
    [autoTravel, setAutoTravel] = useState(false),
    [message, setMessage] = useState("Chưa kiểm");
  const waypoint = useRef(0);
  const cached = useRef<{ camera: Camera; pixels: Uint8ClampedArray; rasters: number } | null>(
    null,
  );
  const [frame, setFrame] = useState<typeof cached.current>(null);
  useEffect(() => {
    if (!cached.current || cached.current.camera !== camera || world.frameDirty) {
      const image = raster(sceneMesh(world), camera);
      cached.current = {
        camera,
        pixels: image.pixels,
        rasters: (cached.current?.rasters ?? 0) + 1,
      };
      world.frameDirty = false;
      setFrame(cached.current);
    }
  }, [world, version, camera]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && frame) draw(ctx, size, world, camera, frame.pixels, selected);
  }, [size, world, version, camera, frame, selected]);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
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
  const publish = useCallback(() => {
    setMessage("Chưa kiểm");
    setVersion((v) => v + 1);
  }, []);
  const tickOnce = useCallback(() => {
    if (stage >= 9 && autoTravel) {
      const p = route[waypoint.current];
      movePlayer(world, p.x, p.z);
      waypoint.current = (waypoint.current + 1) % route.length;
    }
    pump(world);
    publish();
    if (!world.pending.length && !autoTravel) setPaused(true);
  }, [stage, autoTravel, world, publish]);
  useEffect(() => {
    if (paused || reduced || stage < 5) return;
    let id = 0,
      last = performance.now(),
      elapsed = 0;
    const tick = (now: number) => {
      elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (elapsed >= 0.2) {
        elapsed = 0;
        tickOnce();
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [paused, reduced, stage, tickOnce]);
  const reset = () => {
    stop();
    const next = createWorld(stage);
    setWorld(next);
    setCamera(initialCamera);
    setSelected({ x: 0, z: 0 });
    setPreset(0);
    setAutoTravel(false);
    waypoint.current = 0;
    cached.current = null;
    publish();
  };
  const choose = (value: number) => {
    stop();
    const p = presets[value];
    movePlayer(world, p.x, p.z);
    setPreset(value);
    setSelected(centerOf(world.player));
    publish();
  };
  const move = (dx: number, dz: number) => {
    stop();
    movePlayer(
      world,
      Math.max(-512, Math.min(512, world.player.x + dx)),
      Math.max(-512, Math.min(512, world.player.z + dz)),
    );
    publish();
  };
  const play = () => {
    release();
    if (reduced || (!world.pending.length && !autoTravel)) return;
    setPaused((p) => !p);
  };
  const one = () => {
    stop();
    tickOnce();
  };
  const teleport = () => {
    const x = selected.x * 16 + 8,
      z = selected.z * 16 + 8;
    if (Math.abs(x) > 512 || Math.abs(z) > 512) return;
    stop();
    movePlayer(world, x, z);
    publish();
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current) return;
    const p = canvasPoint(e, e.currentTarget),
      key = picked(size, world, p.x, p.y);
    stop();
    e.currentTarget.focus();
    if (key) {
      setSelected(key);
      return;
    }
    const b = layout(size);
    if (p.x < b.left || p.x > b.left + 320 * b.scale || p.y < b.top || p.y > b.top + 240 * b.scale)
      return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = { id: e.pointerId, ...p };
  };
  const drag = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const n = canvasPoint(e, e.currentTarget);
    setCamera((c) => orbit(c, (n.x - p.x) * 0.5, (n.y - p.y) * 0.5));
    pointer.current = { id: p.id, ...n };
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const actions: Record<string, () => void> = {
      r: reset,
      ArrowLeft: () => {
        stop();
        setCamera((c) => orbit(c, -8, 0));
      },
      ArrowRight: () => {
        stop();
        setCamera((c) => orbit(c, 8, 0));
      },
      ArrowUp: () => {
        stop();
        setCamera((c) => orbit(c, 0, -8));
      },
      ArrowDown: () => {
        stop();
        setCamera((c) => orbit(c, 0, 8));
      },
      "+": () => {
        stop();
        setCamera((c) => zoom(c, 1));
      },
      "=": () => {
        stop();
        setCamera((c) => zoom(c, 1));
      },
      "-": () => {
        stop();
        setCamera((c) => zoom(c, -1));
      },
    };
    if (stage >= 1) {
      actions.w = () => move(0, -4);
      actions.s = () => move(0, 4);
      actions.a = () => move(-4, 0);
      actions.d = () => move(4, 0);
      for (const [k, dx, dz] of [
        ["i", 0, -1],
        ["k", 0, 1],
        ["j", -1, 0],
        ["l", 1, 0],
      ] as const)
        actions[k] = () => {
          stop();
          setSelected((p) => ({
            x: Math.max(-64, Math.min(64, p.x + dx)),
            z: Math.max(-64, Math.min(64, p.z + dz)),
          }));
        };
    }
    if (stage >= 2) actions.p = () => choose((preset + 1) % 4);
    if (stage >= 5) {
      actions[" "] = play;
      actions.n = one;
    }
    if (stage >= 9) actions.e = teleport;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!actions[k]) return;
    e.preventDefault();
    if (e.repeat && !k.startsWith("Arrow")) return;
    actions[k]();
  };
  const entry = world.chunks.get(keyOf(selected)),
    x = splitAxis(world.player.x),
    z = splitAxis(world.player.z);
  const selectedDistance = distance(selected, targetCenter(world));
  let status = "Chưa resident";
  if (entry)
    status =
      selectedDistance <= loadRadius(world)
        ? "Resident — vùng cần tải"
        : selectedDistance <= keepRadius(world)
          ? "Resident — giữ dự phòng"
          : "Resident — chờ gỡ";
  if (!entry && world.pending.some((j) => j.kind === "load" && keyOf(j.key) === keyOf(selected)))
    status = "Đang xếp hàng tải";
  return (
    <div
      className="interactive-lab"
      data-testid="voxel-chunk-streaming-lab"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
    >
      <div className="lab-controls">
        <button onClick={reset}>Đặt lại</button>
        {stage >= 1 && (
          <>
            {[
              ["Trái", -4, 0],
              ["Phải", 4, 0],
              ["Lên", 0, -4],
              ["Xuống", 0, 4],
            ].map(([label, dx, dz]) => (
              <button key={label} onClick={() => move(Number(dx), Number(dz))}>
                {label}
              </button>
            ))}
          </>
        )}
        {stage >= 2 && (
          <label>
            Vị trí mẫu{" "}
            <select
              aria-label="Vị trí mẫu streaming"
              value={preset}
              onChange={(e) => choose(Number(e.target.value))}
            >
              {presetNames.map((p, i) => (
                <option key={i} value={i}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
        {stage >= 5 && (
          <>
            <button disabled={reduced || (!world.pending.length && !autoTravel)} onClick={play}>
              {paused ? "Chạy streaming" : "Tạm dừng"}
            </button>
            <button onClick={one}>Một tick</button>
            <label>
              Jobs mỗi tick{" "}
              <select
                aria-label="Jobs mỗi tick"
                value={world.budget}
                onChange={(e) => {
                  stop();
                  settings(world, world.radius, Number(e.target.value));
                  publish();
                }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>
          </>
        )}
        {stage >= 6 && (
          <label>
            Bán kính tải{" "}
            <select
              aria-label="Bán kính tải"
              value={world.radius}
              onChange={(e) => {
                stop();
                settings(world, Number(e.target.value), world.budget);
                publish();
              }}
            >
              <option value="1">1 — 9 chunk</option>
              <option value="2">2 — 25 chunk</option>
            </select>
          </label>
        )}
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
            aria-label="Zoom streaming"
            type="range"
            min=".5"
            max="1.5"
            step=".05"
            value={camera.zoom}
            onChange={(e) => {
              stop();
              const value = Number(e.target.value);
              setCamera((c) => ({ ...c, zoom: value }));
            }}
          />
        </label>
        {stage >= 1 &&
          (["x", "z"] as const).map((axis) => (
            <label key={axis}>
              Chunk chọn {axis}{" "}
              <input
                aria-label={`Chunk chọn ${axis}`}
                type="number"
                min="-64"
                max="64"
                value={selected[axis]}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isInteger(value) && Math.abs(value) <= 64) {
                    stop();
                    setSelected((p) => ({ ...p, [axis]: value }));
                  }
                }}
              />
            </label>
          ))}
        {stage >= 9 && (
          <>
            <label>
              <input
                aria-label="Tự đi theo mốc"
                type="checkbox"
                checked={autoTravel}
                onChange={(e) => {
                  stop();
                  setAutoTravel(e.target.checked);
                }}
              />
              Tự đi theo mốc
            </label>
            <button
              disabled={Math.abs(selected.x * 16 + 8) > 512 || Math.abs(selected.z * 16 + 8) > 512}
              onClick={teleport}
            >
              Đến chunk đã chọn
            </button>
          </>
        )}
        {stage >= 10 && (
          <button
            onClick={() => {
              stop();
              try {
                setMessage(verifySchedule(world));
              } catch (e) {
                setMessage(String(e));
              }
            }}
          >
            Kiểm giới hạn hiện tại
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        style={{ width: "100%", height: 760, touchAction: "none" }}
        tabIndex={0}
        aria-label="Chunk Streaming Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={drag}
        onPointerUp={(e) => {
          if (pointer.current?.id === e.pointerId) release();
        }}
        onPointerCancel={(e) => {
          if (pointer.current?.id === e.pointerId) stop();
        }}
        onLostPointerCapture={(e) => {
          if (pointer.current?.id === e.pointerId) pointer.current = null;
        }}
      />
      <p id={help}>
        WASD hoặc nút dịch nhân vật 4 world units mỗi nhấn; mũi tên/kéo hình xoay camera, +/− zoom.
        IJKL hoặc click bản đồ chọn chunk.{" "}
        {stage >= 5 && "Space chạy/dừng, N xử lý một tick; thao tác tay tạm dừng playback. "}
        {stage >= 9 && "E đến chunk đã chọn. "}
        {reduced && "Reduced motion: dùng Một tick, không tự chạy."}
      </p>
      <LabReadout
        items={[
          {
            label: "Nhân vật (world X/Z)",
            value: `${world.player.x.toFixed(2)}, ${world.player.z.toFixed(2)}`,
          },
          ...(stage >= 2
            ? [
                {
                  label: "Chunk / local X/Z",
                  value: `(${x.chunk},${z.chunk}) / (${x.local.toFixed(2)},${z.local.toFixed(2)})`,
                },
              ]
            : []),
          { label: "Resident / cao nhất", value: `${world.chunks.size} / ${world.peak}` },
          { label: "Chunk đang chọn", value: `(${selected.x},${selected.z}) — ${status}` },
          ...(stage >= 4
            ? [
                {
                  label: "Hash Block ID",
                  value: entry ? hashChunk(entry.blocks) : "Chưa có dữ liệu",
                },
                { label: "Load / unload", value: `${world.loads} / ${world.unloads}` },
              ]
            : []),
          ...(stage >= 5
            ? [
                { label: "Jobs đang chờ", value: world.pending.length },
                {
                  label: "Batch trước: jobs / budget",
                  value: `${world.lastJobs} / ${world.lastBudget}`,
                },
              ]
            : []),
          ...(stage >= 8
            ? [
                { label: "Mesh dựng trong batch trước", value: world.lastMeshes },
                {
                  label: "Lần dựng mesh / raster",
                  value: `${world.rebuilds} / ${frame?.rasters ?? 0}`,
                },
                {
                  label: "Block ID payload (không gồm mesh/map)",
                  value: `${world.chunks.size * 4096} bytes`,
                },
                { label: "Job bỏ vì đổi mục tiêu", value: world.cancelled },
              ]
            : []),
          ...(stage >= 10 ? [{ label: "Sanity hiện tại", value: message }] : []),
        ]}
      />
      {stage >= 5 && <BatchHistory world={world} />}
      {stage >= 5 && (
        <p>
          Đầu hàng đợi:{" "}
          {world.pending
            .slice(0, 5)
            .map((j) => `${j.kind} (${j.key.x},${j.key.z})`)
            .join(" → ") || "Đã xong"}
          . Gỡ xa trước, tải gần trước; đây là giới hạn số job, không bảo đảm thời gian ms cố định.
        </p>
      )}
      <p>
        Xanh lá: resident cần tải; vàng: resident giữ thêm hoặc đang chờ gỡ; xanh dương: đang chờ
        tải; tối: chưa resident. Map chỉ là vùng 7×7 quanh nhân vật, không phải toàn bộ world. Chấm
        hồng là marker debug vẽ đè, chưa có collision/FPS controller.{" "}
        {stage < 7
          ? "Bản này chưa bỏ mặt tiếp giáp giữa hai chunk."
          : "Neighbor resident che mặt biên; neighbor chưa có được xem như Air."}
      </p>
    </div>
  );
}
export default function VoxelChunkStreamingLab({ mode }: { mode?: string }) {
  const match = mode?.match(/^stream62-(10|[1-9])$/);
  return <StreamingLab key={match?.[1] ?? 10} stage={match ? Number(match[1]) : 10} />;
}
