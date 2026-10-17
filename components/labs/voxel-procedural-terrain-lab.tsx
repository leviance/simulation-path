"use client";
import { verifyTriangles } from "@/lib/labs/voxel-chunk-streaming/mesh-audit";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  createTerrain,
  applyConfig,
  defaultConfig,
  heightAt,
  terrainSignal,
  latticeHash,
  verifyColumns,
  type TerrainConfig,
} from "@/lib/labs/voxel-procedural-terrain";
import {
  pump,
  movePlayer,
  presets,
  presetNames,
  centerOf,
  keyOf,
  sceneMesh,
  streamingCamera,
  raster,
  orbit,
  zoom,
  hashChunk,
  verifySchedule,
  verifySurface,
  type Camera,
} from "@/lib/labs/voxel-chunk-streaming";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw, picked } from "./voxel-procedural-terrain/draw";
import { NoiseCell } from "./voxel-procedural-terrain/noise-cell";
function TerrainLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [state, setState] = useState(() => createTerrain({ ...defaultConfig, stage }));
  const [version, setVersion] = useState(0),
    [draft, setDraft] = useState<TerrainConfig>({ ...defaultConfig, stage });
  const [camera, setCamera] = useState<Camera>({ ...streamingCamera, scale: 2 });
  const [selected, setSelected] = useState({ x: 8, z: 8 }),
    [preset, setPreset] = useState(0),
    [localBug, setLocalBug] = useState(false);
  const [paused, setPaused] = useState(true),
    [message, setMessage] = useState("Chưa kiểm");
  const [frame, setFrame] = useState<Uint8ClampedArray | null>(null);
  const cached = useRef<{ camera: Camera; pixels: Uint8ClampedArray } | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number; map: boolean } | null>(null);
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
  }, [release, stop]);
  const publish = useCallback(() => {
    setMessage("Chưa kiểm");
    setVersion((v) => v + 1);
  }, []);
  const tickOnce = useCallback(() => {
    pump(state.world);
    publish();
    if (!state.world.pending.length) setPaused(true);
  }, [state, publish]);
  useEffect(() => {
    if (paused || reduced) return;
    let frameId = 0,
      before = 0,
      elapsed = 0;
    const tick = (now: number) => {
      if (before) elapsed += Math.min(0.1, (now - before) / 1000);
      before = now;
      if (elapsed >= 0.2) {
        elapsed = 0;
        tickOnce();
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [paused, reduced, tickOnce]);
  useEffect(() => {
    if (!cached.current || cached.current.camera !== camera || state.world.frameDirty) {
      cached.current = { camera, pixels: raster(sceneMesh(state.world), camera).pixels };
      state.world.frameDirty = false;
      setFrame(cached.current.pixels);
    }
  }, [state, version, camera]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && frame) draw(ctx, size, state.world, state.config, frame, selected, localBug);
  }, [size, state, version, frame, selected, localBug]);
  function move(dx: number, dz: number) {
    stop();
    const p = state.world.player;
    movePlayer(
      state.world,
      Math.max(-512, Math.min(512, p.x + dx)),
      Math.max(-512, Math.min(512, p.z + dz)),
    );
    setSelected({ x: Math.floor(state.world.player.x), z: Math.floor(state.world.player.z) });
    publish();
  }
  function reset() {
    stop();
    setState(createTerrain({ ...defaultConfig, stage }));
    setDraft({ ...defaultConfig, stage });
    setCamera({ ...streamingCamera, scale: 2 });
    cached.current = null;
    setPreset(0);
    setSelected({ x: 8, z: 8 });
    setLocalBug(false);
    publish();
  }
  function keyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    const key = e.key.toLowerCase();
    if (
      ![
        "w",
        "a",
        "s",
        "d",
        "n",
        "r",
        " ",
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
    if (key === "r") {
      reset();
      return;
    }
    if (key === "n") {
      stop();
      tickOnce();
      return;
    }
    if (key === "w") move(0, -4);
    if (key === "s") move(0, 4);
    if (key === "a") move(-4, 0);
    if (key === "d") move(4, 0);
    if (key.startsWith("arrow")) {
      const c = { ...camera };
      let dx = 0,
        dy = 0;
      if (key === "arrowleft") dx = -8;
      if (key === "arrowright") dx = 8;
      if (key === "arrowup") dy = -8;
      if (key === "arrowdown") dy = 8;
      stop();
      setCamera(orbit(c, dx, dy));
    }
    if (key === "+" || key === "-") {
      stop();
      setCamera(zoom(camera, key === "+" ? 1 : -1));
    }
  }
  function audit() {
    stop();
    try {
      verifySchedule(state.world);
      let errors = 0;
      for (const entry of state.world.chunks.values())
        errors += verifyColumns(entry.key, entry.blocks, state.config);
      const surface = verifySurface(state.world);
      const triangles = verifyTriangles(state.world);
      setMessage(`PASS: ${errors} lỗi cột; ${surface} mặt đơn vị; ${triangles} triangle khớp quad`);
      if (errors) setMessage(`FAIL: ${errors} lỗi cột`);
    } catch (e) {
      setMessage(`FAIL: ${String(e)}`);
    }
  }
  const center = state.world.chunks.get(keyOf(centerOf(state.world.player)));
  return (
    <div
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
    >
      <div className="lab-controls">
        <button
          type="button"
          onClick={() => {
            release();
            setPaused((v) => !v);
          }}
          disabled={reduced || !state.world.pending.length}
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
          Đặt lại
        </button>
        <label>
          Vị trí mẫu terrain
          <select
            value={preset}
            onChange={(e) => {
              stop();
              const n = Number(e.target.value);
              setPreset(n);
              const p = presets[n];
              movePlayer(state.world, p.x, p.z);
              setSelected({ x: Math.floor(p.x), z: Math.floor(p.z) });
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
        {stage >= 7 && (
          <>
            <label>
              Seed terrain
              <input
                type="number"
                min={0}
                max={65535}
                step={1}
                value={draft.seed}
                onChange={(e) => setDraft({ ...draft, seed: Number(e.target.value) })}
              />
            </label>
            <label>
              Scale terrain
              <select
                value={draft.scale}
                onChange={(e) => setDraft({ ...draft, scale: Number(e.target.value) })}
              >
                {[16, 32, 64].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Octave terrain
              <select
                value={draft.octaves}
                onChange={(e) => setDraft({ ...draft, octaves: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                stop();
                try {
                  applyConfig(state, draft);
                  publish();
                } catch {
                  setMessage("Cấu hình không hợp lệ; world không đổi");
                }
              }}
            >
              Áp dụng cấu hình
            </button>
          </>
        )}
        <label>
          <input
            type="checkbox"
            checked={localBug}
            onChange={(e) => {
              stop();
              setLocalBug(e.target.checked);
            }}
          />
          Cố ý dùng local cho preview 2D
        </label>
        <label>
          Cột world X
          <input
            type="number"
            min={-544}
            max={559}
            step={1}
            value={selected.x}
            onChange={(e) => {
              const x = Number(e.target.value);
              if (Number.isInteger(x) && Math.abs(x) <= 559) {
                stop();
                setSelected({ ...selected, x });
              }
            }}
          />
        </label>
        <label>
          Cột world Z
          <input
            type="number"
            min={-544}
            max={559}
            step={1}
            value={selected.z}
            onChange={(e) => {
              const z = Number(e.target.value);
              if (Number.isInteger(z) && Math.abs(z) <= 559) {
                stop();
                setSelected({ ...selected, z });
              }
            }}
          />
        </label>
        {stage >= 9 && (
          <button type="button" onClick={audit}>
            Kiểm cột và mesh resident
          </button>
        )}
      </div>
      <p id={help}>
        WASD dịch 4 đơn vị; N tải tối đa 2 job; Space chạy/dừng; R đặt lại; phím mũi tên xoay, +/−
        zoom. Kéo ảnh 3D để xoay; kéo height map chọn cột (hoặc nhập X/Z). Map và đồ thị truy vấn
        hàm terrain, không tự tải chunk. {reduced && "Reduced motion: dùng Một tick."}
      </p>
      <canvas
        ref={canvas}
        width={760}
        height={930}
        style={{ width: "100%", height: 930, touchAction: "none" }}
        tabIndex={0}
        aria-label="Procedural Terrain Lab"
        aria-describedby={help}
        onKeyDown={keyDown}
        onPointerDown={(e) => {
          if (e.button !== 0 || pointer.current !== null) return;
          stop();
          const p = canvasPoint(e, e.currentTarget);
          const column = picked(size, state.world, p.x, p.y);
          if (column) setSelected(column);
          if (!column && p.y >= 320) return;
          pointer.current = { id: e.pointerId, ...p, map: !!column };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus();
        }}
        onPointerMove={(e) => {
          const old = pointer.current;
          if (!old || old.id !== e.pointerId) return;
          const p = canvasPoint(e, e.currentTarget);
          if (old.map) {
            const column = picked(size, state.world, p.x, p.y);
            if (column) setSelected(column);
          } else setCamera((c) => orbit(c, (p.x - old.x) * 0.5, (p.y - old.y) * 0.5));
          pointer.current = { ...old, ...p };
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
          { label: "Thế hệ / seed đang dùng", value: `${state.generation} / ${state.config.seed}` },
          {
            label: "Resident / job chờ",
            value: `${state.world.chunks.size} / ${state.world.pending.length}`,
          },
          {
            label: "Batch jobs / mesh",
            value: `${state.world.lastJobs} / ${state.world.lastMeshes}`,
          },
          { label: "Cột được chọn", value: `(${selected.x},${selected.z})` },
          {
            label: "n / số block H",
            value: `${terrainSignal(selected.x, selected.z, state.config).toFixed(5)} / ${heightAt(selected.x, selected.z, state.config)}`,
          },
          {
            label: "Hash chunk dưới nhân vật",
            value: center ? hashChunk(center.blocks) : "Chưa resident",
          },
          { label: "Hash nút lattice (0,0)", value: latticeHash(0, 0, state.config.seed) },
          { label: "Kiểm chứng", value: message },
        ]}
      />
      <p>
        Đường xanh biểu diễn tín hiệu trước floor; từ bài nội suy, nó liên tục khi dùng tọa độ
        world. Đường vàng có bậc do lấy mẫu voxel và floor. Không yêu cầu H(15,z)=H(16,z). Không có
        hang động, lưu edit, erosion hay generation đa luồng.
      </p>
      {stage >= 4 && <NoiseCell seed={state.config.seed} />}
    </div>
  );
}
export default function VoxelProceduralTerrainLab({ mode }: { mode?: string }) {
  const parsed = Number(mode?.split("-").at(-1));
  const stage = Number.isInteger(parsed) && parsed >= 1 && parsed <= 9 ? parsed : 9;
  return <TerrainLab key={stage} stage={stage} />;
}
