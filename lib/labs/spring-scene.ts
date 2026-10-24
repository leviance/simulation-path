import {
  makeSpringChain,
  cloneSpringChain,
  accumulateSpringForces,
  trySpringStep,
  measureSpringChain,
  totalSpringMechanicalEnergy,
  planSpringFixedSteps,
  nearestDynamicSpringParticle,
  estimateSpringReleaseVelocity,
  springAdd,
  springSubtract,
  springScale,
  springLength,
  finiteSpringVector,
  type SpringChainState,
  type SpringVec2,
  type SpringMetrics,
  type SpringDragConstraint,
} from "./spring-chain.ts";

export const SPRING_STEPS = [1 / 960, 1 / 480, 1 / 240, 1 / 120, 1 / 30];
export const SPRING_GRAVITY = { x: 0, y: -9.81 };
const MODES = [
  "spring-scene",
  "spring-hooke",
  "spring-forces",
  "spring-integration",
  "spring-damping",
  "spring-drag",
  "spring-stability",
  "spring-validation",
];
export function springStage(mode?: string) {
  const index = MODES.indexOf(mode ?? "");
  return index < 0 ? 8 : index + 1;
}
export interface SpringEnergySample {
  time: number;
  kinetic: number;
  elastic: number;
  gravity: number;
  total: number;
}
export interface SpringIntegrationTrace {
  index: number;
  force: SpringVec2;
  acceleration: SpringVec2;
  positionBefore: SpringVec2;
  velocityBefore: SpringVec2;
  positionAfter: SpringVec2;
  velocityAfter: SpringVec2;
  kinematic: boolean;
}
export interface SpringScene {
  stage: number;
  count: number;
  stiffness: number;
  mass: number;
  damping: number;
  restLength: number;
  gravityEnabled: boolean;
  dampingEnabled: boolean;
  dtIndex: number;
  debug: boolean;
  paused: boolean;
  chain: SpringChainState;
  selected: number;
  pairDistance: number;
  pairAngle: number;
  elapsed: number;
  steps: number;
  substeps: number;
  accumulator: number;
  droppedTime: number;
  fastRemaining: number;
  metrics: SpringMetrics;
  initialEnergy: number;
  history: SpringEnergySample[];
  drag: SpringDragConstraint | null;
  trace: SpringIntegrationTrace | null;
  message: string;
}
const metricsOf = (s: SpringScene) => measureSpringChain(s.chain, SPRING_GRAVITY, s.gravityEnabled);
export function refreshSpringScene(s: SpringScene): SpringScene {
  return { ...s, metrics: metricsOf(s) };
}
export function recordSpringEnergy(s: SpringScene, force = false): SpringScene {
  if (s.stage < 8) return s;
  const interval = s.elapsed - (s.history.at(-1)?.time ?? -Infinity);
  if (interval <= 1e-12 || (!force && interval < 1 / 60 - 1e-12)) return s;
  const m = s.metrics;
  const value = {
    time: s.elapsed,
    kinetic: m.kineticEnergy,
    elastic: m.springEnergy,
    gravity: m.gravitationalEnergy,
    total: totalSpringMechanicalEnergy(m),
  };
  return { ...s, history: [...s.history, value].slice(-1201) };
}
export function stopSpringScene(s: SpringScene): SpringScene {
  return { ...s, paused: true, fastRemaining: 0, accumulator: 0, substeps: 0 };
}
export function rebaseSpringScene(s: SpringScene): SpringScene {
  const metrics = metricsOf(s);
  return recordSpringEnergy(
    {
      ...s,
      metrics,
      initialEnergy: totalSpringMechanicalEnergy(metrics),
      elapsed: 0,
      steps: 0,
      substeps: 0,
      accumulator: 0,
      droppedTime: 0,
      fastRemaining: 0,
      history: [],
      trace: null,
    },
    true,
  );
}
function rebuild(s: SpringScene): SpringScene {
  const chain = makeSpringChain(
    s.stage === 2 ? 2 : s.count,
    { x: 0, y: 0 },
    s.stage === 2 ? 1 : s.restLength,
    s.mass,
    0.1,
    s.stiffness,
    s.damping,
  );
  const selected = s.stage === 2 ? 1 : Math.floor(chain.particles.length / 2);
  if (s.stage === 2)
    chain.particles[1].position = {
      x: s.pairDistance * Math.cos(s.pairAngle),
      y: s.pairDistance * Math.sin(s.pairAngle),
    };
  if (s.stage >= 3) chain.particles[selected].position.x += 0.35;
  if (s.stage === 3) accumulateSpringForces(chain, SPRING_GRAVITY, s.gravityEnabled, false);
  return rebaseSpringScene({ ...s, chain, selected, drag: null, paused: true, message: "" });
}
export function makeSpringScene(stage = 8): SpringScene {
  const chain = makeSpringChain(32, { x: 0, y: 0 }, 0.22, 0.04, 0.1, 120, 0.24);
  return rebuild({
    stage,
    count: 32,
    stiffness: 120,
    mass: 0.04,
    damping: 0.24,
    restLength: 0.22,
    gravityEnabled: stage >= 3,
    dampingEnabled: stage >= 5,
    dtIndex: 1,
    debug: true,
    paused: true,
    chain,
    selected: 16,
    pairDistance: 1.2,
    pairAngle: 0,
    elapsed: 0,
    steps: 0,
    substeps: 0,
    accumulator: 0,
    droppedTime: 0,
    fastRemaining: 0,
    metrics: measureSpringChain(chain, SPRING_GRAVITY, false),
    initialEnergy: 0,
    history: [],
    drag: null,
    trace: null,
    message: "",
  });
}
export type SpringSetting =
  | "count"
  | "stiffness"
  | "mass"
  | "damping"
  | "dtIndex"
  | "gravityEnabled"
  | "dampingEnabled"
  | "pairDistance"
  | "pairAngle"
  | "selected";
