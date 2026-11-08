import {
  defaultCamera,
  makeCity,
  frustum,
  pipeline,
  moveCamera,
  screenRay,
  rayBox,
  type Camera,
  type CityObject,
} from "./math.ts";

export interface CityView {
  mounted: boolean;
  mode: string;
  objects: CityObject[];
  seed: number;
  camera: Camera;
  culling: boolean;
  debug: boolean;
  paused: boolean;
  pointer: number | null;
  selected: number;
  aspect: number;
  time: number;
  result: ReturnType<typeof pipeline>;
  message: string;
  validation: {
    status: "idle" | "running" | "complete" | "cancelled" | "failed";
    done: number;
    total: number;
  };
}

export class CityController {
  private listeners = new Set<() => void>();
  private state: CityView;
  private pointer = { x: 0, y: 0, startX: 0, startY: 0 };
  private disposed = false;
  private deadline = 0;
  drawVersion = 0;
  constructor(mode = "city") {
    const objects = makeCity(1024, 39),
      camera = defaultCamera();
    this.state = {
      mounted: false,
      mode,
      objects,
      camera,
      seed: 39,
      culling: true,
      debug: mode === "frustum",
      paused: true,
      pointer: null,
      selected: 0,
      aspect: 2,
      time: 0,
      result: pipeline(objects, frustum(camera, 2), camera.eye, true),
      message:
        "Mẫu CPU 1.024 record. Chọn góc nhìn, đi vào thành phố rồi quan sát danh sách đổi theo camera.",
      validation: { status: "idle", done: 0, total: 9 },
    };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  mount() {
    this.disposed = false;
    this.update({ mounted: true }, false);
  }
  dispose() {
    this.cancel();
    this.disposed = true;
    this.listeners.clear();
  }
  private update(patch: Partial<CityView>, recalculate = true) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    if (recalculate)
      this.state.result = pipeline(
        this.state.objects,
        frustum(this.state.camera, this.state.aspect),
        this.state.camera.eye,
        this.state.culling,
      );
    ++this.drawVersion;
    this.listeners.forEach((listener) => listener());
  }
  resize(width: number, height: number) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    const aspect = width / height;
    if (aspect !== this.state.aspect) {
      this.cancel();
      this.update({ aspect, pointer: null });
    }
  }
  reset() {
    this.cancel();
    this.update({
      camera: defaultCamera("overview", this.state.objects.length),
      objects: makeCity(this.state.objects.length, this.state.seed),
      paused: true,
      pointer: null,
      time: 0,
      selected: 0,
      culling: true,
      debug: this.state.mode === "frustum",
      validation: { status: "idle", done: 0, total: 9 },
      message: "Đã khôi phục đúng seed, số record và camera ban đầu.",
    });
  }
  regenerate(count: number, seed: number) {
    try {
      const objects = makeCity(count, seed);
      this.cancel();
      this.update({
        objects,
        seed,
        selected: 0,
        camera: defaultCamera("overview", count),
        paused: true,
        pointer: null,
        time: 0,
        validation: { status: "idle", done: 0, total: 9 },
        message: `Đã tạo ${count.toLocaleString("vi-VN")} record CPU từ seed ${seed}.`,
      });
    } catch (error) {
      this.update({ message: String(error) }, false);
    }
  }
  pause() {
    if (!this.state.paused) this.update({ paused: true }, false);
  }
  resume() {
    if (this.state.validation.status === "running") return;
    this.update({ paused: false }, false);
  }
  preset(kind: "street" | "overview") {
    this.cancel();
    this.update({
      camera: defaultCamera(kind, this.state.objects.length),
      paused: true,
      pointer: null,
    });
  }
  setFov(fov: number) {
    if (Number.isFinite(fov)) {
      this.cancel();
      this.update({ camera: { ...this.state.camera, fov: Math.max(35, Math.min(100, fov)) } });
    }
  }
  toggleCulling() {
    this.cancel();
    this.update({ culling: !this.state.culling });
  }
  toggleDebug() {
    this.update({ debug: !this.state.debug }, false);
  }
  select(id: number) {
    const object = this.state.objects.find((object) => object.id === id);
    if (object) this.update({ selected: id }, false);
  }
  move(forward: number, right: number, up: number) {
    this.cancel();
    this.update({ camera: moveCamera(this.state.camera, forward, right, up) });
  }
  look(dx: number, dy: number) {
    this.cancel();
    this.update({
      camera: {
        ...this.state.camera,
        yaw: this.state.camera.yaw + dx * 0.005,
        pitch: Math.max(-1.45, Math.min(1.45, this.state.camera.pitch - dy * 0.005)),
      },
    });
  }
  beginPointer(id: number, primary: boolean, button: number, x: number, y: number) {
    if (!primary || button !== 0 || this.state.pointer !== null) return false;
    this.cancel();
    this.pointer = { x, y, startX: x, startY: y };
    this.update({ pointer: id, paused: true }, false);
    return true;
  }
  movePointer(id: number, x: number, y: number) {
    if (this.state.pointer !== id) return;
    this.look(x - this.pointer.x, y - this.pointer.y);
    this.pointer.x = x;
    this.pointer.y = y;
  }
  endPointer(id: number, width?: number, height?: number) {
    if (this.state.pointer !== id) return;
    if (
      width &&
      height &&
      Math.hypot(this.pointer.x - this.pointer.startX, this.pointer.y - this.pointer.startY) < 5
    ) {
      const ray = screenRay(this.pointer.x, this.pointer.y, this.state.camera, width, height);
      let nearest = Infinity,
        selected = this.state.selected;
      for (const object of this.state.objects) {
        const distance = rayBox(this.state.camera.eye, ray, object);
        if (distance !== null && distance < nearest) {
          nearest = distance;
          selected = object.id;
        }
      }
      this.update({ selected }, false);
    }
    this.update({ pointer: null }, false);
  }
  validate() {
    this.deadline = Date.now() + 5000;
    this.update(
      {
        paused: true,
        validation: { status: "running", done: 0, total: 9 },
        message:
          "Đang đối chiếu 9 camera snapshot, một snapshot mỗi frame. Không phải GPU validation.",
      },
      false,
    );
  }
  cancel() {
    if (this.state.validation.status === "running")
      this.update(
        {
          validation: { ...this.state.validation, status: "cancelled" },
          message: "Đã hủy phép đối chiếu CPU; scene hiện tại được giữ nguyên.",
        },
        false,
      );
  }
  tick(dt: number) {
    if (this.state.validation.status === "running") {
      if (Date.now() > this.deadline) {
        this.update(
          {
            validation: { ...this.state.validation, status: "failed" },
            message: "Đã dừng vì quá giới hạn 5 giây.",
          },
          false,
        );
        return;
      }
      const { done, total } = this.state.validation;
      const camera = { ...this.state.camera, yaw: -Math.PI + (done * Math.PI) / 4 };
      const result = pipeline(
        this.state.objects,
        frustum(camera, this.state.aspect),
        camera.eye,
        true,
      );
      const oracle = this.state.objects
        .filter((object) =>
          frustum(camera, this.state.aspect).every(
            (plane) =>
              plane.x * object.center.x +
                plane.y * object.center.y +
                plane.z * object.center.z +
                plane.w >=
              -object.radius,
          ),
        )
        .map((object) => object.id)
        .sort((a, b) => a - b);
      const actual = [...result.visibleIds].sort((a, b) => a - b);
      const passed = actual.length === oracle.length && actual.every((id, i) => id === oracle[i]);
      this.update(
        {
          validation: {
            status: !passed ? "failed" : done + 1 === total ? "complete" : "running",
            done: done + 1,
            total,
          },
          message: passed
            ? `Đối chiếu CPU ${done + 1}/${total}: không mất/trùng ID. Không đo thời gian GPU.`
            : "Phát hiện sai tập ID trong minh họa CPU.",
        },
        false,
      );
      return;
    }
    if (this.state.paused) return;
    const step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0;
    this.update({
      camera: moveCamera(this.state.camera, step * 15, 0, 0),
      time: this.state.time + step,
    });
  }
}
