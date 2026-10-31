import {
  DEMO_COUNT,
  TRAIL_COUNT,
  TRAIL_CAPACITY,
  add,
  sub,
  mul,
  length,
  position,
  velocity,
  cloneParticle,
  cloneSettings,
  presetSettings,
  validateSettings,
  snapshotParticle,
  stepBoris,
  stepEuler,
  analyticState,
  emptyClock,
  advanceClock,
  commitClock,
  defaultCamera,
  orbit,
  pan,
  zoom,
  projectPoint,
  type Settings,
  type Preset,
  type Integrator,
  type Particle,
  type Vec3,
} from "./math.ts";

export interface Comparison {
  status: "idle" | "running" | "complete" | "cancelled" | "timeout" | "failed";
  message: string;
  selected: number;
  generation: number;
  time: number;
  completedSteps: number;
  totalSteps: number;
  coarsePositionError: number | null;
  finePositionError: number | null;
  coarseVelocityError: number | null;
  fineVelocityError: number | null;
}

interface Work {
  initial: Particle;
  coarse: Particle;
  fine: Particle;
  settings: Settings;
  integrator: Integrator;
  coarseSteps: number;
  done: number;
  deadline: number;
}

export interface ChamberView {
  mode: string;
  active: Settings;
  staged: Settings;
  stagedChanged: boolean;
  paused: boolean;
  integrator: Integrator;
  particles: Particle[];
  trails: Vec3[][];
  camera: ReturnType<typeof defaultCamera>;
  clock: ReturnType<typeof emptyClock>;
  selected: number;
  generation: number;
  pointer: number | null;
  bySpeed: boolean;
  showTrails: boolean;
  message: string;
  comparison: Comparison;
}

const idleComparison = (): Comparison => ({
  status: "idle",
  message: "Chưa đối chiếu. Đây là phép tính CPU trên một hạt, không phải GPU validation.",
  selected: 0,
  generation: 0,
  time: 0,
  completedSteps: 0,
  totalSteps: 0,
  coarsePositionError: null,
  finePositionError: null,
  coarseVelocityError: null,
  fineVelocityError: null,
});

export class ChamberController {
  private listeners = new Set<() => void>();
  private state: ChamberView;
  private work: Work | null = null;
  private disposed = false;
  private lastPublish = 0;
  private lastTrail = -Infinity;
  private pointerPosition = { x: 0, y: 0, startX: 0, startY: 0, pan: false };
  drawVersion = 0;

