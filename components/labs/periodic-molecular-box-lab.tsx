"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  add,
  ballisticStep,
  evaluate,
  fixedStepPlan,
  kineticEnergy,
  length,
  makeFreeParticle,
  makeGas,
  makePair,
  minimumImage,
  momentum,
  subtract,
  validParameters,
  validateRun,
  verletStep,
  wrapPosition,
  type System,
} from "@/lib/labs/periodic-molecular-box";
import {
  drawPeriodicScene,
  makeViewport,
  screenToWorld,
  worldToScreen,
  type TraceSample,
} from "./periodic-molecular-box-render";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";

function initialSystem(mode: string) {
  if (mode === "pbc-wrap" || mode === "pbc-unwrapped") return makeFreeParticle();
  if (mode === "pbc-verlet" || mode === "pbc-final") return makeGas(64);
  return makePair();
}

function PeriodicLab({ mode }: { mode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [initial] = useState(() => initialSystem(mode));
  const systemRef = useRef(initial);
  const [system, setSystem] = useState<System>(() => structuredClone(initial));
  const [paused, setPaused] = useState(true);
  const [dt, setDt] = useState(0.001);
  const [images, setImages] = useState(mode === "pbc-images" || mode === "pbc-final");
  const [error, setError] = useState("");
  const [droppedTime, setDroppedTime] = useState(0);
  const [trace, setTrace] = useState<TraceSample[]>([]);
  const [report, setReport] = useState<ReturnType<typeof validateRun> | null>(null);
  const [baseline, setBaseline] = useState(
    () => kineticEnergy(initial) + evaluate(initial).potential,
  );
  const accumulator = useRef(0);
  const nextTraceTime = useRef(0);
  const pointerId = useRef<number | null>(null);
  const canMove = mode !== "pbc-box";
  const dynamics = ["pbc-verlet", "pbc-images", "pbc-unwrapped", "pbc-final"].includes(mode);
  const showDistance = !["pbc-box", "pbc-wrap"].includes(mode);
  const showForces = [
    "pbc-forces",
    "pbc-verlet",
    "pbc-images",
    "pbc-unwrapped",
    "pbc-final",
  ].includes(mode);
  const showImages = ["pbc-images", "pbc-unwrapped", "pbc-final"].includes(mode);
  const showTrace = mode === "pbc-unwrapped" || mode === "pbc-final";
  const showValidation = mode === "pbc-final";
  const force = useMemo(() => evaluate(system), [system]);
  const particle = system.particles[0];
  const rawDelta =
    system.particles.length === 2
      ? subtract(system.particles[1].position, particle.position)
      : null;
  const shortDelta = rawDelta ? minimumImage(rawDelta, system.box) : null;
  const viewport = makeViewport(size.width, size.height, showTrace);

  const publish = useCallback(() => {
    setSystem(structuredClone(systemRef.current));
  }, []);

  const rebuild = useCallback(
    (next: System) => {
      systemRef.current = next;
      accumulator.current = 0;
      nextTraceTime.current = next.elapsed;
      setPaused(true);
      setError("");
      setTrace([]);
      setReport(null);
      setDroppedTime(0);
      setBaseline(kineticEnergy(next) + evaluate(next).potential);
      publish();
    },
    [publish],
  );

  const reset = useCallback(() => {
    setDt(0.001);
    setImages(mode === "pbc-images" || mode === "pbc-final");
    rebuild(initialSystem(mode));
  }, [mode, rebuild]);

  const advance = useCallback(
    (steps: number) => {
      const current = systemRef.current;
      for (let step = 0; step < steps; step += 1) {
        if (dynamics) {
          if (!verletStep(current, dt)) {
            setError(
              "Không nhận bước mới: kiểm tra cutoff, khoảng cách hai hạt và dt. Trạng thái trước bước được giữ lại.",
            );
            setPaused(true);
            accumulator.current = 0;
            break;
          }
        } else {
          for (const p of current.particles) ballisticStep(p, current.box, dt);
          current.elapsed += dt;
        }
        if (showTrace && current.elapsed >= nextTraceTime.current) {
          const sample = {
            time: current.elapsed,
            wrappedX: current.particles[0].position.x,
            unwrappedX: current.particles[0].unwrapped.x,
          };
          setTrace((previous) => [...previous, sample].slice(-240));
          nextTraceTime.current = current.elapsed + 0.01;
        }
      }
      publish();
    },
    [dt, dynamics, publish, showTrace],
  );

  useEffect(() => {
    if (!reducedMotion) return;
    const frame = requestAnimationFrame(() => setPaused(true));
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  useEffect(() => {
    if (paused || !canMove) return;
    let handle = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const budget = systemRef.current.particles.length >= 1000 ? 1 : 8;
      const plan = fixedStepPlan(accumulator.current, (now - previous) / 1000, dt, budget);
      previous = now;
      accumulator.current = plan.remainder;
      setDroppedTime((value) => value + plan.droppedTime);
      if (plan.steps) advance(plan.steps);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [advance, canMove, dt, paused]);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    setupCanvas(context, size);
    drawPeriodicScene(context, size, system, {
      images: showImages && images,
      distances: showDistance,
      forces: showForces ? force : undefined,
      trace,
      showTrace,
    });
  }, [force, images, showDistance, showForces, showImages, showTrace, size, system, trace]);

  const moveParticle = (position: { x: number; y: number }) => {
    const next = structuredClone(systemRef.current);
    next.particles[0].position = wrapPosition(position, next.box);
    next.particles[0].unwrapped = { ...next.particles[0].position };
    next.particles[0].velocity = { x: 0, y: 0 };
    rebuild(next);
  };

  const drag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointerId.current !== event.pointerId) return;
    moveParticle(
      screenToWorld(canvasPoint(event, event.currentTarget), systemRef.current, viewport),
    );
  };
  const release = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    pointerId.current = null;
  };
  const keyboard = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && showDistance) {
      event.preventDefault();
      const delta = { x: 0, y: 0 };
      if (event.key === "ArrowLeft") delta.x = -0.1;
      if (event.key === "ArrowRight") delta.x = 0.1;
      if (event.key === "ArrowUp") delta.y = -0.1;
      if (event.key === "ArrowDown") delta.y = 0.1;
      moveParticle(add(systemRef.current.particles[0].position, delta));
    } else if (event.code === "Space" && canMove) {
      event.preventDefault();
      setPaused((value) => !value);
    } else if (event.key.toLowerCase() === "r") reset();
    else if (event.key.toLowerCase() === "n" && canMove) {
      setPaused(true);
      advance(1);
    }
  };

  return (
    <div className="lab-body">
      <div className="lab-toolbar">
        <button type="button" onClick={() => setPaused((value) => !value)} disabled={!canMove}>
          {paused ? "Chạy" : "Tạm dừng"}
        </button>
        <button
          type="button"
          disabled={!canMove}
          onClick={() => {
            setPaused(true);
            advance(1);
          }}
        >
          Tiến một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {mode !== "pbc-box" && (
          <label>
            Preset{" "}
            <select
              aria-label="Preset hộp tuần hoàn"
              value={system.particles.length}
              onChange={(event) => {
                const count = Number(event.target.value);
                rebuild(
                  count === 1 ? makeFreeParticle() : count === 2 ? makePair() : makeGas(count),
                );
              }}
            >
              <option value={1}>Một hạt đi qua biên</option>
              <option value={2}>Hai hạt ở hai mép</option>
              {dynamics && (
                <>
                  <option value={64}>64 hạt</option>
                  <option value={144}>144 hạt</option>
                  <option value={1000}>1.000 hạt</option>
                </>
              )}
            </select>
          </label>
        )}
        {dynamics && (
          <label>
            dt{" "}
            <select
              aria-label="Bước thời gian"
              value={dt}
              onChange={(event) => {
                setDt(Number(event.target.value));
                rebuild(structuredClone(systemRef.current));
              }}
            >
              <option value={0.001}>0.001</option>
              <option value={0.002}>0.002</option>
              <option value={0.004}>0.004</option>
              <option value={0.008}>0.008</option>
            </select>
          </label>
        )}
        {showForces && (
          <label>
            Cutoff{" "}
            <select
              aria-label="Cutoff tương tác"
              value={system.parameters.cutoff}
              onChange={(event) => {
                const next = structuredClone(systemRef.current);
                next.parameters.cutoff = Number(event.target.value);
                rebuild(next);
              }}
            >
              <option value={1.8}>1.8</option>
              <option value={2.5}>2.5</option>
              <option value={Math.min(system.box.width, system.box.height) / 2}>
                Nửa cạnh ngắn nhất — không hợp lệ
              </option>
            </select>
          </label>
        )}
        {showImages && (
          <label>
            <input
              type="checkbox"
              checked={images}
              onChange={(event) => setImages(event.target.checked)}
            />{" "}
            Hiện bản sao tuần hoàn
          </label>
        )}
        {showValidation && (
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              setReport(validateRun());
            }}
          >
            Kiểm chứng 400 bước
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ touchAction: "none" }}
        tabIndex={0}
        aria-label="Hộp tuần hoàn: Tab để chọn; các phím mũi tên di chuyển hạt A; Space chạy hoặc dừng; N tiến một bước; R đặt lại."
        onKeyDown={keyboard}
        onPointerDown={(event) => {
          if (!showDistance || event.button !== 0) return;
          const pointer = canvasPoint(event, event.currentTarget);
          const a = worldToScreen(
            systemRef.current.particles[0].position,
            systemRef.current,
            viewport,
          );
          if (Math.hypot(pointer.x - a.x, pointer.y - a.y) > 24) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          pointerId.current = event.pointerId;
          setPaused(true);
        }}
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={() => {
          pointerId.current = null;
        }}
      >
        Các hạt được lưu trong ô gốc. Bản sao màu xám chỉ minh họa các ô bên cạnh; số hạt vật lý
        không tăng.
      </canvas>
      <LabReadout
        items={[
          {
            label: "Số hạt thật / t",
            value: `${system.particles.length} / ${system.elapsed.toFixed(3)}`,
          },
          {
            label: "A trong ô gốc",
            value: `(${particle.position.x.toFixed(3)}, ${particle.position.y.toFixed(3)})`,
          },
          ...(showDistance && rawDelta && shortDelta
            ? [
                {
                  label: "Khoảng cách thường / tuần hoàn",
                  value: `${length(rawDelta).toFixed(3)} / ${length(shortDelta).toFixed(3)}`,
                },
              ]
            : []),
          ...(showForces
            ? [
                {
                  label: "Cặp xét / có lực",
                  value: force.valid
                    ? `${force.evaluatedPairs} / ${force.activePairs}`
                    : "Không tính — cấu hình lỗi",
                },
                {
                  label: "rc / nửa cạnh ngắn nhất",
                  value: `${system.parameters.cutoff} / ${Math.min(system.box.width, system.box.height) / 2}`,
                },
              ]
            : []),
          ...(dynamics
            ? [
                {
                  label: "E / |P|",
                  value: force.valid
                    ? `${(kineticEnergy(system) + force.potential).toFixed(5)} / ${length(momentum(system)).toExponential(2)}`
                    : "Không tính — cấu hình lỗi",
                },
                {
                  label: "Độ lệch E chuẩn hóa",
                  value: force.valid
                    ? `${((Math.abs(kineticEnergy(system) + force.potential - baseline) / Math.max(1, Math.abs(baseline))) * 100).toFixed(4)}%`
                    : "—",
                },
                { label: "Thời gian bỏ qua do guard", value: droppedTime.toFixed(4) },
              ]
            : []),
          ...(showTrace
            ? [
                {
                  label: "A unwrapped",
                  value: `(${particle.unwrapped.x.toFixed(3)}, ${particle.unwrapped.y.toFixed(3)})`,
                },
              ]
            : []),
        ]}
      />
      <p>
        {mode === "pbc-box"
          ? "Hộp và hai marker đang đứng yên. Chưa có wrap hay tích phân ở bài này."
          : !dynamics
            ? "Đang thử chuyển động thẳng: position tăng theo velocity × dt rồi được wrap. Chưa dùng lực để đổi vận tốc."
            : "Playback chậm: 0,1 đơn vị mô phỏng mỗi giây thực. Solver tối đa 8 bước/frame, hoặc 1 bước ở 1.000 hạt; thời gian không theo kịp được ghi rõ ở trên."}
      </p>
      {showDistance && (
        <p>
          Vàng là vector minimum image; xám là phép trừ vị trí thông thường. Chọn preset hai hạt để
          so hai vector.
        </p>
      )}
      {showDistance && (
        <p>
          Kéo hạt A màu vàng hoặc chọn Canvas rồi dùng các phím mũi tên. Việc sửa vị trí sẽ dừng mô
          phỏng, đặt vận tốc A về 0 và tạo lại mốc đo năng lượng; đây không phải một bước vật lý.
        </p>
      )}
      {showImages && <p>Bản sao xám không có state riêng và không được đưa vào vòng lặp lực.</p>}
      {showForces && (error || !force.valid) && (
        <p role="alert">
          {error ||
            (!validParameters(system.parameters, system.box)
              ? "Cutoff phải nhỏ hơn nửa cạnh ngắn nhất của hộp. Chọn lại 1.8 hoặc 2.5 để tính lực."
              : "Hai hạt đang trùng hoặc quá gần nhau qua biên. Tách chúng ra hoặc đặt lại trước khi chạy.")}
        </p>
      )}
      {report && (
        <p role="status">
          {report.passed ? "Đạt" : "Chưa đạt"}: 36 hạt × 400 bước, sai số năng lượng lớn nhất{" "}
          {report.maximumEnergyError.toExponential(3)}, sai số động lượng{" "}
          {report.momentumError.toExponential(3)}. Các ca biên hình học được kiểm tra riêng trong
          CTest.
        </p>
      )}
    </div>
  );
}

export default function PeriodicMolecularBoxLab({ mode = "pbc-final" }: { mode?: string }) {
  return <PeriodicLab key={mode} mode={mode} />;
}
