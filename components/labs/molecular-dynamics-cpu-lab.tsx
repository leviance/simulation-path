"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createMolecularSystem,
  accumulatePairForces,
  forceShiftedEquilibrium,
  length,
  measureSystem,
  planFixedSteps,
  relativeEnergyDrift,
  sampleForceShiftedPair,
  unorderedPairCount,
  validateMolecularDynamics,
  velocityVerletStep,
  type MolecularStepOutput,
} from "@/lib/labs/molecular-dynamics-cpu";
import {
  appendMolecularHistory,
  drawCutoffGraph,
  drawEnergyHistory,
  drawMolecularScene,
  drawScalingPanel,
  makeMolecularViewport,
  molecularCanvasToWorld,
  type MolecularHistorySample,
} from "./molecular-dynamics-cpu-render";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const COUNT_PRESETS = [64, 144, 256, 1_000] as const;
const TEMPERATURE_PRESETS = [0.1, 0.2, 0.35, 0.6] as const;

export default function MolecularDynamicsCpuLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const initialCount = mode === "md-box" || mode === "md-scaling" ? 1_000 : 144;
  const [particleCount, setParticleCount] = useState(initialCount);
  const [targetTemperature, setTargetTemperature] = useState(0.2);
  const [density, setDensity] = useState(0.55);
  const [seed, setSeed] = useState(42);
  const [fixedDt, setFixedDt] = useState(0.001);
  const [system, setSystem] = useState(() =>
    createMolecularSystem(initialCount, targetTemperature, seed, density),
  );
  const systemRef = useRef(system);
  const stepOutput = useRef<MolecularStepOutput>({});
  const maximumDrift = useRef(0);
  const [observedMaximumDrift, setObservedMaximumDrift] = useState(0);
  const [metrics, setMetrics] = useState(() => measureSystem(system));
  const [stepMilliseconds, setStepMilliseconds] = useState(0);
  const [stepError, setStepError] = useState("");
  const [zoomCutoff, setZoomCutoff] = useState(false);
  const [paused, setPaused] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<MolecularHistorySample[]>([]);
  const [substeps, setSubsteps] = useState(0);
  const [droppedTime, setDroppedTime] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [validation, setValidation] = useState<ReturnType<typeof validateMolecularDynamics> | null>(
    null,
  );
  const accumulator = useRef(0);
  const nextHistoryTime = useRef(0);

  const showVelocities = ["md-temperature", "md-verlet", "md-energy", "md-final"].includes(
    mode ?? "md-final",
  );
  const showPairs = ["md-pairs", "md-cutoff"].includes(mode ?? "");
  const showCutoff = ["md-cutoff", "md-verlet", "md-energy", "md-final"].includes(
    mode ?? "md-final",
  );
  const showDynamics = ["md-verlet", "md-energy", "md-scaling", "md-final"].includes(
    mode ?? "md-final",
  );
  const showEnergy = ["md-energy", "md-final"].includes(mode ?? "md-final");
  const showScaling = mode === "md-scaling";
  const showSidePanel = showCutoff || showEnergy || showScaling;
  const viewport = useMemo(
    () => makeMolecularViewport(size.width, size.height, showSidePanel),
    [showSidePanel, size.height, size.width],
  );

  const rebuild = useCallback(
    (
      nextCount = particleCount,
      nextTemperature = targetTemperature,
      nextSeed = seed,
      nextDensity = density,
    ) => {
      const next = createMolecularSystem(nextCount, nextTemperature, nextSeed, nextDensity);
      systemRef.current = next;
      stepOutput.current = { evaluation: accumulatePairForces(next.particles, next.parameters) };
      maximumDrift.current = 0;
      setObservedMaximumDrift(0);
      setMetrics(measureSystem(next, stepOutput.current.evaluation));
      setStepMilliseconds(0);
      setStepError("");
      setSystem(next);
      setParticleCount(nextCount);
      setTargetTemperature(nextTemperature);
      setSeed(nextSeed);
      setDensity(nextDensity);
      setSelectedIndex(0);
      setHistory([]);
      setSubsteps(0);
      setDroppedTime(0);
      setValidation(null);
      setPaused(true);
      accumulator.current = 0;
      nextHistoryTime.current = 0;
    },
    [density, particleCount, seed, targetTemperature],
  );

  const resetAll = useCallback(() => {
    setFixedDt(0.001);
    rebuild(initialCount, 0.2, 42, 0.55);
  }, [initialCount, rebuild]);

  useEffect(() => {
    if (!reducedMotion) return;
    const frame = requestAnimationFrame(() => setPaused(true));
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  useEffect(() => {
    if (paused || !showDynamics) {
      return;
    }

    let frame = 0;
    let previousTime = performance.now();
    const tick = (now: number) => {
      const frameTime = Math.max(0, (now - previousTime) / 1_000);
      previousTime = now;
      const maximumSteps = systemRef.current.particles.length >= 1_000 ? 1 : 4;
      // Playback intentionally advances 0.05 simulation units per real second.
      const plan = planFixedSteps(
        accumulator.current,
        frameTime * 0.05,
        fixedDt,
        maximumSteps,
        0.05,
      );
      accumulator.current = plan.remainder;
      setDroppedTime((current) => current + plan.droppedTime);

      let completed = 0;
      const started = performance.now();
      for (let step = 0; step < plan.steps; step += 1) {
        if (!velocityVerletStep(systemRef.current, fixedDt, stepOutput.current)) {
          setStepError(
            "Bước mới bị từ chối vì lực, vị trí hoặc phản xạ không hợp lệ. Trạng thái trước bước được giữ lại; hãy giảm dt hoặc mật độ.",
          );
          setPaused(true);
          break;
        }
        completed += 1;
        const currentMetrics = measureSystem(systemRef.current, stepOutput.current.evaluation);
        maximumDrift.current = Math.max(
          maximumDrift.current,
          Math.abs(
            relativeEnergyDrift(currentMetrics.totalEnergy, systemRef.current.initialEnergy),
          ),
        );
      }
      if (completed > 0) setStepMilliseconds((performance.now() - started) / completed);
      setSubsteps(completed);
      setSystem({ ...systemRef.current, particles: [...systemRef.current.particles] });
      const frameMetrics = measureSystem(systemRef.current, stepOutput.current.evaluation);
      setMetrics(frameMetrics);
      setObservedMaximumDrift(maximumDrift.current);

      if (systemRef.current.elapsed >= nextHistoryTime.current) {
        setHistory((current) => appendMolecularHistory(current, systemRef.current, frameMetrics));
        nextHistoryTime.current = systemRef.current.elapsed + 0.02;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fixedDt, paused, showDynamics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    setupCanvas(context, size);
    drawMolecularScene(context, system, viewport, selectedIndex, showVelocities, showPairs);
    if (showCutoff) {
      drawCutoffGraph(
        context,
        size.width,
        system,
        (distance) => sampleForceShiftedPair(distance, system.parameters),
        zoomCutoff,
      );
    }
    if (showEnergy) {
      drawEnergyHistory(context, size.width, size.height, history);
    } else if (showScaling) {
      drawScalingPanel(context, size.width, size.height);
    }
  }, [
    history,
    selectedIndex,
    showCutoff,
    showEnergy,
    showPairs,
    showScaling,
    showVelocities,
    size,
    system,
    viewport,
    zoomCutoff,
  ]);

  const stepOnce = useCallback(() => {
    if (!paused) return;
    const started = performance.now();
    if (!velocityVerletStep(systemRef.current, fixedDt, stepOutput.current)) {
      setStepError("Không thể tiến bước này. Hãy giảm dt hoặc đặt lại điều kiện đầu.");
      return;
    }
    const next = { ...systemRef.current, particles: [...systemRef.current.particles] };
    setSystem(next);
    setSubsteps(1);
    const nextMetrics = measureSystem(next, stepOutput.current.evaluation);
    maximumDrift.current = Math.max(
      maximumDrift.current,
      Math.abs(relativeEnergyDrift(nextMetrics.totalEnergy, next.initialEnergy)),
    );
    setMetrics(nextMetrics);
    setObservedMaximumDrift(maximumDrift.current);
    setStepMilliseconds(performance.now() - started);
    setHistory((current) => appendMolecularHistory(current, next, nextMetrics));
  }, [fixedDt, paused]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      if (showDynamics) {
        setPaused((current) => !current);
      }
    }
    if (event.key.toLowerCase() === "n" && showDynamics) {
      stepOnce();
    }
    if (event.key.toLowerCase() === "r") {
      resetAll();
    }
    const preset = Number(event.key);
    if (preset >= 1 && preset <= COUNT_PRESETS.length) {
      rebuild(COUNT_PRESETS[preset - 1]);
    }
  };

  const selectFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const pointer = molecularCanvasToWorld(canvasPoint(event, canvas), systemRef.current, viewport);
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    systemRef.current.particles.forEach((particle, index) => {
      const dx = particle.position.x - pointer.x;
      const dy = particle.position.y - pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistance) {
        nearestDistance = distanceSquared;
        nearestIndex = index;
      }
    });
    setSelectedIndex(nearestIndex);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    setCapturing(true);
    selectFromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setCapturing(false);
  };

  const selected = system.particles[Math.min(selectedIndex, system.particles.length - 1)];
  const drift = relativeEnergyDrift(metrics.totalEnergy, system.initialEnergy);
  const reportItems = [
    { label: "Số hạt N", value: system.particles.length.toLocaleString("vi-VN") },
    {
      label: "Số cặp / một lần tính lực",
      value: unorderedPairCount(system.particles.length).toLocaleString("vi-VN"),
    },
    {
      label: "Cặp nằm trong cutoff",
      value: metrics.activePairs.toLocaleString("vi-VN"),
    },
    { label: "Nhiệt độ T", value: metrics.temperature.toFixed(5) },
    {
      label: "Động lượng |P|",
      value: length(metrics.momentum).toExponential(3),
    },
    {
      label: "Khoảng cách nhỏ nhất",
      value: Number.isFinite(metrics.minimumDistance) ? metrics.minimumDistance.toFixed(5) : "—",
    },
  ];
  if (showDynamics) {
    reportItems.push(
      {
        label: "Lượt xét / bước Verlet (2 lần tính lực)",
        value: (2 * metrics.evaluatedPairs).toLocaleString("vi-VN"),
      },
      { label: "Thời gian một bước + đo số liệu", value: `${stepMilliseconds.toFixed(3)} ms` },
      { label: "Lượt chạm biên", value: String(system.wallCollisions) },
      { label: "Thời gian / số bước", value: `${system.elapsed.toFixed(4)} / ${system.stepCount}` },
      {
        label: "Bước con / thời gian bỏ",
        value: `${substeps} / ${droppedTime.toFixed(4)} đơn vị mô phỏng`,
      },
    );
  }
  if (showEnergy) {
    reportItems.push(
      {
        label: "Năng lượng K / U / E",
        value: `${metrics.kineticEnergy.toFixed(4)} / ${metrics.potentialEnergy.toFixed(4)} / ${metrics.totalEnergy.toFixed(4)}`,
      },
      { label: "Độ lệch năng lượng", value: `${(100 * drift).toFixed(5)}%` },
      {
        label: "Sai số lớn nhất đã quan sát",
        value: `${(100 * observedMaximumDrift).toFixed(5)}%`,
      },
    );
  }
  if (showCutoff)
    reportItems.push({
      label: "Khoảng cách cân bằng gốc / đã dịch",
      value: `${(2 ** (1 / 6) * system.parameters.sigma).toFixed(6)} / ${forceShiftedEquilibrium(system.parameters).toFixed(6)}`,
    });
  if (selected) {
    reportItems.push({
      label: `Hạt đang chọn #${selectedIndex}`,
      value: `x=(${selected.position.x.toFixed(3)}, ${selected.position.y.toFixed(3)}) · v=(${selected.velocity.x.toFixed(3)}, ${selected.velocity.y.toFixed(3)})`,
    });
  }
  reportItems.push({
    label: "Pointer capture",
    value: capturing ? "đang chọn hạt" : "đã nhả",
  });
  if (mode === "md-final") {
    reportItems.push({
      label: "Kiểm chứng mô hình chuẩn",
      value: validation === null ? "chưa chạy" : validation.passed ? "PASS · 9/9" : "FAIL",
    });
    if (validation)
      reportItems.push({
        label: "Kiểm tra va tường có chủ đích",
        value: `${validation.wallEvents} lượt · max |ΔE/E₀| ${(validation.wallEnergyDrift * 100).toFixed(5)}%`,
      });
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Hộp Molecular Dynamics với nhiều hạt Lennard–Jones, đồ thị năng lượng và chi phí quét mọi cặp"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) {
            selectFromPointer(event);
          }
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onLostPointerCapture={() => setCapturing(false)}
      />
      <div className="lab-controls">
        {showCutoff && (
          <button
            type="button"
            aria-pressed={zoomCutoff}
            onClick={() => setZoomCutoff((value) => !value)}
          >
            {zoomCutoff ? "Xem toàn đường cong" : "Phóng to quanh cutoff"}
          </button>
        )}
        <label>
          Số hạt
          <select value={particleCount} onChange={(event) => rebuild(Number(event.target.value))}>
            {COUNT_PRESETS.map((count) => (
              <option key={count} value={count}>
                {count.toLocaleString("vi-VN")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nhiệt độ ban đầu
          <select
            value={targetTemperature}
            onChange={(event) => rebuild(particleCount, Number(event.target.value))}
          >
            {TEMPERATURE_PRESETS.map((value) => (
              <option key={value} value={value}>
                {value.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mật độ
          <input
            type="range"
            min="0.35"
            max="0.75"
            step="0.05"
            value={density}
            onChange={(event) =>
              rebuild(particleCount, targetTemperature, seed, Number(event.target.value))
            }
          />
        </label>
        {showDynamics && (
          <label>
            Fixed dt
            <select
              value={fixedDt}
              onChange={(event) => {
                setFixedDt(Number(event.target.value));
                rebuild();
              }}
            >
              <option value={0.0005}>1/2000</option>
              <option value={0.001}>1/1000</option>
              <option value={0.002}>1/500</option>
              <option value={0.004}>1/250</option>
            </select>
          </label>
        )}
        <button type="button" onClick={() => rebuild(particleCount, targetTemperature, seed + 1)}>
          Seed khác
        </button>
        {showDynamics && (
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {showDynamics && (
          <button type="button" onClick={stepOnce} disabled={!paused}>
            Tiến một bước
          </button>
        )}
        {mode === "md-final" && (
          <button type="button" onClick={() => setValidation(validateMolecularDynamics())}>
            Kiểm chứng mô hình chuẩn
          </button>
        )}
        <button type="button" onClick={resetAll}>
          Đặt lại
        </button>
      </div>
      <LabReadout items={reportItems} />
      {stepError && <p role="alert">{stepError}</p>}
      <p className="lab-hint">
        Click hoặc kéo trên Canvas để chọn hạt cần đọc. Phím 1–4 đổi số hạt, Space chạy/dừng, N tiến
        một bước khi tạm dừng và R đặt lại. Tốc độ phát là 0,05 đơn vị mô phỏng mỗi giây thực;
        preset 1.000 hạt giới hạn một bước mỗi frame. Thời gian bị bỏ được ghi bằng đơn vị mô phỏng.
      </p>
      {mode === "md-final" && (
        <p className="lab-hint">
          PASS chỉ áp dụng cho cấu hình kiểm chứng chuẩn 36 hạt và ca hai hạt va tường. Với cấu hình
          bạn đang chạy, hãy đọc sai số lớn nhất đã quan sát; giá trị hữu hạn chưa chứng minh dt đủ
          nhỏ.
        </p>
      )}
    </>
  );
}
