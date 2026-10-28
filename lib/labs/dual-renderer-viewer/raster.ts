import { objDot, objNormalize } from "../obj-geometry.ts";
import { clipDistance, clipTriangle, intersectClipEdge } from "./clip.ts";
import { multiplyMatrices, screenVertex, transformVector, viewerMatrices } from "./math.ts";
import type {
  Mat4,
  ScreenVertex,
  Vec3,
  Vec4,
  ViewerFrame,
  ViewerMesh,
  ViewerScene,
} from "./types.ts";

function edge(a: ScreenVertex, b: ScreenVertex, x: number, y: number) {
  const reverse = a.y > b.y || (a.y === b.y && a.x > b.x);
  if (reverse) [a, b] = [b, a];
  const value = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
  return reverse ? -value : value;
}
const topLeft = (a: ScreenVertex, b: ScreenVertex) => b.y < a.y || (b.y === a.y && b.x > a.x);
function write(
  frame: ViewerFrame,
  x: number,
  y: number,
  z: number,
  color: number[],
  depth: boolean,
  bias = 0,
) {
  if (
    x < 0 ||
    y < 0 ||
    x >= frame.width ||
    y >= frame.height ||
    !Number.isFinite(z) ||
    z < 0 ||
    z > 1
  )
    return;
  const pixel = y * frame.width + x;
  if (depth && z - bias >= frame.depth[pixel]) {
    frame.rejected++;
    return;
  }
  if (depth) frame.depth[pixel] = z;
  frame.rgba.set(color, pixel * 4);
  frame.passed++;
}
function fill(
  frame: ViewerFrame,
  a: ScreenVertex,
  b: ScreenVertex,
  c: ScreenVertex,
  color: number[],
  depth: boolean,
) {
  let area = edge(a, b, c.x, c.y);
  if (Math.abs(area) < 1e-7) return;
  if (area < 0) {
    [b, c] = [c, b];
    area = -area;
  }
  const left = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))),
    right = Math.min(frame.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const top = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))),
    bottom = Math.min(frame.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const includeA = topLeft(b, c),
    includeB = topLeft(c, a),
    includeC = topLeft(a, b);
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++) {
      const ea = edge(b, c, x + 0.5, y + 0.5),
        eb = edge(c, a, x + 0.5, y + 0.5),
        ec = edge(a, b, x + 0.5, y + 0.5);
      if (
        ea < 0 ||
        (ea === 0 && !includeA) ||
        eb < 0 ||
        (eb === 0 && !includeB) ||
        ec < 0 ||
        (ec === 0 && !includeC)
      )
        continue;
      write(frame, x, y, (ea * a.depth + eb * b.depth + ec * c.depth) / area, color, depth);
    }
}
function line(frame: ViewerFrame, a: Vec4, b: Vec4, color: number[], depth: boolean) {
  for (let plane = 0; plane < 6; plane++) {
    const ia = clipDistance(a, plane) >= 0,
      ib = clipDistance(b, plane) >= 0;
    if (!ia && !ib) return;
    if (ia !== ib) {
      const hit = intersectClipEdge(a, b, plane);
      if (!ia) a = hit;
      else b = hit;
    }
  }
  if (a.w <= 1e-7 || b.w <= 1e-7) return;
  const start = screenVertex(a, frame.width, frame.height),
    end = screenVertex(b, frame.width, frame.height);
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y))),
  );
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    write(
      frame,
      Math.floor(start.x + t * (end.x - start.x)),
      Math.floor(start.y + t * (end.y - start.y)),
      start.depth + t * (end.depth - start.depth),
      color,
      depth,
      1e-5,
    );
  }
}
const positionClip = (m: Mat4, p: Vec3) => transformVector(m, { ...p, w: 1 });

