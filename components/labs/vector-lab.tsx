"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { length, clamp, type Point } from "@/lib/labs/geometry";
import {
  vectorScene,
  beginVectorDrag,
  moveVectorEndpoint,
  nudgeVector,
  vectorResults,
  vectorLayers,
  vectorScreenToWorld,
  type VectorScene,
} from "@/lib/labs/vector-playground";
import { LabReadout, useCanvasSize } from "./lab-shared";
import { drawVectorLab, vectorPointFromEvent } from "./vector-lab-view";
import type { InteractiveLabMode } from "./types";

export default function VectorLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const [scene, setScene] = useState<VectorScene>(vectorScene);
  const sceneRef = useRef(scene);
  const owner = useRef<number | null>(null);
  const previousMode = useRef(mode);
  const [preset, setPreset] = useState("basic");
  const [paused, setPaused] = useState(false);
  const [cursorScreen, setCursorScreen] = useState<Point | null>(null);
  const layers = vectorLayers(mode, scene.viewMode);
  const results = vectorResults(scene);
  const updateScene = (next: VectorScene) => {
    sceneRef.current = next;
    setScene(next);
  };
  const release = () => {
    const id = owner.current;
    owner.current = null;
    const canvas = canvasRef.current;
    if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    if (sceneRef.current.dragged >= 0) updateScene({ ...sceneRef.current, dragged: -1 });
  };
  useEffect(() => {
    const blur = () => release();
    const hidden = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, []);
  useEffect(() => {
    release();
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      updateScene(vectorScene());
      setPreset("basic");
      setPaused(false);
      setCursorScreen(null);
    }
  }, [size.width, size.height, mode]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawVectorLab(ctx, size, scene, vectorLayers(mode, scene.viewMode));
  }, [size, scene, mode]);
  const togglePause = () => {
    release();
    setPaused((value) => !value);
  };
  const reset = () => {
    release();
    updateScene(vectorScene());
    setPreset("basic");
    setPaused(false);
    setCursorScreen(null);
  };
  const choosePreset = (value: string) => {
    release();
    setPreset(value);
    updateScene(vectorScene(value, sceneRef.current.selected));
  };
  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      paused ||
      !layers.canDrag ||
      !event.isPrimary ||
      event.button !== 0 ||
      owner.current !== null
    )
      return;
    const screen = vectorPointFromEvent(event, size);
    if (!screen) return;
    event.preventDefault();
    event.currentTarget.focus();
    setCursorScreen(screen);
    const next = beginVectorDrag(sceneRef.current, screen);
    updateScene(next);
    if (next.dragged < 0) return;
    owner.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreset("custom");
  };
  const moveEndpoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused || (owner.current !== null && owner.current !== event.pointerId)) return;
    const screen = vectorPointFromEvent(event, size, owner.current !== null);
    if (!screen) {
      release();
      return;
    }
    setCursorScreen(screen);
    if (owner.current === null) return;
    if ((event.buttons & 1) === 0) {
      release();
      return;
    }
    updateScene(moveVectorEndpoint(sceneRef.current, screen));
  };
  const endDrag = (event: ReactPointerEvent<HTMLCanvasElement>, cancelled = false) => {
    if (owner.current !== event.pointerId || (!cancelled && event.button !== 0)) return;
    const screen = vectorPointFromEvent(event, size, true);
    if (!cancelled && !paused && screen) {
      updateScene(moveVectorEndpoint(sceneRef.current, screen));
      setCursorScreen(screen);
    }
    release();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    if (![" ", "r", "R", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key))
      return;
    event.preventDefault();
    if (key === " ") {
      if (!event.repeat) togglePause();
      return;
    }
    if (key === "Escape") {
      release();
      return;
    }
    if (paused) return;
    if (key.toLowerCase() === "r") {
      if (!event.repeat) reset();
      return;
    }
    if (!layers.canDrag) return;
    release();
    const deltaWorld = { x: 0, y: 0 };
    if (key === "ArrowLeft") deltaWorld.x = -0.1;
    if (key === "ArrowRight") deltaWorld.x = 0.1;
    if (key === "ArrowUp") deltaWorld.y = 0.1;
    if (key === "ArrowDown") deltaWorld.y = -0.1;
    updateScene(nudgeVector(sceneRef.current, deltaWorld));
    setPreset("custom");
  };
  const pair = (p: Point) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`;
  const cursorWorld = cursorScreen ? vectorScreenToWorld(cursorScreen) : null;
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Trường hợp
          <select
            value={preset}
            disabled={paused}
            onChange={(event) => choosePreset(event.target.value)}
          >
            <option value="basic">Hai hướng khác nhau</option>
            <option value="perpendicular">Vuông góc</option>
            <option value="opposite">Đối hướng</option>
            <option value="zero">A bằng zero</option>
            <option value="bothZero">Cả hai bằng zero</option>
            {preset === "custom" && <option value="custom">Tự chỉnh</option>}
          </select>
        </label>
        {layers.canDrag && (
          <label>
            Điểm đang chọn
            <select
              aria-label="Chọn vector"
              value={scene.selected}
              disabled={paused}
              onChange={(event) => {
                release();
                updateScene({ ...sceneRef.current, selected: Number(event.target.value) as 0 | 1 });
              }}
            >
              <option value={0}>A</option>
              <option value={1}>B</option>
            </select>
          </label>
        )}
        {layers.full && (
          <label>
            Lớp bổ sung
            <select
              aria-label="Lớp bổ sung"
              value={scene.viewMode}
              disabled={paused}
              onChange={(event) => {
                release();
                updateScene({
                  ...sceneRef.current,
                  viewMode: event.target.value as VectorScene["viewMode"],
                });
              }}
            >
              <option value="arithmetic">Chỉ cộng/trừ</option>
              <option value="scalar">Scalar và distance</option>
              <option value="unit">Normalize và vòng tròn đơn vị</option>
              <option value="lerp">Lerp</option>
              <option value="all">Tất cả</option>
            </select>
          </label>
        )}
        {layers.scalar && (
          <label>
            Scalar
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={scene.scalar}
              disabled={paused}
              onChange={(event) => {
                release();
                updateScene({
                  ...sceneRef.current,
                  scalar: clamp(Number(event.target.value), -2, 2),
                });
              }}
            />
            <output>{scene.scalar.toFixed(1)}</output>
          </label>
        )}
        {layers.interpolation && (
          <label>
            t
            <input
              aria-label="Tham số t"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={scene.interpolation}
              disabled={paused}
              onChange={(event) => {
                release();
                updateScene({
                  ...sceneRef.current,
                  interpolation: clamp(Number(event.target.value), 0, 1),
                });
              }}
            />
            <output>{scene.interpolation.toFixed(2)}</output>
          </label>
        )}
        <button onClick={togglePause}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <p className="control-hint">
        {layers.canDrag
          ? "Kéo điểm cuối A/B hoặc chọn vector trong danh sách rồi dùng mũi tên. Nhấn vùng trống không tạo vector mới. Trùng điểm thì ưu tiên vector đang chọn."
          : "Chọn preset để quan sát hai vector; phần kéo thả được giới thiệu ở bài tiếp."}{" "}
        Space tạm dừng, R đặt lại; Tab luôn rời Canvas bình thường. Miền endpoint: X từ −4 đến 4, Y
        từ −3 đến 3.
      </p>
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(340px, 52vw, 520px)" }}
        onPointerDown={startDrag}
        onPointerMove={moveEndpoint}
        onPointerUp={endDrag}
        onPointerCancel={(event) => endDrag(event, true)}
        onLostPointerCapture={(event) => {
          if (owner.current === event.pointerId) release();
        }}
        onBlur={release}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Mô phỏng vector 2D; kéo đầu mũi tên hoặc chọn A/B rồi dùng bàn phím"
      />
      <LabReadout
        items={[
          { label: "A", value: pair(scene.vectorA) + " · |A|=" + length(scene.vectorA).toFixed(3) },
          { label: "B", value: pair(scene.vectorB) + " · |B|=" + length(scene.vectorB).toFixed(3) },
          ...(layers.addition ? [{ label: "A+B", value: pair(results.vectorSum) }] : []),
          ...(layers.subtraction ? [{ label: "A−B", value: pair(results.vectorDifference) }] : []),
          ...(layers.scalar
            ? [
                { label: "scalar × A", value: pair(results.scaledA) },
                { label: "distance(A,B)", value: results.distanceAB.toFixed(6) },
              ]
            : []),
          ...(layers.unit
            ? [
                {
                  label: "normalize(A)",
                  value: pair(results.unitA) + " · length=" + length(results.unitA).toFixed(6),
                },
                {
                  label: "Hướng của A",
                  value:
                    length(scene.vectorA) === 0
                      ? "Không xác định; trả vector 0 theo quy ước"
                      : "Cùng hướng với vector đơn vị",
                },
              ]
            : []),
          ...(layers.interpolation
            ? [
                {
                  label: "lerp(A,B,t)",
                  value: pair(results.point) + " tại t=" + scene.interpolation.toFixed(2),
                },
              ]
            : []),
          ...(layers.dragDetails
            ? [
                { label: "Vùng chọn", value: "14 px quanh endpoint trên bảng logic" },
                { label: "Con trỏ screen", value: cursorScreen ? pair(cursorScreen) + " px" : "—" },
                { label: "Con trỏ world", value: cursorWorld ? pair(cursorWorld) : "—" },
                {
                  label: "Đang kéo",
                  value: scene.dragged < 0 ? "Không" : scene.dragged === 0 ? "A" : "B",
                },
              ]
            : []),
        ]}
      />
      <p className="control-hint">
        Mô phỏng không tự chạy animation. Chế độ giảm chuyển động không làm mất thao tác; các giá
        trị bên trên là phần mô tả thay thế cho hình vẽ.
      </p>
    </div>
  );
}
