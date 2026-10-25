"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { BoidsParams } from "@/lib/labs/boids";
import { buildBoidsGrid, queryBoidsGrid } from "@/lib/labs/boids-grid";
import { createGridBenchmark } from "@/lib/labs/boids-grid-benchmark";
import {
  advanceGridScene,
  boidsGridModes,
  createGridScene,
  requestGridStep,
  stopGridScene,
  validateGridScene,
} from "@/lib/labs/boids-grid-scene";
import type { FlockLayout, GridMethod } from "@/lib/labs/boids-grid-step";
import { BoidsGridControls } from "./boids-grid-controls";
import { BoidsGridReadout } from "./boids-grid-readout";
import { drawBoidsGrid } from "./boids-grid-view";
import { boidsPointer, nearestBoid } from "./boids-view";
import { useCanvasSize, useReducedMotion } from "./lab-shared";

function GridLabScene({ mode }: { mode?: string }) {
  const stageIndex = boidsGridModes.indexOf(mode as (typeof boidsGridModes)[number]);
  const stage = stageIndex < 0 ? 10 : stageIndex + 1;
  const [scene, setScene] = useState(() => createGridScene(stage));
  const model = useRef(scene);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const owner = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const helpId = useId();
  const publish = useCallback(() => {
    const current = model.current;
    setScene({
      ...current,
      job: current.job ? { ...current.job, metrics: { ...current.job.metrics } } : null,
      validation: current.validation ? { ...current.validation } : null,
      benchmark: current.benchmark
        ? { ...current.benchmark, rows: [...current.benchmark.rows] }
        : null,
    });
  }, []);
  const release = useCallback(() => {
    const id = owner.current;
    owner.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    release();
    stopGridScene(model.current);
    publish();
  }, [publish, release]);
  const size = useCanvasSize(canvasRef, stop);
  const reset = (
    count = model.current.count,
    seed = model.current.seed,
    layout = model.current.layout,
  ) => {
    stop();
    const current = model.current;
    model.current = createGridScene(stage, count, seed, current.params, current.cellSize, layout);
    publish();
  };
  const parameter = (name: keyof BoidsParams, value: number) => {
    stop();
    model.current.params = { ...model.current.params, [name]: value };
    model.current.metrics = null;
    model.current.validation = null;
    model.current.benchmark = null;
    publish();
  };
  const toggle = () => {
    const wasPaused = model.current.paused;
    stop();
    if (!reduced && wasPaused) model.current.paused = false;
    publish();
  };
  const step = () => {
    release();
    requestGridStep(model.current);
    publish();
  };
  const method = (value: GridMethod) => {
    stop();
    if (value === "brute" && model.current.count > 1024)
      model.current.notice = "Brute force chỉ dùng ở preset nhỏ; N không bị thay đổi.";
    else model.current.method = value;
    publish();
  };
  const cellSize = (value: number) => {
    stop();
    model.current.cellSize = value;
    model.current.metrics = null;
    model.current.validation = null;
    model.current.benchmark = null;
    publish();
  };
  const layout = (value: FlockLayout) => reset(model.current.count, model.current.seed, value);
  const benchmark = (plan: "scale" | "cells") => {
    stop();
    const current = model.current;
    current.validation = null;
    current.benchmark = createGridBenchmark(
      current.params,
      current.seed,
      current.cellSize,
      current.layout,
      plan,
    );
    publish();
  };
  const validate = () => {
    release();
    validateGridScene(model.current);
    publish();
  };

  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
      stopGridScene(model.current);
      release();
    };
  }, [release, stop]);
  useEffect(() => {
    if (reduced) {
      const frame = requestAnimationFrame(stop);
      return () => cancelAnimationFrame(frame);
    }
  }, [reduced, stop]);
  const running =
    !scene.paused || !!scene.job || !!scene.benchmark?.active || !!scene.validation?.active;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last: number | null = null;
    const tick = (time: number) => {
      const current = model.current;
      if (reduced) current.paused = true;
      advanceGridScene(current, last === null ? 0 : (time - last) / 1000);
      last = time;
      publish();
      if (!current.paused || current.job || current.benchmark?.active || current.validation?.active)
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, reduced, publish]);
  // Không dựng lại grid hoặc vẽ lại 10.000 cá thể chỉ vì progress của batch đổi.
  const inspection = useMemo(() => {
    const grid = buildBoidsGrid(scene.boids, scene.params, scene.cellSize);
    return { grid, query: queryBoidsGrid(scene.boids, scene.selected, scene.params, grid) };
  }, [scene.boids, scene.params, scene.cellSize, scene.selected]);
  const viewState = useMemo(
    () => ({
      stage: 9,
      boids: scene.boids,
      params: scene.params,
      selected: scene.selected,
      debug: scene.debug,
    }),
    [scene.boids, scene.params, scene.selected, scene.debug],
  );
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context)
      drawBoidsGrid(
        context,
        viewState,
        size,
        inspection.grid,
        inspection.query,
        scene.showCells,
        scene.showOccupancy,
      );
  }, [viewState, size, inspection, scene.showCells, scene.showOccupancy]);

  const pointerPoint = (event: PointerEvent<HTMLCanvasElement>) =>
    boidsPointer({ x: event.clientX, y: event.clientY }, event.currentTarget, size, {
      ...model.current,
      stage: 9,
    });
  const drag = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointerPoint(event);
    const current = model.current;
    if (!point || !current.paused) return;
    stopGridScene(current);
    current.boids = current.boids.map((boid, index) =>
      index === current.selected ? { ...boid, position: point } : boid,
    );
    current.metrics = null;
    current.validation = null;
    current.benchmark = null;
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
    model.current.selected = nearestBoid(point, { ...model.current, stage: 9 });
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
    if (pressed === "escape") stop();
    if (pressed === "d") model.current.debug = !model.current.debug;
    if (pressed === "arrowleft")
      model.current.selected =
        (model.current.selected + model.current.count - 1) % model.current.count;
    if (pressed === "arrowright")
      model.current.selected = (model.current.selected + 1) % model.current.count;
    publish();
  };
  const blur = (event: FocusEvent<HTMLDivElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    )
      stop();
  };
  return (
    <div
      className="lab-body"
      onBlur={blur}
      data-grid-count={scene.count}
      data-grid-steps={scene.steps}
      data-grid-paused={scene.paused}
    >
      <BoidsGridControls
        scene={scene}
        reduced={reduced}
        commands={{
          toggle,
          step,
          reset,
          stop,
          count: (count) => reset(count),
          seed: (seed) => reset(scene.count, seed),
          cellSize,
          layout,
          method,
          parameter,
          benchmark,
          validate,
          debug: (name) => {
            release();
            model.current[name] = !model.current[name];
            publish();
          },
        }}
      />
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Đàn Boids lớn với Spatial Grid"
        aria-describedby={helpId}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onKeyDown={key}
        onBlur={release}
        onPointerCancel={(event) => {
          if (owner.current === event.pointerId) stop();
        }}
        onLostPointerCapture={(event) => {
          if (owner.current === event.pointerId) stop();
        }}
        style={{ touchAction: "none", height: "clamp(300px, 50vw, 520px)" }}
      />
      <p id={helpId}>
        Bấm để chọn, kéo khi tạm dừng. Space chạy/dừng; N tiến một bước; ←/→ chọn cá thể; R đặt lại;
        D bật debug; Escape hủy. {reduced && "Reduced motion: chỉ tiến từng bước."}
      </p>
      <p>
        Cá thể xanh dương: candidate chưa lọt bán kính; vàng: hàng xóm chính xác; trắng: cá thể đang
        chọn. Các mũi tên đỏ/xanh dương/xanh lá/vàng lần lượt là separation/alignment/cohesion/gia
        tốc tổng. Đổi thuật toán không tạo lại đàn. Chỉ trạng thái đã tính đủ N cá thể mới được hiển
        thị.
      </p>
      <BoidsGridReadout scene={scene} grid={inspection.grid} query={inspection.query} />
    </div>
  );
}

export default function BoidsSpatialGridLab({ mode }: { mode?: string }) {
  return <GridLabScene key={mode ?? "final"} mode={mode} />;
}
