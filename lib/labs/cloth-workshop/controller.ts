import {
  add,
  mul,
  clamp,
  makeMesh,
  defaultSettings,
  validSettings,
  stepMesh,
  diagnose,
  buildGrid,
  candidatePairs,
  contactPairs,
  excludedByTopology,
  FRAME_DT,
  type Mesh,
  type Settings,
  type Preset,
  type Diagnostics,
  type Drag,
  type Vec3,
} from "./math.ts";
import {
  defaultCamera,
  moveCamera,
  zoomCamera,
  projectPoint,
  cameraBasis,
  type Camera,
} from "./camera.ts";
export type Tool = "camera" | "drag" | "pin";
export interface Validation {
  status: "idle" | "running" | "passed" | "failed" | "cancelled";
  completed: number;
  total: number;
  message: string;
}
export interface ClothView {
  ready: boolean;
  mode: string;
  mesh: Mesh;
  settings: Settings;
  preset: Preset;
  paused: boolean;
  tick: number;
  seconds: number;
  discarded: number;
  camera: Camera;
  tool: Tool;
  selected: number;
  wireframe: boolean;
  strain: boolean;
  debug: boolean;
  normals: boolean;
  pointer: number | null;
  drag: Drag | null;
  diagnostics: Diagnostics;
  validation: Validation;
  message: string;
}
interface Pointer {
  id: number;
  x: number;
  y: number;
  pan: boolean;
  width: number;
  height: number;
}
export class ClothController {
  private view: ClothView;
  private listeners = new Set<() => void>();
  private pointer: Pointer | null = null;
  private accumulator = 0;
  private jobStarted = 0;
  private jobPositions: Vec3[] | null = null;
  drawVersion = 0;
  constructor(mode = "surface") {
    const mesh = makeMesh(),
      settings = defaultSettings(),
      preset: Preset = "hanging";
    this.view = {
      ready: false,
      mode,
      mesh,
      settings,
      preset,
      paused: true,
      tick: 0,
      seconds: 0,
      discarded: 0,
      camera: defaultCamera(),
      tool: "camera",
      selected: Math.floor(mesh.vertices.length / 2),
      wireframe: ["topology", "coloring", "xpbd"].includes(mode),
      strain: mode === "xpbd",
      debug: ["grid", "csr", "self-contact"].includes(mode),
      normals: mode === "normals",
      pointer: null,
      drag: null,
      diagnostics: diagnose(mesh, settings, preset),
      validation: {
        status: "idle",
        completed: 0,
        total: 12,
        message: "Oracle CPU chưa chạy; không phải kiểm GPU.",
      },
      message: "Mẫu CPU nhỏ. Chạy hoặc bước đơn để quan sát vải biến dạng thật.",
    };
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(patch: Partial<ClothView> = {}) {
    this.view = { ...this.view, ...patch };
    this.drawVersion++;
    for (const listener of this.listeners) listener();
  }
  mount() {
    this.publish({ ready: true });
  }
  dispose() {
    this.pointer = null;
    this.jobPositions = null;
    this.accumulator = 0;
    this.view = {
      ...this.view,
      ready: false,
      paused: true,
      pointer: null,
      drag: null,
      validation: {
        ...this.view.validation,
        status:
          this.view.validation.status === "running" ? "cancelled" : this.view.validation.status,
      },
    };
    this.listeners.clear();
  }
  pause() {
    this.accumulator = 0;
    if (!this.view.paused) this.publish({ paused: true });
  }
  resume() {
    if (this.view.ready && this.view.validation.status !== "running") {
      this.accumulator = 0;
      this.publish({ paused: false });
    }
  }
  toggle() {
    if (this.view.paused) this.resume();
    else this.pause();
  }
  private simulate() {
    try {
      this.advanceObstacle();
      const diagnostics = stepMesh(
        this.view.mesh,
        this.view.settings,
        this.view.preset,
        this.view.drag,
      );
      const tick = this.view.tick + 1;
      this.publish({ tick, seconds: tick * FRAME_DT, diagnostics });
    } catch (error) {
      this.publish({ paused: true, message: String(error) });
    }
  }
  step() {
    this.pause();
    if (this.view.validation.status !== "running") this.simulate();
  }
  tick(wall: number, now: number) {
    if (!this.view.ready) return;
    if (this.view.validation.status === "running") this.advanceValidation(now);
    if (this.view.paused || !Number.isFinite(wall) || wall <= 0) return;
    const accepted = Math.min(wall, 0.05);
    this.accumulator += accepted;
    let steps = 0;
    while (this.accumulator >= FRAME_DT && steps < 2) {
      this.accumulator -= FRAME_DT;
      this.simulate();
      steps++;
    }
    if (this.accumulator >= FRAME_DT || wall > accepted) {
      const discarded = Math.max(0, wall - accepted) + this.accumulator;
      this.accumulator = 0;
      this.publish({ discarded: this.view.discarded + discarded });
    }
  }
  reset(preset = this.view.preset, side = this.view.mesh.side) {
    this.endPointer();
    this.cancelValidation("Đổi topology/preset/reset đã hủy oracle cũ.");
    const mesh = makeMesh(side, preset);
    this.accumulator = 0;
    this.publish({
      mesh,
      preset,
      tick: 0,
      seconds: 0,
      discarded: 0,
      paused: true,
      selected: Math.floor(mesh.vertices.length / 2),
      diagnostics: diagnose(mesh, this.view.settings, preset),
      message: `Đã khôi phục preset ${preset}, ${side} × ${side} đỉnh CPU; thời gian = 0.`,
    });
  }
  setSetting(key: keyof Settings, value: number | boolean) {
    const settings = { ...this.view.settings, [key]: value };
    if (!validSettings(settings)) return false;
    // UI sets a target; fixed simulation steps move the actual obstacle at <= 0.5 m/s.
    if (key === "obstacleX") settings.obstacleX = this.view.settings.obstacleX;
    if (key === "obstacleX") {
      this.obstacleTarget = Number(value);
      this.cancelValidation("Đích vật cản đổi: oracle cũ đã hủy.");
      this.publish({
        message: "Vật cản sẽ đi tối đa 0,5 m/s trong các bước mô phỏng; Pause giữ nguyên vị trí.",
      });
      return true;
    }
    this.cancelValidation("Tham số đổi: oracle cũ đã hủy.");
    this.publish({ settings, diagnostics: diagnose(this.view.mesh, settings, this.view.preset) });
    return true;
  }
  obstacleTarget = 0;
  advanceObstacle() {
    const difference = this.obstacleTarget - this.view.settings.obstacleX;
    if (Math.abs(difference) > 1e-9)
      this.view.settings = {
        ...this.view.settings,
        obstacleX:
          this.view.settings.obstacleX + clamp(difference, -0.5 * FRAME_DT, 0.5 * FRAME_DT),
      };
  }
  setTool(tool: Tool) {
    this.endPointer();
    this.publish({ tool });
  }
  setOverlay(key: "wireframe" | "strain" | "debug" | "normals", value: boolean) {
    this.publish({ [key]: value });
  }
  select(id: number) {
    if (Number.isFinite(id))
      this.publish({ selected: clamp(Math.round(id), 0, this.view.mesh.vertices.length - 1) });
  }
  togglePin(id = this.view.selected) {
    this.cancelValidation("Pin đổi: oracle cũ đã hủy.");
    const vertex = this.view.mesh.vertices[id];
    if (!vertex) return;
    vertex.w = vertex.w === 0 ? 1 : 0;
    vertex.v = { x: 0, y: 0, z: 0 };
    this.publish({
      selected: id,
      message: `ID ${id}: ${vertex.w === 0 ? "ghim w = 0" : "động w = 1 kg⁻¹"}. Pin sửa ngay state kể cả khi Pause.`,
    });
  }
  moveCamera(dx: number, dy: number, pan = false) {
    moveCamera(this.view.camera, dx, dy, pan);
    this.publish();
  }
  zoom(delta: number) {
    zoomCamera(this.view.camera, delta);
    this.publish();
  }
  resetCamera() {
    this.publish({ camera: defaultCamera() });
  }
  pick(x: number, y: number, width: number, height: number) {
    let selected = -1,
      distance = 28,
      depth = Infinity;
    this.view.mesh.vertices.forEach((v, id) => {
      const p = projectPoint(v.p, this.view.camera, width, height),
        d = Math.hypot(p.x - x, p.y - y);
      if (p.visible && (d < distance - 1 || (d <= distance + 1 && p.depth < depth))) {
        selected = id;
        distance = d;
        depth = p.depth;
      }
    });
    return selected;
  }
  beginPointer(
    id: number,
    primary: boolean,
    button: number,
    x: number,
    y: number,
    width: number,
    height: number,
    pan = false,
  ) {
    if (!this.view.ready || !primary || this.pointer || ![0, 2].includes(button)) return false;
    const selected = this.pick(x, y, width, height);
    if (this.view.tool !== "camera" && selected < 0) return false;
    this.pointer = { id, x, y, pan: pan || button === 2, width, height };
    if (this.view.tool === "pin") this.togglePin(selected);
    if (this.view.tool === "drag") {
      this.cancelValidation("Kéo vải: oracle cũ đã hủy.");
      const center = this.view.mesh.vertices[selected].p,
        side = this.view.mesh.side;
      const ids = this.view.mesh.vertices.flatMap((v, other) =>
        Math.max(
          Math.abs((other % side) - (selected % side)),
          Math.abs(Math.floor(other / side) - Math.floor(selected / side)),
        ) <= 1 && v.w > 0
          ? [other]
          : [],
      );
      this.view.drag = { ids, anchor: { ...center }, target: { ...center } };
    }
    this.publish({ pointer: id, selected: selected >= 0 ? selected : this.view.selected });
    return true;
  }
  movePointer(id: number, x: number, y: number) {
    const pointer = this.pointer;
    if (!pointer || id !== pointer.id) return;
    const dx = x - pointer.x,
      dy = y - pointer.y;
    pointer.x = x;
    pointer.y = y;
    if (this.view.tool === "camera") this.moveCamera(dx, dy, pointer.pan);
    else if (this.view.drag) {
      const b = cameraBasis(this.view.camera),
        p = projectPoint(this.view.drag.anchor, this.view.camera, pointer.width, pointer.height);
      const target = add(
        this.view.drag.target,
        add(mul(b.right, dx / p.scale), mul(b.up, -dy / p.scale)),
      );
      this.view.drag.target = {
        x: clamp(target.x, -4.5, 4.5),
        y: clamp(target.y, 0.1, 7),
        z: clamp(target.z, -4.5, 4.5),
      };
      this.publish({
        message:
          "Kéo vùng 1-ring: mục tiêu được chuẩn bị khi Pause, chỉ áp dụng khi bước/chạy; tối đa 6 m/s.",
      });
    }
  }
  endPointer(id = this.pointer?.id) {
    if (!this.pointer || id !== this.pointer.id) return;
    this.pointer = null;
    this.publish({ pointer: null, drag: null });
  }
  nudgeSelected(dx: number, dy: number, dz: number) {
    const v = this.view.mesh.vertices[this.view.selected];
    if (!v || v.w === 0) return;
    this.view.drag = {
      ids: [this.view.selected],
      anchor: { ...v.p },
      target: add(v.p, { x: dx, y: dy, z: dz }),
    };
    this.step();
    this.publish({ drag: null });
  }
  startValidation(now = 0) {
    this.endPointer();
    this.pause();
    this.jobStarted = now;
    this.jobPositions = this.view.mesh.vertices.map((v) => ({ ...v.p }));
    this.publish({
      validation: {
        status: "running",
        completed: 0,
        total: 12,
        message: "Oracle CPU 0/12: phân hoạch CSR và tập tiếp xúc so brute force; giới hạn 5 giây.",
      },
    });
  }
  cancelValidation(message = "Đã hủy oracle CPU; không công bố PASS.") {
    if (this.view.validation.status !== "running") return;
    this.jobPositions = null;
    this.publish({ validation: { ...this.view.validation, status: "cancelled", message } });
  }
  private advanceValidation(now: number) {
    if (!this.jobPositions) return;
    if (now - this.jobStarted > 5000) {
      this.cancelValidation("Oracle vượt budget 5 giây; đã hủy, không có PASS.");
      return;
    }
    const batch = this.view.validation.completed;
    // Distinct fixtures: state, translated negative/boundary cells, and coincident non-neighbor IDs.
    const positions = this.jobPositions.map((p, id) => {
      if (batch === 0) return p;
      const source =
        batch % 3 === 0 && id === this.jobPositions!.length - 1 ? this.jobPositions![0] : p;
      return {
        x: source.x + batch * 0.013,
        y: source.y - batch * 0.037,
        z: source.z + batch * 0.021,
      };
    });
    const grid = buildGrid(positions, 2 * this.view.settings.thickness),
      candidates = candidatePairs(grid, this.view.mesh.side),
      pairs = contactPairs(positions, candidates, this.view.settings.thickness);
    const d = { ...this.view.diagnostics, grid, pairs },
      n = positions.length,
      ids = [...grid.ids].sort((a, b) => a - b);
    const partition =
      d.grid.offsets.at(-1) === n &&
      ids.every((id, i) => id === i) &&
      d.grid.ids.every(
        (id, slot) =>
          slot >= d.grid.offsets[d.grid.vertexCells[id]] &&
          slot < d.grid.offsets[d.grid.vertexCells[id] + 1],
      );
    const actual = new Set(d.pairs.map(([a, b]) => `${a}:${b}`)),
      expected = new Set<string>(),
      diameter = 2 * this.view.settings.thickness;
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++) {
        const dx = positions[a].x - positions[b].x,
          dy = positions[a].y - positions[b].y,
          dz = positions[a].z - positions[b].z;
        if (
          !excludedByTopology(a, b, this.view.mesh.side) &&
          dx * dx + dy * dy + dz * dz < diameter * diameter
        )
          expected.add(`${a}:${b}`);
      }
    const pass =
      partition &&
      expected.size === actual.size &&
      [...expected].every((key) => actual.has(key)) &&
      Number.isFinite(d.residual) &&
      d.penetration <= 1e-6;
    const completed = this.view.validation.completed + 1,
      done = completed === 12;
    if (!pass || done) this.jobPositions = null;
    this.publish({
      validation: {
        ...this.view.validation,
        completed,
        status: !pass ? "failed" : done ? "passed" : "running",
        message: !pass
          ? "Oracle CPU FAIL: phân hoạch/contact hoặc penetration không đạt. Không có chứng nhận GPU."
          : done
            ? "Oracle CPU PASS 12/12: CSR, contact IDs và penetration mẫu hiện tại. Không đo/kiểm GPU."
            : `Oracle CPU ${completed}/12: CSR/contact so brute force; không đo thời gian GPU.`,
      },
    });
  }
}