export function editSpringScene(s: SpringScene, key: SpringSetting, value: number): SpringScene {
  if (!Number.isFinite(value)) return s;
  if (key === "selected")
    return s.stage >= 6 && Number.isInteger(value) && value > 0 && value < s.chain.particles.length
      ? { ...s, selected: value }
      : s;
  if (key === "pairDistance" || key === "pairAngle") {
    if (
      s.stage !== 2 ||
      (key === "pairDistance" && (value < 0.1 || value > 1.8)) ||
      (key === "pairAngle" && Math.abs(value) > Math.PI)
    )
      return s;
    return rebuild({ ...s, [key]: value });
  }
  if (key === "gravityEnabled") {
    if (s.stage < 3 || (value !== 0 && value !== 1)) return s;
    return rebuild({ ...s, gravityEnabled: !!value });
  }
  if (key === "dampingEnabled" || key === "damping") {
    if (
      s.stage < 5 ||
      (key === "damping" && (value < 0 || value > 1.6)) ||
      (key === "dampingEnabled" && value !== 0 && value !== 1)
    )
      return s;
    const chain = cloneSpringChain(s.chain);
    if (key === "damping") for (const link of chain.springs) link.damping = value;
    return rebaseSpringScene({
      ...stopSpringScene(s),
      chain,
      drag: null,
      [key]: key === "dampingEnabled" ? !!value : value,
      message: "Đổi damping: bắt đầu lại mốc đo, giữ vị trí và vận tốc.",
    });
  }
  if (s.stage < 7) return s;
  if (
    (key === "count" && ![20, 32, 64, 100].includes(value)) ||
    (key === "stiffness" && (value < 60 || value > 1200)) ||
    (key === "mass" && (value < 0.02 || value > 0.16)) ||
    (key === "dtIndex" && (!Number.isInteger(value) || value < 0 || value >= SPRING_STEPS.length))
  )
    return s;
  return rebuild({ ...s, [key]: value });
}
export function presetSpringScene(stage: number, preset: number) {
  let s = makeSpringScene(stage);
  if (stage < 7) return s;
  if (preset === 1 || preset === 2)
    s = { ...s, gravityEnabled: false, dampingEnabled: preset === 2 };
  if (preset === 3)
    s = {
      ...s,
      gravityEnabled: false,
      dampingEnabled: false,
      stiffness: 1200,
      mass: 0.02,
      dtIndex: 4,
    };
  return rebuild(s);
}
function withinExperiment(chain: SpringChainState) {
  return chain.particles.every(
    (p) =>
      Math.abs(p.position.x) <= 1000 &&
      Math.abs(p.position.y) <= 1000 &&
      springLength(p.velocity) <= 10000,
  );
}
function tick(s: SpringScene): SpringScene {
  const dt = SPRING_STEPS[s.dtIndex];
  if (s.stage < 4) return s;
  if (
    !Number.isFinite(dt) ||
    !Number.isInteger(s.selected) ||
    s.selected < 1 ||
    s.selected >= s.chain.particles.length
  )
    return {
      ...stopSpringScene(s),
      drag: null,
      message: "Cấu hình bước hoặc node được chọn không hợp lệ.",
    };
  const before = s.chain.particles[s.selected];
  const result = trySpringStep(
    s.chain,
    {
      deltaSeconds: dt,
      gravity: SPRING_GRAVITY,
      gravityEnabled: s.gravityEnabled,
      dampingEnabled: s.stage >= 5 && s.dampingEnabled,
    },
    s.drag ?? undefined,
  );
  if (!result.accepted || !withinExperiment(result.chain))
    return {
      ...stopSpringScene(s),
      drag: null,
      message:
        "Thí nghiệm đã dừng: trạng thái suy biến, không hữu hạn hoặc vượt giới hạn an toàn. Reset hay giảm dt; solver không clamp vị trí/vận tốc.",
    };
  const after = result.chain.particles[s.selected],
    steps = s.steps + 1;
  const trace: SpringIntegrationTrace = {
    index: s.selected,
    force: { ...after.force },
    acceleration: springScale(after.force, after.inverseMass),
    positionBefore: { ...before.position },
    velocityBefore: { ...before.velocity },
    positionAfter: { ...after.position },
    velocityAfter: { ...after.velocity },
    kinematic: !!s.drag?.active && s.drag.particleIndex === s.selected,
  };
  let next: SpringScene = {
    ...s,
    chain: result.chain,
    steps,
    elapsed: steps * dt,
    substeps: s.substeps + 1,
    trace,
  };
  next = refreshSpringScene(next);
  return recordSpringEnergy(next);
}
export function stepSpringScene(s: SpringScene): SpringScene {
  if (s.stage < 4) return s;
  return recordSpringEnergy(tick({ ...stopSpringScene(s) }), true);
}
export function requestSpringFast(s: SpringScene): SpringScene {
  if (s.stage < 8 || s.drag?.active) return s;
  if (!Number.isFinite(SPRING_STEPS[s.dtIndex]))
    return { ...stopSpringScene(s), message: "Fixed dt không hợp lệ." };
  return { ...stopSpringScene(s), fastRemaining: Math.round(20 / SPRING_STEPS[s.dtIndex]) };
}
export function advanceSpringFrame(s: SpringScene, frameSeconds: number): SpringScene {
  if (!Number.isFinite(frameSeconds) || frameSeconds < 0 || s.stage < 4) return s;
  let next = { ...s, substeps: 0 };
  if (next.fastRemaining > 0) {
    const batch = Math.min(32, next.fastRemaining);
    for (let i = 0; i < batch; i++) {
      const previous = next.steps;
      next = tick(next);
      if (next.steps === previous) return { ...next, fastRemaining: 0 };
      next = { ...next, fastRemaining: next.fastRemaining - 1 };
    }
    return next.fastRemaining === 0 ? recordSpringEnergy(next, true) : next;
  }
  if (next.paused) return next;
  const plan = planSpringFixedSteps(
    next.accumulator,
    frameSeconds,
    SPRING_STEPS[next.dtIndex],
    32,
    0.05,
  );
  next = { ...next, accumulator: plan.remainder, droppedTime: next.droppedTime + plan.droppedTime };
  for (let i = 0; i < plan.steps; i++) {
    const previous = next.steps;
    next = tick(next);
    if (next.steps === previous) break;
  }
  return next;
}
export function beginSpringDrag(
  s: SpringScene,
  point: SpringVec2,
  maxDistance: number,
): SpringScene | null {
  if (s.stage < 6 || s.drag?.active) return null;
  const index = nearestDynamicSpringParticle(s.chain, point, maxDistance);
  if (index < 0) return null;
  const chain = cloneSpringChain(s.chain),
    position = chain.particles[index].position;
  chain.particles[index].velocity = { x: 0, y: 0 };
  const drag = {
    active: true,
    particleIndex: index,
    target: { ...position },
    releaseVelocity: { x: 0, y: 0 },
    grabOffset: springSubtract(position, point),
  };
  return {
    ...rebaseSpringScene({ ...s, chain, selected: index, drag }),
    message: "Đang kéo: chuột làm công từ bên ngoài; chưa dùng drift để đánh giá solver.",
  };
}
export function moveSpringDrag(
  s: SpringScene,
  point: SpringVec2,
  sampleSeconds: number,
): SpringScene {
  if (
    !s.drag?.active ||
    !finiteSpringVector(point) ||
    !Number.isFinite(sampleSeconds) ||
    sampleSeconds <= 0
  )
    return s;
  const target = springAdd(point, s.drag.grabOffset ?? { x: 0, y: 0 });
  const chain = cloneSpringChain(s.chain);
  const releaseVelocity = estimateSpringReleaseVelocity(s.drag.target, target, sampleSeconds, 6);
  chain.particles[s.drag.particleIndex].position = target;
  chain.particles[s.drag.particleIndex].velocity = { x: 0, y: 0 };
  return refreshSpringScene({ ...s, chain, drag: { ...s.drag, target, releaseVelocity } });
}
export function endSpringDrag(s: SpringScene): SpringScene {
  if (!s.drag?.active) return s;
  const chain = cloneSpringChain(s.chain);
  chain.particles[s.drag.particleIndex].velocity = { ...s.drag.releaseVelocity };
  return {
    ...rebaseSpringScene({ ...s, chain, drag: null }),
    message: "Đã thả: vận tốc thả tối đa 6 m/s, bắt đầu lại mốc đo năng lượng.",
  };
}
export function cancelSpringDrag(s: SpringScene): SpringScene {
  if (!s.drag?.active) return s;
  const chain = cloneSpringChain(s.chain);
  chain.particles[s.drag.particleIndex].velocity = { x: 0, y: 0 };
  return {
    ...rebaseSpringScene({ ...stopSpringScene(s), chain, drag: null }),
    message: "Đã hủy kéo, không áp vận tốc thả; bắt đầu lại mốc đo.",
  };
}
export function nudgeSpringNode(s: SpringScene, delta: SpringVec2): SpringScene {
  if (s.stage < 6 || !finiteSpringVector(delta)) return s;
  const chain = cloneSpringChain(s.chain);
  const point = springAdd(chain.particles[s.selected].position, delta);
  if (Math.abs(point.x) > 1000 || Math.abs(point.y) > 1000) return s;
  chain.particles[s.selected].position = point;
  chain.particles[s.selected].velocity = { x: 0, y: 0 };
  return {
    ...rebaseSpringScene({ ...stopSpringScene(s), chain, drag: null }),
    message: "Dịch khối bằng bàn phím là can thiệp từ bên ngoài; đã bắt đầu lại mốc đo.",
  };
}
