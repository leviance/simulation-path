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
  COUNT_PRESETS,
  barrierMessage,
  blellochStages,
  cpuExclusiveScan,
  cpuInclusiveScan,
  cpuReduction,
  makeDeterministicInput,
  makeHierarchy,
  makePassLabels,
  modelGpuMilliseconds,
  validateExclusiveScan,
  validateReduction,
  workgroupReductionStages,
  type BarrierChoice,
  type ReductionScanOperation,
} from "@/lib/labs/gpu-reduction-prefix-sum";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const MONO = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
const DEFAULT_SMALL_INPUT = [3, 1, 4, 2, 5, 0, 2, 1];

function drawHeading(context: CanvasRenderingContext2D, text: string) {
  context.fillStyle = "#d7deec";
  context.font = MONO;
  context.fillText(text, 22, 25);
}

function drawValues(
  context: CanvasRenderingContext2D,
  values: readonly number[],
  y: number,
  width: number,
  selectedIndex: number,
  color = "#61afef",
  label = "values",
) {
  const left = 24;
  const gap = 6;
  const boxWidth = Math.max(
    34,
    Math.min(68, (width - left * 2 - gap * (values.length - 1)) / values.length),
  );
  context.fillStyle = "#9caaca";
  context.font = MONO;
  context.fillText(label, left, y - 11);
  values.forEach((value, index) => {
    const x = left + index * (boxWidth + gap);
    context.fillStyle = index === selectedIndex ? "#e5c07b" : color;
    context.globalAlpha = index === selectedIndex ? 1 : 0.78;
    context.fillRect(x, y, boxWidth, 36);
    context.fillStyle = "#0b1020";
    context.textAlign = "center";
    context.fillText(Number.isFinite(value) ? value.toFixed(2) : "NaN", x + boxWidth / 2, y + 22);
  });
  context.globalAlpha = 1;
  context.textAlign = "left";
}

function drawContract(
  context: CanvasRenderingContext2D,
  width: number,
  values: readonly number[],
  selectedIndex: number,
  operation: ReductionScanOperation,
) {
  drawHeading(context, "cùng input · hai output contract khác nhau");
  drawValues(context, values, 62, width, selectedIndex, "#61afef", "input");
  const reduction = cpuReduction(values);
  context.fillStyle = "#202d46";
  context.fillRect(24, 142, width - 48, 48);
  context.fillStyle = "#98c379";
  context.font = MONO;
  context.fillText(`reduction → một scalar: ${reduction.toFixed(2)}`, 38, 172);
  const inclusive = operation === "inclusive-scan";
  const scan = inclusive ? cpuInclusiveScan(values) : cpuExclusiveScan(values);
  drawValues(
    context,
    scan,
    235,
    width,
    selectedIndex,
    "#c678dd",
    inclusive ? "inclusive scan" : "exclusive scan",
  );
}

function drawHierarchy(
  context: CanvasRenderingContext2D,
  width: number,
  inputCount: number,
  operation: ReductionScanOperation,
  selectedPass: number,
  blockSpan: number,
) {
  drawHeading(context, `${inputCount.toLocaleString("vi-VN")} phần tử · block span ${blockSpan}`);
  const hierarchy = makeHierarchy(inputCount, blockSpan);
  const labels = makePassLabels(operation, inputCount, blockSpan);
  labels.forEach((label, index) => {
    const y = 58 + index * 52;
    const inset = index < hierarchy.length ? index * 22 : (labels.length - index - 1) * 22;
    context.fillStyle =
      index === selectedPass ? "#e5c07b" : index < hierarchy.length ? "#61afef" : "#c678dd";
    context.globalAlpha = index === selectedPass ? 1 : 0.76;
    context.fillRect(24 + inset, y, Math.max(120, width - 48 - inset * 2), 34);
    context.fillStyle = "#0b1020";
    context.font = MONO;
    context.fillText(label, 36 + inset, y + 22);
  });
  context.globalAlpha = 1;
}

