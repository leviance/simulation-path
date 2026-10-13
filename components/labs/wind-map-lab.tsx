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
  advanceParticles,
  curl,
  derivativeX,
  derivativeY,
  divergence,
  dt,
  fromScreen,
  gradientError,
  initialScene,
  makeField,
  makeParticles,
  planSteps,
  populate,
  presets,
  scalarColor,
  toScreen,
  validateMap,
  world,
  type Layer,
  type Potential,
  type Preset,
  type Scene,
  type Vec2,
} from "@/lib/labs/wind-map";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";

const labels: Record<Preset, string> = {
  uniform: "Gió đều: (1; 0,25)",
  source: "Tỏa ra: (x; y)",
  sink: "Hút vào: (−x; −y)",
  rotation: "Xoay: (−y; x)",
  shear: "Trượt: (y; 0)",
  gradient: "Gradient của φ",
};
function initialLayer(stage: number): Layer {
  if (stage === 3 || stage === 6) return "potential";
  if (stage === 4) return "divergence";
  if (stage >= 5) return "curl";
  return "arrows";
}
function WindExperiment({ stage }: { stage: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion(),
    helpId = useId();
  const [scene, setScene] = useState(() => initialScene(stage));
  const [resolution, setResolution] = useState(33);
  const [layer, setLayer] = useState<Layer>(() => initialLayer(stage));
  const [cursor, setCursor] = useState<Vec2>({ x: 0, y: 0 });
  const [paused, setPaused] = useState(true),
    [fps, setFps] = useState(60);
  const [tick, setTick] = useState(0),
    [dropped, setDropped] = useState(0);
  const [report, setReport] = useState("Chưa chạy");
  const particles = useRef(makeParticles());
  const [snapshot, setSnapshot] = useState(() => makeParticles());
  const accumulator = useRef(0),
    pointer = useRef<number | null>(null);
  const field = useMemo(() => {
    const grid = makeField(resolution, 1 + ((resolution - 1) * 3) / 4);
    populate(grid, scene, stage);
    return grid;
  }, [resolution, scene, stage]);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    accumulator.current = 0;
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const resetTracers = () => {
    accumulator.current = 0;
    setPaused(true);
    particles.current = makeParticles();
    setSnapshot(structuredClone(particles.current));
    setTick(0);
    setDropped(0);
    setReport("Chưa chạy");
  };
  const changeScene = (patch: Partial<Scene>) => {
    resetTracers();
    setScene((old) => ({ ...old, ...patch }));
  };
  const reset = () => {
    stop();
    resetTracers();
    setScene(initialScene(stage));
    setResolution(33);
    setLayer(initialLayer(stage));
    setCursor({ x: 0, y: 0 });
    setFps(60);
  };
  const singleStep = () => {
    if (stage < 7) return;
    stop();
    advanceParticles(field, particles.current);
    setTick((value) => value + 1);
    setSnapshot(structuredClone(particles.current));
  };
  const toggle = () => {
    if (stage < 7 || reducedMotion) return;
    accumulator.current = 0;
    setPaused((value) => !value);
  };
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
    if (paused || reducedMotion || stage < 7) return;
    let frame = 0,
      last = performance.now();
    const animate = (time: number) => {
      if (time - last >= 1000 / fps - 0.5) {
        const plan = planSteps(accumulator.current, (time - last) / 1000);
        last = time;
        accumulator.current = plan.remainder;
        for (let i = 0; i < plan.steps; i++) advanceParticles(field, particles.current);
        if (plan.steps > 0) {
          setTick((value) => value + plan.steps);
          setSnapshot(structuredClone(particles.current));
        }
        if (plan.dropped > 0) setDropped((value) => value + plan.dropped);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, stage, fps, field]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const screen = (p: Vec2) => toScreen(size.width, size.height, p);
    if (layer !== "arrows")
      for (let y = 0; y < field.height; y++)
        for (let x = 0; x < field.width; x++) {
          let value = field.scalar[y * field.width + x];
          if (layer === "divergence") value = divergence(field, x, y);
          if (layer === "curl") value = curl(field, x, y);
          ctx.fillStyle = "rgb(" + scalarColor(value).join(",") + ")";
          const p = world(field, x, y);
          const a = screen({
            x: Math.max(-2, p.x - field.dx / 2),
            y: Math.min(1.5, p.y + field.dy / 2),
          });
          const b = screen({
            x: Math.min(2, p.x + field.dx / 2),
            y: Math.max(-1.5, p.y - field.dy / 2),
          });
          ctx.fillRect(a.x, a.y, b.x - a.x + 0.25, b.y - a.y + 0.25);
        }
    const line = (a: Vec2, b: Vec2) => {
      const start = screen(a),
        end = screen(b);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    };
    ctx.strokeStyle = "#e1ebf5";
    ctx.lineWidth = 1;
    const stride = Math.max(1, (field.width - 1) / 16);
    for (let y = 0; y < field.height; y += stride)
      for (let x = 0; x < field.width; x += stride) {
        const i = y * field.width + x,
          p = world(field, x, y),
          vx = field.vx[i],
          vy = field.vy[i],
          speed = Math.hypot(vx, vy);
        if (speed < 1e-12) {
          const s = screen(p);
          ctx.fillStyle = "#e1ebf5";
          ctx.fillRect(s.x, s.y, 1, 1);
          continue;
        }
        const length = Math.min(0.16, 0.09 * speed),
          dx = vx / speed,
          dy = vy / speed;
        const tip = { x: p.x + length * dx, y: p.y + length * dy };
        line(p, tip);
        line(tip, { x: tip.x - 0.035 * dx - 0.018 * dy, y: tip.y - 0.035 * dy + 0.018 * dx });
        line(tip, { x: tip.x - 0.035 * dx + 0.018 * dy, y: tip.y - 0.035 * dy - 0.018 * dx });
      }
    if (stage >= 7) {
      ctx.fillStyle = "#fadc6e";
      for (const particle of snapshot) {
        const s = screen(particle.position);
        ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
      }
    }
    if (stage >= 8 && scene.vortex) {
      const s = screen(scene.center);
      ctx.strokeStyle = "#d8b4fe";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, 2 * Math.PI);
      ctx.stroke();
    }
    const s = screen(cursor);
    ctx.strokeStyle = "#78ffb4";
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 4, s.y - 4, 8, 8);
  }, [field, layer, size, cursor, snapshot, stage, scene]);
  const updatePointer = (event: PointerEvent<HTMLCanvasElement>, place: boolean) => {
    const p = fromScreen(size.width, size.height, canvasPoint(event, event.currentTarget));
    if (!p) return false;
    const x = Math.max(0, Math.min(field.width - 1, Math.round((p.x + 2) / field.dx)));
    const y = Math.max(0, Math.min(field.height - 1, Math.round((p.y + 1.5) / field.dy)));
    setCursor(world(field, x, y));
    if (place && stage >= 8) changeScene({ center: p, vortex: true });
    return true;
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || event.button !== 0 || pointer.current !== null || !updatePointer(event, true))
      return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) release();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (stage >= 2 && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      let { x, y } = cursor;
      if (event.key === "ArrowLeft") x -= field.dx;
      if (event.key === "ArrowRight") x += field.dx;
      if (event.key === "ArrowUp") y += field.dy;
      if (event.key === "ArrowDown") y -= field.dy;
      setCursor({ x: Math.max(-2, Math.min(2, x)), y: Math.max(-1.5, Math.min(1.5, y)) });
    }
    if (event.key === "Enter" && stage >= 8) {
      event.preventDefault();
      changeScene({ center: cursor, vortex: true });
    }
    if (event.key === " ") {
      event.preventDefault();
      if (!event.repeat) toggle();
    }
    if (event.key.toLowerCase() === "n" && !event.repeat) singleStep();
  };
  const x = Math.max(0, Math.min(field.width - 1, Math.round((cursor.x + 2) / field.dx)));
  const y = Math.max(0, Math.min(field.height - 1, Math.round((cursor.y + 1.5) / field.dy)));
  const i = y * field.width + x;
  const readout = [
    { label: "Nút đang chọn", value: "(" + x + "; " + y + ") · index " + i },
    { label: "World (x; y)", value: cursor.x.toFixed(3) + "; " + cursor.y.toFixed(3) },
    { label: "Vector (vx; vy)", value: field.vx[i].toFixed(6) + "; " + field.vy[i].toFixed(6) },
  ];
  if (stage >= 3)
    readout.push(
      { label: "Scalar φ", value: field.scalar[i].toFixed(6) },
      {
        label: "Gradient φ",
        value:
          derivativeX(field, field.scalar, x, y).toFixed(6) +
          "; " +
          derivativeY(field, field.scalar, x, y).toFixed(6),
      },
    );
  if (stage >= 4) readout.push({ label: "Divergence", value: divergence(field, x, y).toFixed(6) });
  if (stage >= 5) readout.push({ label: "Curl z", value: curl(field, x, y).toFixed(6) });
  if (stage >= 6) {
    if (scene.preset === "gradient" && !scene.vortex) {
      const error = gradientError(field, scene.potential);
      readout.push({
        label: "Sai số gradient trong miền / mép",
        value: error.interior.toExponential(3) + " / " + error.boundary.toExponential(3),
      });
    }
    readout.push({
      label: "Lưới / dx / dy",
      value:
        field.width +
        " × " +
        field.height +
        " / " +
        field.dx.toFixed(4) +
        " / " +
        field.dy.toFixed(4),
    });
  }
  if (stage >= 7)
    readout.push(
      { label: "Tick", value: String(tick) },
      { label: "Thời gian mô phỏng", value: (tick * dt).toFixed(3) + " s" },
      { label: "Thời gian bỏ qua", value: dropped.toFixed(3) + " s" },
    );
  if (stage >= 9) readout.push({ label: "Kiểm chứng", value: report });
  return (
    <>
      <div className="lab-controls">
        <label>
          Trường mẫu{" "}
          <select
            value={scene.preset}
            disabled={stage < 2}
            onChange={(e) => changeScene({ preset: e.target.value as Preset })}
          >
            {presets
              .filter((p) => stage >= 3 || p !== "gradient")
              .map((p) => (
                <option key={p} value={p}>
                  {labels[p]}
                </option>
              ))}
          </select>
        </label>
        {stage >= 3 && (
          <>
            <label>
              Trường scalar{" "}
              <select
                value={scene.potential}
                onChange={(e) => changeScene({ potential: e.target.value as Potential })}
              >
                <option value="bowl">Lòng chảo: φ = (x²+y²)/2</option>
                <option value="hill">Đỉnh đồi: φ = exp(−x²−y²)</option>
              </select>
            </label>
            <label>
              Lớp màu{" "}
              <select value={layer} onChange={(e) => setLayer(e.target.value as Layer)}>
                <option value="arrows">Chỉ mũi tên</option>
                <option value="potential">Scalar φ</option>
                {stage >= 4 && <option value="divergence">Divergence</option>}
                {stage >= 5 && <option value="curl">Curl z</option>}
              </select>
            </label>
          </>
        )}
        {stage >= 6 && (
          <label>
            Độ phân giải{" "}
            <select
              value={resolution}
              onChange={(e) => {
                stop();
                resetTracers();
                setResolution(Number(e.target.value));
                setCursor({ x: 0, y: 0 });
              }}
            >
              <option value={33}>33 × 25</option>
              <option value={65}>65 × 49</option>
            </select>
          </label>
        )}
        {stage >= 7 && (
          <label>
            FPS hiển thị tối đa{" "}
            <select
              value={fps}
              onChange={(e) => {
                stop();
                setFps(Number(e.target.value));
              }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </label>
        )}
        {stage >= 8 && (
          <>
            <label>
              <input
                type="checkbox"
                checked={scene.vortex}
                onChange={(e) => changeScene({ vortex: e.target.checked })}
              />{" "}
              Xoáy cục bộ
            </label>
            <label>
              Chiều xoáy{" "}
              <select
                value={scene.strength}
                onChange={(e) => changeScene({ strength: Number(e.target.value) })}
              >
                <option value={2}>Ngược kim đồng hồ</option>
                <option value={-2}>Cùng kim đồng hồ</option>
              </select>
            </label>
          </>
        )}
        <button type="button" disabled={stage < 7 || reducedMotion} onClick={toggle}>
          {paused || reducedMotion ? "Chạy" : "Tạm dừng"}
        </button>
        <button type="button" disabled={stage < 7} onClick={singleStep}>
          Tiến một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {stage >= 9 && (
          <button
            type="button"
            onClick={() => {
              stop();
              const result = validateMap();
              setReport(
                (result.passed ? "PASS" : "FAIL") +
                  " · Trường tuyến tính: " +
                  result.derivativeError.toExponential(2) +
                  " · Curl(gradient): " +
                  result.gradientCurl.toExponential(2) +
                  " · Sai số trong miền: " +
                  result.coarse.interior.toExponential(2) +
                  " → " +
                  result.refined.interior.toExponential(2),
              );
            }}
          >
            Kiểm chứng trường chuẩn
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Bản đồ trường vector"
        aria-describedby={helpId}
        style={{ touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={(event) => {
          if (stage >= 2) updatePointer(event, pointer.current === event.pointerId);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={keyDown}
      >
        Bản đồ vector trong miền x từ −2 đến 2, y từ −1,5 đến 1,5. Mũi tên chỉ hướng của vector;
        bảng số cho biết vector, scalar và các đạo hàm tại nút được chọn.
      </canvas>
      <p id={helpId} className="lab-note">
        World y hướng lên. Từ bài 2, chuột hoặc mũi tên chọn nút; từ bài 7, N tiến 1/60 s và Space
        chạy/dừng; từ bài 8, kéo chuột hoặc Enter đặt tâm xoáy. Đổi trường hoặc lưới sẽ dừng và gieo
        lại hạt.
      </p>
      {stage >= 3 && (
        <p className="lab-note">
          Màu xanh: âm; tối: 0; cam: dương. Thang cố định −2 đến 2, giá trị vượt thang chỉ bão hòa
          màu. Chỉ trường mẫu “Gradient của φ” lấy vector từ scalar; các trường mẫu khác độc lập với
          φ.
        </p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Curl dương: xu hướng xoay ngược kim đồng hồ trong world. Trường trượt (y; 0) có curl −1 dù
          các mũi tên đều nằm ngang.
        </p>
      )}
      {stage >= 7 && (
        <p className="lab-note">
          128 hạt đánh dấu dùng nội suy bilinear và midpoint RK2. Hạt ra khỏi miền hoặc quá 8 giây
          được gieo lại; mật độ chấm không phải phép đo khối lượng hay áp suất.
        </p>
      )}
      {stage >= 8 && (
        <p className="lab-note">
          Chỉ có một xoáy Gaussian cục bộ. Di chuyển tâm sẽ dựng lại trường nền rồi cộng xoáy một
          lần; kéo chuột không cộng dồn lực qua mỗi event.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">Reduced motion đang bật: dùng nút từng bước để quan sát hạt.</p>
      )}
      <LabReadout items={readout} />
    </>
  );
}
export default function WindMapLab({ mode }: { mode?: string }) {
  const stage = Math.max(1, Math.min(9, Number(mode?.match(/^wind-(\d)$/)?.[1] ?? 9)));
  return <WindExperiment key={stage} stage={stage} />;
}
