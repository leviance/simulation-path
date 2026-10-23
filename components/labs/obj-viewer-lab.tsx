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
  OBJ_PRESETS,
  buildObjScene,
  normalizeObjMesh,
  objStage,
  parseObjSource,
  objFaceIndexLabels,
  type ObjPreset,
} from "@/lib/labs/obj-viewer";
import {
  advanceObjViewer,
  initialObjViewer,
  turnObjViewer,
  type ObjViewerState,
} from "@/lib/labs/obj-controls";
import { createZFrame, zFrameDifference } from "@/lib/labs/z-buffer";
import { renderObjFrame } from "@/lib/labs/obj-frame";
import { drawObjViewer, OBJ_WIDTH, OBJ_HEIGHT } from "./obj-viewer-view";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function ObjViewerLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Workbench key={mode ?? "obj-validation"} mode={mode} />;
}

function Workbench({ mode }: { mode?: InteractiveLabMode }) {
  const stage = objStage(mode),
    help = useId(),
    canvasRef = useRef<HTMLCanvasElement>(null);
  const initialPreset: ObjPreset =
    stage === 3 ? "triangle" : stage === 4 ? "negative" : stage >= 5 ? "cube" : "rocket";
  const [preset, setPreset] = useState<ObjPreset | "custom">(initialPreset);
  const [draft, setDraft] = useState<string>(OBJ_PRESETS[initialPreset]);
  const [source, setSource] = useState<string>(OBJ_PRESETS[initialPreset]);
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState("");
  const [difference, setDifference] = useState("chưa kiểm tra");
  const [state, setState] = useState(() => initialObjViewer(stage));
  const current = useRef(state),
    fileEpoch = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; start: ObjViewerState } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const commit = useCallback((next: ObjViewerState) => {
    current.current = next;
    setState(next);
    setDifference("chưa kiểm tra");
  }, []);
  const cancel = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    setCapturing(false);
    if (active && canvasRef.current?.hasPointerCapture(active.id))
      canvasRef.current.releasePointerCapture(active.id);
  }, []);
  const pause = useCallback(() => {
    cancel();
    commit({ ...current.current, paused: true });
  }, [cancel, commit]);
  const size = useCanvasSize(canvasRef, pause),
    reducedMotion = useReducedMotion();
  usePauseOnReducedMotion(pause);
  const invalidateFiles = useCallback(() => {
    fileEpoch.current++;
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      invalidateFiles();
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
      cancel();
    };
  }, [cancel, pause, invalidateFiles]);
  useEffect(() => {
    if (state.paused || reducedMotion) return;
    let id = 0,
      previous: number | undefined;
    const tick = (time: number) => {
      if (previous === undefined || time - previous >= 32) {
        const dt = previous === undefined ? 0 : (time - previous) / 1000;
        previous = time;
        commit(advanceObjViewer(current.current, dt));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [state.paused, reducedMotion, commit]);

  const parsed = useMemo(() => parseObjSource(source, stage), [source, stage]);
  const normalization = useMemo(
    () => (stage >= 5 ? normalizeObjMesh(parsed.mesh) : null),
    [parsed.mesh, stage],
  );
  const error = parsed.diagnostics[0]
    ? `line ${parsed.diagnostics[0].line}: ${parsed.diagnostics[0].message}`
    : "";
  const mesh = useMemo(
    () =>
      error
        ? { positions: [], triangles: [], sourceFaceCount: 0 }
        : (normalization?.mesh ?? parsed.mesh),
    [error, normalization, parsed.mesh],
  );
  const scene = useMemo(
    () =>
      buildObjScene(
        mesh,
        OBJ_WIDTH,
        OBJ_HEIGHT,
        state.angleX,
        state.angleY,
        state.culling,
        { yaw: state.cameraYaw, pitch: state.cameraPitch, distance: state.distance },
        stage,
      ),
    [
      mesh,
      state.angleX,
      state.angleY,
      state.cameraYaw,
      state.cameraPitch,
      state.distance,
      state.culling,
      stage,
    ],
  );
  const rendered = useMemo(
    () =>
      state.solid && stage >= 6
        ? renderObjFrame(scene.triangles, OBJ_WIDTH, OBJ_HEIGHT, {
            reverseOrder: state.reverse,
            depthEnabled: stage >= 7,
          })
        : { frame: createZFrame(OBJ_WIDTH, OBJ_HEIGHT), message: "", candidates: 0 },
    [scene, state.solid, state.reverse, stage],
  );
  const frame = rendered.frame;
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context)
      drawObjViewer(context, size, scene, frame, state, stage, selected, error || rendered.message);
  }, [scene, frame, state, size, stage, selected, error, rendered.message]);

  const change = (patch: Partial<ObjViewerState>) => {
    cancel();
    commit({ ...current.current, ...patch });
  };
  const reset = () => {
    fileEpoch.current++;
    cancel();
    commit(initialObjViewer(stage));
    setSelected(0);
    setNotice("");
  };
  const loadSource = (text: string) => {
    pause();
    if (text.length > 2 * 1024 * 1024) {
      setNotice(
        "Canvas chỉ nhận tối đa 2 MiB để không chặn trang. Dùng ứng dụng C++ cho file lớn hơn.",
      );
      return;
    }
    const preview = parseObjSource(text, stage);
    if (preview.mesh.triangles.length > 6000) {
      setNotice(
        "Canvas giới hạn 6.000 triangle; file chưa được nạp. Dùng viewer C++ cho mesh lớn hơn.",
      );
      return;
    }
    setSource(text);
    setDraft(text);
    setSelected(0);
    setNotice("");
    setDifference("chưa kiểm tra");
  };
  const applyPreset = (next: ObjPreset) => {
    fileEpoch.current++;
    setPreset(next);
    loadSource(OBJ_PRESETS[next]);
  };
  const step = () => change({ ...advanceObjViewer(current.current, 1 / 60, true), paused: true });
  const checkOrder = () => {
    pause();
    const forward = renderObjFrame(scene.triangles, OBJ_WIDTH, OBJ_HEIGHT);
    const reverse = renderObjFrame(scene.triangles, OBJ_WIDTH, OBJ_HEIGHT, {
      reverseOrder: true,
    });
    if (forward.message || reverse.message) {
      setDifference("không chạy: mesh vượt ngân sách Canvas");
      return;
    }
    const result = zFrameDifference(forward.frame, reverse.frame);
    setDifference(`${result.colorPixels} color · ${result.depthPixels} depth`);
  };

  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || drag.current) return;
    event.currentTarget.focus();
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      id: event.pointerId,
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.width,
      start: current.current,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      drag.current = null;
      setCapturing(false);
      commit({ ...current.current, paused: true });
      return;
    }
    setCapturing(true);
    commit({ ...current.current, paused: true });
    event.preventDefault();
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    if (event.type !== "pointerup" && (event.buttons & 1) === 0) {
      cancel();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    commit(
      turnObjViewer(
        active.start,
        ((event.clientX - rect.left) / rect.width - active.x) * 6.4,
        ((event.clientY - rect.top) / rect.width - active.y) * 6.4,
      ),
    );
  };
  const pointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    pointerMove(event);
    cancel();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    const key = event.key.toLowerCase();
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      let x = 0,
        y = 0;
      if (event.key === "ArrowLeft") x = -0.08;
      if (event.key === "ArrowRight") x = 0.08;
      if (event.key === "ArrowUp") y = -0.08;
      if (event.key === "ArrowDown") y = 0.08;
      cancel();
      commit(turnObjViewer(current.current, x, y));
      return;
    }
    if (event.repeat) return;
    if (key === "r") reset();
    if (key === ".") step();
    if (key === "f") change({ debug: !current.current.debug });
    if (key === "g") change({ grid: !current.current.grid });
    if (stage >= 6 && key === "n") change({ normals: !current.current.normals });
    if (stage >= 6 && key === "c") change({ culling: !current.current.culling });
    if (stage >= 7 && key === "o") change({ reverse: !current.current.reverse });
    if (stage >= 8 && key === "w") change({ solid: !current.current.solid });
    if (stage >= 8 && key === "v") change({ cameraDrag: !current.current.cameraDrag });
    if (key === " ") {
      event.preventDefault();
      if (!reducedMotion) change({ paused: !current.current.paused });
    }
  };

  const indexLabels = useMemo(
    () => objFaceIndexLabels(source, parsed.mesh, selected),
    [source, parsed.mesh, selected],
  );
  const selectedScene = scene.triangles.find((t) => t.sourceTriangle === selected);
  return (
    <div className="lab-stack">
      <div className="lab-controls">
        <label>
          OBJ mẫu
          <select
            aria-label="OBJ mẫu"
            value={preset}
            onChange={(e) => applyPreset(e.target.value as ObjPreset)}
          >
            <option value="rocket">Rocket nhỏ</option>
            <option value="cube">Cube: 6 quad</option>
            <option value="triangle">Triangle có slash</option>
            <option value="slash">Quad có slash</option>
            <option value="negative">Pentagon index âm</option>
            <option value="malformed">Input có lỗi</option>
            <option value="custom" disabled>
              File/source của bạn
            </option>
          </select>
        </label>
        {stage >= 8 && (
          <label>
            Thao tác kéo
            <select
              aria-label="Thao tác kéo"
              value={state.cameraDrag ? "camera" : "model"}
              onChange={(e) => change({ cameraDrag: e.target.value === "camera", paused: true })}
            >
              <option value="model">Xoay model</option>
              <option value="camera">Camera orbit</option>
            </select>
          </label>
        )}
        {stage >= 8 && (
          <label className="check">
            <input
              type="checkbox"
              checked={state.solid}
              onChange={(e) => change({ solid: e.target.checked })}
            />
            Solid
          </label>
        )}
        {stage >= 6 && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={state.normals}
                onChange={(e) => change({ normals: e.target.checked })}
              />
              Normals
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={state.culling}
                onChange={(e) => change({ culling: e.target.checked })}
              />
              Back-face culling
            </label>
          </>
        )}
        {stage >= 7 && (
          <label className="check">
            <input
              type="checkbox"
              checked={state.reverse}
              onChange={(e) => change({ reverse: e.target.checked })}
            />
            Đảo draw order
          </label>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={state.debug}
            onChange={(e) => change({ debug: e.target.checked })}
          />
          Thông tin debug
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={state.grid}
            onChange={(e) => change({ grid: e.target.checked })}
          />
          Grid và axes
        </label>
        {stage >= 7 && (
          <label>
            Khoảng cách camera
            <input
              aria-label="Khoảng cách camera"
              type="range"
              min="1.1"
              max="9"
              step="0.1"
              value={state.distance}
              onChange={(e) => change({ distance: Number(e.target.value), paused: true })}
            />
          </label>
        )}
        <button
          type="button"
          disabled={reducedMotion}
          onClick={() => change({ paused: !current.current.paused })}
        >
          {state.paused || reducedMotion ? "Cho model quay" : "Tạm dừng"}
        </button>
        <button type="button" onClick={step}>
          Tiến một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {stage >= 7 && (
          <button type="button" onClick={checkOrder}>
            Kiểm tra thứ tự
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "420px", touchAction: "none" }}
        tabIndex={0}
        role="img"
        aria-label="OBJ mesh được parse, chuẩn hóa và render bằng CPU Z-buffer"
        aria-describedby={help}
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={(e) => {
          if (drag.current?.id === e.pointerId) cancel();
        }}
        onLostPointerCapture={(e) => {
          if (drag.current?.id === e.pointerId) cancel();
        }}
        onBlur={pause}
      />
      <p id={help}>
        Kéo hoặc dùng phím mũi tên. R đặt lại, Space chạy/dừng, dấu chấm tiến 1/60 giây. Tab rời
        Canvas.
        {stage >= 8
          ? " V đổi model/camera; W đổi solid/wireframe; N xem normals."
          : " Các công cụ chưa học sẽ xuất hiện ở bài sau."}{" "}
        {reducedMotion ? "Đã tắt tự quay theo reduced motion; bạn vẫn có thể tiến từng bước." : ""}
      </p>
      <label className="lab-source-editor">
        Nguồn OBJ đang thử
        <textarea
          aria-label="Nguồn OBJ"
          value={draft}
          maxLength={2 * 1024 * 1024}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            fileEpoch.current++;
            setPreset("custom");
            loadSource(draft);
          }}
        >
          Nạp source vào parser
        </button>
      </label>
      {stage >= 8 && (
        <label>
          Mở file OBJ (tối đa 2 MiB / 6.000 triangle trong Canvas)
          <input
            aria-label="Mở file OBJ"
            type="file"
            accept=".obj"
            onChange={async (e) => {
              const file = e.target.files?.[0],
                epoch = ++fileEpoch.current;
              e.target.value = "";
              if (!file) return;
              pause();
              if (file.size > 2 * 1024 * 1024) {
                setNotice("File quá 2 MiB; chưa nạp vào Canvas. Dùng viewer C++.");
                return;
              }
              try {
                const text = await file.text();
                if (epoch === fileEpoch.current) {
                  setPreset("custom");
                  loadSource(text);
                }
              } catch {
                if (epoch === fileEpoch.current)
                  setNotice("Không đọc được file OBJ; dữ liệu cũ được giữ nguyên.");
              }
            }}
          />
        </label>
      )}
      <p role="status">{notice || error || rendered.message || "Parser không phát hiện lỗi."}</p>
      {state.debug && (
        <LabReadout
          items={[
            {
              label: "Position / source face",
              value: `${parsed.mesh.positions.length} / ${parsed.mesh.sourceFaceCount}`,
            },
            { label: "Triangle sau fan", value: String(parsed.mesh.triangles.length) },
            {
              label: "OBJ index → vector index",
              value: indexLabels,
            },
            {
              label: "Model X / Y",
              value: `${state.angleX.toFixed(3)} / ${state.angleY.toFixed(3)}`,
            },
            ...(stage >= 8
              ? [
                  {
                    label: "Camera yaw / pitch",
                    value: `${state.cameraYaw.toFixed(3)} / ${state.cameraPitch.toFixed(3)}`,
                  },
                ]
              : []),
            ...(stage >= 5
              ? [
                  {
                    label: "Uniform scale",
                    value: normalization?.uniformScale.toFixed(4) ?? "không normalize được",
                  },
                ]
              : []),
            ...(stage >= 6
              ? [
                  {
                    label: "Normal / intensity",
                    value: selectedScene
                      ? `${selectedScene.normal.x.toFixed(2)}, ${selectedScene.normal.y.toFixed(2)}, ${selectedScene.normal.z.toFixed(2)} / ${selectedScene.intensity.toFixed(3)}`
                      : "—",
                  },
                ]
              : []),
            ...(stage >= 7
              ? [
                  { label: "Triangle cắt near", value: String(scene.clippedCount) },
                  {
                    label: "Fragment pass / reject",
                    value: `${frame.passedCount} / ${frame.rejectedCount}`,
                  },
                  { label: "Chênh lệch khi đảo order", value: difference },
                ]
              : []),
            { label: "Diagnostic đầu tiên", value: error || "không có" },
            { label: "pointer capture", value: capturing ? "đang kéo" : "đã nhả" },
          ]}
        />
      )}
      {stage >= 2 && state.debug && (
        <label>
          Triangle đang xem
          <input
            aria-label="Triangle đang xem"
            type="range"
            min="0"
            max={Math.max(0, parsed.mesh.triangles.length - 1)}
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
