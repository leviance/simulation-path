"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  initialInspector,
  inspectorStage,
  inspectorPreset,
  inspectorResults,
  inspectorViewport,
  inspectorPick,
  editInspector,
  inspectorParameterValue,
  advanceInspector,
  formatInspectorValue,
  INSPECTOR_STAGES,
  type InspectorScene,
  type InspectorParameter,
} from "@/lib/labs/pipeline-inspector";
import { drawInspector, inspectorPointFromEvent } from "./pipeline3d-lab-view";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const DEG = Math.PI / 180;
export default function Pipeline3dLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Pipeline3dScene key={mode ?? "default"} mode={mode} />;
}

function Pipeline3dScene({ mode }: { mode?: InteractiveLabMode }) {
  const dragHelpId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null),
    reducedMotion = useReducedMotion();
  const stage = inspectorStage(mode);
  const [scene, setScene] = useState<InspectorScene>(initialInspector),
    sceneRef = useRef(scene);
  const drag = useRef<{ id: number; cssX: number; cssY: number } | null>(null);
  const [dragMode, setDragMode] = useState<"model" | "view">("model");
  const dragModeRef = useRef<"model" | "view">("model");
  const [captured, setCaptured] = useState(false);
  const commit = useCallback((s: InspectorScene) => {
    sceneRef.current = s;
    setScene(s);
  }, []);
  const cancelPointer = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    setCaptured(false);
    const canvas = canvasRef.current;
    if (active && canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
  }, []);
  const pauseForEnvironment = useCallback(() => {
    cancelPointer();
    commit({ ...sceneRef.current, paused: true });
  }, [cancelPointer, commit]);
  const size = useCanvasSize(canvasRef, pauseForEnvironment);
  usePauseOnReducedMotion(pauseForEnvironment);
  const reset = useCallback(
    (index = 0) => {
      cancelPointer();
      dragModeRef.current = "model";
      setDragMode("model");
      commit(inspectorPreset(index));
    },
    [cancelPointer, commit],
  );
  const edit = (key: InspectorParameter, value: number) => {
    cancelPointer();
    commit(editInspector(sceneRef.current, key, value));
  };
  const changeDragMode = (value: string) => {
    if (stage < 3 || (value !== "model" && value !== "view")) return;
    if (value === "view" && stage < 4) return;
    cancelPointer();
    dragModeRef.current = value;
    setDragMode(value);
    commit({ ...sceneRef.current, paused: true });
  };
  const selectVertex = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= 8) return;
    cancelPointer();
    commit({ ...sceneRef.current, selectedVertex: index, paused: true });
  };
  const selectStage = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index > 5) return;
    commit({ ...sceneRef.current, selectedStage: index });
  };
  const togglePause = () => {
    cancelPointer();
    const s = sceneRef.current;
    commit({ ...s, paused: stage < 7 || reducedMotion ? true : !s.paused });
  };
  const step = () => {
    cancelPointer();
    const s = sceneRef.current;
    if (stage < 7 || !s.paused) return;
    commit({ ...advanceInspector({ ...s, paused: false }, 1 / 30), paused: true });
  };
  const toggleDebug = () => {
    cancelPointer();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug, paused: true });
  };
  const movePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const p = inspectorPointFromEvent(event, size, sceneRef.current, true);
    if (!p) return;
    const dx = p.cssX - active.cssX,
      dy = p.cssY - active.cssY;
    active.cssX = p.cssX;
    active.cssY = p.cssY;
    let s = sceneRef.current;
    if (stage >= 4 && dragModeRef.current === "view") {
      s = editInspector(s, "cameraYaw", s.camera.yaw + dx * 0.006);
      s = editInspector(s, "cameraPitch", s.camera.pitch - dy * 0.004);
    } else if (stage >= 3) {
      s = editInspector(s, "modelYaw", s.model.yaw + dx * 0.006);
    } else {
      const local = s.vertices[s.selectedVertex];
      s = editInspector(s, "localX", local.x + dx / 75);
      s = editInspector(s, "localY", local.y - dy / 75);
    }
    commit(s);
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const p = inspectorPointFromEvent(event, size, sceneRef.current);
    if (!p) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    let s = { ...sceneRef.current, paused: true };
    const picked = inspectorPick(p, s, stage);
    if (picked !== null) s = { ...s, selectedVertex: picked };
    commit(s);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, cssX: p.cssX, cssY: p.cssY };
      setCaptured(true);
    } catch {
      drag.current = null;
      setCaptured(false);
    }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      cancelPointer();
      return;
    }
    movePointer(event);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    movePointer(event);
    cancelPointer();
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelPointer();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab") return;
    const key = event.key.toLowerCase();
    if (key === "r") {
      event.preventDefault();
      if (!event.repeat) reset();
      return;
    }
    if (key === "escape") {
      event.preventDefault();
      cancelPointer();
      commit({ ...sceneRef.current, paused: true });
      return;
    }
    if (stage >= 7 && [" ", "n", "f"].includes(key)) {
      event.preventDefault();
      if (event.repeat) return;
      if (key === " ") togglePause();
      else if (key === "n") step();
      else toggleDebug();
      return;
    }
    if (/^[1-6]$/.test(key)) {
      event.preventDefault();
      selectStage(Number(key) - 1);
      return;
    }
    if (key === "v") {
      event.preventDefault();
      if (!event.repeat) selectVertex((sceneRef.current.selectedVertex + 1) % 8);
      return;
    }
    const commands: Record<string, [InspectorParameter, number, number]> = {
      arrowleft: ["localX", -0.1, 1],
      arrowright: ["localX", 0.1, 1],
      arrowup: ["localY", 0.1, 1],
      arrowdown: ["localY", -0.1, 1],
      pageup: ["localZ", 0.1, 1],
      pagedown: ["localZ", -0.1, 1],
      a: ["modelX", -0.2, 3],
      d: ["modelX", 0.2, 3],
      w: ["modelZ", 0.2, 3],
      s: ["modelZ", -0.2, 3],
      q: ["modelYaw", -5 * DEG, 3],
      e: ["modelYaw", 5 * DEG, 3],
      u: ["scaleX", -0.1, 3],
      o: ["scaleX", 0.1, 3],
      z: ["cameraZ", -0.2, 4],
      x: ["cameraZ", 0.2, 4],
      j: ["cameraYaw", -5 * DEG, 4],
      l: ["cameraYaw", 5 * DEG, 4],
      i: ["cameraPitch", 5 * DEG, 4],
      k: ["cameraPitch", -5 * DEG, 4],
      "[": ["fov", -5 * DEG, 5],
      "]": ["fov", 5 * DEG, 5],
      "-": ["near", -0.1, 5],
      "=": ["near", 0.1, 5],
      "+": ["near", 0.1, 5],
      "9": ["far", -1, 5],
      "0": ["far", 1, 5],
    };
    const command = commands[key];
    if (!command || stage < command[2]) return;
    event.preventDefault();
    const [parameter, delta] = command;
    edit(parameter, inspectorParameterValue(sceneRef.current, parameter) + delta);
  };
  useEffect(() => {
    const pause = () => {
      cancelPointer();
      commit({ ...sceneRef.current, paused: true });
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
      cancelPointer();
    };
  }, [cancelPointer, commit]);
  useEffect(() => {
    if (stage < 7 || scene.paused || reducedMotion) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      const s = sceneRef.current;
      if (s.paused) return;
      const dt = (now - previous) / 1000;
      previous = now;
      commit(advanceInspector(s, dt));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, scene.paused, reducedMotion, commit]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawInspector(ctx, size, scene, stage);
  }, [size, scene, stage]);
  const r = inspectorResults(scene, stage),
    v = inspectorViewport(scene);
  const controls: {
    key: InspectorParameter;
    label: string;
    min: number;
    max: number;
    step: number;
    stage: number;
    angle?: boolean;
  }[] = [
    { key: "localX", label: "Local X", min: -4, max: 4, step: 0.1, stage: 1 },
    { key: "localY", label: "Local Y", min: -4, max: 4, step: 0.1, stage: 1 },
    { key: "localZ", label: "Local Z", min: -4, max: 4, step: 0.1, stage: 1 },
    { key: "modelX", label: "Model X", min: -12, max: 12, step: 0.1, stage: 3 },
    { key: "modelZ", label: "Model Z", min: -4, max: 34, step: 0.1, stage: 3 },
    { key: "modelYaw", label: "Model yaw", min: -180, max: 180, step: 1, stage: 3, angle: true },
    { key: "scaleX", label: "Scale X", min: -2, max: 2, step: 0.1, stage: 3 },
    { key: "cameraZ", label: "Camera Z", min: -4, max: 8, step: 0.1, stage: 4 },
    { key: "cameraYaw", label: "Camera yaw", min: -180, max: 180, step: 1, stage: 4, angle: true },
    {
      key: "cameraPitch",
      label: "Camera pitch",
      min: -89,
      max: 89,
      step: 1,
      stage: 4,
      angle: true,
    },
    { key: "fov", label: "Vertical FOV", min: 25, max: 110, step: 1, stage: 5, angle: true },
    {
      key: "near",
      label: "Near plane",
      min: 0.05,
      max: scene.lens.farPlane - 0.05,
      step: 0.05,
      stage: 5,
    },
    {
      key: "far",
      label: "Far plane",
      min: scene.lens.nearPlane + 0.05,
      max: 60,
      step: 0.05,
      stage: 5,
    },
  ];
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select
            aria-label="Pipeline preset"
            value=""
            onChange={(e) => reset(Number(e.target.value))}
          >
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            {[
              "Cảnh mặc định",
              "Ví dụ tính tay",
              "Before near",
              "Behind camera",
              "Beyond far",
              "Outside XY",
              "w = 0",
            ].map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vertex
          <select
            aria-label="Vertex"
            value={scene.selectedVertex}
            onChange={(e) => selectVertex(Number(e.target.value))}
          >
            {scene.vertices.map((_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stage
          <select
            aria-label="Stage"
            value={scene.selectedStage}
            onChange={(e) => selectStage(Number(e.target.value))}
          >
            {INSPECTOR_STAGES.map((s, i) => (
              <option key={s} value={i}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {stage >= 3 && (
          <label>
            Thao tác kéo
            <select
              aria-label="Thao tác kéo"
              aria-describedby={dragHelpId}
              value={dragMode}
              onChange={(e) => changeDragMode(e.target.value)}
            >
              <option value="model">Xoay mô hình</option>
              <option value="view" disabled={stage < 4}>
                Đổi góc nhìn{stage < 4 ? " — từ bài 4" : ""}
              </option>
            </select>
          </label>
        )}
        {controls
          .filter((c) => stage >= c.stage)
          .map((c) => {
            const scale = c.angle ? DEG : 1,
              value = inspectorParameterValue(scene, c.key) / scale;
            return (
              <label key={c.key}>
                {c.label}
                <input
                  aria-label={c.label}
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={value}
                  onChange={(e) => edit(c.key, Number(e.target.value) * scale)}
                />
                <output>
                  {value.toFixed(2)}
                  {c.angle ? "°" : ""}
                </output>
              </label>
            );
          })}
        <button onClick={togglePause} disabled={stage < 7 || reducedMotion}>
          {scene.paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={step} disabled={stage < 7 || !scene.paused}>
          Tiến một bước
        </button>
        {stage >= 7 && (
          <button onClick={toggleDebug}>{scene.debug ? "Ẩn debug" : "Hiện debug"}</button>
        )}
        <button onClick={() => reset()}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{
          height: scene.debug ? "clamp(320px,42vw,440px)" : "clamp(380px,58vw,580px)",
          touchAction: "none",
        }}
        aria-label="Máy soi pipeline 3D: click chọn vertex, kéo để biến đổi, bàn phím và slider có cùng chức năng"
        aria-describedby={dragHelpId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDown={onKeyDown}
        onBlur={() => {
          cancelPointer();
          commit({ ...sceneRef.current, paused: true });
        }}
      />
      <p id={dragHelpId}>
        {stage < 3
          ? "Kéo để sửa local X/Y của vertex đang chọn."
          : dragMode === "model"
            ? "Xoay mô hình: kéo ngang để xoay khối quanh trục Y của nó. Kéo dọc không có tác dụng; camera và lưới tọa độ world giữ nguyên."
            : "Đổi góc nhìn: kéo ngang để đổi camera yaw, kéo dọc để đổi camera pitch. Mô hình và hệ tọa độ world không xoay; bạn đang nhìn chúng từ một hướng khác."}
        {stage >= 3
          ? " Mỗi lần kéo chỉ tác động đến chế độ đã chọn. Thanh điều khiển và bàn phím vẫn chỉnh được từng thông số riêng."
          : ""}
      </p>
      <p>
        Vertex màu vàng là điểm đang theo dõi. Local cũng gọi là model space; WORLD là kết quả sau
        M. Bảng luôn giữ đủ sáu stage khi bật debug; dấu — nghĩa là chưa có giá trị, không phải tọa
        độ 0. Viewport logic {v.width}×{v.height}; số SCREEN không phải CSS pixel của Canvas. Trước
        bài 6, ảnh 3D dùng công thức tham chiếu P11 để đối chiếu bảng đang xây. Từ bài 3 có chế độ
        Xoay mô hình; từ bài 4 có thêm Đổi góc nhìn. Delta kéo tính bằng CSS pixel, không nhân DPR.
        R đặt lại, V chọn vertex, 1–6 chọn stage. Phím biến đổi giống bảng điều khiển SDL trong bài;
        Tab và tổ hợp Ctrl/Alt/Meta vẫn dành cho browser.
        {reducedMotion ? " Reduced motion: tắt tự quay; vẫn chỉnh tay và tiến một bước được." : ""}
      </p>
      {scene.debug && (
        <>
          <LabReadout
            items={r.values.map((value, i) => ({
              label: INSPECTOR_STAGES[i] + (i === scene.selectedStage ? " · đang chọn" : ""),
              value: formatInspectorValue(value),
            }))}
          />
          <LabReadout
            items={[
              {
                label: "trạng thái",
                value: stage >= 6 ? r.trace.status : "ảnh tham chiếu; pipeline chưa đủ stage",
              },
              { label: "pointer capture", value: captured ? "đang kéo" : "đã nhả" },
              ...(stage === 2
                ? [
                    {
                      label: "point sau translation(2,1,3)",
                      value: formatInspectorValue(r.translatedPoint),
                    },
                    {
                      label: "direction sau translation(2,1,3)",
                      value: formatInspectorValue(r.translatedDirection),
                    },
                  ]
                : []),
              ...(stage >= 3
                ? [
                    {
                      label: "model direct error",
                      value: Number.isFinite(r.modelError) ? r.modelError.toExponential(2) : "—",
                    },
                  ]
                : []),
              ...(stage >= 7
                ? [
                    {
                      label: "MVP agreement error",
                      value:
                        r.agreement !== null && Number.isFinite(r.agreement)
                          ? r.agreement.toExponential(2)
                          : "— invalid input",
                    },
                  ]
                : []),
            ]}
          />
        </>
      )}
    </div>
  );
}
