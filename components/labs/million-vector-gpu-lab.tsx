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
  DESKTOP_LIMITS,
  WEAK_LIMITS,
  makeDispatchPlan,
  median,
  modelPipelineMilliseconds,
  oracleAt,
  std430ByteOffset,
  validateCapabilities,
  validateMillionVectorContract,
  validateOutput,
  vectorAt,
  type ComputeLimits,
  type Vec4,
  type VectorOperation,
} from "@/lib/labs/million-vector-gpu";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const COUNT_PRESETS = [256, 65_537, 1_000_003] as const;
const LOCAL_SIZE_PRESETS = [32, 64, 128, 256] as const;
const MONO = "12px ui-monospace, SFMono-Regular, Consolas, monospace";

function formatVec4(value: Vec4) {
  return `(${value.x.toFixed(3)}, ${value.y.toFixed(3)}, ${value.z.toFixed(3)}, ${value.w.toFixed(3)})`;
}

function operationLabel(operation: VectorOperation) {
  if (operation === "axpy") return "AXPY: scalar × A + B";
  if (operation === "difference") return "Difference: A − B";
  return "Add: A + B";
}

function drawTitle(context: CanvasRenderingContext2D, text: string) {
  context.fillStyle = "#d7deec";
  context.font = MONO;
  context.fillText(text, 24, 24);
}

function drawVectorBars(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  a: Vec4,
  b: Vec4,
  output: Vec4,
) {
  const rows = [
    { label: "A[i]", value: a, color: "#61afef" },
    { label: "B[i]", value: b, color: "#e5c07b" },
    { label: "out[i]", value: output, color: "#98c379" },
  ];
  const components = ["x", "y", "z", "w"] as const;
  const left = 86;
  const baseline = width * 0.52;
  const scale = Math.min(94, width * 0.12);
  const rowGap = Math.max(62, (height - 70) / 3);
  context.font = MONO;
  rows.forEach((row, rowIndex) => {
    const y = 64 + rowIndex * rowGap;
    context.fillStyle = "#aebbd2";
    context.fillText(row.label, 24, y + 16);
    context.strokeStyle = "#34435f";
    context.beginPath();
    context.moveTo(left, y + 15);
    context.lineTo(width - 24, y + 15);
    context.stroke();
    components.forEach((component, componentIndex) => {
      const value = row.value[component];
      const laneY = y + componentIndex * 9;
      context.strokeStyle = row.color;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(baseline, laneY);
      context.lineTo(baseline + value * scale, laneY);
      context.stroke();
    });
  });
}

function drawSsboLayout(context: CanvasRenderingContext2D, width: number, selectedIndex: number) {
  const labels = ["binding 0 · InputA", "binding 1 · InputB", "binding 2 · Output"];
  const colors = ["#61afef", "#e5c07b", "#98c379"];
  const left = 28;
  const cellWidth = Math.max(54, Math.min(94, (width - 56) / 6));
  labels.forEach((label, row) => {
    const y = 62 + row * 86;
    context.fillStyle = "#d7deec";
    context.font = MONO;
    context.fillText(label, left, y - 12);
    for (let offset = 0; offset < 6; offset += 1) {
      const index = Math.max(0, selectedIndex - 2 + offset);
      const x = left + offset * cellWidth;
      context.fillStyle = colors[row];
      context.globalAlpha = index === selectedIndex ? 0.95 : 0.28;
      context.fillRect(x, y, cellWidth - 5, 48);
      context.globalAlpha = 1;
      context.fillStyle = "#0b1020";
      context.fillText(`i=${index}`, x + 6, y + 18);
      context.fillText(`+${std430ByteOffset(index)}B`, x + 6, y + 36);
    }
  });
}

