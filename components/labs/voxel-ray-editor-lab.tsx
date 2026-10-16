"use client";
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
  createEditor,
  refreshEditor,
  makeChunk,
  changeCamera,
  changeGeometry,
  setAim,
  edit,
  orbit,
  zoom,
  placementCell,
  traverse,
  type Ray,
  type Editor,
  type Preset,
} from "@/lib/labs/voxel-ray-editor";
import { presetNames } from "@/lib/labs/voxel-hidden-faces/model";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw, layout } from "./voxel-ray-editor/draw";
function EditorLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    reduced = useReducedMotion(),
    help = useId(),
    editor = useRef<Editor | null>(null);
  if (!editor.current) editor.current = createEditor(stage);
  const state = editor.current;
  const [version, setVersion] = useState(0),
    [auditResult, setAuditResult] = useState("Chưa kiểm");
  const pointer = useRef<{ id: number; button: number; x: number; y: number } | null>(null);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const release = useCallback(() => {
    const p = pointer.current;
    pointer.current = null;
    if (p && canvas.current?.hasPointerCapture(p.id)) canvas.current.releasePointerCapture(p.id);
  }, []);
  const stop = useCallback(() => {
    editor.current!.paused = true;
    release();
    bump();
  }, [release, bump]);
  usePauseOnReducedMotion(stop);
  const apply = (action: (e: Editor) => void) => {
    const live = editor.current!;
    action(live);
    refreshEditor(live, stage);
    bump();
  };
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, size, editor.current!, stage);
  }, [size, version, stage]);
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
  const paused = state.paused;
  useEffect(() => {
    if (paused || reduced || stage < 4) return;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      const e = editor.current!;
      if (!e.paused && now - last >= 100) {
        e.shown = Math.min(e.trace.visits.length, e.shown + 1);
        if (e.shown >= e.trace.visits.length) e.paused = true;
        last = now;
        refreshEditor(e, stage);
        bump();
      }
      if (!e.paused) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, stage, bump]);
  const reset = () => {
    release();
    editor.current = createEditor(stage);
    setAuditResult("Chưa kiểm");
    bump();
  };
  const aim = (x: number, y: number) => {
    const b = layout(size);
    if (x < b.left || y < b.top || x >= b.left + 320 * b.scale || y >= b.top + 240 * b.scale)
      return false;
    setAim(editor.current!, Math.floor((x - b.left) / b.scale), Math.floor((y - b.top) / b.scale));
    return true;
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current || ![0, 1, 2].includes(event.button)) return;
    const p = canvasPoint(event, event.currentTarget);
    if (!aim(p.x, p.y)) return;
    event.preventDefault();
    event.currentTarget.focus();
    const live = editor.current!;
    live.paused = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, button: event.button, x: p.x, y: p.y };
    if (event.button === 0 && stage >= 6) edit(live, false);
    if (event.button === 2 && stage >= 7) edit(live, true);
    refreshEditor(live, stage);
    bump();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const live = editor.current!;
    const p = canvasPoint(event, event.currentTarget),
      drag = pointer.current;
    if (drag && drag.id !== event.pointerId) return;
    if (drag?.button === 1) {
      changeCamera(live, orbit(live.camera, (p.x - drag.x) * 0.5, (p.y - drag.y) * 0.5));
      pointer.current = { ...drag, x: p.x, y: p.y };
    } else if (!aim(p.x, p.y)) return;
    refreshEditor(live, stage);
    bump();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.repeat) return;
    const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const actions: Record<string, () => void> = {
      r: reset,
      ArrowLeft: () => apply((e) => changeCamera(e, orbit(e.camera, -8, 0))),
      ArrowRight: () => apply((e) => changeCamera(e, orbit(e.camera, 8, 0))),
      ArrowUp: () => apply((e) => changeCamera(e, orbit(e.camera, 0, -8))),
      ArrowDown: () => apply((e) => changeCamera(e, orbit(e.camera, 0, 8))),
      a: () => apply((e) => setAim(e, Math.max(0, e.pixelX - 2), e.pixelY)),
      d: () => apply((e) => setAim(e, Math.min(319, e.pixelX + 2), e.pixelY)),
      w: () => apply((e) => setAim(e, e.pixelX, Math.max(0, e.pixelY - 2))),
      s: () => apply((e) => setAim(e, e.pixelX, Math.min(239, e.pixelY + 2))),
      "+": () => apply((e) => changeCamera(e, zoom(e.camera, 1))),
      "-": () => apply((e) => changeCamera(e, zoom(e.camera, -1))),
    };
    if (stage >= 4) {
      actions[" "] = () => {
        if (!reduced) {
          apply((e) => {
            e.paused = !e.paused;
          });
        }
      };
      actions.n = () =>
        apply((e) => {
          e.paused = true;
          e.shown = Math.min(e.trace.visits.length, e.shown + 1);
        });
    }
    if (stage >= 3) {
      for (const [key, amount] of [
        ["[", -1],
        ["]", 1],
      ] as const) {
        actions[key] = () =>
          apply((e) => {
            e.reach = Math.max(1, Math.min(64, e.reach + amount));
            e.pickDirty = true;
            e.paused = true;
          });
      }
    }
    if (stage >= 6) {
      actions.Delete = () =>
        apply((e) => {
          edit(e, false);
        });
      actions.Backspace = actions.Delete;
    }
    if (stage >= 7) {
      actions.e = () =>
        apply((e) => {
          edit(e, true);
        });
      for (const material of [1, 2, 3]) {
        actions[String(material)] = () =>
          apply((e) => {
            e.material = material;
          });
      }
    }
    if (actions[k]) {
      event.preventDefault();
      actions[k]();
    }
  };
  const visit = state.trace.visits[Math.min(state.shown, state.trace.visits.length) - 1],
    hit = state.trace.hit,
    target = stage >= 7 ? placementCell(state.chunk, hit) : null;
  return (
    <div className="interactive-lab" data-testid="voxel-ray-editor-lab">
      <div className="lab-controls">
        <button onClick={reset}>Đặt lại</button>
        <label>
          Khối mẫu{" "}
          <select
            aria-label="Khối mẫu ray editor"
            value={state.preset}
            onChange={(e) => {
              release();
              const p = Number(e.target.value) as Preset;
              apply((s) => {
                s.preset = p;
                s.chunk = makeChunk(p);
                changeGeometry(s);
                s.message = "Đã nạp lại preset";
              });
            }}
          >
            {presetNames.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pixel x{" "}
          <input
            aria-label="Pixel x"
            type="range"
            min="0"
            max="319"
            step="1"
            value={state.pixelX}
            onChange={(e) => {
              const x = Number(e.target.value);
              apply((s) => setAim(s, x, s.pixelY));
            }}
          />
        </label>
        <label>
          Pixel y{" "}
          <input
            aria-label="Pixel y"
            type="range"
            min="0"
            max="239"
            step="1"
            value={state.pixelY}
            onChange={(e) => {
              const y = Number(e.target.value);
              apply((s) => setAim(s, s.pixelX, y));
            }}
          />
        </label>
        <label>
          Zoom{" "}
          <input
            aria-label="Zoom ray editor"
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={state.camera.zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              apply((s) => changeCamera(s, { ...s.camera, zoom: z }));
            }}
          />
        </label>
        {stage >= 3 && (
          <label>
            Tầm với{" "}
            <input
              aria-label="Tầm với"
              type="range"
              min="1"
              max="64"
              step="1"
              value={state.reach}
              onChange={(e) => {
                const reach = Number(e.target.value);
                apply((s) => {
                  s.reach = reach;
                  s.pickDirty = true;
                  s.paused = true;
                });
              }}
            />
          </label>
        )}
        {stage >= 4 && (
          <>
            <button
              disabled={reduced}
              onClick={() => {
                state.paused = !state.paused;
                bump();
              }}
            >
              {state.paused ? "Chạy DDA" : "Tạm dừng"}
            </button>
            <button
              onClick={() =>
                apply((s) => {
                  s.paused = true;
                  s.shown = Math.min(s.trace.visits.length, s.shown + 1);
                })
              }
            >
              Một ô tiếp theo
            </button>
          </>
        )}
        {stage >= 6 && (
          <button
            onClick={() =>
              apply((s) => {
                edit(s, false);
              })
            }
          >
            Phá block đang ngắm
          </button>
        )}
        {stage >= 7 && (
          <>
            <label>
              Vật liệu{" "}
              <select
                aria-label="Vật liệu đặt block"
                value={state.material}
                onChange={(e) => {
                  state.material = Number(e.target.value);
                  bump();
                }}
              >
                <option value={1}>Grass</option>
                <option value={2}>Dirt</option>
                <option value={3}>Stone</option>
              </select>
            </label>
            <button
              disabled={!target}
              onClick={() =>
                apply((s) => {
                  edit(s, true);
                })
              }
            >
              Đặt block ở ô xanh
            </button>
          </>
        )}
      </div>
      <canvas
        ref={canvas}
        style={{ width: "100%", height: 620, touchAction: "none" }}
        tabIndex={0}
        aria-label="Voxel Ray Editor Lab"
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
        onContextMenu={(e) => e.preventDefault()}
      />
      <p id={help}>
        Di chuyển con trỏ hoặc WASD để ngắm; arrow/middle-drag xoay camera, +/− zoom, R reset.{" "}
        {stage >= 4 ? "Space chạy/dừng preview hữu hạn, N đi một ô. " : ""}
        {stage >= 6
          ? "Click trái/Delete phá một block mỗi lần nhấn; giữ hoặc kéo không phá liên tục. "
          : ""}
        {stage >= 7 ? "Click phải/E đặt tại ô xanh, không ghi đè block đặc. " : ""}Outline là
        overlay debug; hình chính vẫn dùng Z-buffer.{" "}
        {reduced ? "Reduced motion: chỉ xem từng ô thủ công." : "Mở bài ở trạng thái paused."}
      </p>
      <LabReadout
        items={[
          { label: "Tâm ngắm (pixel)", value: `${state.pixelX}, ${state.pixelY}` },
          { label: "Block / triangles", value: `${state.mesh.solid} / ${state.mesh.mesh.length}` },
          ...(stage >= 2 && state.ray
            ? [
                {
                  label: "Ray origin / direction",
                  value: `(${state.ray.origin.map((v) => v.toFixed(3)).join(", ")}) / (${state.ray.direction.map((v) => v.toFixed(3)).join(", ")})`,
                },
              ]
            : []),
          ...(stage >= 3
            ? [
                {
                  label: "Đoạn trong chunk",
                  value: state.trace.interval
                    ? `${state.trace.interval.enter.toFixed(4)} → ${state.trace.interval.exit.toFixed(4)}`
                    : "MISS / ngoài tầm",
                },
              ]
            : []),
          ...(stage >= 4
            ? [
                {
                  label: "Ô DDA đang xem",
                  value: visit
                    ? `(${visit.cell.join(", ")}) | t ${visit.enter.toFixed(4)} → ${visit.exit.toFixed(4)} | ${Math.min(state.shown, state.trace.visits.length)}/${state.trace.visits.length}`
                    : "Không có đoạn đi trong ô",
                },
              ]
            : []),
          ...(stage >= 5
            ? [
                {
                  label: "Hit đầu tiên",
                  value: hit
                    ? `(${hit.cell.join(", ")}) | n=(${hit.normal.join(", ")}) | t=${hit.distance.toFixed(4)}`
                    : "MISS",
                },
              ]
            : []),
          ...(stage >= 7
            ? [
                {
                  label: "Ô đặt block",
                  value: target ? `(${target.join(", ")})` : "Không có ô đặt hợp lệ",
                },
              ]
            : []),
          ...(stage >= 6 ? [{ label: "Kết quả chỉnh sửa", value: state.message }] : []),
          ...(stage >= 8
            ? [
                {
                  label: "Rebuild / raster / pick",
                  value: `${state.rebuilds} / ${state.rasterizations} / ${state.queries}`,
                },
              ]
            : []),
        ]}
      />
      {stage >= 9 && (
        <button
          onClick={() => {
            stop();
            let ok = true;
            for (const p of [0, 1, 2, 3, 4, 5, 6]) {
              const c = makeChunk(p as Preset);
              const ray = state.ray;
              if (ray) {
                const a = traverseForAudit(c, ray);
                ok = ok && a;
              }
            }
            setAuditResult(
              ok ? "PASS: query có giới hạn; oracle đầy đủ nằm trong Node/CTest" : "FAIL",
            );
          }}
        >
          Kiểm query hiện tại
        </button>
      )}
      {stage >= 9 && <p aria-live="polite">{auditResult}</p>}
      <p>
        Chỉ một chunk opaque, chưa FPS controller, streaming, greedy meshing, undo hay lưu thay đổi.
        Tầm với tính từ mặt phẳng phát tia của camera trực giao, không phải mắt người chơi.
      </p>
    </div>
  );
}
// Smoke toán nhỏ cho nút UI; các bộ test so với oracle độc lập đầy đủ hơn.
function traverseForAudit(chunk: Uint8Array, ray: Ray) {
  return traverse(chunk, ray).visits.length <= 64;
}
export default function VoxelRayEditorLab({ mode }: { mode?: string }) {
  const match = mode?.match(/^pick60-([1-9])$/);
  return <EditorLab key={match?.[1] ?? 9} stage={match ? Number(match[1]) : 9} />;
}
