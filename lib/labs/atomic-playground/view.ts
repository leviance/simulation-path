import { add3, cross3, dot3, normalize3, scale3, subtract3, type Vec3 } from "../normal.ts";
import type { Clip, Probe } from "./statistics.ts";
import { orbital, type OrbitalId } from "./catalog.ts";

export const atomicModes = [
  "field",
  "measure",
  "cdf",
  "gpu",
  "batches",
  "splats",
  "clip",
  "probe",
  "compare",
  "config",
  "validation",
] as const;
export type AtomicMode = (typeof atomicModes)[number];
export interface AtomicCamera {
  target: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
}
export interface AtomicView {
  camera: AtomicCamera;
  clip: Clip;
  probe: Probe;
  showProbe: boolean;
  compare: boolean;
  secondary: OrbitalId;
  opacity: number;
  size: number;
  palette: "phase" | "cyan" | "warm";
  densityBoost: boolean;
  inspect: boolean;
}
export function atomicMode(value: string | undefined): AtomicMode {
  return atomicModes.find((mode) => mode === value) ?? "validation";
}
export function fitCamera(id: OrbitalId, other?: OrbitalId): AtomicCamera {
  let radius = orbital(id).viewRadius;
  if (other) radius = Math.max(radius, orbital(other).viewRadius);
  return { target: { x: 0, y: 0, z: 0 }, yaw: 0.75, pitch: 0.28, distance: radius * 2.8 };
}
export function initialView(mode: AtomicMode): AtomicView {
  return {
    camera: fitCamera("pz"),
    clip: { enabled: mode === "clip", axis: "x", position: 0 },
    probe: { center: { x: 0, y: 0, z: 0 }, radius: 4 },
    showProbe: mode === "probe" || mode === "validation",
    compare: mode === "compare",
    secondary: "s2",
    opacity: 0.11,
    size: 1.9,
    palette: "phase",
    densityBoost: false,
    inspect: mode !== "field" && mode !== "splats",
  };
}
export function cameraBasis(camera: AtomicCamera) {
  const horizontal = Math.cos(camera.pitch);
  const eye = add3(camera.target, {
    x: camera.distance * horizontal * Math.cos(camera.yaw),
    y: camera.distance * Math.sin(camera.pitch),
    z: camera.distance * horizontal * Math.sin(camera.yaw),
  });
  const forward = normalize3(subtract3(camera.target, eye)),
    right = normalize3(cross3(forward, { x: 0, y: 1, z: 0 }));
  return { eye, forward, right, up: cross3(right, forward) };
}
export function orbitCamera(camera: AtomicCamera, dx: number, dy: number): AtomicCamera {
  return {
    ...camera,
    yaw: (camera.yaw - dx * 0.007) % (Math.PI * 2),
    pitch: Math.min(1.48, Math.max(-1.48, camera.pitch + dy * 0.007)),
  };
}
export function panCamera(camera: AtomicCamera, dx: number, dy: number): AtomicCamera {
  const basis = cameraBasis(camera),
    gain = camera.distance * 0.0013;
  const target = add3(
    camera.target,
    add3(scale3(basis.right, -dx * gain), scale3(basis.up, dy * gain)),
  );
  return Math.hypot(target.x, target.y, target.z) < 160 ? { ...camera, target } : camera;
}
export function zoomCamera(camera: AtomicCamera, steps: number): AtomicCamera {
  return {
    ...camera,
    distance: Math.max(0.15, Math.min(350, camera.distance * Math.exp(-steps * 0.12))),
  };
}
export function travelCamera(camera: AtomicCamera, steps: number): AtomicCamera {
  const offset = scale3(
    cameraBasis(camera).forward,
    steps * Math.max(0.1, camera.distance * 0.025),
  );
  return { ...camera, target: add3(camera.target, offset) };
}
export function projector(camera: AtomicCamera, width: number, height: number, originX = 0) {
  const basis = cameraBasis(camera),
    focal = height / (2 * Math.tan(0.42));
  return (point: Vec3) => {
    const relative = subtract3(point, basis.eye),
      depth = dot3(relative, basis.forward);
    if (depth <= 0.035) return null;
    return {
      x: originX + width / 2 + (dot3(relative, basis.right) * focal) / depth,
      y: height * 0.5 - (dot3(relative, basis.up) * focal) / depth,
      depth,
    };
  };
}
export const modeQuestions: Record<AtomicMode, string> = {
  field:
    "Một điểm biểu diễn một mẫu vị trí, không phải một electron riêng. Đổi preset rồi tìm các thùy và vùng nút.",
  measure:
    "Vì sao chọn đều bán kính không cho phân bố đúng? So histogram với tích phân tham chiếu, không chỉ nhìn độ sáng.",
  cdf: "CDF biến một số ngẫu nhiên thành bán kính và hướng như thế nào? Giữ seed để kiểm tính tái lập.",
  gpu: "Bảng CPU nhỏ khác với sinh toàn cloud ở đâu? Lab này là reference CPU nhỏ; bản native mới xử lý một triệu điểm bằng GPU.",
  batches:
    "Hủy một candidate chưa hoàn chỉnh có làm mất cloud cũ không? Pause rồi chạy từng batch để theo dõi.",
  splats:
    "Mật độ điểm đã biểu diễn field. Đổi opacity hoặc density boost mà histogram giữ nguyên cho biết điều gì?",
  clip: "Cắt qua cloud có làm thay đổi xác suất của cả miền không? Đọc riêng số còn thấy và N dùng để đo.",
  probe:
    "Chọn một vùng đo, so tỉ lệ mẫu với reference và sai số thống kê. Dịch vùng đo rồi quan sát độ bất định tích phân.",
  compare:
    "Hai orbital ở cùng thang a₀ trông khác nhau thế nào? Hai pane dùng cùng camera và khoảng cách world.",
  config:
    "Cùng preset, N và seed có cho đúng những điểm cũ không? Xuất JSON nhỏ rồi reset hoặc nạp lại.",
  validation:
    "Dùng preset sai để tìm lỗi phân bố, không sửa độ sáng để che histogram lệch. Native có phép kiểm triệu mẫu riêng.",
};