function drawWorkgroup(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elementCount: number,
  localSize: number,
  selectedLane: number,
  showTail: boolean,
) {
  const plan = makeDispatchPlan(elementCount, localSize);
  const workgroupId = showTail ? Math.max(0, plan.workgroupCount - 1) : 0;
  const columns = Math.ceil(Math.sqrt(localSize));
  const rows = Math.ceil(localSize / columns);
  const cell = Math.max(5, Math.min(22, (width - 60) / columns, (height - 78) / rows));
  const left = (width - columns * cell) * 0.5;
  const top = 52;
  for (let lane = 0; lane < localSize; lane += 1) {
    const globalId = workgroupId * localSize + lane;
    const valid = globalId < elementCount;
    const x = left + (lane % columns) * cell;
    const y = top + Math.floor(lane / columns) * cell;
    context.fillStyle = valid ? "#61afef" : "#e06c75";
    context.globalAlpha = lane === selectedLane ? 1 : 0.45;
    context.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    if (lane === selectedLane) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.strokeRect(x, y, cell, cell);
    }
  }
  context.globalAlpha = 1;
  context.fillStyle = "#aebbd2";
  context.font = MONO;
  context.fillText(
    `workgroup ${workgroupId} · xanh: chạy · đỏ: return bởi bounds guard`,
    24,
    height - 16,
  );
}

function drawPipeline(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  barrierMode: "correct" | "missing" | "wrong",
) {
  const stages = [
    { label: "Upload A/B", color: "#61afef" },
    { label: "Dispatch", color: "#c678dd" },
    {
      label:
        barrierMode === "correct"
          ? "BUFFER_UPDATE barrier"
          : barrierMode === "missing"
            ? "Không có barrier"
            : "Sai consumer bit",
      color: barrierMode === "correct" ? "#98c379" : "#e06c75",
    },
    { label: "Readback", color: "#e5c07b" },
  ];
  const gap = 14;
  const stageWidth = (width - 48 - gap * (stages.length - 1)) / stages.length;
  const y = height * 0.36;
  stages.forEach((stage, index) => {
    const x = 24 + index * (stageWidth + gap);
    context.fillStyle = stage.color;
    context.globalAlpha = 0.78;
    context.fillRect(x, y, stageWidth, 72);
    context.globalAlpha = 1;
    context.fillStyle = "#0b1020";
    context.font = MONO;
    context.fillText(stage.label, x + 8, y + 39, stageWidth - 14);
    if (index < stages.length - 1) {
      context.strokeStyle = "#aebbd2";
      context.beginPath();
      context.moveTo(x + stageWidth, y + 36);
      context.lineTo(x + stageWidth + gap, y + 36);
      context.stroke();
    }
  });
}

function drawTiming(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elementCount: number,
  phase: number,
  includeUpload: boolean,
  includeReadback: boolean,
) {
  const rows = Array.from({ length: 9 }, (_, index) =>
    modelPipelineMilliseconds(elementCount, index + phase),
  );
  const samples = rows.map(
    (row) => row.compute + (includeUpload ? row.upload : 0) + (includeReadback ? row.readback : 0),
  );
  const maximum = Math.max(...samples, 0.001);
  const left = 40;
  const bottom = height - 38;
  const chartHeight = height - 92;
  const gap = 10;
  const barWidth = Math.max(12, (width - left - 28 - gap * 8) / 9);
  samples.forEach((sample, index) => {
    const barHeight = (sample / maximum) * chartHeight;
    context.fillStyle = "#c678dd";
    context.fillRect(left + index * (barWidth + gap), bottom - barHeight, barWidth, barHeight);
    context.fillStyle = "#aebbd2";
    context.font = MONO;
    context.fillText(String(index + 1), left + index * (barWidth + gap) + 3, bottom + 17);
  });
  context.strokeStyle = "#e5c07b";
  const medianY = bottom - (median(samples) / maximum) * chartHeight;
  context.beginPath();
  context.moveTo(left, medianY);
  context.lineTo(width - 20, medianY);
  context.stroke();
  context.fillStyle = "#aebbd2";
  context.font = MONO;
  context.fillText(
    `timeline: ${includeUpload ? "upload + " : ""}compute${includeReadback ? " + readback" : ""}`,
    left,
    42,
  );
}

