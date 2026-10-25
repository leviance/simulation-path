"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { computeSteering, findNeighbors, type BoidsParams } from "@/lib/labs/boids";
import { createBoidsBenchmark } from "@/lib/labs/boids-benchmark";
import {
  advanceBoidsScene,
  boidsModes,
  createBoidsScene,
  snapshotBoidsScene,
  stepBoidsScene,
  stopBoidsScene,
} from "@/lib/labs/boids-scene";
import { BoidsControls } from "./boids-controls";
import { boidsPointer, drawBoids, nearestBoid } from "./boids-view";
import { useCanvasSize, useReducedMotion } from "./lab-shared";

function BoidsLabScene({ mode }: { mode?: string }) {
  const helpId = useId();
  const index = boidsModes.indexOf(mode as (typeof boidsModes)[number]);
  const initialStage = index < 0 ? 9 : index + 1;
  const model = useRef(createBoidsScene(initialStage));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const owner = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const [scene, setScene] = useState(() => createBoidsScene(initialStage));
  const publish = useCallback(() => setScene(snapshotBoidsScene(model.current)), []);
  const release = useCallback(() => {
    const id = owner.current;
    owner.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    release();
    stopBoidsScene(model.current);
    publish();
  }, [release, publish]);
  const size = useCanvasSize(canvasRef, stop);
  const reset = useCallback(
    (count = model.current.count, seed = model.current.seed) => {
      release();
      model.current = createBoidsScene(initialStage, count, seed, model.current.params);
      publish();
    },
    [initialStage, release, publish],
  );

  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
      release();
    };
  }, [release, stop]);
  useEffect(() => {
    if (reduced) {
      const frame = requestAnimationFrame(stop);
      return () => cancelAnimationFrame(frame);
    }
  }, [reduced, stop]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) drawBoids(context, scene, size);
  }, [scene, size]);

  const running = !scene.paused || !!scene.job?.active;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last: number | null = null;
    const tick = (time: number) => {
      const current = model.current;
      if (reduced) current.paused = true;
      advanceBoidsScene(current, last === null ? 0 : (time - last) / 1000);
      last = time;
      publish();
      if (!current.paused || current.job?.active) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, reduced, publish]);

  const toggle = () => {
    release();
    if (!reduced && !model.current.job?.active) model.current.paused = !model.current.paused;
    model.current.accumulator = 0;
    publish();
  };
  const step = () => {
    stopBoidsScene(model.current);
    stepBoidsScene(model.current);
    publish();
  };
  const parameter = (key: keyof BoidsParams, value: number) => {
    if (model.current.job) model.current.job.active = false;
    model.current.params[key] = value;
    model.current.job = null;
    publish();
  };
  const pointerPoint = (event: PointerEvent<HTMLCanvasElement>) =>
    boidsPointer({ x: event.clientX, y: event.clientY }, event.currentTarget, size, model.current);
  const drag = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointerPoint(event);
    if (point && model.current.paused) model.current.boids[model.current.selected].position = point;
    publish();
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointerPoint(event);
    if (!point || event.button !== 0 || !event.isPrimary || owner.current !== null) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    owner.current = event.pointerId;
    model.current.selected = nearestBoid(point, model.current);
    event.currentTarget.focus();
    publish();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (owner.current !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      release();
      return;
    }
    drag(event);
  };
  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    if (owner.current !== event.pointerId || event.button !== 0) return;
    drag(event);
    release();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const pressed = event.key.toLowerCase();
    if (![" ", "n", "r", "d", "escape", "arrowleft", "arrowright"].includes(pressed)) return;
    event.preventDefault();
    if (pressed === " ") toggle();
    if (pressed === "n") step();
    if (pressed === "r") reset();
    if (pressed === "d") {
      model.current.debug = !model.current.debug;
      publish();
    }
    if (pressed === "escape") stop();
    if (pressed.startsWith("arrow")) {
      const offset = pressed === "arrowleft" ? -1 : 1;
      model.current.selected =
        (model.current.selected + offset + model.current.count) % model.current.count;
      publish();
    }
  };
  const blur = (event: FocusEvent<HTMLDivElement>) => {
    // Chuyển từ Canvas sang nút Pause không được pause rồi toggle thành chạy lại.
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    )
      stop();
  };
  const neighbors =
    scene.stage >= 3 ? findNeighbors(scene.boids, scene.selected, scene.params) : [];
  const steering =
    scene.stage >= 4
      ? computeSteering(scene.boids, scene.selected, neighbors, scene.params, scene.stage)
      : null;
  const selected = scene.boids[scene.selected];
  return (
    <div
      className="lab-body"
      onBlur={blur}
      data-boids-stage={scene.stage}
      data-boids-count={scene.count}
      data-boids-steps={scene.steps}
      data-boids-paused={scene.paused}
    >
      <BoidsControls
        scene={scene}
        reduced={reduced}
        commands={{
          toggle,
          step,
          reset,
          cancel: stop,
          debug: () => {
            release();
            model.current.debug = !model.current.debug;
            publish();
          },
          benchmark: () => {
            stop();
            model.current.job = createBoidsBenchmark(model.current.seed, model.current.params);
            publish();
          },
          count: (count) => reset(count),
          seed: (seed) => reset(scene.count, seed),
          parameter,
        }}
      />
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng đàn Boids 2D"
        aria-describedby={helpId}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={(event) => {
          if (owner.current === event.pointerId) stop();
        }}
        onLostPointerCapture={(event) => {
          if (owner.current === event.pointerId) stop();
        }}
        onBlur={release}
        style={{ touchAction: "none", height: "clamp(300px, 50vw, 520px)" }}
      />
      <p id={helpId}>
        Bấm để chọn cá thể; khi tạm dừng có thể kéo nó. Trên Canvas: Space chạy/dừng, N tiến một
        bước, ←/→ đổi cá thể, R đặt lại, D bật debug, Escape dừng/hủy.{" "}
        {reduced && "Reduced motion đang bật: chỉ dùng tiến từng bước."}
      </p>
      <p>
        Đỏ: separation · Xanh dương: alignment · Xanh lá: cohesion · Vàng: gia tốc tổng. Miền tuần
        hoàn: hàng xóm ở mép đối diện vẫn tương tác.
      </p>
      <dl className="lab-readout">
        <div>
          <dt>Đã cập nhật</dt>
          <dd>
            {scene.steps} bước · t={scene.time.toFixed(3)} s
          </dd>
        </div>
        <div>
          <dt>Cá thể đang chọn</dt>
          <dd>
            ID {selected.id} · ({selected.position.x.toFixed(1)}, {selected.position.y.toFixed(1)})
          </dd>
        </div>
        {scene.debug &&
          steering &&
          (
            [
              ["Separation", steering.separation, 4],
              ["Alignment", steering.alignment, 5],
              ["Cohesion", steering.cohesion, 6],
              ["Gia tốc tổng", steering.acceleration, 4],
            ] as const
          )
            .filter(([, , stage]) => scene.stage >= stage)
            .map(([name, vector]) => (
              <div key={name}>
                <dt>{name} của cá thể đang chọn</dt>
                <dd>
                  ({vector.x.toFixed(2)}, {vector.y.toFixed(2)}) world/s²
                </dd>
              </div>
            ))}
        <div>
          <dt>Hàng xóm / số phép kiểm toàn đàn</dt>
          <dd>
            {neighbors.length} / {scene.metrics.comparisons.toLocaleString("vi-VN")}
          </dd>
        </div>
        <div>
          <dt>Query / steering+update / toàn bước</dt>
          <dd>
            {scene.metrics.queryMs.toFixed(2)} / {scene.metrics.updateMs.toFixed(2)} /{" "}
            {scene.metrics.totalMs.toFixed(2)} ms
          </dd>
        </div>
        <div>
          <dt>Thời gian thực bỏ khi quá tải</dt>
          <dd>{scene.droppedSeconds.toFixed(3)} s — mô phỏng không chạy bù vô hạn</dd>
        </div>
      </dl>
      {scene.job?.active && (
        <p role="status">
          Đang đo mốc {scene.job.row + 1}/3; warm-up {scene.job.warmup}/2; mẫu{" "}
          {scene.job.samples.length}/7.
        </p>
      )}
      {!!scene.job?.rows.length && (
        <table>
          <caption>
            Release C++ và trình duyệt là hai môi trường đo riêng. Mỗi dòng dùng cùng snapshot/seed,
            2 warm-up và 7 mẫu.
          </caption>
          <thead>
            <tr>
              <th>N</th>
              <th>Phép kiểm/bước</th>
              <th>Median ms</th>
              <th>Min–max ms</th>
              <th>Checksum</th>
            </tr>
          </thead>
          <tbody>
            {scene.job.rows.map((row) => (
              <tr key={row.count}>
                <td>{row.count}</td>
                <td>{row.comparisons}</td>
                <td>{row.medianMs.toFixed(2)}</td>
                <td>
                  {row.minMs.toFixed(2)}–{row.maxMs.toFixed(2)}
                </td>
                <td>{row.checksum.toString(16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Boids2dLab({ mode }: { mode?: string }) {
  return <BoidsLabScene key={mode ?? "final"} mode={mode} />;
}
