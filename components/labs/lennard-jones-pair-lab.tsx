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
  LENNARD_JONES_HISTORY_LIMIT,
  assessLennardJonesExperiment,
  addLennardJonesPoint,
  appendLennardJonesHistory,
  evaluateLennardJonesPair,
  lennardJonesPairDelta,
  lennardJonesDragCondition,
  lennardJonesPairDistance,
  lennardJonesRelativeEnergyDrift,
  lengthLennardJonesPoint,
  makeLennardJonesPair,
  measureLennardJonesSystem,
  planLennardJonesFixedSteps,
  scaleLennardJonesPoint,
  subtractLennardJonesPoint,
  traceLennardJonesVelocityVerletStep,
  validateLennardJonesModel,
  validLennardJonesPairState,
  type LennardJonesHistorySample,
  type LennardJonesParameters,
  type LennardJonesPoint,
} from "@/lib/labs/lennard-jones-pair";
import {
  drawLennardJonesEnergyGraph,
  drawLennardJonesPotentialGraphs,
  drawLennardJonesScene,
  lennardJonesCanvasToWorld,
  makeLennardJonesViewport,
  worldToLennardJonesCanvas,
} from "./lennard-jones-pair-render";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function LennardJonesPairLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [parameters, setParameters] = useState<LennardJonesParameters>({ epsilon: 1, sigma: 1 });
  const [mass, setMass] = useState(1);
  const [fixedDeltaSeconds, setFixedDeltaSeconds] = useState(1 / 1000);
  const [pair, setPair] = useState(() => makeLennardJonesPair(1.5));
  const pairRef = useRef(pair);
  const initialCondition = useRef({
    separationRatio: 1.5,
    direction: { x: 1, y: 0 } satisfies LennardJonesPoint,
  });
  const [paused, setPaused] = useState(true);
  const [history, setHistory] = useState<LennardJonesHistorySample[]>([]);
  const [droppedTime, setDroppedTime] = useState(0);
  const [substeps, setSubsteps] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const draggingRef = useRef(false);
  const [validationReport, setValidationReport] = useState<ReturnType<
    typeof validateLennardJonesModel
  > | null>(null);
  const [experimentReport, setExperimentReport] = useState<ReturnType<
    typeof assessLennardJonesExperiment
  > | null>(null);
  const [stepError, setStepError] = useState("");
  const [baseline, setBaseline] = useState(() => measureLennardJonesSystem(pair, parameters));
  const initialEnergy = useRef(baseline.totalEnergy);
  const accumulator = useRef(0);
  const nextHistoryTime = useRef(0);

  const showPotential = mode !== "pair-distance";
  const showForce = !["pair-distance", "lj-potential"].includes(mode ?? "");
  const showInvariants = ["pair-invariants", "lj-verlet", "lj-energy", "lj-final"].includes(
    mode ?? "lj-final",
  );
  const showDynamics = ["lj-verlet", "lj-energy", "lj-final"].includes(mode ?? "lj-final");
  const showEnergy = ["lj-energy", "lj-final"].includes(mode ?? "lj-final");
  const view = useMemo(
    () => makeLennardJonesViewport(size.width, size.height, showPotential || showEnergy),
    [showEnergy, showPotential, size.height, size.width],
  );

  const resetPair = useCallback(
    (
      separationRatio = 1.5,
      direction: LennardJonesPoint = { x: 1, y: 0 },
      nextParameters = parameters,
      nextMass = mass,
    ) => {
      const next = makeLennardJonesPair(
        separationRatio * nextParameters.sigma,
        nextMass,
        direction,
      );
      if (!validLennardJonesPairState(next)) return;
      const nextDelta = lennardJonesPairDelta(next);
      const nextDirection = scaleLennardJonesPoint(
        nextDelta,
        1 / lengthLennardJonesPoint(nextDelta),
      );
      initialCondition.current = {
        separationRatio,
        direction: nextDirection,
      };
      setParameters(nextParameters);
      setMass(nextMass);
      pairRef.current = next;
      setPair(next);
      const metrics = measureLennardJonesSystem(next, nextParameters);
      initialEnergy.current = metrics.totalEnergy;
      setBaseline(metrics);
      setHistory(
        appendLennardJonesHistory(
          [],
          next,
          nextParameters,
          metrics.totalEnergy,
          LENNARD_JONES_HISTORY_LIMIT,
        ),
      );
      nextHistoryTime.current = 0.02;
      accumulator.current = 0;
      setDroppedTime(0);
      setSubsteps(0);
      setPaused(true);
      setValidationReport(null);
      setExperimentReport(null);
      setStepError("");
    },
    [mass, parameters],
  );

  const applyConfiguration = useCallback(
    (nextParameters: LennardJonesParameters, nextMass = mass) => {
      const current = pairRef.current;
      const currentRatio = lennardJonesPairDistance(current) / parameters.sigma;
      const direction = lennardJonesPairDelta(current);
      resetPair(currentRatio, direction, nextParameters, nextMass);
    },
    [mass, parameters.sigma, resetPair],
  );

  const restartExperiment = useCallback(() => {
    resetPair(initialCondition.current.separationRatio, initialCondition.current.direction);
  }, [resetPair]);

  const resetAll = useCallback(() => {
    setFixedDeltaSeconds(1 / 1000);
    resetPair(1.5, { x: 1, y: 0 }, { epsilon: 1, sigma: 1 }, 1);
  }, [resetPair]);

  useEffect(() => {
    if (!reducedMotion) return;
    // Respond at the next animation boundary; explicit user controls still work afterward.
    const frame = requestAnimationFrame(() => setPaused(true));
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  useEffect(() => {
    if (paused || !showDynamics) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const frameSeconds = Math.max(0, (now - previous) / 1000);
      previous = now;
      const plan = planLennardJonesFixedSteps(
        accumulator.current,
        frameSeconds,
        fixedDeltaSeconds,
        32,
        0.05,
      );
      accumulator.current = plan.remainder;
      setDroppedTime((current) => current + plan.droppedTime);
      let next = pairRef.current;
      let completed = 0;
      for (let step = 0; step < plan.steps; step += 1) {
        const trace = traceLennardJonesVelocityVerletStep(next, parameters, fixedDeltaSeconds);
        if (!trace.valid) {
          setStepError(
            "Bước mới không hợp lệ. Hãy giảm dt hoặc tăng khoảng cách ban đầu; trạng thái trước bước được giữ lại.",
          );
          setPaused(true);
          break;
        }
        next = trace.next;
        completed += 1;
      }
      pairRef.current = next;
      setPair(next);
      setSubsteps(completed);
      if (next.elapsed >= nextHistoryTime.current) {
        setHistory((current) =>
          appendLennardJonesHistory(
            current,
            next,
            parameters,
            initialEnergy.current,
            LENNARD_JONES_HISTORY_LIMIT,
          ),
        );
        nextHistoryTime.current = next.elapsed + 0.02;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fixedDeltaSeconds, parameters, paused, showDynamics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    drawLennardJonesScene(context, view, pair, parameters, showForce, showInvariants);
    if (showPotential) {
      drawLennardJonesPotentialGraphs(
        context,
        size.width,
        size.height,
        pair,
        parameters,
        showForce,
      );
    }
    if (showEnergy) {
      drawLennardJonesEnergyGraph(context, size.width, size.height, history, parameters.epsilon);
    }
  }, [history, pair, parameters, showEnergy, showForce, showInvariants, showPotential, size, view]);

  const stepOnce = useCallback(() => {
    if (!paused) return;
    const trace = traceLennardJonesVelocityVerletStep(
      pairRef.current,
      parameters,
      fixedDeltaSeconds,
    );
    if (!trace.valid) {
      setStepError("Không thể tiến bước này. Hãy giảm dt hoặc đặt lại khoảng cách ban đầu.");
      return;
    }
    pairRef.current = trace.next;
    setPair(trace.next);
    setSubsteps(1);
    setHistory((current) =>
      appendLennardJonesHistory(
        current,
        trace.next,
        parameters,
        initialEnergy.current,
        LENNARD_JONES_HISTORY_LIMIT,
      ),
    );
  }, [fixedDeltaSeconds, parameters, paused]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      if (showDynamics) setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && showDynamics) stepOnce();
    if (event.key.toLowerCase() === "r") resetAll();
    if (event.key === "1") resetPair(0.95);
    if (event.key === "2") resetPair(2 ** (1 / 6));
    if (event.key === "3") resetPair(1.5);
  };

  const updateFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pointer = lennardJonesCanvasToWorld(canvasPoint(event, canvas), view);
    const { direction, separationRatio } = lennardJonesDragCondition(
      pointer,
      initialCondition.current.direction,
      parameters.sigma,
    );
    resetPair(separationRatio, direction);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pointer = canvasPoint(event, canvas);
    const atomB = worldToLennardJonesCanvas(pairRef.current.atomB.position, view);
    if (Math.hypot(pointer.x - atomB.x, pointer.y - atomB.y) > 28) return;
    canvas.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setCapturing(true);
    setPaused(true);
    updateFromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    draggingRef.current = false;
    setCapturing(false);
  };

  const interaction = evaluateLennardJonesPair(pair, parameters);
  const metrics = measureLennardJonesSystem(pair, parameters);
  const forceSum = interaction.valid
    ? addLennardJonesPoint(interaction.forceOnA, interaction.forceOnB)
    : { x: 0, y: 0 };
  const drift = metrics.valid
    ? lennardJonesRelativeEnergyDrift(metrics.totalEnergy, baseline.totalEnergy)
    : Number.NaN;
  const centerDrift = lengthLennardJonesPoint(
    subtractLennardJonesPoint(metrics.center, baseline.center),
  );
  const trace = traceLennardJonesVelocityVerletStep(pair, parameters, fixedDeltaSeconds);
  const readoutItems = [
    {
      label: "Khoảng cách r/σ",
      value: interaction.valid
        ? (interaction.distance / parameters.sigma).toFixed(6)
        : "không hợp lệ",
    },
    {
      label: "Delta A→B",
      value: `(${lennardJonesPairDelta(pair).x.toFixed(4)}, ${lennardJonesPairDelta(pair).y.toFixed(4)})`,
    },
    {
      label: "Thế năng U",
      value: interaction.valid ? interaction.potential.toFixed(7) : "không hợp lệ",
    },
  ];
  if (showForce) {
    readoutItems.push(
      {
        label: "Độ dốc dU/dr",
        value: interaction.valid
          ? `${interaction.potentialSlope >= 0 ? "hút" : "đẩy"} · ${interaction.potentialSlope.toFixed(7)}`
          : "không hợp lệ",
      },
      { label: "Tổng lực FA+FB", value: lengthLennardJonesPoint(forceSum).toExponential(3) },
    );
  }
  if (showInvariants) {
    readoutItems.push(
      {
        label: "Động lượng |p|",
        value: lengthLennardJonesPoint(metrics.momentum).toExponential(3),
      },
      {
        label: "Độ trôi tâm khối lượng",
        value: centerDrift.toExponential(3),
      },
    );
  }
  if (showDynamics) {
    readoutItems.push(
      { label: "Thời gian mô phỏng", value: pair.elapsed.toFixed(4) },
      {
        label: "Velocity Verlet trace",
        value: trace.valid
          ? `|a₀| ${lengthLennardJonesPoint(trace.accelerationA0).toFixed(4)} → |a₁| ${lengthLennardJonesPoint(trace.accelerationA1).toFixed(4)}`
          : "step bị từ chối",
      },
    );
  }
  if (showEnergy) {
    readoutItems.push(
      {
        label: "Năng lượng U / K / E",
        value: `${metrics.potential.toFixed(5)} / ${metrics.kinetic.toFixed(5)} / ${metrics.totalEnergy.toFixed(5)}`,
      },
      { label: "Độ lệch năng lượng tương đối", value: `${(100 * drift).toFixed(5)}%` },
    );
  }
  readoutItems.push({
    label: "Giới hạn bước / trạng thái kéo",
    value: `${substeps} bước con · bỏ ${droppedTime.toFixed(4)} s · ${capturing ? "đang kéo" : "đã nhả"}`,
  });
  if (mode === "lj-final") {
    readoutItems.push({
      label: "Kiểm chứng mô hình chuẩn",
      value:
        validationReport === null ? "chưa chạy" : validationReport.passed ? "PASS · 7/7" : "FAIL",
    });
    if (experimentReport) {
      readoutItems.push({
        label: `Cấu hình đang chọn · ${experimentReport.steps.toLocaleString("vi-VN")}/1.000 bước`,
        value: !experimentReport.valid
          ? "Lần kiểm tra dừng vì trạng thái không hợp lệ; chưa đủ dữ liệu để đánh giá sai số."
          : `${experimentReport.stable ? "đạt ngưỡng 0,2%" : "cần giảm dt / kiểm tra điều kiện đầu"} · max |ΔE/E₀| ${(experimentReport.maximumEnergyDrift * 100).toFixed(4)}%`,
      });
    }
    if (validationReport !== null) {
      readoutItems.push({
        label: "Các phép kiểm",
        value: [
          ["mốc thế năng", validationReport.landmarks],
          ["hướng lực", validationReport.forceDirections],
          ["Newton III", validationReport.newtonThirdLaw],
          ["trạng thái hữu hạn", validationReport.finiteRun],
          ["động lượng", validationReport.momentum],
          ["tâm khối lượng", validationReport.centerOfMass],
          ["năng lượng", validationReport.energy],
        ]
          .map(([label, passed]) => `${label} ${passed ? "✓" : "✗"}`)
          .join(" · "),
      });
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Hai nguyên tử tương tác bằng thế Lennard–Jones, đồ thị thế năng, lực và năng lượng"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (draggingRef.current) updateFromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onLostPointerCapture={() => {
          draggingRef.current = false;
          setCapturing(false);
        }}
      />
      <div className="lab-controls">
        <label>
          Khoảng cách r/σ
          <input
            type="range"
            min="0.82"
            max="2.8"
            step="0.01"
            value={(lennardJonesPairDistance(pair) / parameters.sigma).toFixed(2)}
            onChange={(event) => resetPair(Number(event.target.value))}
          />
        </label>
        {showPotential && (
          <label>
            Epsilon ε
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={parameters.epsilon}
              onChange={(event) => {
                const epsilon = Number(event.target.value);
                applyConfiguration({ ...parameters, epsilon });
              }}
            />
          </label>
        )}
        {showPotential && (
          <label>
            Sigma σ
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={parameters.sigma}
              onChange={(event) => {
                const sigma = Number(event.target.value);
                applyConfiguration({ ...parameters, sigma });
              }}
            />
          </label>
        )}
        {showInvariants && (
          <label>
            Khối lượng mỗi nguyên tử
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={mass}
              onChange={(event) => {
                applyConfiguration(parameters, Number(event.target.value));
              }}
            />
          </label>
        )}
        {showDynamics && (
          <label>
            Fixed dt
            <select
              value={fixedDeltaSeconds}
              onChange={(event) => {
                setFixedDeltaSeconds(Number(event.target.value));
                restartExperiment();
              }}
            >
              <option value={1 / 250}>1/250</option>
              <option value={1 / 500}>1/500</option>
              <option value={1 / 1000}>1/1000</option>
              <option value={1 / 2000}>1/2000</option>
            </select>
          </label>
        )}
        <button type="button" onClick={() => resetPair(0.95)}>
          Vùng đẩy
        </button>
        <button type="button" onClick={() => resetPair(2 ** (1 / 6))}>
          Đáy thế
        </button>
        <button type="button" onClick={() => resetPair(1.5)}>
          Vùng hút
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
        {mode === "lj-final" && (
          <button
            type="button"
            onClick={() => {
              setValidationReport(validateLennardJonesModel(parameters, mass));
              const initial = makeLennardJonesPair(
                initialCondition.current.separationRatio * parameters.sigma,
                mass,
                initialCondition.current.direction,
              );
              setExperimentReport(
                assessLennardJonesExperiment(initial, parameters, fixedDeltaSeconds),
              );
            }}
          >
            Kiểm chứng mô hình chuẩn
          </button>
        )}
        <button type="button" onClick={resetAll}>
          Đặt lại
        </button>
      </div>
      <LabReadout items={readoutItems} />
      {stepError && <p role="alert">{stepError}</p>}
      {mode === "lj-final" && (
        <p className="lab-hint">
          Kiểm chứng chuẩn dùng r = 1,45σ và dt theo thang thời gian của mô hình. Báo cáo cấu hình
          đang chọn dùng đúng khoảng cách ban đầu và dt của bạn; kết quả chỉ áp dụng cho 1.000 bước
          đã kiểm tra.
        </p>
      )}
      <p className="lab-hint">
        Kéo nguyên tử đỏ để chọn hướng và khoảng cách. Phím 1–3 đổi vùng, Space chạy/dừng, N tiến
        một bước và R đặt lại. Canvas dùng hệ đơn vị rút gọn; đường cong bị cắt để dễ nhìn nhưng các
        giá trị U và F đưa vào mô phỏng vẫn được giữ nguyên.
      </p>
    </>
  );
}
