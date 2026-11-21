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
  compareDepth,
  initialShutter,
  makeDepthStrip,
  makeSection,
  nearestProbe,
  presets,
  probePoint,
  referenceSpot,
  type Probe,
  type ReferenceSpot,
  type ShutterConfig,
} from "@/lib/labs/shutter-preview";
import {
  setupCanvas,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { cutLayout, drawSection, type ShutterLayer } from "./shutter-section-draw";
import type { InteractiveLabMode } from "./types";

const modes = [
  "shutter-room",
  "shutter-blades",
  "shutter-depth",
  "shutter-compare",
  "shutter-bias",
  "shutter-reload",
  "shutter-observer",
];
const prompts = [
  "Qua một ô cửa chưa lắp chớp, nắng chạm mặt sàn ở đâu? Đặt điểm đo lên sàn rồi đưa nó lên mặt thùng. Theo tia nét đứt từ điểm đo ngược về nguồn sáng.",
  "Giữ yên thùng rồi mở và khép lá chớp. Để ý cả độ rộng của vệt nắng lẫn vị trí đầu vệt. Bây giờ trượt thùng ngang phòng: dải nào chạm mặt thùng trước khi kịp xuống sàn?",
  "Hãy coi nguồn sáng như người đang nhìn qua các khe cửa. Mỗi ô trên thước xám lưu khoảng cách đến bề mặt đầu tiên ở hướng đó. Di chuyển điểm đo để thấy nó dùng ô nào.",
  "Hai điểm trên cùng một tấm sàn có cùng pháp tuyến: theo Lambert chúng phải sáng như nhau. Chọn “Dưới một lá” rồi “Giữa hai lá” để tìm thông tin còn thiếu.",
  "Đưa điểm đo tới mép bóng. So đường tia thật với kết quả ở một ô của bảng độ sâu; chỉnh độ lệch hoặc lấy thêm hai ô bên cạnh. Làm sao biết ta đã sửa vết nhiễu hay vô tình xóa bóng?",
  "Giữ nguyên một mép bóng dễ nhận ra. Trong ứng dụng C++, đây là cảnh để kiểm xem điều gì còn nguyên khi shader mới không biên dịch được. Trên web bạn chỉ khảo sát hình học.",
  "Vì sao ở cùng một ô cửa, lúc thì lá chớp chắn nắng, lúc lại chính chiếc thùng? Thử ba điểm đối chiếu, sau đó kéo điểm đo đến một bề mặt mà bạn tự chọn.",
] as const;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
type State = {
  scene: ShutterConfig;
  probe: Probe;
  layer: ShutterLayer;
  bias: number;
  filtered: boolean;
  bins: number;
  rays: boolean;
  paused: boolean;
  direction: number;
};
function start(stage: number): State {
  return {
    scene: initialShutter(),
    probe: { surface: "floor", t: 3.75 / 8 },
    layer: stage === 3 ? "depth" : stage === 4 || stage === 5 ? "compare" : "room",
    bias: 0.025,
    filtered: false,
    bins: 128,
    rays: true,
    paused: true,
    direction: -1,
  };
}
function nextTilt(s: State, degrees: number, paused: boolean): State {
  let dir = s.direction;
  if (s.scene.tilt >= 42) dir = -1;
  else if (s.scene.tilt <= -38) dir = 1;
  const tilt = clamp(s.scene.tilt + dir * degrees, -38, 42);
  if (tilt === 42) dir = -1;
  else if (tilt === -38) dir = 1;
  return { ...s, scene: { ...s.scene, tilt }, direction: dir, paused };
}
const spots: { id: ReferenceSpot; label: string }[] = [
  { id: "slat", label: "Dưới một lá" },
  { id: "gap", label: "Giữa hai lá" },
  { id: "crate", label: "Sau thùng" },
];
const surfaceNames = {
  floor: "Mặt sàn",
  top: "Mặt trên của thùng",
  near: "Mặt thùng phía cửa",
  far: "Mặt thùng phía trong phòng",
};

export default function ShaderHotReloadLab({ mode }: { mode?: InteractiveLabMode }) {
  const index = modes.indexOf(mode ?? "shutter-observer"),
    stage = index === -1 ? 7 : index + 1;
  return <ShutterLab stage={stage} key={stage} />;
}

function ShutterLab({ stage }: { stage: number }) {
  const [state, setState] = useState(() => start(stage));
  const current = useRef(state),
    canvas = useRef<HTMLCanvasElement>(null),
    help = useId();
  const drag = useRef<{ id: number; before: State } | null>(null),
    [captured, capture] = useState(false);
  const change = useCallback((edit: (s: State) => State) => {
    const previous = current.current,
      next = edit(previous);
    if (previous !== next) {
      current.current = next;
      setState(next);
    }
  }, []);
  const release = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (!active) return;
    capture(false);
    if (canvas.current?.hasPointerCapture(active.id))
      canvas.current.releasePointerCapture(active.id);
  }, []);
  const stop = useCallback(() => {
    release();
    change((s) => (s.paused ? s : { ...s, paused: true }));
  }, [change, release]);
  const size = useCanvasSize(canvas, stop),
    reduced = useReducedMotion();
  usePauseOnReducedMotion(stop);
  const section = useMemo(() => makeSection(state.scene, stage >= 2), [state.scene, stage]);
  const strip = useMemo(() => makeDepthStrip(section, state.bins), [section, state.bins]);
  const point = probePoint(section, state.probe),
    reading = compareDepth(section, strip, point, state.bias);
  const depthVisible = state.layer === "depth" || state.layer === "compare";

  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    if (canvas.current) observer.observe(canvas.current);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", stop);
    return () => {
      observer.disconnect();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
      release();
    };
  }, [stop, release]);
  useEffect(() => {
    if (state.paused || reduced || stage < 2) return;
    let frame = 0,
      previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      if (elapsed >= 50 && !current.current.paused) {
        previous = now;
        change((s) => nextTilt(s, Math.min(0.1, elapsed / 1000) * 16, false));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [change, state.paused, reduced, stage]);

  // Chỉ vẽ trạng thái mới nhất nếu thiết bị gửi nhiều tọa độ con trỏ trong một frame.
  const pending = useRef<number | null>(null),
    paint = useRef<() => void>(() => {});
  useEffect(() => {
    paint.current = () => {
      const ctx = canvas.current?.getContext("2d");
      if (!ctx) return;
      setupCanvas(ctx, size);
      drawSection(ctx, size.width, size.height, section, strip, state);
    };
    if (pending.current === null)
      pending.current = requestAnimationFrame(() => {
        pending.current = null;
        paint.current();
      });
  }, [size, state, section, strip]);
  useEffect(
    () => () => {
      if (pending.current !== null) cancelAnimationFrame(pending.current);
      pending.current = null;
    },
    [],
  );

  function tune(key: "tilt" | "sun" | "boxX", value: number) {
    change((s) => {
      const scene = { ...s.scene, [key]: value };
      let probe = s.probe;
      if (probe.surface !== "floor" && !makeSection(scene, stage >= 2).crate) {
        const previous = probePoint(makeSection(s.scene, stage >= 2), probe);
        probe = { surface: "floor", t: previous.z / 8 };
      }
      return { ...s, scene, probe, paused: true };
    });
  }
  function reset() {
    release();
    change(() => start(stage));
  }
  function chooseSpot(which: ReferenceSpot) {
    release();
    const ref = referenceSpot(which);
    change((s) => ({ ...s, ...ref, paused: true }));
  }
  function play() {
    if (!reduced) change((s) => ({ ...s, paused: !s.paused }));
  }
  function dragProbe(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const p = cutLayout(size.width, size.height, depthVisible).toWorld(
      ((event.clientX - rect.left) * size.width) / rect.width,
      ((event.clientY - rect.top) * size.height) / rect.height,
    );
    change((s) => ({ ...s, probe: nearestProbe(section, p), paused: true }));
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || drag.current) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, before: current.current };
    capture(true);
    dragProbe(event);
  }
  function endPointer(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.id === event.pointerId) release();
  }
  function keys(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const k = event.key.toLowerCase(),
      s = current.current;
    if (drag.current) {
      if (k === "escape") {
        const before = drag.current.before;
        release();
        change(() => before);
        event.preventDefault();
      }
      return;
    }
    if (event.repeat && [" ", "r", "n", "v", "f"].includes(k)) {
      event.preventDefault();
      return;
    }
    if (k === "r") reset();
    else if (k === "arrowup" || k === "arrowdown")
      change((s) => ({
        ...s,
        probe: { ...s.probe, t: clamp(s.probe.t + (k === "arrowup" ? 0.0125 : -0.0125), 0, 1) },
        paused: true,
      }));
    else if (stage >= 2 && (k === "arrowleft" || k === "arrowright"))
      tune("tilt", clamp(s.scene.tilt + (k === "arrowright" ? 3 : -3), -45, 65));
    else if (stage >= 2 && (k === "a" || k === "d"))
      tune("boxX", clamp(s.scene.boxX + (k === "d" ? 0.18 : -0.18), -2.1, 2.1));
    else if (stage >= 2 && (k === "q" || k === "e"))
      tune("sun", clamp(s.scene.sun + (k === "e" ? 2 : -2), -22, 22));
    else if (stage >= 2 && ["1", "2", "3"].includes(k)) tune("tilt", [42, 23, -38][Number(k) - 1]);
    else if (stage >= 2 && k === " ") play();
    else if (stage >= 2 && k === "n") change((s) => nextTilt(s, 2, true));
    else if (stage >= 3 && k === "v")
      change((s) => ({ ...s, layer: s.layer === "depth" ? "room" : "depth" }));
    else if (stage >= 5 && k === "f")
      change((s) => ({ ...s, filtered: !s.filtered, layer: "compare" }));
    else return;
    event.preventDefault();
  }
  const hit = reading.hit,
    hitName =
      hit?.kind === "blade"
        ? "Lá thứ " + hit.index + " từ bệ cửa"
        : hit?.kind === "crate"
          ? "Chiếc thùng"
          : hit?.kind === "wall"
            ? "Mảng tường"
            : "Không có vật chắn";
  return (
    <section
      data-testid="shutter-lab"
      data-stage={stage}
      data-captured={captured}
      data-paused={state.paused}
    >
      <p className="lab-note">{prompts[stage - 1]}</p>
      <canvas
        ref={canvas}
        data-testid="shutter-canvas"
        className="lab-canvas"
        tabIndex={0}
        role="img"
        aria-label="Nắng qua cửa chớp — mặt cắt tương tác"
        aria-describedby={help}
        style={{
          height: "clamp(330px, 52vw, 500px)",
          background: "#182735",
          cursor: captured ? "grabbing" : "crosshair",
        }}
        onPointerDown={pointerDown}
        onPointerMove={(e) => {
          if (drag.current?.id === e.pointerId) dragProbe(e);
        }}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onBlur={stop}
        onKeyDown={keys}
      >
        Mặt cắt phòng từ cửa vào trong. Bảng số bên dưới nêu vật che đầu tiên trên tia đi từ điểm đo
        về phía nguồn sáng.
      </canvas>
      {stage >= 2 && (
        <div className="lab-controls" role="group" aria-label="Hình học của phòng">
          <label>
            Góc lá chớp{" "}
            <input
              data-testid="shutter-tilt"
              aria-label="Góc lá chớp"
              type="range"
              min={-45}
              max={65}
              step={1}
              value={Math.round(state.scene.tilt)}
              onChange={(e) => tune("tilt", Number(e.target.value))}
            />
            <output aria-live="off">{state.scene.tilt.toFixed(0)}°</output>
          </label>
          <label>
            Hướng nắng{" "}
            <input
              data-testid="shutter-sun"
              aria-label="Hướng nắng"
              type="range"
              min={-22}
              max={22}
              step={1}
              value={state.scene.sun}
              onChange={(e) => tune("sun", Number(e.target.value))}
            />
            <output aria-live="off">{state.scene.sun.toFixed(0)}°</output>
          </label>
          <label>
            Trượt thùng theo X{" "}
            <input
              data-testid="shutter-box"
              aria-label="Vị trí thùng theo X"
              type="range"
              min={-2.1}
              max={2.1}
              step={0.01}
              value={state.scene.boxX}
              onChange={(e) => tune("boxX", Number(e.target.value))}
            />
            <output aria-live="off">{state.scene.boxX.toFixed(2)} m</output>
          </label>
        </div>
      )}
      <div className="lab-controls" role="group" aria-label="Trạng thái cửa chớp">
        {stage >= 2 && (
          <>
            <button
              type="button"
              data-testid="shutter-open"
              onClick={() => tune("tilt", presets.open)}
            >
              Mở (+42°)
            </button>
            <button
              type="button"
              data-testid="shutter-half"
              onClick={() => tune("tilt", presets.half)}
            >
              Nghiêng (+23°)
            </button>
            <button
              type="button"
              data-testid="shutter-closed"
              onClick={() => tune("tilt", presets.closed)}
            >
              Khép (−38°)
            </button>
            <button
              type="button"
              data-testid="shutter-play"
              disabled={reduced}
              aria-pressed={!state.paused}
              onClick={play}
            >
              {state.paused ? "Chạy lá chớp" : "Tạm dừng"}
            </button>
            <button
              type="button"
              data-testid="shutter-step"
              onClick={() => change((s) => nextTilt(s, 2, true))}
            >
              Tiến một bước (2°)
            </button>
          </>
        )}
        <button type="button" data-testid="shutter-reset" onClick={reset}>
          Đặt lại
        </button>
        <label className="check">
          <input
            type="checkbox"
            data-testid="shutter-rays"
            checked={state.rays}
            onChange={(e) => change((s) => ({ ...s, rays: e.target.checked }))}
          />{" "}
          Vẽ đường đi của nắng
        </label>
      </div>
      <div className="lab-controls" role="group" aria-label="Đặt điểm đo">
        <label>
          Đặt điểm trên{" "}
          <select
            aria-label="Bề mặt đặt điểm đo"
            data-testid="shutter-surface"
            value={!section.crate ? "floor" : state.probe.surface}
            onChange={(e) =>
              change((s) => ({
                ...s,
                paused: true,
                probe: { surface: e.target.value as Probe["surface"], t: 0.5 },
              }))
            }
          >
            {Object.entries(surfaceNames).map(([id, label]) => (
              <option key={id} value={id} disabled={id !== "floor" && !section.crate}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Di chuyển điểm{" "}
          <input
            data-testid="shutter-probe"
            aria-label="Di chuyển điểm trên bề mặt"
            type="range"
            min={0}
            max={1}
            step={0.0025}
            value={state.probe.t}
            onChange={(e) =>
              change((s) => ({
                ...s,
                paused: true,
                probe: { ...s.probe, t: Number(e.target.value) },
              }))
            }
          />
        </label>
        {stage >= 2 &&
          spots.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={"shutter-spot-" + item.id}
              onClick={() => chooseSpot(item.id)}
            >
              {item.label}
            </button>
          ))}
      </div>
      {stage >= 3 && (
        <div className="lab-controls" role="group" aria-label="Độ sâu và bóng đổ">
          <label>
            Lớp quan sát{" "}
            <select
              data-testid="shutter-layer"
              aria-label="Lớp quan sát"
              value={state.layer}
              onChange={(e) => change((s) => ({ ...s, layer: e.target.value as ShutterLayer }))}
            >
              <option value="room">Mặt cắt hình học</option>
              <option value="depth">Thước độ sâu 1D</option>
              {stage >= 4 && (
                <>
                  <option value="compare">Kết quả so độ sâu</option>
                  <option value="lambert">Lambert, bỏ qua vật che</option>
                </>
              )}
            </select>
          </label>
          {depthVisible && (
            <label>
              Số mẫu{" "}
              <select
                aria-label="Số mẫu độ sâu"
                data-testid="shutter-samples"
                value={state.bins}
                onChange={(e) => change((s) => ({ ...s, bins: Number(e.target.value) }))}
              >
                {[32, 64, 128, 256, 512].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          )}
          {stage >= 5 && (
            <>
              <label>
                Độ lệch (bias){" "}
                <input
                  data-testid="shutter-bias"
                  aria-label="Độ lệch so độ sâu"
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.001}
                  value={state.bias}
                  onChange={(e) =>
                    change((s) => ({ ...s, bias: Number(e.target.value), layer: "compare" }))
                  }
                />
                <output aria-live="off">{state.bias.toFixed(3)} m</output>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  data-testid="shutter-filter"
                  checked={state.filtered}
                  onChange={(e) =>
                    change((s) => ({ ...s, filtered: e.target.checked, layer: "compare" }))
                  }
                />{" "}
                Lấy trung bình ba phép so
              </label>
            </>
          )}
        </div>
      )}
      <dl className="lab-readout" aria-label="Kết quả tại điểm đo" aria-live="off">
        <div>
          <dt>Điểm trong phòng (X / Y / Z)</dt>
          <dd data-testid="shutter-point">
            {(state.scene.sliceX + section.slopeX * point.z).toFixed(2)} / {point.y.toFixed(2)} /{" "}
            {point.z.toFixed(2)} m
          </dd>
        </div>
        <div>
          <dt>Vật chắn đầu tiên</dt>
          <dd data-testid="shutter-hit" data-kind={hit?.kind ?? "none"}>
            {hitName}
          </dd>
        </div>
        <div>
          <dt>Dò tia hình học</dt>
          <dd data-testid="shutter-visibility" data-lit={reading.lit}>
            {reading.lit ? "Nhận nắng trực tiếp" : "Nằm trong bóng"}
          </dd>
        </div>
        {stage >= 2 && (
          <div>
            <dt>Thùng trong lát cắt</dt>
            <dd data-testid="shutter-in-slice">
              {section.crate
                ? "Có · bề dày theo Z " + (section.crate.far - section.crate.near).toFixed(2) + " m"
                : "Không cắt qua thùng"}
            </dd>
          </div>
        )}
        {depthVisible && (
          <>
            <div>
              <dt>Điểm đo / gần nhất tại ô {reading.bin}</dt>
              <dd data-testid="shutter-depth">
                {reading.depth.toFixed(3)} /{" "}
                {reading.nearest === null ? "trống" : reading.nearest.toFixed(3)} m
              </dd>
            </div>
            <div>
              <dt>Kết quả so độ sâu</dt>
              <dd data-testid="shutter-map-lit" data-lit={reading.mapLit}>
                {reading.mapLit ? "Sáng (một ô)" : "Tối (một ô)"}
                {state.filtered && " · ba ô: " + Math.round(reading.filtered * 100) + "% sáng"}
              </dd>
            </div>
          </>
        )}
        {stage >= 4 && (
          <div>
            <dt>Lambert trên mặt sàn</dt>
            <dd>n·L = {section.sunY.toFixed(3)} ở cả điểm trong nắng và điểm trong bóng.</dd>
          </div>
        )}
      </dl>
      {stage >= 3 && depthVisible && (
        <p className="lab-note">
          Thước xám ghi một hàng mẫu của mô hình CPU: màu tối là bề mặt gần, màu sáng là bề mặt xa,
          xanh sẫm là ô trống. Khung vàng chỉ ô ứng với điểm đo. Hai khoảng cách được đo trong hình
          chiếu Z/Y, không phải số đọc từ depth texture của GPU.
          {state.layer === "compare" &&
            " Dải xanh ngọc trên sàn và thùng là phần vượt qua phép so; chỉnh số mẫu để so lại với tia nét đứt."}
        </p>
      )}
      {stage === 6 && (
        <p className="lab-note">
          <strong>Kiểm tra reload trong ứng dụng C++:</strong> giữ nguyên một dải nắng trên cạnh
          thùng, sửa shader ngoài rồi nhấn F5. Nếu bỏ một dấu chấm phẩy, chương trình phải báo file
          và lỗi của driver mà vẫn giữ nguyên cảnh cũ. Canvas không đọc hay biên dịch GLSL.
        </p>
      )}
      <p id={help} className="lab-hint">
        Đây là mặt cắt 2D chạy trên CPU, không phải ảnh OpenGL. Bản vẽ bỏ các nẹp trang trí để thấy
        rõ khe. Ở lớp mặt cắt, vạch vàng đánh dấu nơi nhận nắng; lớp Lambert cố ý bỏ qua mọi vật
        che. Dải mờ chỉ đường tia, không mô phỏng bụi. Z đo từ cửa vào phòng, Y đo từ sàn lên. Mặt
        phẳng cắt đi dọc hướng nắng nên thùng có thể ra ngoài lát khi trượt ngang theo X. Chạm hoặc
        kéo điểm đo trên sàn hay thùng; dùng các ô điều khiển nếu không dùng chuột. Khi Canvas có
        tiêu điểm: ↑/↓ dịch điểm, Esc hủy kéo, R đặt lại.
        {stage >= 2 &&
          " ←/→ nghiêng lá, A/D dịch thùng, Q/E xoay hướng nắng, 1/2/3 chọn góc, Space chạy/dừng, N tiến một bước. Các điểm đối chiếu đặt lại góc nắng, góc lá và vị trí thùng để thử cùng một trường hợp."}
        {reduced && stage >= 2 && " Chế độ giảm chuyển động đang bật: dùng nút tiến một bước."}
      </p>
    </section>
  );
}