function drawReductionStage(
  context: CanvasRenderingContext2D,
  width: number,
  selectedPass: number,
  selectedIndex: number,
  values: readonly number[],
  barriersEnabled: boolean,
) {
  const stages = workgroupReductionStages(values, barriersEnabled);
  const stage = stages[Math.min(selectedPass, stages.length - 1)];
  drawHeading(
    context,
    `shared memory · stride ${stage.stride} · barrier ${barriersEnabled ? "ON" : "OFF"}`,
  );
  drawValues(context, stage.values, 75, width, selectedIndex, "#61afef", "sharedValues[ ]");
  const treeY = 180;
  for (let index = 0; index < stage.activeLanes; index += 1) {
    const x = 42 + (index + 0.5) * ((width - 84) / stage.activeLanes);
    context.fillStyle = "#98c379";
    context.beginPath();
    context.arc(x, treeY, 9, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = barriersEnabled ? "#aebbd2" : "#e06c75";
  context.font = MONO;
  context.fillText(
    barriersEnabled
      ? "barrier() công bố kết quả trước khi stride kế tiếp đọc"
      : "mô hình lỗi: stride kế tiếp chỉ nhìn thấy dữ liệu cũ",
    24,
    245,
  );
}

function drawBlelloch(
  context: CanvasRenderingContext2D,
  width: number,
  selectedPass: number,
  selectedIndex: number,
  values: readonly number[],
) {
  const stages = blellochStages(values);
  const stage = stages[Math.min(selectedPass, stages.length - 1)];
  drawHeading(context, `${stage.phase} · offset ${stage.offset}`);
  drawValues(context, stage.values, 70, width, selectedIndex, "#c678dd", "temp[ ]");
  const phaseText = {
    load: "nạp input, tail dùng zero",
    upsweep: "gom tổng từ lá lên root",
    "root-zero": "lưu block sum trước, rồi root = 0",
    downsweep: "swap nhánh trái, cộng prefix sang nhánh phải",
    output: "exclusive prefix hoàn chỉnh",
  }[stage.phase];
  context.fillStyle = "#202d46";
  context.fillRect(24, 170, width - 48, 58);
  context.fillStyle = "#e5c07b";
  context.font = MONO;
  context.fillText(phaseText, 38, 203);
}

function drawBlockScan(
  context: CanvasRenderingContext2D,
  width: number,
  selectedPass: number,
  withOffsets: boolean,
) {
  drawHeading(context, withOffsets ? "scan block sums → uniform add" : "local scan từng block");
  const local = [
    [0, 3, 4, 8],
    [0, 5, 5, 7],
    [0, 6, 7, 10],
  ];
  const sums = [10, 8, 12];
  const offsets = [0, 10, 18];
  local.forEach((block, blockIndex) => {
    const y = 58 + blockIndex * 74;
    const blockWidth = width - 48;
    context.fillStyle = blockIndex === selectedPass % 3 ? "#263653" : "#17233a";
    context.fillRect(24, y, blockWidth, 58);
    const shown = withOffsets ? block.map((value) => value + offsets[blockIndex]) : block;
    context.fillStyle = "#9caaca";
    context.font = MONO;
    context.fillText(
      `block ${blockIndex} · sum ${sums[blockIndex]} · offset ${withOffsets ? offsets[blockIndex] : "?"}`,
      36,
      y + 19,
    );
    context.fillStyle = withOffsets ? "#98c379" : "#61afef";
    context.fillText(`[${shown.join(", ")}]`, 36, y + 43);
  });
}

function drawBarriers(
  context: CanvasRenderingContext2D,
  width: number,
  choice: BarrierChoice,
  consumer: "compute-pass" | "readback",
) {
  drawHeading(context, "producer → visibility contract → consumer");
  const report = barrierMessage("compute-pass", consumer, choice);
  const stages = ["compute write", choice, consumer];
  stages.forEach((stage, index) => {
    const boxWidth = (width - 76) / 3;
    const x = 24 + index * (boxWidth + 14);
    context.fillStyle = index === 1 ? (report.passed ? "#98c379" : "#e06c75") : "#61afef";
    context.fillRect(x, 92, boxWidth, 70);
    context.fillStyle = "#0b1020";
    context.font = MONO;
    context.textAlign = "center";
    context.fillText(stage, x + boxWidth / 2, 132);
  });
  context.textAlign = "left";
  context.fillStyle = report.passed ? "#98c379" : "#e06c75";
  context.fillText(report.message, 24, 220);
}

export default function GpuReductionPrefixSumLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrame = useRef<number | null>(null);
  const activePointer = useRef<number | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [operation, setOperation] = useState<ReductionScanOperation>("exclusive-scan");
  const [smallInput, setSmallInput] = useState([...DEFAULT_SMALL_INPUT]);
  const [inputCount, setInputCount] = useState<number>(1_000_003);
  const [blockSpan, setBlockSpan] = useState(512);
  const [seed, setSeed] = useState(39);
  const [selectedPass, setSelectedPass] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [barrierChoice, setBarrierChoice] = useState<BarrierChoice>("shader-storage");
  const [consumer, setConsumer] = useState<"compute-pass" | "readback">("compute-pass");
  const [workgroupBarrierEnabled, setWorkgroupBarrierEnabled] = useState(true);
  const [injectedError, setInjectedError] = useState<"none" | "offset" | "nan" | "tail">("none");

  const reset = useCallback(() => {
    setOperation("exclusive-scan");
    setSmallInput([...DEFAULT_SMALL_INPUT]);
    setInputCount(1_000_003);
    setBlockSpan(512);
    setSeed(39);
    setSelectedPass(0);
    setSelectedIndex(0);
    setPaused(false);
    setCapturing(false);
    setBarrierChoice("shader-storage");
    setConsumer("compute-pass");
    setWorkgroupBarrierEnabled(true);
    setInjectedError("none");
  }, []);

  const input = useMemo(
    () => makeDeterministicInput(Math.min(inputCount, 4096), seed),
    [inputCount, seed],
  );
  const hierarchy = useMemo(() => makeHierarchy(inputCount, blockSpan), [blockSpan, inputCount]);
  const passLabels = useMemo(
    () => makePassLabels(operation, inputCount, blockSpan),
    [blockSpan, inputCount, operation],
  );
  const stepCount = useMemo(() => {
    if (mode === "workgroup-reduction") return workgroupReductionStages(smallInput).length;
    if (mode === "blelloch-scan") return blellochStages(smallInput).length;
    if (mode === "block-scan" || mode === "recursive-uniform-add") return 3;
    return Math.max(1, passLabels.length);
  }, [mode, passLabels.length, smallInput]);
  const smallScan = useMemo(() => {
    const output = cpuExclusiveScan(smallInput);
    if (injectedError === "offset") output[4] += 2;
    if (injectedError === "nan") output[2] = Number.NaN;
    if (injectedError === "tail") output[output.length - 1] += 1;
    return output;
  }, [injectedError, smallInput]);
  const scanReport = useMemo(
    () => validateExclusiveScan(smallInput, smallScan, 1e-6, 1e-6),
    [smallInput, smallScan],
  );
  const reductionReport = useMemo(() => validateReduction(input, cpuReduction(input)), [input]);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const tick = () => {
      setSelectedPass((current) => (current + 1) % stepCount);
      animationFrame.current = window.setTimeout(() => {
        animationFrame.current = requestAnimationFrame(tick);
      }, 850) as unknown as number;
    };
    animationFrame.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
        clearTimeout(animationFrame.current);
      }
      animationFrame.current = null;
    };
  }, [paused, reducedMotion, stepCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    if (mode === "reduction-scan-contract") {
      drawContract(context, size.width, smallInput, selectedIndex, operation);
    } else if (mode === "workgroup-reduction") {
      drawReductionStage(
        context,
        size.width,
        selectedPass,
        selectedIndex,
        smallInput,
        workgroupBarrierEnabled,
      );
    } else if (mode === "blelloch-scan") {
      drawBlelloch(context, size.width, selectedPass, selectedIndex, smallInput);
    } else if (mode === "block-scan") {
      drawBlockScan(context, size.width, selectedPass, false);
    } else if (mode === "recursive-uniform-add") {
      drawBlockScan(context, size.width, selectedPass, true);
    } else if (mode === "pass-barriers") {
      drawBarriers(context, size.width, barrierChoice, consumer);
    } else if (mode === "scan-validation") {
      drawHeading(context, `validation ${scanReport.passed ? "PASS" : "FAIL"}`);
      drawValues(context, smallInput, 60, size.width, selectedIndex, "#61afef", "input");
      drawValues(
        context,
        smallScan,
        150,
        size.width,
        selectedIndex,
        scanReport.passed ? "#98c379" : "#e06c75",
        "actual exclusive scan",
      );
    } else {
      drawHierarchy(context, size.width, inputCount, operation, selectedPass, blockSpan);
    }
  }, [
    barrierChoice,
    blockSpan,
    consumer,
    inputCount,
    mode,
    operation,
    scanReport.passed,
    smallInput,
    selectedIndex,
    selectedPass,
    size,
    smallScan,
    workgroupBarrierEnabled,
  ]);

  const updateFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const point = canvasPoint(event, event.currentTarget);
      const ratio = Math.max(0, Math.min(0.999, point.x / size.width));
      setSelectedIndex(Math.floor(ratio * smallInput.length));
      setSelectedPass(Math.floor(ratio * stepCount));
    },
    [size.width, smallInput.length, stepCount],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setCapturing(true);
      updateFromPointer(event);
    },
    [updateFromPointer],
  );

  const releasePointer = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      activePointer.current === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointer.current = null;
    setCapturing(false);
  }, []);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedPass((current) => (current + 1) % stepCount);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedPass((current) => (current - 1 + stepCount) % stepCount);
      }
      if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
      if (event.key.toLowerCase() === "r") reset();
      if (event.key.toLowerCase() === "o") {
        setOperation((current) => (current === "reduction" ? "exclusive-scan" : "reduction"));
      }
      const presetIndex = Number(event.key) - 1;
      if (presetIndex >= 0 && presetIndex < COUNT_PRESETS.length) {
        setInputCount(COUNT_PRESETS[presetIndex]);
        setSelectedPass(0);
      }
    },
    [reset, stepCount],
  );

  const barrier = barrierMessage("compute-pass", consumer, barrierChoice);
  const timing = modelGpuMilliseconds(operation, inputCount, blockSpan);
  const padding = hierarchy[0]?.zeroPadding ?? 0;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng Canvas 2D về hierarchical reduction, Blelloch exclusive prefix sum, shared memory, barrier và uniform add"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) updateFromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        <label>
          Operation
          <select
            value={operation}
            onChange={(event) => setOperation(event.target.value as ReductionScanOperation)}
          >
            <option value="reduction">Reduction</option>
            <option value="exclusive-scan">Exclusive Scan</option>
            {mode === "reduction-scan-contract" && (
              <option value="inclusive-scan">Inclusive Scan (để so sánh)</option>
            )}
          </select>
        </label>
        {mode === "reduction-scan-contract" &&
          smallInput.map((value, index) => (
            <label key={index}>
              Input {index}
              <input
                aria-label={`Input ${index}`}
                type="number"
                min={-99}
                max={99}
                step={1}
                value={value}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setSmallInput((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index && Number.isFinite(nextValue) ? nextValue : item,
                    ),
                  );
                }}
              />
            </label>
          ))}
        <label>
          Element count
          <select
            value={inputCount}
            onChange={(event) => {
              setInputCount(Number(event.target.value));
              setSelectedPass(0);
            }}
          >
            {COUNT_PRESETS.map((count) => (
              <option key={count} value={count}>
                {count.toLocaleString("vi-VN")}
              </option>
            ))}
          </select>
        </label>
        {mode === "hierarchy-plan" && (
          <label>
            Block span
            <select
              value={blockSpan}
              onChange={(event) => {
                setBlockSpan(Number(event.target.value));
                setSelectedPass(0);
              }}
            >
              <option value={128}>128</option>
              <option value={256}>256</option>
              <option value={512}>512 (source C++)</option>
            </select>
          </label>
        )}
        <label>
          Seed: {seed}
          <input
            type="range"
            min={1}
            max={99}
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value))}
          />
        </label>
        {mode === "workgroup-reduction" && (
          <label>
            Workgroup barrier
            <select
              value={workgroupBarrierEnabled ? "enabled" : "missing"}
              onChange={(event) => setWorkgroupBarrierEnabled(event.target.value === "enabled")}
            >
              <option value="enabled">Bật barrier</option>
              <option value="missing">Bỏ barrier (mô hình stale read)</option>
            </select>
          </label>
        )}
        {mode === "pass-barriers" && (
          <>
            <label>
              Consumer
              <select
                value={consumer}
                onChange={(event) => setConsumer(event.target.value as typeof consumer)}
              >
                <option value="compute-pass">Compute pass</option>
                <option value="readback">CPU readback</option>
              </select>
            </label>
            <label>
              Barrier
              <select
                value={barrierChoice}
                onChange={(event) => setBarrierChoice(event.target.value as BarrierChoice)}
              >
                <option value="shader-storage">SHADER_STORAGE</option>
                <option value="buffer-update">BUFFER_UPDATE</option>
                <option value="none">Bỏ barrier</option>
              </select>
            </label>
          </>
        )}
        {mode === "scan-validation" && (
          <label>
            Lỗi cố ý
            <select
              value={injectedError}
              onChange={(event) => setInjectedError(event.target.value as typeof injectedError)}
            >
              <option value="none">Không lỗi</option>
              <option value="offset">Sai block offset</option>
              <option value="nan">NaN</option>
              <option value="tail">Sai phần đuôi</option>
            </select>
          </label>
        )}
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => setSelectedPass((current) => (current + 1) % stepCount)}
        >
          Bước một pass
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Hierarchy",
            value: `${inputCount.toLocaleString("vi-VN")} → ${hierarchy.map((level) => level.blockCount.toLocaleString("vi-VN")).join(" → ")} · ${padding} zero padding`,
          },
          {
            label: "Chuỗi compute pass",
            value: `${passLabels.length} dispatch · bước minh họa ${selectedPass + 1}/${stepCount} · ${passLabels[Math.min(selectedPass, passLabels.length - 1)] ?? "empty"}`,
          },
          ...(mode === "pass-barriers"
            ? [
                {
                  label: "Barrier cần dùng",
                  value: `${barrier.passed ? "PASS" : "FAIL"} · ${barrier.message}`,
                },
              ]
            : []),
          ...(mode === "scan-validation" || mode === "reduction-scan-final"
            ? [
                {
                  label: "Kết quả kiểm tra",
                  value: `${scanReport.passed && reductionReport.passed ? "PASS" : "FAIL"} · first mismatch ${scanReport.firstMismatch ?? "none"} · max error ${scanReport.maximumAbsoluteError.toExponential(2)}`,
                },
              ]
            : []),
          {
            label: "Mô hình đo thời gian",
            value: `${timing.toFixed(3)} ms cho ${passLabels.length} pass · Canvas 2D không phải phép đo GPU`,
          },
          {
            label: "Mô tả thay thế",
            value: `Canvas đang mô hình hóa ${operation} với block span ${blockSpan}. Source C++ dùng block span 512; pointer ${capturing ? "đang capture" : "đã nhả"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo ngang hoặc dùng ←/→ để chọn bước. O đổi operation, 1–4 đổi count, Space pause, R reset.
        Reduced motion luôn dừng autoplay.
      </p>
    </>
  );
}