export default function MillionVectorGpuLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [elementCount, setElementCount] = useState<number>(
    mode === "one-workgroup" ? 256 : 1_000_003,
  );
  const [localSize, setLocalSize] = useState(256);
  const [operation, setOperation] = useState<VectorOperation>("add");
  const [scalar, setScalar] = useState(1.25);
  const [selectedIndex, setSelectedIndex] = useState(777);
  const [selectedLane, setSelectedLane] = useState(0);
  const [limits, setLimits] = useState<ComputeLimits>(DESKTOP_LIMITS);
  const [barrierMode, setBarrierMode] = useState<"correct" | "missing" | "wrong">("correct");
  const [injectedError, setInjectedError] = useState<"none" | "roundoff" | "large" | "nan">("none");
  const [tolerance, setTolerance] = useState(2e-6);
  const [paused, setPaused] = useState(true);
  const [phase, setPhase] = useState(0);
  const [includeUpload, setIncludeUpload] = useState(false);
  const [includeReadback, setIncludeReadback] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const showLimits = mode === "compute-limits";
  const showLayout = mode === "ssbo-layout";
  const showWorkgroup = mode === "one-workgroup" || mode === "dispatch-tail";
  const showTail = mode === "dispatch-tail";
  const showBarrier = mode === "barrier-readback";
  const showValidation = mode === "gpu-validation" || mode === "vector-gpu-final" || !mode;
  const showTiming = mode === "gpu-timing";

  const reset = useCallback(() => {
    setElementCount(mode === "one-workgroup" ? 256 : 1_000_003);
    setLocalSize(256);
    setOperation("add");
    setScalar(1.25);
    setSelectedIndex(777);
    setSelectedLane(0);
    setLimits(DESKTOP_LIMITS);
    setBarrierMode("correct");
    setIncludeUpload(false);
    setIncludeReadback(false);
    setInjectedError("none");
    setTolerance(2e-6);
    setPaused(true);
    setPhase(0);
    setCapturing(false);
  }, [mode]);

  useEffect(() => {
    if (paused || reducedMotion || (!showTiming && mode !== "vector-gpu-final" && mode)) return;
    const tick = () => {
      setPhase((current) => (current + 0.035) % 1000);
      animationFrame.current = requestAnimationFrame(tick);
    };
    animationFrame.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [mode, paused, reducedMotion, showTiming]);

  const plan = useMemo(() => makeDispatchPlan(elementCount, localSize), [elementCount, localSize]);
  const capability = useMemo(() => validateCapabilities(limits, plan), [limits, plan]);
  const clampedIndex = Math.min(elementCount - 1, Math.max(0, selectedIndex));
  const { a, b, expected, actual } = useMemo(() => {
    const nextA = vectorAt(clampedIndex, "a");
    const nextB = vectorAt(clampedIndex, "b");
    const nextExpected = oracleAt(clampedIndex, operation, scalar);
    const nextActual = { ...nextExpected };
    if (injectedError === "roundoff") nextActual.x += 1e-7;
    if (injectedError === "large") nextActual.x += 0.01;
    if (injectedError === "nan") nextActual.x = Number.NaN;
    return { a: nextA, b: nextB, expected: nextExpected, actual: nextActual };
  }, [clampedIndex, injectedError, operation, scalar]);
  const outputValidation = validateOutput([expected], [actual], tolerance, tolerance);
  const timingRows = Array.from({ length: 9 }, (_, index) =>
    modelPipelineMilliseconds(elementCount, index + phase),
  );
  const computeMedian = median(timingRows.map((row) => row.compute));
  const pipeline = timingRows[0];
  const namedValidation = validateMillionVectorContract();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    if (showLayout) {
      drawTitle(context, "Ba SSBO · một Vec4 = 16 byte · std430");
      drawSsboLayout(context, size.width, clampedIndex);
    } else if (showWorkgroup) {
      drawTitle(
        context,
        showTail ? "Workgroup cuối và bounds guard" : "Một workgroup 256 invocation",
      );
      drawWorkgroup(
        context,
        size.width,
        size.height,
        elementCount,
        localSize,
        selectedLane,
        showTail,
      );
    } else if (showBarrier) {
      drawTitle(context, "Visibility phải được khóa theo consumer kế tiếp");
      drawPipeline(context, size.width, size.height, barrierMode);
    } else if (showTiming) {
      drawTitle(context, "Chín GL_TIME_ELAPSED samples · đường vàng = median");
      drawTiming(
        context,
        size.width,
        size.height,
        elementCount,
        phase,
        includeUpload,
        includeReadback,
      );
    } else if (showLimits) {
      drawTitle(context, "Capability report trước allocation/dispatch");
      const rows = Object.entries(capability);
      rows.forEach(([label, passed], index) => {
        const y = 62 + index * 58;
        context.fillStyle = passed ? "#98c379" : "#e06c75";
        context.fillRect(28, y, passed ? size.width - 56 : (size.width - 56) * 0.32, 34);
        context.fillStyle = "#0b1020";
        context.font = MONO;
        context.fillText(`${passed ? "PASS" : "FAIL"} · ${label}`, 38, y + 22);
      });
    } else {
      drawTitle(context, `${operationLabel(operation)} · probe i=${clampedIndex}`);
      drawVectorBars(context, size.width, size.height, a, b, actual);
    }
  }, [
    a,
    actual,
    b,
    barrierMode,
    capability,
    clampedIndex,
    elementCount,
    includeReadback,
    includeUpload,
    localSize,
    operation,
    phase,
    selectedLane,
    showBarrier,
    showLayout,
    showLimits,
    showTail,
    showTiming,
    showWorkgroup,
    size,
  ]);

  const updateFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPoint(event, canvas);
    const fraction = Math.max(0, Math.min(0.999999, point.x / size.width));
    if (showWorkgroup) setSelectedLane(Math.floor(fraction * localSize));
    else setSelectedIndex(Math.floor(fraction * elementCount));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setCapturing(true);
    updateFromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointer.current = null;
    setCapturing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key.toLowerCase() === "r") reset();
    if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      if (showWorkgroup) {
        setSelectedLane((current) => Math.max(0, Math.min(localSize - 1, current + direction)));
      } else {
        setSelectedIndex((current) => Math.max(0, Math.min(elementCount - 1, current + direction)));
      }
    }
    if (event.key === "1") setOperation("add");
    if (event.key === "2") setOperation("axpy");
    if (event.key === "3") setOperation("difference");
  };

  const selectedWorkgroup = showTail ? Math.max(0, plan.workgroupCount - 1) : 0;
  const selectedGlobalId = selectedWorkgroup * localSize + selectedLane;
  const capabilityFailures = Object.entries(capability)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng Canvas 2D về SSBO, compute workgroup, bounds guard, memory barrier, validation và timing"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) updateFromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        {!showLimits && !showBarrier && (
          <label>
            Số phần tử
            <select
              value={elementCount}
              onChange={(event) => {
                const count = Number(event.target.value);
                setElementCount(count);
                setSelectedIndex((current) => Math.min(current, count - 1));
              }}
            >
              {COUNT_PRESETS.map((count) => (
                <option key={count} value={count}>
                  {count.toLocaleString("vi-VN")}
                </option>
              ))}
            </select>
          </label>
        )}
        {(showWorkgroup || showLimits || mode === "vector-gpu-final" || !mode) && (
          <label>
            Local size
            <select
              value={localSize}
              onChange={(event) => {
                const value = Number(event.target.value);
                setLocalSize(value);
                setSelectedLane((current) => Math.min(current, value - 1));
              }}
            >
              {LOCAL_SIZE_PRESETS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}
        {(mode === "vector-workload" ||
          mode === "gpu-validation" ||
          mode === "vector-gpu-final" ||
          !mode) && (
          <label>
            Operation
            <select
              value={operation}
              onChange={(event) => setOperation(event.target.value as VectorOperation)}
            >
              <option value="add">Add</option>
              <option value="axpy">AXPY</option>
              <option value="difference">Difference</option>
            </select>
          </label>
        )}
        {(mode === "vector-workload" ||
          mode === "gpu-validation" ||
          mode === "vector-gpu-final" ||
          !mode) && (
          <label>
            Scalar: {scalar.toFixed(2)}
            <input
              type="range"
              min={-4}
              max={4}
              step={0.25}
              value={scalar}
              onChange={(event) => setScalar(Number(event.target.value))}
            />
          </label>
        )}
        {showLimits && (
          <label>
            Capability preset
            <select
              value={limits === DESKTOP_LIMITS ? "desktop" : "weak"}
              onChange={(event) =>
                setLimits(event.target.value === "desktop" ? DESKTOP_LIMITS : WEAK_LIMITS)
              }
            >
              <option value="desktop">OpenGL 4.6 desktop</option>
              <option value="weak">Thiếu compute/SSBO</option>
            </select>
          </label>
        )}
        {showBarrier && (
          <label>
            Barrier experiment
            <select
              value={barrierMode}
              onChange={(event) => setBarrierMode(event.target.value as typeof barrierMode)}
            >
              <option value="correct">BUFFER_UPDATE đúng</option>
              <option value="missing">Bỏ barrier</option>
              <option value="wrong">Sai consumer bit</option>
            </select>
          </label>
        )}
        {showTiming && (
          <>
            <label>
              <input
                type="checkbox"
                checked={includeUpload}
                onChange={(event) => setIncludeUpload(event.target.checked)}
              />
              Hiện upload trong timeline
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeReadback}
                onChange={(event) => setIncludeReadback(event.target.checked)}
              />
              Hiện readback trong timeline
            </label>
          </>
        )}
        {mode === "gpu-validation" && (
          <label>
            Injected error
            <select
              value={injectedError}
              onChange={(event) => setInjectedError(event.target.value as typeof injectedError)}
            >
              <option value="none">Không lỗi</option>
              <option value="roundoff">Roundoff 1e-7</option>
              <option value="large">Sai 0,01</option>
              <option value="nan">NaN</option>
            </select>
          </label>
        )}
        {mode === "gpu-validation" && (
          <label>
            Tolerance: {tolerance.toExponential(0)}
            <input
              type="range"
              min={-8}
              max={-2}
              step={1}
              value={Math.round(Math.log10(tolerance))}
              onChange={(event) => setTolerance(10 ** Number(event.target.value))}
            />
          </label>
        )}
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Chạy timeline" : "Tạm dừng"}
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Dispatch plan",
            value: `${plan.workgroupCount.toLocaleString("vi-VN")} groups × ${localSize} = ${plan.launchedInvocations.toLocaleString("vi-VN")} invocations · ${plan.unusedInvocations} lane dư`,
          },
          ...(showWorkgroup
            ? [
                {
                  label: "Invocation address",
                  value: `group ${selectedWorkgroup} · local ${selectedLane} · global ${selectedGlobalId} · ${selectedGlobalId < elementCount ? `xử lý out[${selectedGlobalId}]` : "return trước buffer access"}`,
                },
              ]
            : []),
          ...(showLayout
            ? [
                {
                  label: "std430 address",
                  value: `index ${clampedIndex} × stride 16 = byte offset ${std430ByteOffset(clampedIndex).toLocaleString("vi-VN")}`,
                },
              ]
            : []),
          ...(showLimits
            ? [
                {
                  label: "Kiểm tra giới hạn GPU",
                  value:
                    capabilityFailures.length === 0
                      ? "4/4 checks đạt trước allocation"
                      : `FAIL: ${capabilityFailures.join(", ")}`,
                },
              ]
            : []),
          ...(showBarrier
            ? [
                {
                  label: "Readback visibility",
                  value:
                    barrierMode === "correct"
                      ? "PASS · consumer glGetBufferSubData được mô tả bởi BUFFER_UPDATE bit"
                      : "STALE/UNDEFINED · thí nghiệm lỗi, không dùng kết quả để validate",
                },
              ]
            : []),
          ...(showValidation
            ? [
                {
                  label: "CPU ↔ GPU probe",
                  value: `${formatVec4(expected)} ↔ ${formatVec4(actual)} · max error ${outputValidation.maximumAbsoluteError.toExponential(2)} · ${outputValidation.allFinite && outputValidation.mismatchCount === 0 ? "PASS" : "FAIL"}`,
                },
                {
                  label: "Kết quả kiểm tra",
                  value: `${Object.values(namedValidation).filter(Boolean).length}/${Object.keys(namedValidation).length} checks đạt`,
                },
              ]
            : []),
          ...(showTiming || mode === "vector-gpu-final" || !mode
            ? [
                {
                  label: "Mô hình đo thời gian",
                  value: `upload ${includeUpload ? `${pipeline.upload.toFixed(3)} ms` : "ẩn"} · compute median ${computeMedian.toFixed(3)} ms · barrier ${pipeline.barrier.toFixed(3)} ms · readback ${includeReadback ? `${pipeline.readback.toFixed(3)} ms` : "ẩn"}`,
                },
              ]
            : []),
          {
            label: "Mô tả thay thế",
            value: `Canvas 2D đang minh họa ${plan.workgroupCount} workgroups cho ${elementCount.toLocaleString("vi-VN")} Vec4; đây là mô hình contract, không phải phép đo GPU của trình duyệt. Pointer ${capturing ? "đang capture" : "đã nhả"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo ngang để chọn index hoặc local lane; mũi tên trái/phải bước từng phần tử. 1/2/3 đổi
        operation, Space chạy/dừng timeline, R reset. Reduced motion luôn giữ timeline đứng yên.
      </p>
    </>
  );
}
