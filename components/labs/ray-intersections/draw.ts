import {
  add,
  multiply,
  subtract,
  dot,
  project,
  cameraBasis,
  scene,
  at,
  type Camera,
  type Hit,
  type Ray,
  type Vec3,
} from "@/lib/labs/ray-intersections";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export function drawPicking(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  camera: Camera,
  ray: Ray,
  hits: (Hit | null)[],
  best: Hit | null,
  stage: number,
  u: number,
  v: number,
  geometry = scene,
) {
  setupCanvas(ctx, size);
  const { width, height } = size;
  const line = (a: Vec3, b: Vec3, color: string) => {
    const forward = cameraBasis(camera).forward;
    const da = dot(subtract(a, camera.origin), forward),
      db = dot(subtract(b, camera.origin), forward);
    const nearDepth = 0.051;
    if (da < nearDepth && db < nearDepth) return;
    if (da < nearDepth) a = add(a, multiply(subtract(b, a), (nearDepth - da) / (db - da)));
    else if (db < nearDepth) b = add(b, multiply(subtract(a, b), (nearDepth - db) / (da - db)));
    const pa = project(a, camera, width, height),
      pb = project(b, camera, width, height);
    if (!pa || !pb) return;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  };
  for (let i = -4; i <= 4; i++) {
    line({ x: i, y: -1, z: -2 }, { x: i, y: -1, z: 5 }, "#354663");
    line({ x: -4, y: -1, z: i }, { x: 4, y: -1, z: i }, "#354663");
  }
  for (let axis = 0; axis < 3; axis++)
    for (let segment = 0; segment < 64; segment++) {
      const circle = (angle: number): Vec3 => {
        if (axis === 1) return { x: Math.cos(angle), y: 0, z: Math.sin(angle) };
        if (axis === 2) return { x: 0, y: Math.cos(angle), z: Math.sin(angle) };
        return { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
      };
      const a = circle((segment * 2 * Math.PI) / 64),
        b = circle(((segment + 1) * 2 * Math.PI) / 64);
      line(
        add(geometry.sphere.center, multiply(a, geometry.sphere.radius)),
        add(geometry.sphere.center, multiply(b, geometry.sphere.radius)),
        "#62beff",
      );
    }
  const corners: Vec3[] = Array.from({ length: 8 }, (_, i) => ({
    x: i & 1 ? geometry.box.maximum.x : geometry.box.minimum.x,
    y: i & 2 ? geometry.box.maximum.y : geometry.box.minimum.y,
    z: i & 4 ? geometry.box.maximum.z : geometry.box.minimum.z,
  }));
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4]) if (!(i & bit)) line(corners[i], corners[i | bit], "#e5b65c");
  line(geometry.triangle.a, geometry.triangle.b, "#c387f0");
  line(geometry.triangle.b, geometry.triangle.c, "#c387f0");
  line(geometry.triangle.c, geometry.triangle.a, "#c387f0");
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#d4dfef";
  ctx.fillText("World: x →, y ↑; khung dây không che khuất", 12, 20);
  if (stage < 2) return;
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(u * width - 8, v * height);
  ctx.lineTo(u * width + 8, v * height);
  ctx.moveTo(u * width, v * height - 8);
  ctx.lineTo(u * width, v * height + 8);
  ctx.stroke();
  for (const hit of hits)
    if (hit) {
      const p = project(hit.point, camera, width, height);
      const color = best?.objectId === hit.objectId ? "#78ff82" : "#abb2bf";
      if (p) {
        ctx.strokeStyle = color;
        ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
      }
      line(hit.point, add(hit.point, multiply(hit.normal, 0.5)), color);
    }
  // A second view avoids the misleading zero-length camera projection of its own ray.
  const inset = Math.min(150, width * 0.3),
    x0 = 12,
    y0 = height - inset - 12;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, inset, inset);
  ctx.clip();
  ctx.fillStyle = "#10192c";
  ctx.fillRect(x0, y0, inset, inset);
  const scale = inset / 16;
  const top = (p: Vec3) => ({ x: x0 + inset / 2 + p.x * scale, y: y0 + 12 + (p.z + 7) * scale });
  ctx.strokeStyle = "#e5b65c";
  const low = top(geometry.box.minimum),
    high = top(geometry.box.maximum);
  ctx.strokeRect(low.x, low.y, high.x - low.x, high.y - low.y);
  const center = top(geometry.sphere.center);
  ctx.strokeStyle = "#62beff";
  ctx.beginPath();
  ctx.arc(center.x, center.y, geometry.sphere.radius * scale, 0, 2 * Math.PI);
  ctx.stroke();
  const origin = top(ray.origin),
    end = top(at(ray, Math.min(ray.tMax, 12)));
  ctx.strokeStyle = "#64e1b4";
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(origin.x - 2, origin.y - 2, 4, 4);
  for (const hit of hits)
    if (hit) {
      const p = top(hit.point);
      ctx.fillStyle = "#78ff82";
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
  ctx.fillStyle = "#d4dfef";
  ctx.fillText("Nhìn từ trên: XZ", x0 + 5, y0 + inset - 6);
  ctx.restore();
}
