"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import {
  cameraRay,
  boxInterval,
  defaultCamera,
  presets,
  presetNames,
  stageSettings,
  type Camera,
  type Mode,
  type Preset,
} from "@/lib/labs/volume-ray-marching/model";
import { march, type Result } from "@/lib/labs/volume-ray-marching/march";
import type { Measurement } from "@/lib/labs/volume-ray-marching/jobs";
import { usePauseOnReducedMotion, useReducedMotion } from "../lab-shared";
import { useDataset } from "./use-dataset";
import Viewport from "./viewport";
import { Profile } from "./profile";
import { CloudLegend } from "./cloud-legend";
import { ComparisonStrip } from "./comparison";
import styles from "./volume-ray-marching.module.css";
const empty: Result = {
  color: [0, 0, 0],
  transmittance: 1,
  maximum: 0,
  mean: 0,
  length: 0,
  samples: 0,
  profile: [],
};
export default function Workbench({ stage }: { stage: number }) {
  const [camera, setCamera] = useState<Camera>({ ...defaultCamera });
  const [settings, setSettings] = useState(() => stageSettings(stage));
  const [preset, setPreset] = useState<Preset>("cloud"),
    [side, setSide] = useState(stage >= 9 ? 128 : 64);
  const [selected, setSelected] = useState({ u: 0.5, v: 0.5 }),
    [aspect, setAspect] = useState(760 / 520);
  const [shown, setShown] = useState(0),
    [paused, setPaused] = useState(true),
    [cancelVersion, setCancelVersion] = useState(0),
    [retry, setRetry] = useState(0);
  const [measurements, setMeasurements] = useState<Measurement[]>([]),
    [measuring, setMeasuring] = useState(false),
    [validation, setValidation] = useState("");
  const measureController = useRef<AbortController | null>(null);
  const reduced = useReducedMotion();
  const phase = useDataset(preset, side, stage, retry);
  const stop = useCallback(() => {
    setPaused(true);
    setShown(0);
    measureController.current?.abort();
    measureController.current = null;
    setMeasuring(false);
    setMeasurements([]);
  }, []);
  const cancel = () => {
    stop();
    setCancelVersion((value) => value + 1);
    setValidation("");
  };
  const moveCamera = useCallback(
    (next: SetStateAction<Camera>) => {
      stop();
      setCamera(next);
    },
    [stop],
  );
  const pick = useCallback(
    (u: number, v: number) => {
      stop();
      setSelected({ u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) });
    },
    [stop],
  );
  const ray = useMemo(
    () => cameraRay(camera, selected.u, selected.v, aspect),
    [camera, selected, aspect],
  );
  const interval = stage >= 3 ? boxInterval(ray) : null;
  const trace = useMemo(
    () => (stage >= 5 && phase.data ? march(ray, phase.data.volume, settings, stage >= 8) : empty),
    [stage, phase.data, ray, settings],
  );
  const running = stage >= 8 && !paused && !reduced && shown < trace.samples;
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
      measureController.current?.abort();
    };
  }, [stop]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setShown((value) => Math.min(trace.samples, value + 1)), 80);
    return () => clearInterval(timer);
  }, [running, trace.samples]);
  const reset = () => {
    cancel();
    setCamera({ ...defaultCamera });
    setSettings(stageSettings(stage));
    setSelected({ u: 0.5, v: 0.5 });
    if (phase.error) setRetry((value) => value + 1);
  };
  const changeMode = (mode: Mode) => {
    cancel();
    setSettings((old) => ({ ...old, mode }));
  };
  const compare = async () => {
    if (measuring) {
      measureController.current?.abort();
      setMeasuring(false);
      return;
    }
    if (!phase.data) return;
    stop();
    setMeasuring(true);
    const controller = new AbortController();
    measureController.current = controller;
    try {
      const { compareSteps } = await import("@/lib/labs/volume-ray-marching/jobs");
      controller.signal.throwIfAborted();
      const result = await compareSteps(
        camera,
        phase.data.volume,
        settings,
        selected.u,
        selected.v,
        aspect,
        controller.signal,
      );
      if (!controller.signal.aborted) setMeasurements(result);
    } catch (error) {
      if (!controller.signal.aborted) setValidation(String(error));
    } finally {
      if (measureController.current === controller) {
        measureController.current = null;
        setMeasuring(false);
      }
    }
  };
  const verify = async () => {
    if (!phase.data) return;
    const current = phase.data;
    const { audit } = await import("@/lib/labs/volume-ray-marching/analysis");
    try {
      const result = audit(current.volume);
      setValidation(
        "PASS — " + result.checks + " checks · max error " + result.maximumError.toExponential(2),
      );
    } catch (error) {
      setValidation("FAIL — " + String(error));
    }
  };
  let description =
    settings.mode === "mip"
      ? "Giữ mật độ lớn nhất dọc tia."
      : settings.mode === "average"
        ? "Trung bình theo độ dài đoạn tia, không phải ảnh X-ray."
        : "Tích lũy C/T front-to-back; opacity phụ thuộc ds.";
  if (stage === 1) description = "Ảnh UV đầu tiên; chưa có ray hoặc volume.";
  if (stage === 2) description = "Màu biểu diễn direction; chưa đọc density.";
  if (stage === 3) description = "Độ sáng biểu diễn độ dài giao box; chưa đọc volume.";
  if (stage === 4) description = "Chỉ đọc một midpoint trong texture 3D; chưa tích lũy dọc tia.";
  return (
    <section
      className={styles.root}
      data-v54-ready={phase.ready ? "true" : "false"}
      data-dataset={phase.data?.preset ?? "none"}
      data-side={phase.data?.volume.side ?? 0}
      data-voxels={phase.data?.volume.values.length ?? 0}
      data-bytes={phase.data?.volume.values.byteLength ?? 0}
      data-mode={settings.mode}
      data-generation-ms={phase.data?.generationMs ?? 0}
    >
      <header className={styles.heading}>
        <div>
          <span>VOLUME / LIGHTBOX</span>
          <h3>Một khối dữ liệu, ba cách nhìn</h3>
        </div>
        <span>
          {phase.data
            ? phase.data.volume.side +
              "³ · " +
              phase.data.volume.values.length.toLocaleString("vi-VN") +
              " mẫu thật"
            : "Chưa cấp phát volume"}
        </span>
      </header>
      <p>
        Đây là bản CPU hỗ trợ đọc shader. Dữ liệu sương được tạo sẵn, không phải solver chất lưu.
        C++ dùng fragment shader và viewport theo cửa sổ; Canvas dùng ảnh CPU nhỏ, không dùng
        WebGL/WASM.
      </p>
      <div className={styles.controls}>
        <label>
          Dataset
          <select
            aria-label="Dataset"
            disabled={stage < 4}
            value={preset}
            onChange={(event) => {
              cancel();
              setPreset(event.target.value as Preset);
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
          Độ phân giải
          <select
            aria-label="Độ phân giải volume"
            disabled={stage < 4}
            value={side}
            onChange={(event) => {
              cancel();
              setSide(Number(event.target.value));
            }}
          >
            <option value={64}>64³ · 1 MiB</option>
            <option value={128}>128³ · 8 MiB</option>
          </select>
        </label>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      {stage >= 4 && !phase.ready && (
        <div className={styles.status}>
          <label>
            Đang tạo dataset yêu cầu <progress value={phase.progress} max={1} />
          </label>
          <p>Chỉ thay dữ liệu khi tạo xong; thông số “mẫu thật” vẫn ghi dataset đang giữ.</p>
        </div>
      )}
      {phase.error && (
        <p role="alert">
          Không tạo được dataset: {phase.error}. Dữ liệu trước được giữ lại.{" "}
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Thử lại
          </button>
        </p>
      )}
      <div className={styles.modes} role="group" aria-label="Chế độ tích lũy">
        <button
          type="button"
          aria-pressed={settings.mode === "mip"}
          disabled={stage < 5}
          onClick={() => changeMode("mip")}
        >
          MIP
        </button>
        <button
          type="button"
          aria-pressed={settings.mode === "average"}
          disabled={stage < 5}
          onClick={() => changeMode("average")}
        >
          Average
        </button>
        <button
          type="button"
          aria-pressed={settings.mode === "alpha"}
          disabled={stage < 6}
          onClick={() => changeMode("alpha")}
        >
          Alpha
        </button>
        <span>{description}</span>
      </div>
      <Viewport
        stage={stage}
        volume={phase.data?.volume ?? null}
        datasetKey={phase.key}
        camera={camera}
        settings={settings}
        selected={selected}
        cancelVersion={cancelVersion}
        dataReady={phase.ready || Boolean(phase.error)}
        onCamera={moveCamera}
        onPick={pick}
        onAspect={setAspect}
        stop={stop}
      />
      {stage >= 7 && phase.data?.preset === "cloud" && (
        <CloudLegend volume={phase.data.volume} palette={settings.palette} />
      )}
      {stage >= 5 && phase.data && (
        <ComparisonStrip
          volume={phase.data.volume}
          datasetKey={phase.key}
          camera={camera}
          settings={settings}
          stage={stage}
          enabled={phase.ready || Boolean(phase.error)}
          onMode={changeMode}
        />
      )}
      <div className={styles.controls}>
        <button
          type="button"
          disabled={stage < 2}
          onClick={() => moveCamera((old) => ({ ...old, yaw: old.yaw - 0.15 }))}
        >
          Xoay trái
        </button>
        <button
          type="button"
          disabled={stage < 2}
          onClick={() => moveCamera((old) => ({ ...old, yaw: old.yaw + 0.15 }))}
        >
          Xoay phải
        </button>
        <button
          type="button"
          disabled={stage < 2}
          onClick={() =>
            moveCamera((old) => ({ ...old, distance: Math.max(0.25, old.distance * 0.9) }))
          }
        >
          Phóng to
        </button>
        <button
          type="button"
          disabled={stage < 2}
          onClick={() =>
            moveCamera((old) => ({ ...old, distance: Math.min(8, old.distance / 0.9) }))
          }
        >
          Thu nhỏ
        </button>
        <button
          type="button"
          disabled={stage < 2}
          onClick={() => moveCamera((old) => ({ ...old, yaw: 0, pitch: 0, inside: false }))}
        >
          Nhìn theo trục Z
        </button>
        <label>
          <input
            type="checkbox"
            aria-label="Camera trong volume"
            disabled={stage < 3}
            checked={camera.inside}
            onChange={(event) => moveCamera((old) => ({ ...old, inside: event.target.checked }))}
          />
          Camera trong khối
        </label>
      </div>
      <div className={styles.controls}>
        <label>
          Step
          <select
            aria-label="Step length"
            disabled={stage < 5}
            value={settings.stepLength}
            onChange={(event) => {
              cancel();
              setSettings((old) => ({ ...old, stepLength: Number(event.target.value) }));
            }}
          >
            {[0.008, 0.02, 0.04, 0.08, 0.13, 0.16].map((value) => (
              <option key={value} value={value}>
                {value} world units
              </option>
            ))}
          </select>
        </label>
        <label>
          Sigma <output>{settings.sigma.toFixed(1)}</output>
          <input
            type="range"
            aria-label="Sigma"
            min={0}
            max={12}
            step={0.5}
            disabled={stage < 6}
            value={settings.sigma}
            onChange={(event) => {
              cancel();
              setSettings((old) => ({ ...old, sigma: Number(event.target.value) }));
            }}
          />
        </label>
        <label>
          Cutoff <output>{settings.cutoff.toFixed(3)}</output>
          <input
            type="range"
            aria-label="Cutoff"
            min={0}
            max={0.8}
            step={0.025}
            disabled={stage < 7}
            value={settings.cutoff}
            onChange={(event) => {
              cancel();
              setSettings((old) => ({ ...old, cutoff: Number(event.target.value) }));
            }}
          />
        </label>
        <label>
          Palette
          <select
            aria-label="Palette"
            disabled={stage < 7}
            value={settings.palette}
            onChange={(event) => {
              cancel();
              setSettings((old) => ({ ...old, palette: Number(event.target.value) }));
            }}
          >
            <option value={0}>Mây tự nhiên</option>
            <option value={1}>Màu theo mật độ</option>
            <option value={2}>White</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Gradient lighting"
            disabled={stage < 7 || settings.mode !== "alpha"}
            checked={settings.lighting}
            onChange={(event) => {
              cancel();
              setSettings((old) => ({ ...old, lighting: event.target.checked }));
            }}
          />
          Gradient lighting
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Early termination"
            disabled={stage < 9 || settings.mode !== "alpha"}
            checked={settings.early}
            onChange={(event) => {
              cancel();
              setSettings((old) => ({ ...old, early: event.target.checked }));
            }}
          />
          Early T ≤ 0,0005
        </label>
      </div>
      <p className={styles.explanation}>
        Cutoff tạo ρ′ = clamp((ρ − cutoff)/(1 − cutoff), 0, 1); cả ba mode đọc cùng ρ′. Sigma và
        gradient lighting chỉ tác động alpha. Lighting này là xấp xỉ cục bộ để thấy cấu trúc, không
        tính shadow hay multiple scattering.
      </p>
      <div
        className={`lab-readout ${styles.readout}`}
        data-ray
        data-camera={[camera.yaw, camera.pitch, camera.distance, Number(camera.inside)].join(",")}
      >
        <span>Origin: {ray.origin.map((value) => value.toFixed(3)).join(" / ")}</span>
        <span>Direction: {ray.direction.map((value) => value.toFixed(3)).join(" / ")}</span>
        {stage >= 3 && (
          <span data-interval>
            Entry / exit:{" "}
            {interval ? interval.entry.toFixed(6) + " / " + interval.exit.toFixed(6) : "MISS"}
          </span>
        )}
        {stage >= 5 && (
          <span data-result>
            CPU reference:{" "}
            {settings.mode === "alpha"
              ? "T=" + trace.transmittance.toFixed(7)
              : settings.mode === "mip"
                ? "MIP=" + trace.maximum.toFixed(7)
                : "Mean=" + trace.mean.toFixed(7)}
          </span>
        )}
      </div>
      {stage >= 8 && (
        <>
          <div className={styles.controls}>
            <label>
              u{" "}
              <input
                type="range"
                aria-label="Điểm tia u"
                min={0}
                max={1}
                step={0.01}
                value={selected.u}
                onChange={(event) => pick(Number(event.target.value), selected.v)}
              />
            </label>
            <label>
              v{" "}
              <input
                type="range"
                aria-label="Điểm tia v"
                min={0}
                max={1}
                step={0.01}
                value={selected.v}
                onChange={(event) => pick(selected.u, Number(event.target.value))}
              />
            </label>
            <button
              type="button"
              disabled={!trace.samples}
              onClick={() => {
                setPaused(true);
                setShown((value) => Math.min(trace.samples, value + 1));
              }}
            >
              Tiến một mẫu
            </button>
            <button
              type="button"
              disabled={reduced || !trace.samples}
              onClick={() => {
                if (shown >= trace.samples) setShown(0);
                setPaused(running);
              }}
            >
              {running ? "Dừng mẫu" : "Chạy mẫu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPaused(true);
                setShown(0);
              }}
            >
              Về mẫu đầu
            </button>
          </div>
          <Profile trace={trace} shown={shown} mode={settings.mode} />
        </>
      )}
      {phase.data && (
        <figure className={styles.histogram}>
          <figcaption>
            <strong>Histogram toàn bộ scalar gốc</strong>
            <span>
              {phase.data.volume.values.length.toLocaleString("vi-VN")} mẫu · log(1 + số lượng) ·
              không sửa density
            </span>
          </figcaption>
          <svg viewBox="0 0 640 76" role="img" aria-label="Histogram mật độ">
            <g fill="#5fb6b5">
              {Array.from(phase.data.bins, (count, i) => {
                const maximum = Math.max(...phase.data!.bins),
                  h = (Math.log1p(count) / Math.log1p(maximum)) * 60;
                return <rect key={i} x={i * 20 + 1} y={65 - h} width={16} height={h} />;
              })}
            </g>
          </svg>
        </figure>
      )}
      {stage >= 9 && (
        <section className={styles.measure}>
          <h4>Bước nhỏ hơn đổi được điều gì?</h4>
          <p>
            So cùng tia đã chọn với CPU step 0,002; tắt early khi đo. Một warm-up và năm lần đo mỗi
            step; median/IQR dưới đây chỉ là thời gian JavaScript cho một tia, không phải GPU hay
            FPS C++.
          </p>
          <button type="button" disabled={!phase.ready} onClick={() => void compare()}>
            {measuring ? "Hủy so sánh" : "So sánh bốn step (CPU)"}
          </button>
          {measurements.length > 0 && (
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Số mẫu</th>
                    <th>Sai số lớn nhất</th>
                    <th>CPU median ms</th>
                    <th>IQR ms</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((value) => (
                    <tr key={value.step}>
                      <td>{value.step}</td>
                      <td>{value.samples}</td>
                      <td>{value.error.toExponential(3)}</td>
                      <td>{value.medianMs.toFixed(3)}</td>
                      <td>
                        {value.lowerMs.toFixed(3)} – {value.upperMs.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {stage >= 10 && (
        <div className={styles.controls}>
          <button type="button" disabled={!phase.ready} onClick={() => void verify()}>
            Kiểm fixture hằng và slab
          </button>
          <output>{validation}</output>
        </div>
      )}
      <p>
        128³ = 2.097.152 Float32 / 8 MiB khi chọn 128³. World box [-1,1]³, spacing 2/N; đây là đơn
        vị tùy chọn, không phải mm/HU hoặc CT reconstruction. Ray miss không lấy mẫu; sampler
        clamp-to-edge chỉ dùng trong đoạn giao box.
      </p>
    </section>
  );
}
