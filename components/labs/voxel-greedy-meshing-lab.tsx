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
  makeMask,
  rectangles,
  buildMesh,
  verify,
  defaultCamera,
  orbit,
  zoom,
  raster,
  presetNames,
  faceNames,
  createPlaybackClock,
  playbackDue,
  explainRectangle,
  type Preset,
} from "@/lib/labs/voxel-greedy-meshing";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw } from "./voxel-greedy-meshing/draw";

function GreedyLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [preset, setPreset] = useState<Preset>(2),
    [slice, setSlice] = useState(15),
    [merge, setMerge] = useState(stage >= 5);
  const [face, setFace] = useState(2),
    [plane, setPlane] = useState(16),
    [camera, setCamera] = useState(defaultCamera);
  const [shown, setShown] = useState(0),
    [paused, setPaused] = useState(true),
    [result, setResult] = useState("Chưa kiểm");
  const [version, setVersion] = useState(0);
  const chunk = useMemo(() => makeChunk(preset), [preset, version]);
  const built = useMemo(
    () => buildMesh(chunk, slice, merge, stage === 5 ? 2 : -1),
    [chunk, slice, merge, stage],
  );
  const mask = useMemo(() => makeMask(chunk, face, plane, slice), [chunk, face, plane, slice]);
  const rects = useMemo(() => rectangles(mask, face, plane), [mask, face, plane]);
  const decision = useMemo(
    () => (stage >= 4 ? explainRectangle(mask, rects, stage >= 7 ? shown - 1 : 0) : null),
    [mask, rects, stage, shown],
  );
  const frame = useMemo(() => raster(built.mesh, camera), [built, camera]);
  const counters = useRef({
    built: null as typeof built | null,
    frame: null as typeof frame | null,
    rebuilds: 0,
    rasterizations: 0,
    version: -1,
  });
  const [counts, setCounts] = useState({ rebuilds: 0, rasterizations: 0 });
  useEffect(() => {
    const c = counters.current;
    if (c.version !== version) {
      c.built = null;
      c.frame = null;
      c.rebuilds = 0;
      c.rasterizations = 0;
      c.version = version;
    }
    if (c.built !== built) {
      c.built = built;
      c.rebuilds++;
    }
    if (c.frame !== frame) {
      c.frame = frame;
      c.rasterizations++;
    }
    setCounts({ rebuilds: c.rebuilds, rasterizations: c.rasterizations });
  }, [built, frame, version]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx)
      draw(
        ctx,
        size,
        frame.pixels,
        mask,
        rects,
        stage >= 7 ? shown : rects.length,
        stage,
        face,
        decision,
      );
  }, [size, frame, mask, rects, shown, stage, face, decision]);
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
  useEffect(() => {
    if (paused || reduced || stage < 7) return;
    let id = 0;
    const clock = createPlaybackClock();
    const tick = (now: number) => {
      if (playbackDue(clock, now)) {
        setShown((n) => Math.min(rects.length, n + 1));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [paused, reduced, rects.length, stage]);
  useEffect(() => {
    if (shown >= rects.length) setPaused(true);
  }, [shown, rects.length]);
  const restart = () => {
    stop();
    setShown(0);
    setResult("Chưa kiểm");
  };
  const reset = () => {
    restart();
    setPreset(2);
    setSlice(15);
    setMerge(stage >= 5);
    setFace(2);
    setPlane(16);
    setCamera(defaultCamera);
    setVersion((v) => v + 1);
  };
  const play = () => {
    release();
    if (reduced || rects.length === 0) return;
    if (shown >= rects.length) setShown(0);
    setPaused((v) => !v);
  };
  const next = () => {
    stop();
    setShown((n) => Math.min(rects.length, n + 1));
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current) return;
    stop();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = { id: e.pointerId, ...canvasPoint(e, e.currentTarget) };
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const n = canvasPoint(e, e.currentTarget);
    setCamera((c) => orbit(c, (n.x - p.x) * 0.5, (n.y - p.y) * 0.5));
    pointer.current = { id: p.id, ...n };
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
    };
    if (stage >= 2) {
      actions.f = () => {
        restart();
        setFace((n) => (n + 1) % 6);
      };
      actions["["] = () => {
        restart();
        setPlane((n) => Math.max(0, n - 1));
      };
      actions["]"] = () => {
        restart();
        setPlane((n) => Math.min(16, n + 1));
      };
    }
    if (stage >= 5)
      actions.m = () => {
        restart();
        setMerge((v) => !v);
      };
    if (stage >= 6) {
      actions.PageUp = () => {
        restart();
        setSlice((n) => Math.min(15, n + 1));
      };
      actions.PageDown = () => {
        restart();
        setSlice((n) => Math.max(0, n - 1));
      };
    }
    if (stage >= 7) {
      actions[" "] = play;
      actions.n = next;
    }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!actions[k]) return;
    e.preventDefault();
    if (e.repeat && [" ", "r", "m", "f", "n"].includes(k)) return;
    actions[k]();
  };
  const selected = rects[Math.min(shown, rects.length) - 1];
  return (
    <div
      className="interactive-lab"
      data-testid="voxel-greedy-meshing-lab"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
    >
      <div className="lab-controls">
        <button onClick={reset}>Đặt lại</button>
        {stage >= 4 && (
          <button
            type="button"
            onClick={() => {
              stop();
              setPreset(8);
              setSlice(15);
              setFace(2);
              setPlane(16);
              setShown(0);
              setResult("Chưa kiểm");
            }}
          >
            Nạp ví dụ mask 4×4
          </button>
        )}
        <label>
          Khối mẫu{" "}
          <select
            aria-label="Khối mẫu greedy"
            value={preset}
            onChange={(e) => {
              restart();
              setPreset(Number(e.target.value) as Preset);
            }}
          >
            {presetNames.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {stage >= 2 && (
          <>
            <label>
              Hướng mặt{" "}
              <select
                aria-label="Hướng mặt greedy"
                value={face}
                onChange={(e) => {
                  restart();
                  setFace(Number(e.target.value));
                }}
              >
                {faceNames.map((n, i) => (
                  <option key={i} value={i}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mặt phẳng{" "}
              <input
                aria-label="Mặt phẳng greedy"
                type="range"
                min="0"
                max="16"
                value={plane}
                onChange={(e) => {
                  restart();
                  setPlane(Number(e.target.value));
                }}
              />
              {plane}
            </label>
          </>
        )}
        {stage >= 5 && (
          <label>
            <input
              type="checkbox"
              aria-label="Gộp mặt greedy"
              checked={merge}
              onChange={(e) => {
                restart();
                setMerge(e.target.checked);
              }}
            />
            Gộp mặt
          </label>
        )}
        {stage >= 6 && (
          <label>
            Cắt ở y{" "}
            <input
              aria-label="Cắt ở y greedy"
              type="range"
              min="0"
              max="15"
              value={slice}
              onChange={(e) => {
                restart();
                setSlice(Number(e.target.value));
              }}
            />
            {slice}
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
            aria-label="Zoom greedy"
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={camera.zoom}
            onChange={(e) => {
              stop();
              const z = Number(e.target.value);
              setCamera((c) => ({ ...c, zoom: z }));
            }}
          />
        </label>
        {stage >= 7 && (
          <>
            <button disabled={reduced || !rects.length} onClick={play}>
              {paused ? "Chạy gộp" : "Tạm dừng"}
            </button>
            <button onClick={next}>Một rectangle</button>
            <button onClick={restart}>Về đầu mask</button>
          </>
        )}
        {stage >= 9 && (
          <button
            onClick={() => {
              stop();
              try {
                setResult(
                  `PASS: ${verify(chunk, built.quads, slice)} mặt đơn vị khớp vị trí/hướng/vật liệu. Chỉ kiểm khối đang chọn.`,
                );
              } catch (e) {
                setResult(String(e));
              }
            }}
          >
            Đối chiếu khối này
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        style={{ width: "100%", height: stage >= 2 ? 760 : 460, touchAction: "none" }}
        tabIndex={0}
        aria-label="Greedy Meshing Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
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
        Kéo hoặc dùng mũi tên để xoay, +/− zoom, R đặt lại.{" "}
        {stage >= 2 && "F đổi hướng, [/] đổi mặt phẳng. "}
        {stage >= 5 && "M đổi baseline/greedy. "}
        {stage >= 6 && "PageUp/PageDown đổi lớp cắt. "}
        {stage >= 7 &&
          "N đi một rectangle; Space chạy/dừng. Viền trắng là rectangle vừa chọn, vàng là phần đã gộp. "}
        {reduced && "Reduced motion: chỉ đi từng bước."}
      </p>
      <LabReadout
        items={[
          {
            label: "Mặt đơn vị → quad đang vẽ",
            value: `${built.unitFaces} → ${built.quads.length}`,
          },
          { label: "Triangles", value: built.mesh.length },
          ...(stage >= 2
            ? [
                {
                  label: "Mask đang xem",
                  value: `${faceNames[face]}, plane=${plane}; ${mask.filter((m) => m !== 0).length} mặt đơn vị`,
                },
              ]
            : []),
          ...(stage >= 4
            ? [
                {
                  label: "Rectangle của mask",
                  value: stage >= 7 ? `${shown}/${rects.length}` : rects.length,
                },
              ]
            : []),
          ...(stage >= 3
            ? [
                {
                  label: "Vật liệu trong mask",
                  value: `Grass=${mask.filter((m) => m === 1).length}, Dirt=${mask.filter((m) => m === 2).length}, Stone=${mask.filter((m) => m === 3).length}`,
                },
              ]
            : []),
          ...(stage >= 7
            ? [
                {
                  label: "Rectangle vừa chọn",
                  value: selected
                    ? `u=${selected.u}, v=${selected.v}, w=${selected.width}, h=${selected.height}, material=${selected.material}`
                    : "Chưa chọn",
                },
              ]
            : []),
          ...(decision
            ? [
                {
                  label: "Seed đang giải thích",
                  value: `(${decision.seed.u},${decision.seed.v}) — viền xanh; rectangle ${decision.index + 1}`,
                },
                { label: "Vì sao width dừng?", value: decision.width.reason },
                { label: "Vì sao height dừng?", value: decision.height.reason },
              ]
            : []),
          ...(stage >= 8
            ? [
                {
                  label: "Mesh rebuild / raster",
                  value: `${counts.rebuilds} / ${counts.rasterizations}`,
                },
                {
                  label: merge
                    ? "Mask samples / key comparisons"
                    : "Neighbor checks / key comparisons",
                  value: `${built.work.samples} / ${built.work.comparisons}`,
                },
              ]
            : []),
          ...(stage >= 9 ? [{ label: "Oracle hiện tại", value: result }] : []),
        ]}
      />
      <p>
        3D luôn hiển thị mesh hoàn chỉnh; stepper chỉ diễn lại danh sách rectangle đã lưu của một
        mask, không dừng mesher giữa chừng. {stage === 5 && "Bài này mới gộp hướng +Y. "}Các ô tối
        không phải Air trong world mà là vị trí không có mặt ngoài theo hướng đã chọn. Giảm quad
        không có nghĩa FPS tăng theo cùng tỷ lệ.
        {stage >= 4 &&
          " Viền xanh đánh dấu seed, đỏ đánh dấu ô làm dừng width/height; nếu dừng ở biên thì không có ô đỏ. Trước bài 07, phần giải thích chọn rectangle đầu tiên; từ bài 07, nó theo rectangle vừa bước tới."}
      </p>
    </div>
  );
}
export default function VoxelGreedyMeshingLab({ mode }: { mode?: string }) {
  const match = mode?.match(/^greedy61-([1-9])$/);
  return <GreedyLab key={match?.[1] ?? 9} stage={match ? Number(match[1]) : 9} />;
}