  constructor(mode = "charged-chamber") {
    const active = presetSettings(mode === "lorentz-force" ? "circle" : "helix");
    if (
      [
        "chamber-view",
        "particle-state",
        "lorentz-force",
        "boris-step",
        "chamber-reference",
      ].includes(mode)
    )
      active.phaseSpan = 0;
    this.state = {
      mode,
      active,
      staged: cloneSettings(active),
      stagedChanged: false,
      paused: true,
      integrator: mode === "lorentz-force" ? "euler" : "boris",
      particles: [],
      trails: [],
      camera: defaultCamera(),
      clock: emptyClock(),
      selected: 0,
      generation: 1,
      pointer: null,
      bySpeed: false,
      showTrails: true,
      message: "Nhấn Chạy để quan sát. Canvas tính tối đa 256 hạt bằng JavaScript/CPU.",
      comparison: idleComparison(),
    };
    this.rebuild();
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  mount() {
    this.disposed = false;
  }
  dispose() {
    this.cancelComparison("Đã hủy khi rời bài; kết quả chưa hoàn tất không được công bố.");
    this.state = { ...this.state, pointer: null, paused: true };
    this.disposed = true;
    this.listeners.clear();
  }
  private publish() {
    if (this.disposed) return;
    this.state = { ...this.state };
    ++this.drawVersion;
    for (const listener of this.listeners) listener();
  }
  private rebuild() {
    this.state.particles = Array.from(
      { length: Math.min(DEMO_COUNT, this.state.active.count) },
      (_, id) => snapshotParticle(id, this.state.active),
    );
    this.state.clock = emptyClock();
    this.state.trails = Array.from({ length: TRAIL_COUNT }, () => []);
    this.state.selected = Math.min(this.state.selected, this.state.particles.length - 1);
    this.lastTrail = -Infinity;
    this.appendTrails();
    ++this.drawVersion;
  }
  stage(settings: Settings) {
    this.state.staged = cloneSettings(settings);
    this.state.stagedChanged = JSON.stringify(settings) !== JSON.stringify(this.state.active);
    this.publish();
  }
  preset(preset: Preset) {
    const settings = presetSettings(preset);
    settings.count = this.state.staged.count;
    settings.seed = this.state.staged.seed;
    settings.dt = this.state.staged.dt;
    settings.phaseSpan = this.state.staged.phaseSpan;
    this.stage(settings);
  }
  apply(): boolean {
    const error = validateSettings(this.state.staged);
    if (error) {
      this.state.message = `${error} Trạng thái đang hợp lệ vẫn được giữ nguyên.`;
      this.publish();
      return false;
    }
    this.cancelComparison("Đã hủy vì áp dụng snapshot mới.");
    this.state.active = cloneSettings(this.state.staged);
    this.state.stagedChanged = false;
    this.state.paused = true;
    ++this.state.generation;
    this.state.comparison = idleComparison();
    this.rebuild();
    this.state.message =
      "Đã áp dụng và đặt t = 0. N là yêu cầu cho bản C++; Canvas chỉ lấy tối đa 256 ID đầu.";
    this.publish();
    return true;
  }
  reset() {
    this.cancelComparison("Đã hủy vì Reset.");
    this.state.paused = true;
    this.state.pointer = null;
    ++this.state.generation;
    this.state.comparison = idleComparison();
    this.rebuild();
    this.state.message =
      "Reset giữ cấu hình ACTIVE và seed; các chỉnh sửa STAGED chưa được áp dụng.";
    this.publish();
  }
  pause() {
    this.state.paused = true;
    this.state.clock.accumulator = 0;
    this.publish();
  }
  resume() {
    if (this.state.comparison.status === "running") return;
    if (this.state.clock.simulatedSeconds >= 12) this.reset();
    this.state.paused = false;
    this.publish();
  }
  step() {
    if (!this.state.paused || this.work) return;
    this.integrate(1);
    this.publish();
  }
  setIntegrator(integrator: Integrator) {
    this.cancelComparison("Đã hủy vì đổi integrator.");
    this.state.integrator = integrator;
    this.reset();
    this.state.message =
      integrator === "euler"
        ? "Euler là thí nghiệm lỗi có chủ đích. Bản C++ hoàn chỉnh luôn dùng Boris."
        : "Đã chọn Boris; x và v cùng ở thời điểm t.";
    this.publish();
  }
  setPresentation(option: "bySpeed" | "showTrails", value: boolean) {
    this.state[option] = value;
    this.publish();
  }
  select(id: number) {
    if (!Number.isFinite(id)) return;
    const selected = Math.max(0, Math.min(this.state.particles.length - 1, Math.trunc(id)));
    if (selected !== this.state.selected) this.state.trails[TRAIL_COUNT - 1] = [];
    this.state.selected = selected;
    this.publish();
  }
  selectedReference() {
    const initial = snapshotParticle(this.state.selected, this.state.active);
    return analyticState(initial, this.state.active.fields, this.state.clock.simulatedSeconds);
  }
  private appendTrails() {
    if (this.state.clock.simulatedSeconds - this.lastTrail < 1 / 30) return;
    this.lastTrail = this.state.clock.simulatedSeconds;
    for (let slot = 0; slot < TRAIL_COUNT; ++slot) {
      const id = slot === TRAIL_COUNT - 1 ? this.state.selected : slot;
      const particle = this.state.particles[id];
      if (!particle) continue;
      const trail = this.state.trails[slot];
      trail.push(position(particle));
      if (trail.length > TRAIL_CAPACITY) trail.shift();
    }
  }
  private integrate(steps: number) {
    const { active, particles, clock, integrator } = this.state;
    const step = integrator === "boris" ? stepBoris : stepEuler;
    for (let index = 0; index < steps; ++index) {
      if (clock.simulatedSeconds + active.dt > 12 + 1e-9) {
        this.state.paused = true;
        this.state.message =
          "Đã dừng ở giới hạn 12 giây mô phỏng của Canvas. Không respawn; Reset để thử lại.";
        break;
      }
      for (const particle of particles) {
        if (!step(particle, active.fields, active.dt)) {
          this.state.paused = true;
          this.state.message = "Gặp state không hữu hạn; đã dừng, không báo phép kiểm thành công.";
          return;
        }
      }
      commitClock(clock, 1, active.dt);
      this.appendTrails();
    }
    ++this.drawVersion;
  }
  tick(wallSeconds: number, now = Date.now()) {
    if (this.disposed) return;
    if (this.work) this.runBatch(now);
    else if (!this.state.paused)
      this.integrate(
        advanceClock(this.state.clock, wallSeconds, this.state.active.dt, false, false),
      );
    if (now - this.lastPublish >= 100 || this.state.paused) {
      this.lastPublish = now;
      this.publish();
    }
  }
  startComparison(now = Date.now()) {
    if (this.disposed || this.work) return false;
    this.state.paused = true;
    const settings = cloneSettings(this.state.active);
    const initial = snapshotParticle(this.state.selected, settings);
    const coarseSteps = Math.max(1, Math.round(4 / settings.dt));
    this.work = {
      initial,
      coarse: cloneParticle(initial),
      fine: cloneParticle(initial),
      settings,
      integrator: this.state.integrator,
      coarseSteps,
      done: 0,
      deadline: now + 8000,
    };
    this.state.comparison = {
      ...idleComparison(),
      status: "running",
      message: "CPU: đối chiếu dt và dt/2 ở CÙNG thời điểm, mỗi frame xử lý tối đa 128 bước.",
      selected: this.state.selected,
      generation: this.state.generation,
      time: coarseSteps * settings.dt,
      totalSteps: coarseSteps * 3,
    };
    this.publish();
    return true;
  }
  cancelComparison(message = "Đã hủy; không có kết quả hoàn chỉnh.") {
    if (!this.work) return;
    this.work = null;
    this.state.comparison = { ...this.state.comparison, status: "cancelled", message };
    this.publish();
  }
  private runBatch(now: number) {
    const work = this.work;
    if (!work) return;
    if (now >= work.deadline) {
      this.work = null;
      this.state.comparison = {
        ...this.state.comparison,
        status: "timeout",
        message: "Hết hạn 8 giây; phép kiểm chưa hoàn tất, không có PASS.",
      };
      return;
    }
    const step = work.integrator === "boris" ? stepBoris : stepEuler;
    const total = work.coarseSteps * 3;
    const end = Math.min(total, work.done + 128);
    for (; work.done < end; ++work.done) {
      const coarse = work.done < work.coarseSteps;
      if (
        !step(
          coarse ? work.coarse : work.fine,
          work.settings.fields,
          work.settings.dt / (coarse ? 1 : 2),
        )
      ) {
        this.work = null;
        this.state.comparison = {
          ...this.state.comparison,
          status: "failed",
          message: "State không hợp lệ; phép kiểm thất bại.",
        };
        return;
      }
    }
    this.state.comparison = { ...this.state.comparison, completedSteps: work.done };
    if (work.done !== total) return;
    const exact = analyticState(work.initial, work.settings.fields, this.state.comparison.time);
    const errors = {
      coarsePositionError: length(sub(position(work.coarse), exact.position)),
      finePositionError: length(sub(position(work.fine), exact.position)),
      coarseVelocityError: length(sub(velocity(work.coarse), exact.velocity)),
      fineVelocityError: length(sub(velocity(work.fine), exact.velocity)),
    };
    const valid = Object.values(errors).every(Number.isFinite);
    this.state.comparison = {
      ...this.state.comparison,
      ...errors,
      status: valid ? "complete" : "failed",
      message: valid
        ? "Đã đối chiếu một hạt CPU với nghiệm độc lập. Kết quả này không kiểm một triệu state GPU."
        : "Sai số không hữu hạn; phép kiểm thất bại.",
    };
    this.work = null;
  }
  resetCamera() {
    this.state.camera = defaultCamera();
    this.publish();
  }
  focusSelected() {
    this.state.camera.target = position(this.state.particles[this.state.selected]);
    this.publish();
  }
  moveCamera(dx: number, dy: number, panning = false) {
    if (panning) pan(this.state.camera, dx, dy);
    else orbit(this.state.camera, dx, dy);
    this.publish();
  }
  zoomCamera(delta: number) {
    zoom(this.state.camera, delta);
    this.publish();
  }
  beginPointer(id: number, primary: boolean, button: number, x: number, y: number, shift = false) {
    if (this.state.pointer !== null || !primary || (button !== 0 && button !== 2)) return false;
    this.state.pointer = id;
    this.pointerPosition = { x, y, startX: x, startY: y, pan: button === 2 || shift };
    this.publish();
    return true;
  }
  movePointer(id: number, x: number, y: number) {
    if (this.state.pointer !== id) return;
    this.moveCamera(
      x - this.pointerPosition.x,
      y - this.pointerPosition.y,
      this.pointerPosition.pan,
    );
    this.pointerPosition.x = x;
    this.pointerPosition.y = y;
  }
  endPointer(id: number, width?: number, height?: number) {
    if (this.state.pointer !== id) return false;
    const p = this.pointerPosition;
    this.state.pointer = null;
    if (width && height && !p.pan && Math.hypot(p.x - p.startX, p.y - p.startY) < 4)
      this.pick(p.x, p.y, width, height);
    this.publish();
    return true;
  }
  private pick(x: number, y: number, width: number, height: number) {
    let nearest = 16,
      depth = Infinity,
      chosen = this.state.selected;
    this.state.particles.forEach((particle, id) => {
      const point = projectPoint(position(particle), this.state.camera, width, height);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (point.visible && distance <= nearest && (distance < nearest - 1 || point.depth < depth)) {
        nearest = distance;
        depth = point.depth;
        chosen = id;
      }
    });
    if (chosen !== this.state.selected) this.state.trails[TRAIL_COUNT - 1] = [];
    this.select(chosen);
  }
}

export function selectedError(state: ChamberView) {
  const particle = state.particles[state.selected];
  const exact = analyticState(
    snapshotParticle(state.selected, state.active),
    state.active.fields,
    state.clock.simulatedSeconds,
  );
  return {
    position: length(sub(position(particle), exact.position)),
    velocity: length(sub(velocity(particle), exact.velocity)),
  };
}

export function forceParts(state: ChamberView) {
  const particle = state.particles[state.selected];
  const qOverM =
    (particle.positionCharge.w * state.active.fields.chargeScale) / particle.velocityMass.w;
  // Keep the same cross-product order as the CPU and GLSL integrators.
  const v = velocity(particle),
    b = state.active.fields.magnetic;
  const magnetic = mul(
    { x: v.y * b.z - v.z * b.y, y: v.z * b.x - v.x * b.z, z: v.x * b.y - v.y * b.x },
    qOverM,
  );
  const electric = mul(state.active.fields.electric, qOverM);
  return { electric, magnetic, total: add(electric, magnetic), qOverM };
}
