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
  GRAVITY,
  LARGE_GPU,
  LIMITED_GPU,
  barrierStatus,
  chooseLargestSupportedCount,
  makeDispatchPlan,
  makeInitialParticle,
  makeSpawnParticle,
  median,
  modelParticleGpuTimes,
  particleStorageBytes,
  queryRingSnapshot,
  selectSimulationDt,
  stepParticle,
  validateCapabilities,
  validateFiveMillionParticleContract,
  validateParticles,
  type BarrierChoice,
  type ParticleCapabilities,
} from "@/lib/labs/five-million-particle-fountain";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const MONO = "12px ui-monospace, SFMono-Regular, Consolas, monospace";

function drawTitle(context: CanvasRenderingContext2D, text: string) {
  context.fillStyle = "#d7deec";
  context.font = MONO;
  context.fillText(text, 22, 24);
}

function drawFountain(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: number,
  seed: number,
  spreadAges: boolean,
  selectedIndex: number,
  gravity: number,
) {
  const sampleCount = Math.max(180, Math.min(620, Math.floor(width * 0.72)));
  const scale = Math.min(width / 18, height / 13);
  const originX = width * 0.5;
  const floorY = height * 0.86;
  context.strokeStyle = "#263653";
  context.beginPath();
  context.moveTo(20, floorY);
  context.lineTo(width - 20, floorY);
  context.stroke();

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const index = sample * 7919 + (selectedIndex % 997);
    const spawn = makeSpawnParticle(index, seed, seed);
    let age = phase / 60;
    if (spreadAges) age += makeInitialParticle(index, seed).positionAge.w;
    age %= spawn.velocityLife.w;
    const x = spawn.positionAge.x + spawn.velocityLife.x * age;
    const y = spawn.velocityLife.y * age + 0.5 * gravity * age * age;
    const age01 = age / spawn.velocityLife.w;
    const screenX = originX + x * scale;
    const screenY = floorY - y * scale;
    if (screenX < 0 || screenX > width || screenY < 0 || screenY > height) continue;
    const red = Math.round(40 + (235 - 40) * (1 - age01));
    const green = Math.round(130 + (195 - 130) * (1 - age01));
    const blue = Math.round(240 - 75 * (1 - age01));
    context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.18 + (1 - age01) * 0.58})`;
    context.beginPath();
    context.arc(screenX, screenY, 1.2 + (1 - age01) * 1.3, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#e5c07b";
  context.fillRect(originX - 18, floorY - 4, 36, 8);
}

function drawBudget(
  context: CanvasRenderingContext2D,
  width: number,
  particleCount: number,
  limits: ParticleCapabilities,
) {
  const requested = particleStorageBytes(particleCount);
  const available = limits.maximumShaderStorageBlockBytes;
  const maximum = Math.max(requested, available);
  const rows = [
    { label: "Particle SSBO cần", value: requested, color: "#61afef" },
    { label: "GL_MAX block", value: available, color: "#98c379" },
  ];
  rows.forEach((row, index) => {
    const y = 84 + index * 86;
    context.fillStyle = "#aebbd2";
    context.font = MONO;
    context.fillText(`${row.label} · ${(row.value / 1024 / 1024).toFixed(1)} MiB`, 24, y - 12);
    context.fillStyle = "#202d46";
    context.fillRect(24, y, width - 48, 38);
    context.fillStyle = row.color;
    context.fillRect(24, y, ((width - 48) * row.value) / maximum, 38);
  });
}

function drawWorkgroups(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  particleCount: number,
  selectedIndex: number,
) {
  const plan = makeDispatchPlan(particleCount);
  const lastGroupStart = (plan.workgroupCount - 1) * plan.localSize;
  const columns = 32;
  const rows = 8;
  const cell = Math.max(5, Math.min(18, (width - 46) / columns, (height - 74) / rows));
  const left = (width - columns * cell) * 0.5;
  const top = 48;
  const selectedLane = selectedIndex % 256;
  for (let lane = 0; lane < 256; lane += 1) {
    const globalIndex = lastGroupStart + lane;
    const valid = globalIndex < particleCount;
    const x = left + (lane % columns) * cell;
    const y = top + Math.floor(lane / columns) * cell;
    context.fillStyle = valid ? "#61afef" : "#e06c75";
    context.globalAlpha = lane === selectedLane ? 1 : 0.48;
    context.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    if (lane === selectedLane) {
      context.strokeStyle = "#ffffff";
      context.strokeRect(x, y, cell, cell);
    }
  }
  context.globalAlpha = 1;
  context.fillStyle = "#aebbd2";
  context.font = MONO;
  context.fillText("xanh: cập nhật particle[index] · đỏ: bounds guard return", 22, height - 18);
}

function drawRenderMapping(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  selectedIndex: number,
) {
  const stages = [
    `gl_VertexID = ${selectedIndex}`,
    `particles[${selectedIndex}]`,
    "world ÷ halfExtent",
    "GL_POINTS sprite",
  ];
  const gap = 14;
  const boxWidth = (width - 44 - gap * 3) / 4;
  const y = height * 0.36;
  stages.forEach((stage, index) => {
    const x = 22 + index * (boxWidth + gap);
    context.fillStyle = ["#61afef", "#c678dd", "#e5c07b", "#98c379"][index];
    context.globalAlpha = 0.82;
    context.fillRect(x, y, boxWidth, 74);
    context.globalAlpha = 1;
    context.fillStyle = "#0b1020";
    context.font = MONO;
    context.fillText(stage, x + 7, y + 40, boxWidth - 12);
  });
}

function drawBarrier(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  choice: BarrierChoice,
) {
  const state = barrierStatus(choice);
  const stages = ["Compute ghi SSBO", choice, "Vertex đọc SSBO", "Draw points"];
  const gap = 13;
  const boxWidth = (width - 44 - gap * 3) / 4;
  const y = height * 0.37;
  stages.forEach((stage, index) => {
    const x = 22 + index * (boxWidth + gap);
    context.fillStyle = index === 1 && !state.visible ? "#e06c75" : "#61afef";
    if (index === 1 && state.visible) context.fillStyle = "#98c379";
    context.fillRect(x, y, boxWidth, 70);
    context.fillStyle = "#0b1020";
    context.font = MONO;
    context.fillText(stage, x + 7, y + 39, boxWidth - 12);
  });
}

function drawQueryRing(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  latency: number,
) {
  const slots = queryRingSnapshot(frame, latency);
  const radius = Math.min(66, width * 0.11);
  const centerX = width * 0.5;
  const centerY = height * 0.52;
  slots.forEach((slot, index) => {
    const angle = -Math.PI * 0.5 + (index * Math.PI * 2) / slots.length;
    const x = centerX + Math.cos(angle) * radius * 1.55;
    const y = centerY + Math.sin(angle) * radius;
    context.fillStyle = slot.pending ? "#e5c07b" : "#98c379";
    if (slot.submittedFrame < 0) context.fillStyle = "#3b4760";
    context.beginPath();
    context.arc(x, y, 30, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#0b1020";
    context.font = MONO;
    context.textAlign = "center";
    context.fillText(`slot ${slot.slot}`, x, y - 2);
    context.fillText(slot.pending ? "pending" : "available", x, y + 14);
  });
  context.textAlign = "left";
}

export default function FiveMillionParticleFountainLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrame = useRef<number | null>(null);
  const activePointer = useRef<number | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState<number>(5_000_000);
  const [limits, setLimits] = useState<ParticleCapabilities>(LARGE_GPU);
  const [barrierChoice, setBarrierChoice] = useState<BarrierChoice>("shader-storage");
  const [rawDt, setRawDt] = useState(1 / 60);
  const [gravity, setGravity] = useState(GRAVITY);
  const [paused, setPaused] = useState(false);
  const [lastStepWasManual, setLastStepWasManual] = useState(false);
  const [spreadAges, setSpreadAges] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(37);
  const [seed, setSeed] = useState(38);
  const [latency, setLatency] = useState(2);
  const [phase, setPhase] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [injectedError, setInjectedError] = useState<"none" | "gravity" | "respawn" | "nan">(
    "none",
  );

  const showBudget = mode === "particle-budget";
  const showCompute = mode === "particle-compute";
  const showRender = mode === "particle-render";
  const showBarrier = mode === "compute-draw-barrier";
  const showTiming = mode === "particle-timing";

  const reset = useCallback(() => {
    setParticleCount(5_000_000);
    setLimits(LARGE_GPU);
    setBarrierChoice("shader-storage");
    setRawDt(1 / 60);
    setGravity(GRAVITY);
    setPaused(false);
    setLastStepWasManual(false);
    setSpreadAges(true);
    setSelectedIndex(37);
    setSeed(38);
    setLatency(2);
    setPhase(0);
    setCapturing(false);
    setInjectedError("none");
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const tick = () => {
      setPhase((current) => (current + 1) % 100_000);
      animationFrame.current = requestAnimationFrame(tick);
    };
    animationFrame.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [paused, reducedMotion]);

  const plan = useMemo(() => makeDispatchPlan(particleCount), [particleCount]);
  const capability = useMemo(() => validateCapabilities(limits, plan), [limits, plan]);
  const fallbackCount = chooseLargestSupportedCount(limits);
  const selectedParticle = useMemo(
    () => makeInitialParticle(selectedIndex, seed),
    [seed, selectedIndex],
  );
  const expected = useMemo(
    () =>
      stepParticle(
        selectedParticle,
        selectedIndex,
        1 / 120,
        mode === "particle-contract" ? gravity : GRAVITY,
        17,
      ),
    [gravity, mode, selectedIndex, selectedParticle],
  );
  const actual = useMemo(() => {
    const value = structuredClone(expected);
    if (injectedError === "gravity") value.velocityLife.y += 0.2;
    if (injectedError === "respawn") value.positionAge.w = value.velocityLife.w + 1;
    if (injectedError === "nan") value.positionAge.x = Number.NaN;
    return value;
  }, [expected, injectedError]);
  const probe = validateParticles([expected], [actual]);
  const selectedDt = selectSimulationDt(rawDt, paused, lastStepWasManual);
  const timingSamples = Array.from({ length: 9 }, (_, index) =>
    modelParticleGpuTimes(particleCount, index + phase),
  );
  const computeMedian = median(timingSamples.map((sample) => sample.compute));
  const drawMedian = median(timingSamples.map((sample) => sample.draw));
  const namedContract = validateFiveMillionParticleContract();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    if (showBudget) {
      drawTitle(context, "Byte budget phải được kiểm trước allocation");
      drawBudget(context, size.width, particleCount, limits);
    } else if (showCompute) {
      drawTitle(context, "Workgroup cuối · lane đỏ return trước SSBO access");
      drawWorkgroups(context, size.width, size.height, particleCount, selectedIndex);
    } else if (showRender) {
      drawTitle(context, "Không có VBO copy: draw ID chính là particle index");
      drawRenderMapping(context, size.width, size.height, selectedIndex);
    } else if (showBarrier) {
      drawTitle(context, "Barrier được chọn từ consumer là vertex shader");
      drawBarrier(context, size.width, size.height, barrierChoice);
    } else if (showTiming) {
      drawTitle(context, "Bốn query slot · chỉ đọc result đã available");
      drawQueryRing(context, size.width, size.height, phase, latency);
    } else {
      drawTitle(context, "Mẫu Canvas 2D của GPU-resident particle fountain");
      drawFountain(
        context,
        size.width,
        size.height,
        phase,
        seed,
        spreadAges,
        selectedIndex,
        gravity,
      );
    }
  }, [
    barrierChoice,
    gravity,
    latency,
    limits,
    particleCount,
    phase,
    seed,
    selectedIndex,
    showBarrier,
    showBudget,
    showCompute,
    showRender,
    showTiming,
    size,
    spreadAges,
  ]);

  const updateFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPoint(event, canvas);
    const fraction = Math.max(0, Math.min(0.999999, point.x / size.width));
    setSelectedIndex(Math.floor(fraction * particleCount));
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
    if (event.key.toLowerCase() === "n") {
      setPhase((current) => current + 1);
      setLastStepWasManual(true);
    }
    if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
      setLastStepWasManual(false);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setSelectedIndex((current) => Math.max(0, Math.min(particleCount - 1, current + direction)));
    }
    const preset = Number(event.key) - 1;
    if (preset >= 0 && preset < COUNT_PRESETS.length) setParticleCount(COUNT_PRESETS[preset]);
  };

  const failedCapabilities = Object.entries(capability)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const barrier = barrierStatus(barrierChoice);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng Canvas 2D về particle lifecycle, SSBO, compute update, vertex shader, memory barrier, timer query và validation probe"
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
          Particle count
          <select
            value={particleCount}
            onChange={(event) => {
              const count = Number(event.target.value);
              setParticleCount(count);
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
        {(showBudget || mode === "particle-fountain-final") && (
          <label>
            Capability
            <select
              value={limits === LARGE_GPU ? "large" : "limited"}
              onChange={(event) =>
                setLimits(event.target.value === "large" ? LARGE_GPU : LIMITED_GPU)
              }
            >
              <option value="large">256 MiB SSBO</option>
              <option value="limited">64 MiB SSBO</option>
            </select>
          </label>
        )}
        {showBarrier && (
          <label>
            Barrier
            <select
              value={barrierChoice}
              onChange={(event) => setBarrierChoice(event.target.value as BarrierChoice)}
            >
              <option value="shader-storage">SHADER_STORAGE</option>
              <option value="buffer-update">BUFFER_UPDATE (sai consumer)</option>
              <option value="missing">Bỏ barrier</option>
            </select>
          </label>
        )}
        {(mode === "particle-contract" || mode === "particle-time-control") && (
          <label>
            Raw dt: {(rawDt * 1000).toFixed(1)} ms
            <input
              type="range"
              min={1}
              max={200}
              value={Math.round(rawDt * 1000)}
              onChange={(event) => {
                setRawDt(Number(event.target.value) / 1000);
                setLastStepWasManual(false);
              }}
            />
          </label>
        )}
        {mode === "particle-contract" && (
          <label>
            Gravity: {gravity.toFixed(1)}
            <input
              type="range"
              min={-20}
              max={0}
              step={0.5}
              value={gravity}
              onChange={(event) => setGravity(Number(event.target.value))}
            />
          </label>
        )}
        {mode === "particle-initialization" && (
          <>
            <label>
              Seed: {seed}
              <input
                type="range"
                min={1}
                max={100}
                value={seed}
                onChange={(event) => setSeed(Number(event.target.value))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={spreadAges}
                onChange={(event) => setSpreadAges(event.target.checked)}
              />
              Trải age ban đầu
            </label>
          </>
        )}
        {showTiming && (
          <label>
            Query latency: {latency} frame
            <input
              type="range"
              min={1}
              max={6}
              value={latency}
              onChange={(event) => setLatency(Number(event.target.value))}
            />
          </label>
        )}
        {mode === "particle-probe" && (
          <label>
            Lỗi cố ý
            <select
              value={injectedError}
              onChange={(event) => setInjectedError(event.target.value as typeof injectedError)}
            >
              <option value="none">Không lỗi</option>
              <option value="gravity">Sai gravity step</option>
              <option value="respawn">Bỏ qua respawn</option>
              <option value="nan">NaN trong position</option>
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={() => {
            setPaused((current) => !current);
            setLastStepWasManual(false);
          }}
        >
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPhase((current) => current + 1);
            setLastStepWasManual(true);
          }}
        >
          Bước một frame
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Dispatch",
            value: `${plan.workgroupCount.toLocaleString("vi-VN")} groups × 256 = ${plan.launchedInvocations.toLocaleString("vi-VN")} lanes · ${plan.unusedInvocations} lane dư`,
          },
          {
            label: "Storage",
            value: `${particleStorageBytes(particleCount).toLocaleString("vi-VN")} byte · ${(particleStorageBytes(particleCount) / 1024 / 1024).toFixed(1)} MiB · fallback ${fallbackCount.toLocaleString("vi-VN")}`,
          },
          ...(showBudget
            ? [
                {
                  label: "Capability report",
                  value:
                    failedCapabilities.length === 0
                      ? "PASS · allocation được phép"
                      : `FAIL · ${failedCapabilities.join(", ")}`,
                },
              ]
            : []),
          ...(showBarrier
            ? [
                {
                  label: "Compute → vertex visibility",
                  value: barrier.visible
                    ? "PASS · vertex shader thấy compute writes"
                    : "STALE/UNDEFINED · thí nghiệm lỗi",
                },
              ]
            : []),
          ...(mode === "particle-contract" || mode === "particle-time-control"
            ? [
                {
                  label: "Simulation dt",
                  value: `${(selectedDt * 1000).toFixed(3)} ms · raw ${(rawDt * 1000).toFixed(1)} ms · ${paused ? "paused" : "running"}`,
                },
              ]
            : []),
          ...(showTiming || mode === "particle-fountain-final"
            ? [
                {
                  label: "Mô hình đo thời gian",
                  value: `compute median ${computeMedian.toFixed(3)} ms · draw median ${drawMedian.toFixed(3)} ms · đây không phải benchmark trình duyệt`,
                },
              ]
            : []),
          ...(mode === "particle-probe" || mode === "particle-fountain-final"
            ? [
                {
                  label: "64-particle probe",
                  value: `${probe.allFinite && probe.mismatchCount === 0 ? "PASS" : "FAIL"} · mismatch ${probe.mismatchCount} · max error ${probe.maximumAbsoluteError.toExponential(2)}`,
                },
                {
                  label: "Các điều kiện cần đạt",
                  value: `${Object.values(namedContract).filter(Boolean).length}/${Object.keys(namedContract).length} checks đạt`,
                },
              ]
            : []),
          {
            label: "Mô tả thay thế",
            value: `Canvas đang vẽ một mẫu nhỏ để giải thích pipeline ${particleCount.toLocaleString("vi-VN")} particle. Source C++ mới chạy GPU thật; Canvas 2D không phải phép đo GPU. Pointer ${capturing ? "đang capture" : "đã nhả"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo ngang hoặc dùng phím mũi tên để chọn particle/lane. Phím 1–4 đổi count, Space pause, N
        bước một frame, R reset. Reduced motion luôn dừng animation tự động.
      </p>
    </>
  );
}
