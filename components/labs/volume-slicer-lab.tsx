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
  Volume,
  axesFor,
  auditVolume,
  clampPoint,
  defaultGrid,
  fillOrientation,
  fillPhantom,
  fitSlice,
  gridCoordinate,
  initialPoint,
  makeImage,
  panelRect,
  phantom,
  pickSlice,
  sampleLinear,
  sampleNearest,
  viewNames,
  windowValue,
  worldCoordinate,
  type Point,
} from "@/lib/labs/volume-slicer";
import {
  canvasPoint,
  LabReadout,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { drawSlices } from "./volume-slicer/draw";
import { createScanClock } from "@/lib/labs/volume-slicer/scan-clock";
import { TrilinearInspector } from "./volume-slicer/trilinear-inspector";

function SlicerExperiment({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [cursor, setCursor] = useState<Point>(() => initialPoint()),
    [activeView, setView] = useState(0),
    [preset, setPreset] = useState("phantom");
  const [level, setLevel] = useState(0.5),
    [width, setWidth] = useState(1),
    [linear, setLinear] = useState(false),
    [paused, setPaused] = useState(true),
    [validation, setValidation] = useState("Chưa kiểm");
  const pointer = useRef<number | null>(null);
  const [inspectorVersion, setInspectorVersion] = useState(0);
  const volume = useMemo(() => {
    if (stage < 2) return null;
    const value = new Volume();
    if (preset === "ramp") fillOrientation(value);
    else fillPhantom(value);
    return value;
  }, [preset, stage]);
  const axes = axesFor(activeView),
    cut = gridCoordinate(defaultGrid, axes.cut, cursor[axes.cut]);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvas.current?.hasPointerCapture(id))
      canvas.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const images = useMemo(
    () =>
      (stage >= 6 ? [0, 1, 2] : [activeView]).map((view) =>
        makeImage(volume, view, cursor, { level, width }, linear, stage, 96),
      ),
    [stage, activeView, volume, cursor, level, width, linear],
  );
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawSlices(ctx, size, defaultGrid, cursor, activeView, stage, images);
  }, [size, cursor, activeView, stage, images]);
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
    if (paused || reduced || stage < 6) return;
    let frame = 0;
    const elapsedSinceRefresh = createScanClock(performance.now());
    const animate = (now: number) => {
      const dt = elapsedSinceRefresh(now);
      if (dt > 0) {
        const axis = axesFor(activeView).cut;
        setCursor((point) => {
          const next: Point = [...point];
          next[axis] += dt * defaultGrid.spacing[axis] * 4;
          return clampPoint(defaultGrid, next);
        });
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, stage, activeView]);
  const atEnd =
    cursor[axes.cut] >= worldCoordinate(defaultGrid, axes.cut, defaultGrid.count[axes.cut] - 1);
  // Stop scheduling at the last slice without setting state inside an effect.
  useEffect(() => {
    if (!atEnd || paused) return;
    const id = requestAnimationFrame(stop);
    return () => cancelAnimationFrame(id);
  }, [atEnd, paused, stop]);
  const reset = () => {
    stop();
    setCursor(initialPoint());
    setView(0);
    setPreset("phantom");
    setLevel(0.5);
    setWidth(1);
    setLinear(false);
    setValidation("Chưa kiểm");
    setInspectorVersion((value) => value + 1);
  };
  const pick = (event: PointerEvent<HTMLCanvasElement>, down = false) => {
    const p = canvasPoint(event, event.currentTarget);
    for (let view = 0; view < 3; view++) {
      if (!down && view !== activeView) continue;
      const rect = fitSlice(defaultGrid, view, panelRect(view, size.width, size.height, true)),
        next = pickSlice(defaultGrid, view, cursor, rect, p.x, p.y);
      if (next) {
        setCursor(next);
        setView(view);
        setPaused(true);
        return true;
      }
    }
    return false;
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 6 || event.button !== 0 || pointer.current !== null) return;
    event.currentTarget.focus();
    if (pick(event, true)) {
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) release();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", " "].includes(
        event.key,
      )
    )
      event.preventDefault();
    if (event.key.toLowerCase() === "r") reset();
    if (stage >= 2 && ["PageUp", "PageDown"].includes(event.key)) {
      stop();
      setCursor((point) => {
        const next: Point = [...point];
        next[axes.cut] +=
          (event.key === "PageUp" ? 1 : -1) *
          (stage >= 5 ? 0.1 : 1) *
          defaultGrid.spacing[axes.cut];
        return clampPoint(defaultGrid, next);
      });
    }
    if (stage >= 6 && event.key.startsWith("Arrow")) {
      stop();
      setCursor((point) => {
        const next: Point = [...point];
        if (event.key === "ArrowLeft")
          next[axes.horizontal] -= defaultGrid.spacing[axes.horizontal];
        if (event.key === "ArrowRight")
          next[axes.horizontal] += defaultGrid.spacing[axes.horizontal];
        if (event.key === "ArrowUp") next[axes.vertical] += defaultGrid.spacing[axes.vertical];
        if (event.key === "ArrowDown") next[axes.vertical] -= defaultGrid.spacing[axes.vertical];
        return clampPoint(defaultGrid, next);
      });
    }
    if (stage >= 6 && event.key === " " && !event.repeat && !reduced && !atEnd)
      setPaused((value) => !value);
  };
  const scalar =
    stage < 2
      ? phantom(cursor)
      : linear && stage >= 5
        ? sampleLinear(volume!, cursor)!
        : sampleNearest(volume!, cursor)!;
  const vec = (point: Point) => point.map((x) => x.toFixed(4)).join("; ");
  const readout = [
    { label: "Mặt cắt / trục giữ cố định", value: viewNames[activeView] },
    { label: "World point x/y/z", value: vec(cursor) },
    { label: "Scalar tại world point", value: scalar.toFixed(7) },
  ];
  if (stage >= 2)
    readout.push(
      { label: "Voxel grid / bộ nhớ", value: "64 × 48 × 40 / 960 KiB Float64" },
      {
        label: "Grid coordinate liên tục",
        value: vec(cursor.map((p, a) => gridCoordinate(defaultGrid, a, p)) as Point),
      },
    );
  if (stage >= 4)
    readout.push({
      label: "Brightness sau window/level",
      value: windowValue(scalar, { level, width }).toFixed(7),
    });
  if (stage >= 5)
    readout.push({
      label: "Nearest / trilinear",
      value:
        sampleNearest(volume!, cursor)!.toFixed(7) +
        " / " +
        sampleLinear(volume!, cursor)!.toFixed(7),
    });
  if (stage >= 7) readout.push({ label: "Audit lần gần nhất", value: validation });
  return (
    <>
      <p id={help}>
        PageUp/Down đổi lát; R đặt lại. Từ Bài 06, click/kéo ảnh hoặc dùng mũi tên để dời điểm chung
        của ba view; Space quét/dừng. Canvas CPU dựng ảnh 96×96/view, source SDL3 dùng 128×128/view.
        Đây là scalar tổng hợp, không phải ảnh CT hay Hounsfield Units.
      </p>
      <div className="lab-controls">
        <label>
          Dataset{" "}
          <select
            aria-label="Dataset"
            value={preset}
            disabled={stage < 2}
            onChange={(e) => {
              stop();
              setPreset(e.target.value);
              setValidation("Chưa kiểm");
            }}
          >
            <option value="phantom">Phantom bất đối xứng</option>
            <option value="ramp">Ramp kiểm hướng trục</option>
          </select>
        </label>
        <label>
          Mặt cắt{" "}
          <select
            aria-label="Mặt cắt"
            value={activeView}
            disabled={stage < 3}
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
          Lát: {cut.toFixed(stage >= 5 ? 1 : 0)}{" "}
          <input
            aria-label="Vị trí lát cắt"
            type="range"
            min="0"
            max={defaultGrid.count[axes.cut] - 1}
            step={stage >= 5 ? 0.1 : 1}
            value={cut}
            disabled={stage < 2}
            onChange={(e) => {
              stop();
              setCursor((p) => {
                const next: Point = [...p];
                next[axes.cut] = worldCoordinate(defaultGrid, axes.cut, Number(e.target.value));
                return next;
              });
            }}
          />
        </label>
        <label>
          Level{" "}
          <input
            aria-label="Level"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={level}
            disabled={stage < 4}
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
            min="0.05"
            max="1.5"
            step="0.01"
            value={width}
            disabled={stage < 4}
            onChange={(e) => {
              stop();
              setWidth(Number(e.target.value));
            }}
          />
        </label>
        <label>
          <input
            aria-label="Trilinear"
            type="checkbox"
            checked={linear}
            disabled={stage < 5}
            onChange={(e) => {
              stop();
              setLinear(e.target.checked);
            }}
          />{" "}
          Trilinear
        </label>
        <button
          type="button"
          disabled={stage < 6 || reduced || (atEnd && paused)}
          onClick={() => setPaused((v) => !v)}
        >
          {paused ? "Quét lát" : "Dừng"}
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {stage >= 7 && (
          <button
            type="button"
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
      <canvas
        ref={canvas}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Volume Slice Lab"
        aria-describedby={help}
        style={{ touchAction: "none" }}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={(e) => {
          if (pointer.current === e.pointerId) pick(e);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      />
      <LabReadout items={readout} />
      {stage >= 5 && volume && (
        <TrilinearInspector key={inspectorVersion} volume={volume} point={cursor} />
      )}
      {reduced && (
        <p>
          Reduced motion đang bật: quét tự động bị tắt; các lát tĩnh và điều khiển tay vẫn dùng
          được.
        </p>
      )}
      <p>
        XY: x phải, y lên; XZ: x phải, z lên; YZ: y phải, z lên. Đây là quy ước toán của project,
        không phải hướng hiển thị radiology. Ảnh giữ đúng tỉ lệ physical spacing; thay window/level
        không sửa dữ liệu volume.
      </p>
    </>
  );
}
export default function VolumeSlicerLab({ mode = "slice53-7" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(7, Number(mode.match(/^slice53-(\d)$/)?.[1] ?? 7)));
  return <SlicerExperiment key={stage} stage={stage} />;
}
