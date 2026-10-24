"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  makeBruteScene,
  refreshBrute,
  bruteStage,
  editBrute,
  moveBrute,
  stepBrute,
  requestBrute,
  advanceBrute,
  stopBrute,
} from "@/lib/labs/brute-force-scene";
import {
  bruteView,
  bruteEventPoint,
  bruteScreenToWorld,
  bruteInView,
  makeBruteBitmap,
  drawBruteCanvas,
} from "./brute-force-view";
import { BruteControls, BruteReadout } from "./brute-force-controls";
import { useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function BruteForceParticleQueryLab({ mode }: { mode?: InteractiveLabMode }) {
  return <BruteTank key={mode ?? "brute-validation"} mode={mode} />;
}
function BruteTank({ mode }: { mode?: InteractiveLabMode }) {
  const stage = bruteStage(mode),
    canvasRef = useRef<HTMLCanvasElement>(null),
    owner = useRef<number | null>(null);
  const [scene, setScene] = useState(() => makeBruteScene(stage)),
    current = useRef(scene);
  const [capturing, setCapturing] = useState(false);
  const publish = useCallback(() => setScene({ ...current.current }), []);
  const release = useCallback(() => {
    const id = owner.current;
    owner.current = null;
    const canvas = canvasRef.current;
    if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    setCapturing(false);
  }, []);
  const stop = useCallback(() => {
    release();
    stopBrute(current.current);
    publish();
  }, [release, publish]);
  const size = useCanvasSize(canvasRef, stop),
    reduced = useReducedMotion();
  usePauseOnReducedMotion(stop);
  const reset = () => {
    release();
    const debug = current.current.debug;
    current.current = makeBruteScene(stage);
    current.current.debug = debug;
    refreshBrute(current.current);
    publish();
  };
  const edit = (key: "count" | "seed" | "radius" | "scanLimit", value: number) => {
    release();
    editBrute(current.current, key, value);
    publish();
  };
  const run = (scaling: boolean) => {
    release();
    requestBrute(current.current, scaling);
    publish();
  };
  const step = () => {
    release();
    stepBrute(current.current);
    publish();
  };
  const toggle = () => {
    release();
    if (!reduced) {
      current.current.paused = !current.current.paused;
      current.current.job.active = false;
    }
    publish();
  };
  const debug = () => {
    release();
    stopBrute(current.current);
    current.current.debug = !current.current.debug;
    publish();
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      refreshBrute(current.current);
      publish();
    });
    return () => cancelAnimationFrame(frame);
  }, [publish]);

  useEffect(() => {
    let frame: number | null = null,
      last: number | null = null;
    const tick = (time: number) => {
      const model = current.current;
      if (!model.job.active && model.paused) {
        frame = null;
        return;
      }
      const dt = last === null ? 0 : Math.min(0.05, (time - last) / 1000);
      last = time;
      if (reduced) model.paused = true;
      advanceBrute(model, dt);
      publish();
      frame = requestAnimationFrame(tick);
    };
    if (scene.job.active || !scene.paused) frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [scene.job.active, scene.paused, publish, reduced]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const blur = () => stop();
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hide);
      const id = owner.current;
      owner.current = null;
      if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    };
  }, [stop]);
  const cache = useRef<{
    count: number;
    seed: number;
    width: number;
    height: number;
    dpr: number;
    bitmap: HTMLCanvasElement;
  } | null>(null);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const old = cache.current;
    if (
      !old ||
      old.count !== scene.count ||
      old.seed !== scene.seed ||
      old.width !== size.width ||
      old.height !== size.height ||
      old.dpr !== size.dpr
    )
      cache.current = {
        count: scene.count,
        seed: scene.seed,
        ...size,
        bitmap: makeBruteBitmap(scene, size),
      };
    drawBruteCanvas(context, scene, size, cache.current!.bitmap);
  }, [scene, size]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) =>
    bruteEventPoint(event, event.currentTarget, size);
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    moveBrute(
      current.current,
      bruteScreenToWorld(point(event), bruteView(size.width, size.height)),
    );
    publish();
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      stage < 2 ||
      event.button !== 0 ||
      !event.isPrimary ||
      owner.current !== null ||
      !bruteInView(point(event), bruteView(size.width, size.height))
    )
      return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    owner.current = event.pointerId;
    setCapturing(true);
    move(event);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stage < 2) return;
    if (owner.current !== null) {
      if (owner.current !== event.pointerId) return;
      if (event.buttons === 0) {
        release();
        return;
      }
      move(event);
    } else if (
      event.pointerType === "mouse" &&
      bruteInView(point(event), bruteView(size.width, size.height))
    )
      move(event);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (owner.current !== event.pointerId || event.button !== 0) return;
    move(event);
    release();
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (owner.current === event.pointerId) stop();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "r") {
      event.preventDefault();
      reset();
    }
    if (key === "escape") {
      event.preventDefault();
      stop();
    }
    if (key === "b" && stage >= 5) {
      event.preventDefault();
      run(false);
    }
    if (key === "s" && stage >= 6) {
      event.preventDefault();
      run(true);
    }
    if (key === " " && stage >= 7) {
      event.preventDefault();
      toggle();
    }
    if (key === "n" && (stage === 3 || stage >= 7)) {
      event.preventDefault();
      step();
    }
    if (key === "f" && stage >= 7) {
      event.preventDefault();
      debug();
    }
    if (stage >= 2 && ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
      event.preventDefault();
      release();
      const center = current.current.query.center;
      moveBrute(current.current, {
        x: center.x + (key === "arrowright" ? 0.02 : key === "arrowleft" ? -0.02 : 0),
        y: center.y + (key === "arrowup" ? 0.02 : key === "arrowdown" ? -0.02 : 0),
      });
      publish();
    }
  };
  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) stop();
      }}
    >
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(500px,62vw,660px)", touchAction: "none" }}
        tabIndex={0}
        aria-label="Đám mây particle với kính lúp brute-force quanh con trỏ"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDown={onKeyDown}
      />
      <BruteControls
        scene={scene}
        reduced={reduced}
        edit={edit}
        run={run}
        stop={stop}
        step={step}
        toggle={toggle}
        reset={reset}
        debug={debug}
      />
      <BruteReadout scene={scene} capturing={capturing} />
      <p className="lab-hint">
        R reset; Esc dừng; Tab rời Canvas.
        {stage >= 2 &&
          " Rê chuột để đặt vòng tròn; giữ nút trái để kéo ra ngoài vùng vẽ. Phím mũi tên đổi tâm."}
        {stage === 3 && " N tiến scan prefix thêm 10%."}
        {stage >= 5 && " B chạy benchmark."}
        {stage >= 6 && " S chạy scaling."}
        {stage >= 7 &&
          " Space chạy/dừng auto probe, N tiến một bước, F debug. Reduced motion tắt auto; query tay và job hữu hạn vẫn dùng được."}
      </p>
    </div>
  );
}