// Canvas 2D minh họa pipeline chung. Không giả làm phép đo hoặc kết quả của GPU thật.
export function renderViewer(
  mesh: ViewerMesh,
  scene: ViewerScene,
  width: number,
  height: number,
): ViewerFrame {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 1_000_000
  )
    throw new Error("Viewport vượt giới hạn Canvas");
  const frame: ViewerFrame = {
    width,
    height,
    rgba: new Uint8ClampedArray(width * height * 4),
    depth: new Float64Array(width * height).fill(1),
    submitted: mesh.indices.length / 3,
    culled: 0,
    clipped: 0,
    passed: 0,
    rejected: 0,
  };
  for (let pixel = 0; pixel < width * height; pixel++) frame.rgba.set([13, 21, 38, 255], pixel * 4);
  const matrices = viewerMatrices(scene, width / height);
  const clip = mesh.vertices.map((v) => positionClip(matrices.mvp, v.position));
  const light = objNormalize(scene.light)!;
  for (let order = 0; order < frame.submitted; order++) {
    const triangle = scene.view.reverseOrder ? frame.submitted - 1 - order : order,
      offset = triangle * 3;
    const [ia, ib, ic] = mesh.indices.slice(offset, offset + 3);
    const polygon = clipTriangle(clip[ia], clip[ib], clip[ic]);
    if (polygon.length !== 3) frame.clipped++;
    if (polygon.length < 3 || polygon.some((p) => p.w <= 1e-7)) continue;
    const screen = polygon.map((p) => screenVertex(p, width, height));
    let area = 0;
    for (let index = 1; index + 1 < screen.length && Math.abs(area) < 1e-7; index++)
      area = edge(screen[0], screen[index], screen[index + 1].x, screen[index + 1].y);
    if (Math.abs(area) < 1e-7) continue;
    if (scene.view.cullBackfaces && area > 0) {
      frame.culled++;
      continue;
    }
    const rotated = transformVector(matrices.model, { ...mesh.vertices[ia].normal, w: 0 });
    const intensity = scene.lit
      ? 0.22 + 0.78 * Math.max(0, objDot(objNormalize(rotated)!, light))
      : 1;
    const color = [scene.baseColor.x, scene.baseColor.y, scene.baseColor.z]
      .map((n) => Math.round(Math.max(0, Math.min(1, n * intensity)) * 255))
      .concat(255);
    if (scene.view.wireframe)
      for (let i = 0; i < polygon.length; i++)
        line(frame, polygon[i], polygon[(i + 1) % polygon.length], color, scene.depthEnabled);
    else
      for (let i = 1; i + 1 < screen.length; i++)
        fill(frame, screen[0], screen[i], screen[i + 1], color, scene.depthEnabled);
  }
  if (scene.view.grid) {
    const m = multiplyMatrices(matrices.projection, matrices.view);
    for (let i = -6; i <= 6; i++) {
      line(
        frame,
        positionClip(m, { x: i * 0.5, y: -1.1, z: -3 }),
        positionClip(m, { x: i * 0.5, y: -1.1, z: 3 }),
        [37, 51, 74, 255],
        scene.depthEnabled,
      );
      line(
        frame,
        positionClip(m, { x: -3, y: -1.1, z: i * 0.5 }),
        positionClip(m, { x: 3, y: -1.1, z: i * 0.5 }),
        [37, 51, 74, 255],
        scene.depthEnabled,
      );
    }
  }
  if (scene.view.normals)
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const [a, b, c] = mesh.indices.slice(i, i + 3).map((index) => mesh.vertices[index]);
      const center = {
        x: (a.position.x + b.position.x + c.position.x) / 3,
        y: (a.position.y + b.position.y + c.position.y) / 3,
        z: (a.position.z + b.position.z + c.position.z) / 3,
      };
      const tip = {
        x: center.x + a.normal.x * 0.12,
        y: center.y + a.normal.y * 0.12,
        z: center.z + a.normal.z * 0.12,
      };
      line(
        frame,
        positionClip(matrices.mvp, center),
        positionClip(matrices.mvp, tip),
        [255, 201, 107, 255],
        scene.depthEnabled,
      );
    }
  return frame;
}
