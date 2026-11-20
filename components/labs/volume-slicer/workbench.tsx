"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClientReady } from "@/components/use-client-ready";
import {
  axesFor,
  audit,
  clampPoint,
  coordinate,
  defaultWindow,
  extent,
  geodeCentre,
  makeGrid,
  presetNames,
  presets,
  type Preset,
  type Vec3,
} from "@/lib/labs/volume-slicer";
import { defaultCamera, limitCamera } from "@/lib/labs/volume-slicer/camera";
import { usePauseOnReducedMotion, useReducedMotion } from "../lab-shared";
import { useDataset } from "./use-dataset";
import { usePlane } from "./use-planes";
import { SliceView } from "./slice-view";
import { SceneView } from "./scene-view";
import { Inspector, Histogram } from "./inspector";
import styles from "./volume-slicer.module.css";

function Experiment({ stage }: { stage: number }) {
  const client = useClientReady(),
    reduced = useReducedMotion();
  const [side, setSide] = useState(stage >= 9 ? 128 : 64);
  const [preset, setPreset] = useState<Preset>(stage < 2 ? "sphere" : "specimen");
  const [probe, setProbe] = useState<Vec3>(stage < 2 ? [0, 0, 0] : [...geodeCentre]);
  const [camera, setCamera] = useState({ ...defaultCamera }),
    [window, setWindow] = useState({ ...defaultWindow });
  const [linear, setLinear] = useState(stage >= 4),
    [colored, setColored] = useState(stage >= 5),
    [cut, setCut] = useState(true);
  const [paused, setPaused] = useState(true),
    [active, setActive] = useState(0),
    [cancelVersion, setCancelVersion] = useState(0);
  const [validation, setValidation] = useState("Chưa chạy phép kiểm");
  const { data, loading, status, error } = useDataset(client, stage, preset, side);
  const grid = data?.volume.grid ?? makeGrid(side);
  const stop = useCallback(() => setPaused(true), []);
  const cancel = useCallback(() => {
    setPaused(true);
    setCancelVersion((old) => old + 1);
  }, []);
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    globalThis.window.addEventListener("blur", stop);
    return () => globalThis.window.removeEventListener("blur", stop);
  }, [stop]);
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    if (paused || reduced || stage < 8 || loading) return;
    let frame = 0,
      previous = performance.now();
    const advance = (now: number) => {
      const delta = Math.max(0, Math.min(0.05, (now - previous) / 1000));
      previous = now;
      const current = gridRef.current,
        axis = axesFor(active).fixed;
      setProbe((old) => {
        const next: Vec3 = [...old];
        next[axis] = Math.min(current.origin[axis] + extent(current)[axis], old[axis] + 12 * delta);
        return next;
      });
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, stage, loading, active]);
  const axis = axesFor(active).fixed,
    end = grid.origin[axis] + extent(grid)[axis],
    atEnd = probe[axis] >= end;
  useEffect(() => {
    if (!paused && atEnd) {
      const frame = requestAnimationFrame(stop);
      return () => cancelAnimationFrame(frame);
    }
  }, [paused, atEnd, stop]);
  const xy = usePlane(data?.volume, stage, 0, probe, linear, window, colored);
  const xz = usePlane(data?.volume, stage, 1, probe, linear, window, colored);
  const yz = usePlane(data?.volume, stage, 2, probe, linear, window, colored);
  const planes = [xy, xz, yz];
  const ready = client && (stage === 1 || Boolean(data && !loading));
  const point = (next: Vec3) => {
    stop();
    setProbe(clampPoint(grid, next));
  };
  const reset = () => {
    cancel();
    setProbe(stage < 2 ? [0, 0, 0] : [...geodeCentre]);
    setCamera({ ...defaultCamera });
    setWindow({ ...defaultWindow });
    setActive(0);
  };
  return (
    <div
      className={styles.root}
      data-volume53-ready={ready ? "true" : "false"}
      data-dataset={data?.preset ?? "analytic"}
    >
      <header className={styles.heading}>
        <div>
          <span>SCALAR / SLICE WORKBENCH</span>
          <h3>Nhìn vào bên trong một khối dữ liệu</h3>
        </div>
        <span>
          {data
            ? presetNames[presets.indexOf(data.preset)] +
              " · " +
              data.side +
              "³ · " +
              data.volume.values.length.toLocaleString("vi-VN") +
              " voxel thật"
            : stage === 1
              ? "Lát sphere được tính trực tiếp"
              : "Đang chuẩn bị dữ liệu 3D"}
        </span>
      </header>
      <p id="slice53-controls">
        Ba ảnh dùng cùng một probe. Ở từng ảnh, mũi tên dời điểm và PageUp/Down dời lát từ Bài 7; ở
        khối 3D, kéo/mũi tên xoay camera, wheel/+/- zoom, Home đặt lại góc nhìn. Scalar tổng hợp,
        không phải HU hoặc phép dựng CT.
      </p>
      <div className={styles.controls}>
        <label>
          Dataset
          <select
            aria-label="Dataset"
            disabled={!client || stage < 2}
            value={preset}
            onChange={(event) => {
              cancel();
              setValidation("Chưa chạy phép kiểm");
              setPreset(event.target.value as Preset);
            }}
          >
            {presets.map((p, i) => (
              <option key={p} value={p}>
                {presetNames[i]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Độ phân giải
          <select
            aria-label="Độ phân giải volume"
            disabled={!client || stage < 2}
            value={side}
            onChange={(event) => {
              cancel();
              setValidation("Chưa chạy phép kiểm");
              setSide(Number(event.target.value));
            }}
          >
            <option value={64}>64³ · 1 MiB</option>
            <option value={128}>128³ · 8 MiB</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Trilinear"
            disabled={stage < 4}
            checked={linear}
            onChange={(event) => {
              stop();
              setLinear(event.target.checked);
            }}
          />
          Trilinear
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Màu scalar"
            disabled={stage < 5}
            checked={colored}
            onChange={(event) => setColored(event.target.checked)}
          />
          Màu scalar
        </label>
        {stage >= 6 && (
          <button type="button" aria-pressed={cut} onClick={() => setCut((old) => !old)}>
            {cut ? "Đang cắt mở" : "Đang xem nguyên khối"}
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <p className={styles.status} role="status">
        {stage >= 2 ? status : "Bài 1 chưa cấp phát volume: mỗi pixel được tính từ sphereField."}{" "}
        {loading && "Bạn vẫn có thể chuyển trang hoặc chọn lại dataset."}
      </p>
      {error && <p role="alert">{error}</p>}
      <div className={stage >= 6 ? styles.workspace : styles.onlySlices}>
        {stage >= 6 && data?.mesh && (
          <div>
            <SceneView
              data={data}
              probe={probe}
              slices={planes.map((plane) => plane.raw)}
              window={window}
              colored={colored}
              linear={linear}
              camera={camera}
              cut={cut}
              sectionView={active}
              cancelVersion={cancelVersion}
              setCamera={setCamera}
              stop={stop}
            />
            <div className={styles.controls}>
              <button
                type="button"
                onClick={() => setCamera((old) => limitCamera({ ...old, yaw: old.yaw - 0.18 }))}
              >
                Xoay trái
              </button>
              <button
                type="button"
                onClick={() => setCamera((old) => limitCamera({ ...old, yaw: old.yaw + 0.18 }))}
              >
                Xoay phải
              </button>
              <button
                type="button"
                onClick={() =>
                  setCamera((old) => limitCamera({ ...old, distance: old.distance * 0.9 }))
                }
              >
                Phóng to
              </button>
              <button
                type="button"
                onClick={() =>
                  setCamera((old) => limitCamera({ ...old, distance: old.distance / 0.9 }))
                }
              >
                Thu nhỏ
              </button>
              <button type="button" onClick={() => setCamera({ ...defaultCamera })}>
                Đặt lại góc nhìn
              </button>
            </div>
            {stage >= 4 && data && <Inspector data={data} probe={probe} stage={stage} />}
            {stage >= 5 && data && <Histogram data={data} />}
          </div>
        )}
        <div className={styles.slices}>
          {(stage >= 3 ? [0, 1, 2] : [0]).map((view) => (
            <SliceView
              key={view}
              grid={grid}
              view={view}
              probe={probe}
              rgba={planes[view].rgba}
              stage={stage}
              cancelVersion={cancelVersion}
              onProbe={point}
              onSelect={setActive}
              stop={stop}
            />
          ))}
        </div>
      </div>
      <div className={styles.sliders}>
        {(stage >= 3 ? [0, 1, 2] : [0]).map((view) => {
          const axis = axesFor(view).fixed;
          return (
            <label key={view}>
              {["XY · z", "XZ · y", "YZ · x"][view]}
              <output>
                {probe[axis].toFixed(2)} mm · q={coordinate(grid, probe[axis], axis).toFixed(2)}
              </output>
              <input
                aria-label={"Lát " + ["XY", "XZ", "YZ"][view]}
                type="range"
                min={grid.origin[axis]}
                max={grid.origin[axis] + extent(grid)[axis]}
                step={0.1}
                value={probe[axis]}
                disabled={!ready}
                onChange={(event) => {
                  cancel();
                  setActive(view);
                  setProbe((old) => {
                    const next: Vec3 = [...old];
                    next[axis] = Number(event.target.value);
                    return next;
                  });
                }}
              />
            </label>
          );
        })}
      </div>
      {stage >= 5 && (
        <div className={styles.controls}>
          <label>
            Level <output>{window.level.toFixed(2)}</output>
            <input
              aria-label="Level"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={window.level}
              onChange={(event) =>
                setWindow((old) => ({ ...old, level: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            Window width <output>{window.width.toFixed(2)}</output>
            <input
              aria-label="Window width"
              type="range"
              min={0.05}
              max={1.5}
              step={0.01}
              value={window.width}
              onChange={(event) =>
                setWindow((old) => ({ ...old, width: Number(event.target.value) }))
              }
            />
          </label>
        </div>
      )}
      {stage >= 8 && (
        <div className={styles.controls}>
          <label>
            Hướng quét
            <select
              aria-label="Hướng quét"
              value={active}
              onChange={(event) => {
                stop();
                setActive(Number(event.target.value));
              }}
            >
              <option value={0}>XY / z</option>
              <option value={1}>XZ / y</option>
              <option value={2}>YZ / x</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!ready || reduced}
            onClick={() => {
              if (atEnd)
                setProbe((old) => {
                  const next: Vec3 = [...old];
                  next[axis] = grid.origin[axis];
                  return next;
                });
              setPaused((old) => !old);
            }}
          >
            {paused ? "Quét lát" : "Dừng quét"}
          </button>
          <span>12 mm/s · đến biên thì dừng</span>
        </div>
      )}
      <p className={styles.probe} data-probe={probe.join(",")}>
        Probe (mm): {probe.map((v) => v.toFixed(3)).join(" / ")} · Camera:{" "}
        {[camera.yaw, camera.pitch, camera.distance].map((v) => v.toFixed(3)).join(" / ")}
      </p>
      {data && (
        <p>
          {data.side}³ = {data.volume.values.length.toLocaleString("vi-VN")} mẫu ·{" "}
          {data.volume.values.byteLength / 1048576} MiB Float32 · spacing{" "}
          {grid.spacing.map((v) => v.toFixed(3)).join(" / ")} mm. Vỏ:{" "}
          {data.mesh?.triangles.toLocaleString("vi-VN") ?? "chưa dùng"} triangle; lấy mẫu ảnh không
          bị giảm theo vỏ.
        </p>
      )}
      {stage < 6 && stage >= 4 && data && <Inspector data={data} probe={probe} stage={stage} />}
      {stage < 6 && stage >= 5 && data && <Histogram data={data} />}
      {stage >= 9 && (
        <div className={styles.controls}>
          <button
            type="button"
            disabled={!data || loading}
            onClick={() => {
              cancel();
              try {
                const report = audit(data!.volume);
                setValidation(
                  `${report.failures ? "FAIL" : "PASS"} — ${report.checks} checks; affine residual ${report.residual.toExponential(3)}`,
                );
              } catch (failure) {
                setValidation("FAIL — " + String(failure));
              }
            }}
          >
            Kiểm volume và nội suy
          </button>
          <output aria-live="polite">{validation}</output>
        </div>
      )}
      {reduced && (
        <p>Reduced motion đang bật: quét tự động tắt, điều khiển bằng tay vẫn dùng được.</p>
      )}
      <p>
        Canvas là bản CPU hỗ trợ học tập, không phải C++ chạy trong browser. Vỏ 3D chỉ để định
        hướng; ba ảnh 256² và inspector dùng mảng scalar đầy đủ. Khối 160 × 192 × 224 mm là dữ liệu
        tổng hợp, không phải công cụ chẩn đoán.
      </p>
    </div>
  );
}
export default function Workbench({ mode = "slice53-9" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(9, Number(mode.match(/^slice53-(\d+)$/)?.[1] ?? 9)));
  return <Experiment key={stage} stage={stage} />;
}
