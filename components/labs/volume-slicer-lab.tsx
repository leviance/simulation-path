"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  axesFor,
  auditVolume,
  clampPoint,
  colorImage,
  fitSlice,
  gridCoordinate,
  initialPoint,
  makeGrid,
  phantom,
  pickSlice,
  presetNames,
  presets,
  sampleImage,
  sampleLinear,
  sampleNearest,
  viewNames,
  windowValue,
  worldCoordinate,
  type Point,
  type Preset,
} from "@/lib/labs/volume-slicer";
import { createDataset } from "@/lib/labs/volume-slicer/dataset";
import { defaultSliceCamera, type SliceCamera } from "@/lib/labs/volume-slicer/camera";
import {
  canvasPoint,
  LabReadout,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { useClientReady } from "../use-client-ready";
import { drawSlices } from "./volume-slicer/draw";
import { sceneRect, slicePanelRect } from "./volume-slicer/viewport";
import { createScanClock } from "@/lib/labs/volume-slicer/scan-clock";
import { TrilinearInspector } from "./volume-slicer/trilinear-inspector";
import { VolumeHistogram } from "./volume-slicer/histogram";
import styles from "./volume-slicer/volume-slicer.module.css";

const darkSnapshot = () =>
  document.documentElement.dataset.theme === "dark" ||
  document.documentElement.classList.contains("dark");
const subscribeTheme = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  return () => observer.disconnect();
};
const limitCamera = (camera: SliceCamera): SliceCamera => ({
  ...camera,
  pitch: Math.max(0.05, Math.min(1.35, camera.pitch)),
  distance: Math.max(5.3, Math.min(12, camera.distance)),
});

