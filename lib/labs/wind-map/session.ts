import { dt, initialScene, makeField, world, type Layer, type Scene, type Vec2 } from "./model.ts";
import { populate } from "./scenes.ts";
import { advanceParticles, makeParticles, planSteps } from "./particles.ts";
import { validateMap } from "./reference.ts";

export function initialLayer(stage: number): Layer {
  if (stage === 3 || stage === 6) return "gradient";
  if (stage === 4) return "divergence";
  if (stage >= 5) return "curl";
  return "arrows";
}

// Mutable numerical state never goes into React. Consumers publish small readouts only.
export class WindSession {
  readonly stage: number;
  field = makeField();
  scene: Scene;
  particles = makeParticles();
  layer: Layer;
  cursor = { x: 0, y: 0 };
  paused = true;
  tracers = true;
  clean = false;
  editVortex = false;
  tick = 0;
  visitedLastStep = 0;
  dropped = 0;
  accumulator = 0;
  fps = 60;
  report = "Chưa chạy";
  revision = 0;
  clockRevision = 0;
  mounted = false;
  disposed = false;
  size = { width: 800, height: 600 };

  constructor(stage = 9) {
    this.stage = Math.max(1, Math.min(9, Math.trunc(stage) || 9));
    this.scene = initialScene(this.stage);
    this.layer = initialLayer(this.stage);
    this.reset();
  }

  mount() {
    this.mounted = true;
    this.disposed = false;
  }
  resize(width: number, height: number) {
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)
      this.size = { width, height };
  }
  pause() {
    this.paused = true;
    this.accumulator = 0;
    this.clockRevision++;
  }
  resume() {
    if (!this.disposed && this.stage >= 7 && this.tracers) {
      this.accumulator = 0;
      this.paused = false;
      this.clockRevision++;
    }
  }
  dispose() {
    this.pause();
    this.mounted = false;
    this.disposed = true;
  }

  reset() {
    this.pause();
    this.field = makeField();
    if (this.stage >= 7) this.field = makeField(65, 49);
    this.scene = initialScene(this.stage);
    this.layer = initialLayer(this.stage);
    this.cursor = { x: 0, y: 0 };
    this.clean = false;
    this.editVortex = false;
    this.tracers = true;
    this.fps = 60;
    this.rebuild();
  }
  rebuild() {
    this.pause();
    populate(this.field, this.scene, this.stage);
    this.revision++;
    this.particles = makeParticles();
    this.tick = 0;
    this.visitedLastStep = 0;
    this.dropped = 0;
    this.report = "Chưa chạy";
  }
  changeScene(patch: Partial<Scene>) {
    if (this.disposed) return;
    this.scene = { ...this.scene, ...patch };
    this.rebuild();
  }
  resolution(columns: number) {
    if (this.stage < 6 || ![33, 65, 129].includes(columns)) return;
    this.field = makeField(columns, 1 + ((columns - 1) * 3) / 4);
    this.cursor = { x: 0, y: 0 };
    this.rebuild();
  }
  point(p: Vec2, place = false) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    const x = Math.max(0, Math.min(this.field.width - 1, Math.round((p.x + 2) / this.field.dx)));
    const y = Math.max(0, Math.min(this.field.height - 1, Math.round((p.y + 1.5) / this.field.dy)));
    this.cursor = world(this.field, x, y);
    if (place && this.stage >= 8) this.changeScene({ center: p, vortex: true });
  }
  toggleTracers() {
    this.pause();
    this.tracers = !this.tracers;
  }
  step() {
    if (this.disposed || this.stage < 7 || !this.tracers) return;
    advanceParticles(this.field, this.particles);
    this.visitedLastStep = this.particles.length;
    this.tick++;
  }
  frame(elapsed: number) {
    if (this.disposed || this.paused || !this.tracers) return;
    const plan = planSteps(this.accumulator, elapsed);
    this.accumulator = plan.remainder;
    this.dropped += plan.dropped;
    for (let i = 0; i < plan.steps; i++) this.step();
  }
  verify() {
    this.pause();
    const result = validateMap();
    this.report = `${result.passed ? "PASS" : "FAIL"} · Affine ${result.derivativeError.toExponential(2)} · Curl(gradient) ${result.gradientCurl.toExponential(2)} · Gaussian ${result.coarse.interior.toExponential(2)} → ${result.refined.interior.toExponential(2)}`;
  }
  get modelTime() {
    return this.tick * dt;
  }
}