function SlicerExperiment({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    ready = useClientReady(),
    reduced = useReducedMotion();
  const dark = useSyncExternalStore(subscribeTheme, darkSnapshot, () => false);
  const [side, setSide] = useState(stage >= 7 ? 128 : 64),
    grid = useMemo(() => makeGrid(side), [side]);
  const [cursor, setCursor] = useState<Point>(() => initialPoint()),
    [activeView, setView] = useState(0),
    [preset, setPreset] = useState<Preset>("phantom");
  const [level, setLevel] = useState(0.5),
    [width, setWidth] = useState(1),
    [linear, setLinear] = useState(stage >= 5),
    [color, setColor] = useState(stage >= 4);
  const [camera, setCamera] = useState<SliceCamera>({ ...defaultSliceCamera }),
    [cutaway, setCutaway] = useState(true),
    [interactive, setInteractive] = useState(false);
  const [paused, setPaused] = useState(true),
    [validation, setValidation] = useState("Chưa kiểm"),
    [inspectorVersion, setInspectorVersion] = useState(0);
  const pointer = useRef<{
    id: number;
    kind: "slice" | "scene";
    view: number;
    x: number;
    y: number;
  } | null>(null);
  const wheelIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const result = useMemo(() => {
    if (!ready || stage < 2) return { data: null, error: "" };
    try {
      return { data: createDataset(side, preset, stage >= 3), error: "" };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Không tạo được volume",
      };
    }
  }, [ready, side, preset, stage]);
  const volume = result.data?.volume ?? null,
    mesh = result.data?.mesh ?? null;
  const axes = axesFor(activeView),
    atEnd = cursor[axes.cut] >= worldCoordinate(grid, axes.cut, side - 1);
  const release = useCallback(() => {
    const drag = pointer.current;
    pointer.current = null;
    setInteractive(false);
    if (drag && canvas.current?.hasPointerCapture(drag.id))
      canvas.current.releasePointerCapture(drag.id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const [cursorX, cursorY, cursorZ] = cursor;
  const rawXY = useMemo(
    () =>
      ready && (stage < 2 || volume)
        ? sampleImage(volume, 0, [0, 0, cursorZ], linear, stage, 256)
        : null,
    [ready, volume, cursorZ, linear, stage],
  );
  const rawXZ = useMemo(
    () =>
      stage >= 3 && volume ? sampleImage(volume, 1, [0, cursorY, 0], linear, stage, 256) : null,
    [volume, cursorY, linear, stage],
  );
  const rawYZ = useMemo(
    () =>
      stage >= 3 && volume ? sampleImage(volume, 2, [cursorX, 0, 0], linear, stage, 256) : null,
    [volume, cursorX, linear, stage],
  );
  const raw = useMemo(
    () => [rawXY, rawXZ, rawYZ].filter((value) => value !== null),
    [rawXY, rawXZ, rawYZ],
  );
  const images = useMemo(
    () => raw.map((values) => colorImage(values, { level, width }, stage, color)),
    [raw, level, width, stage, color],
  );
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && images.length === (stage >= 3 ? 3 : 1))
      drawSlices(
        ctx,
        size,
        grid,
        cursor,
        activeView,
        stage,
        images,
        raw,
        volume,
        mesh,
        camera,
        cutaway,
        interactive,
        dark,
      );
  }, [
    size,
    grid,
    cursor,
    activeView,
    stage,
    images,
    raw,
    volume,
    mesh,
    camera,
    cutaway,
    interactive,
    dark,
    level,
    width,
  ]);
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
    const target = canvas.current;
    if (!target || stage < 3) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== target) return;
      const p = canvasPoint(event, target),
        area = sceneRect(size.width, size.height);
      if (p.x < area.x || p.x > area.x + area.width || p.y < area.y || p.y > area.y + area.height)
        return;
      event.preventDefault();
      setPaused(true);
      setInteractive(true);
      if (wheelIdle.current) clearTimeout(wheelIdle.current);
      setCamera((old) =>
        limitCamera({
          ...old,
          distance: old.distance * Math.exp(event.deltaY * 0.001),
        }),
      );
      wheelIdle.current = setTimeout(() => setInteractive(false), 120);
    };
    target.addEventListener("wheel", wheel, { passive: false });
    return () => {
      target.removeEventListener("wheel", wheel);
      if (wheelIdle.current) clearTimeout(wheelIdle.current);
    };
  }, [stage, size.width, size.height]);
  useEffect(() => {
    if (paused || reduced || atEnd || stage < 6) return;
    let frame = 0;
    const elapsed = createScanClock(performance.now());
    const animate = (now: number) => {
      const dt = elapsed(now);
      if (dt > 0)
        setCursor((old) => {
          const next: Point = [...old];
          const axis = axesFor(activeView).cut;
          next[axis] += dt * grid.spacing[axis] * 4;
          return clampPoint(grid, next);
        });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, atEnd, stage, activeView, grid]);
  useEffect(() => {
    if (!atEnd || paused) return;
    const frame = requestAnimationFrame(stop);
    return () => cancelAnimationFrame(frame);
  }, [atEnd, paused, stop]);
  const reset = () => {
    stop();
    setCursor(initialPoint(grid));
    setView(0);
    setLevel(0.5);
    setWidth(1);
    setLinear(stage >= 5);
    setColor(stage >= 4);
    setCamera({ ...defaultSliceCamera });
    setCutaway(true);
    setValidation("Chưa kiểm");
    setInspectorVersion((v) => v + 1);
  };
  const changeCut = (view: number, value: number) => {
    stop();
    setView(view);
    const axis = axesFor(view).cut;
    setCursor((old) => {
      const next: Point = [...old];
      next[axis] = worldCoordinate(grid, axis, value);
      return next;
    });
  };
  const pick = (event: PointerEvent<HTMLCanvasElement>, down = false) => {
    const p = canvasPoint(event, event.currentTarget);
    for (let view = 0; view < 3; view++) {
      if (!down && pointer.current?.view !== view) continue;
      const rect = fitSlice(grid, view, slicePanelRect(view, size.width, size.height));
      let x = p.x,
        y = p.y;
      if (!down) {
        x = Math.max(rect.x, Math.min(rect.x + rect.width, x));
        y = Math.max(rect.y, Math.min(rect.y + rect.height, y));
      }
      const next = pickSlice(grid, view, cursor, rect, x, y);
      if (!next) continue;
      setCursor(next);
      setView(view);
      setPaused(true);
      if (down) {
        pointer.current = { id: event.pointerId, kind: "slice", view, x: p.x, y: p.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current?.id === event.pointerId) release();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", " "].includes(
        event.key,
      )
    )
      event.preventDefault();
    if (!ready) return;
    if (event.key.toLowerCase() === "r" && !event.repeat) reset();
    if (stage >= 3 && event.ctrlKey && event.key.startsWith("Arrow")) {
      stop();
      setCamera((old) =>
        limitCamera({
          ...old,
          yaw:
            old.yaw + (event.key === "ArrowLeft" ? -0.08 : event.key === "ArrowRight" ? 0.08 : 0),
          pitch:
            old.pitch + (event.key === "ArrowUp" ? 0.06 : event.key === "ArrowDown" ? -0.06 : 0),
        }),
      );
      return;
    }
    if (stage >= 3 && ["1", "2", "3"].includes(event.key)) {
      stop();
      setView(Number(event.key) - 1);
    }
    if (stage >= 2 && ["PageUp", "PageDown"].includes(event.key)) {
      const index = gridCoordinate(grid, axes.cut, cursor[axes.cut]);
      changeCut(
        activeView,
        Math.max(
          0,
          Math.min(side - 1, index + (event.key === "PageUp" ? 1 : -1) * (stage >= 5 ? 0.1 : 1)),
        ),
      );
    }
    if (stage >= 6 && event.key.startsWith("Arrow")) {
      stop();
      setCursor((old) => {
        const next: Point = [...old];
        if (event.key === "ArrowLeft") next[axes.horizontal] -= grid.spacing[axes.horizontal];
        if (event.key === "ArrowRight") next[axes.horizontal] += grid.spacing[axes.horizontal];
        if (event.key === "ArrowUp") next[axes.vertical] += grid.spacing[axes.vertical];
        if (event.key === "ArrowDown") next[axes.vertical] -= grid.spacing[axes.vertical];
        return clampPoint(grid, next);
      });
    }
    if (stage >= 6 && event.key === " " && !event.repeat && !reduced && !atEnd)
      setPaused((old) => !old);
  };
  let scalar = phantom(cursor);
  if (volume)
    scalar =
      (linear && stage >= 5 ? sampleLinear(volume, cursor) : sampleNearest(volume, cursor)) ?? 0;
  const vector = (p: Point) => p.map((v) => v.toFixed(4)).join("; ");
  const readout = [
    { label: "Mặt cắt / trục giữ cố định", value: viewNames[activeView] },
    { label: "World point x/y/z", value: vector(cursor) },
    { label: "Scalar tại world point", value: scalar.toFixed(7) },
    {
      label: "Camera yaw/pitch/distance",
      value: vector([camera.yaw, camera.pitch, camera.distance]),
    },
  ];
  if (volume) {
    const index = cursor.map((p, a) =>
      Math.max(0, Math.min(side - 1, Math.floor(gridCoordinate(grid, a, p) + 0.5))),
    ) as Point;
    readout.push(
      {
        label: "Voxel grid / bộ nhớ",
        value:
          side +
          "³ = " +
          volume.values.length.toLocaleString("en-US") +
          " mẫu / " +
          volume.values.byteLength / 1048576 +
          " MiB Float64",
      },
      {
        label: "Voxel gần nhất / địa chỉ",
        value: index.join(", ") + " / #" + volume.index(...index),
      },
      {
        label: "Grid coordinate liên tục",
        value: vector(cursor.map((p, a) => gridCoordinate(grid, a, p)) as Point),
      },
      { label: "Spacing x/y/z", value: vector(grid.spacing) + " world units" },
    );
  }
  if (stage >= 4)
    readout.push({
      label: "Brightness sau window/level",
      value: windowValue(scalar, { level, width }).toFixed(7),
    });
  if (stage >= 5 && volume)
    readout.push({
      label: "Nearest / trilinear",
      value:
        sampleNearest(volume, cursor)!.toFixed(7) +
        " / " +
        sampleLinear(volume, cursor)!.toFixed(7),
    });
  if (stage >= 7) readout.push({ label: "Audit lần gần nhất", value: validation });
  const blocked = (chapter: number) => !ready || stage < chapter;
  return (
    <div className={styles.root} data-volume53-ready={ready ? "true" : "false"}>
      <div className={styles.heading}>
        <h3>Khối vật liệu cắt mở</h3>
        <span>
          {stage >= 2
            ? side + "³ · " + (side ** 3).toLocaleString("en-US") + " voxel"
            : "Lát XY đầu tiên"}
        </span>
      </div>
      <p id={help}>
        Mẫu tổng hợp có lõi xoắn và ống rỗng. Kéo khối để xoay góc nhìn; ba thanh XY/XZ/YZ lần lượt
        dời z/y/x. Từ Bài 06, chọn điểm trên ảnh hoặc dùng mũi tên; Ctrl+mũi tên chỉ xoay camera,
        PageUp/Down dời lát, Space quét/dừng, R đặt lại.
      </p>
      {result.error && (
        <p role="alert">
          Không tạo được dữ liệu: {result.error}. Hãy chọn preset khác hoặc 64³; chưa có xác nhận
          cho dữ liệu bị lỗi.
        </p>
      )}
      <div className={styles.controls}>
        <label>
          Dataset{" "}
          <select
            aria-label="Dataset"
            value={preset}
            disabled={blocked(2)}
            onChange={(e) => {
              stop();
              setPreset(e.target.value as Preset);
              setValidation("Chưa kiểm");
            }}
          >
            {presets.map((value, i) => (
              <option key={value} value={value}>
                {presetNames[i]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Độ phân giải{" "}
          <select
            aria-label="Độ phân giải volume"
            value={side}
            disabled={blocked(2)}
            onChange={(e) => {
              stop();
              const n = Number(e.target.value);
              setSide(n);
              setCursor((p) => clampPoint(makeGrid(n), p));
              setValidation("Chưa kiểm");
            }}
          >
            <option value={64}>64³ · 2 MiB</option>
            <option value={128}>128³ · 16 MiB</option>
          </select>
        </label>
        <label>
          Mặt cắt{" "}
          <select
            aria-label="Mặt cắt"
            value={activeView}
            disabled={blocked(3)}
            onChange={(e) => {
              stop();
              setView(Number(e.target.value));
            }}
          >
            {viewNames.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Trilinear"
            checked={linear}
            disabled={blocked(5)}
            onChange={(e) => {
              stop();
              setLinear(e.target.checked);
            }}
          />
          Trilinear
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Màu mật độ"
            checked={color}
            disabled={blocked(4)}
            onChange={(e) => {
              stop();
              setColor(e.target.checked);
            }}
          />
          Màu scalar
        </label>
      </div>
      {stage >= 3 && (
        <div className={styles.controls}>
          <button
            type="button"
            disabled={!ready}
            aria-pressed={!cutaway}
            onClick={() => {
              stop();
              setCutaway(false);
            }}
          >
            Nguyên khối
          </button>
          <button
            type="button"
            disabled={!ready}
            aria-pressed={cutaway}
            onClick={() => {
              stop();
              setCutaway(true);
            }}
          >
            Cắt mở
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setCamera((old) => limitCamera({ ...old, yaw: old.yaw - 0.18 }))}
          >
            Xoay trái
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setCamera((old) => limitCamera({ ...old, yaw: old.yaw + 0.18 }))}
          >
            Xoay phải
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              setCamera((old) => limitCamera({ ...old, distance: old.distance * 0.9 }))
            }
          >
            Phóng to
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              setCamera((old) => limitCamera({ ...old, distance: old.distance / 0.9 }))
            }
          >
            Thu nhỏ
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setCamera({ ...defaultSliceCamera })}
          >
            Đặt lại góc nhìn
          </button>
        </div>
      )}
      <canvas
        ref={canvas}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Volume Slice Lab"
        aria-describedby={help}
        style={{ height: stage >= 3 ? 680 : 400, touchAction: "none" }}
        onKeyDown={key}
        onPointerDown={(event) => {
          if (blocked(3) || event.button !== 0 || pointer.current) return;
          event.currentTarget.focus();
          const p = canvasPoint(event, event.currentTarget),
            area = sceneRect(size.width, size.height);
          if (
            p.x >= area.x &&
            p.x <= area.x + area.width &&
            p.y >= area.y &&
            p.y <= area.y + area.height
          ) {
            setPaused(true);
            setInteractive(true);
            pointer.current = { id: event.pointerId, kind: "scene", view: -1, x: p.x, y: p.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          } else if (stage >= 6) pick(event, true);
        }}
        onPointerMove={(event) => {
          const drag = pointer.current;
          if (drag?.id !== event.pointerId) return;
          if (drag.kind === "slice") {
            pick(event);
            return;
          }
          const p = canvasPoint(event, event.currentTarget),
            dx = p.x - drag.x,
            dy = p.y - drag.y;
          drag.x = p.x;
          drag.y = p.y;
          setCamera((old) =>
            limitCamera({ ...old, yaw: old.yaw + dx * 0.008, pitch: old.pitch + dy * 0.008 }),
          );
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        Ba mặt XY/XZ/YZ đọc cùng một mảng scalar. Khối bề mặt minh họa vị trí các lát, không phải
        tái tạo CT.
      </canvas>
      <div className={styles.sliders}>
        {(stage >= 3 ? [0, 1, 2] : [0]).map((view) => {
          const axis = axesFor(view).cut,
            index = gridCoordinate(grid, axis, cursor[axis]);
          return (
            <label key={view}>
              {["XY · z", "XZ · y", "YZ · x"][view]}
              <output>
                {index.toFixed(1)} / {side - 1}
              </output>
              <input
                aria-label={"Lát " + ["XY", "XZ", "YZ"][view]}
                type="range"
                min={0}
                max={side - 1}
                step={stage >= 5 ? 0.1 : 1}
                value={index}
                disabled={blocked(2)}
                onChange={(e) => changeCut(view, Number(e.target.value))}
              />
            </label>
          );
        })}
      </div>
      <div className={styles.controls}>
        <label>
          Level{" "}
          <input
            aria-label="Level"
            type="range"
            min="0"
            max="1"
            step=".01"
            value={level}
            disabled={blocked(4)}
            onChange={(e) => {
              stop();
              setLevel(Number(e.target.value));
            }}
          />
        </label>
        <label>
          Window width{" "}
          <input
            aria-label="Window width"
            type="range"
            min=".05"
            max="1.5"
            step=".01"
            value={width}
            disabled={blocked(4)}
            onChange={(e) => {
              stop();
              setWidth(Number(e.target.value));
            }}
          />
        </label>
        <button
          type="button"
          disabled={blocked(6) || reduced || (atEnd && paused)}
          onClick={() => setPaused((old) => !old)}
        >
          {paused ? "Quét lát" : "Dừng"}
        </button>
        <button type="button" disabled={!ready} onClick={reset}>
          Đặt lại
        </button>
        {stage >= 7 && (
          <button
            type="button"
            disabled={!volume}
            onClick={() => {
              stop();
              const report = auditVolume(volume!);
              setValidation(
                (report.failures === 0 ? "PASS" : "FAIL") +
                  " — checks=" +
                  report.checks +
                  "; max residual=" +
                  report.residual.toExponential(3) +
                  "; min/max=" +
                  report.minimum.toFixed(5) +
                  "/" +
                  report.maximum.toFixed(5),
              );
            }}
          >
            Kiểm volume và nội suy
          </button>
        )}
      </div>
      <p className={styles.status} aria-live="polite">
        World ({vector(cursor)}) · scalar {scalar.toFixed(5)}
        {stage >= 7 ? " · " + validation : ""}
      </p>
      <details>
        <summary>Voxel inspector — tọa độ, địa chỉ và sampling</summary>
        <LabReadout items={readout} />
      </details>
      {stage >= 4 && result.data && (
        <VolumeHistogram stats={result.data.statistics} window={{ level, width }} />
      )}
      {stage >= 5 && volume && (
        <details open={stage === 5}>
          <summary>Tám voxel và trọng số trilinear</summary>
          <TrilinearInspector key={inspectorVersion} volume={volume} point={cursor} />
        </details>
      )}
      {reduced && (
        <p>Reduced motion đang bật: quét tự động tắt, điều khiển tay và camera vẫn dùng được.</p>
      )}
      <p>
        Khối rộng 3.2 × 3.84 × 4.8 world units, không mặc định mm. Ảnh giữ physical spacing. Bề mặt
        s=0.18 là mesh định hướng, stride 3
        {mesh ? " / " + mesh.length.toLocaleString("en-US") + " triangles" : ""}; ba ảnh 256² lấy
        mẫu khối đầy đủ, không dùng mesh để đo. Đổi camera không xoay dữ liệu. Đây không phải HU hay
        CT reconstruction. Reset giữ dataset/độ phân giải.
      </p>
    </div>
  );
}
export default function VolumeSlicerLab({ mode = "slice53-7" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(7, Number(mode.match(/^slice53-(\d)$/)?.[1] ?? 7)));
  return <SlicerExperiment key={stage} stage={stage} />;
}
