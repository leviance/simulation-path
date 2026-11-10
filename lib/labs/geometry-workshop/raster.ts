import { add3, dot3, scale3, type Vec3 } from "../normal.ts";
import { cameraBasis, makeProjector, type Camera, type ScreenPoint } from "./camera.ts";
import type { Mesh } from "./mesh.ts";
import type { SurfaceKind } from "./settings.ts";
import { unit } from "./surfaces.ts";

export interface RasterOptions {
  wireframe: boolean;
  uv: boolean;
  cullBack: boolean;
  highlightFace: number | null;
  highlightCell: boolean;
}

export interface RasterBuffer {
  width: number;
  height: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
  depth: Float32Array<ArrayBuffer>;
  faces: Int32Array<ArrayBuffer>;
}

const palette: Record<SurfaceKind, readonly [number, number, number]> = {
  patch: [106, 206, 216],
  torus: [105, 186, 241],
  mobius: [179, 148, 237],
  shell: [239, 173, 104],
  knot: [79, 204, 182],
};

export function createRasterBuffer(width: number, height: number): RasterBuffer {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 640 ||
    height > 420
  ) {
    throw new RangeError("Raster lớp học vượt giới hạn 640 × 420.");
  }
  const count = width * height;
  return {
    width,
    height,
    pixels: new Uint8ClampedArray(count * 4),
    depth: new Float32Array(count),
    faces: new Int32Array(count),
  };
}

interface RasterVertex extends ScreenPoint {
  front: number;
  back: number;
  u: number;
  v: number;
}

const keyLight = unit({ x: 0.25, y: 0.85, z: -0.6 });
const fillLight = unit({ x: -0.75, y: 0.25, z: 0.54 });

function lightAt(normal: Vec3, view: Vec3, halfway: Vec3) {
  const diffuse = Math.max(0, dot3(normal, keyLight));
  const fill = Math.max(0, dot3(normal, fillLight));
  const rim = 1 - Math.abs(dot3(normal, view));
  const highlight = Math.pow(Math.max(0, dot3(normal, halfway)), 18);
  return 0.23 + diffuse * 0.63 + fill * 0.22 + rim * rim * 0.16 + highlight * 0.28;
}

function edge(a: ScreenPoint, b: ScreenPoint, x: number, y: number) {
  return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
}

function edgeLength(a: ScreenPoint, b: ScreenPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function rasterFace(
  target: RasterBuffer,
  a: RasterVertex,
  b: RasterVertex,
  c: RasterVertex,
  face: number,
  color: readonly [number, number, number],
  options: RasterOptions,
) {
  const area = edge(a, b, c.x, c.y);
  if (Math.abs(area) < 1e-8) return;
  // The Y-down viewport makes front-facing (CCW in world/view) triangles negative.
  const back = area > 0;
  if (back && options.cullBack) return;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxX = Math.min(target.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const maxY = Math.min(target.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const highlight =
    face === options.highlightFace ||
    (options.highlightCell && options.highlightFace !== null && face === options.highlightFace + 1);
  const drawEdges = options.wireframe || highlight;
  const edgeA = Math.abs(area) / edgeLength(b, c);
  const edgeB = Math.abs(area) / edgeLength(c, a);
  const edgeC = Math.abs(area) / edgeLength(a, b);
  const lightA = back ? a.back : a.front;
  const lightB = back ? b.back : b.front;
  const lightC = back ? c.back : c.front;
  const inverseArea = 1 / area;
  for (let y = minY; y <= maxY; ++y) {
    for (let x = minX; x <= maxX; ++x) {
      const wa = edge(b, c, x + 0.5, y + 0.5) * inverseArea;
      const wb = edge(c, a, x + 0.5, y + 0.5) * inverseArea;
      const wc = 1 - wa - wb;
      if (wa < -1e-8 || wb < -1e-8 || wc < -1e-8) continue;
      const depth = wa * a.depth + wb * b.depth + wc * c.depth;
      const pixel = y * target.width + x;
      if (depth > target.depth[pixel]) continue;
      target.depth[pixel] = depth;
      target.faces[pixel] = face;

      const u = wa * a.u + wb * b.u + wc * c.u;
      const v = wa * a.v + wb * b.v + wc * c.v;
      const checker = (Math.floor(u * 14) + Math.floor(v * 10)) & 1;
      const pattern = checker ? 1 : 0.88;
      const shade = (wa * lightA + wb * lightB + wc * lightC) * pattern;
      const ink = pixel * 4;
      if (drawEdges && Math.min(wa * edgeA, wb * edgeB, wc * edgeC) < 0.7) {
        target.pixels[ink] = highlight ? 255 : 68;
        target.pixels[ink + 1] = highlight ? 215 : 102;
        target.pixels[ink + 2] = highlight ? 136 : 126;
      } else if (options.uv) {
        target.pixels[ink] = (75 + 168 * u) * shade;
        target.pixels[ink + 1] = (105 + 130 * v) * shade;
        target.pixels[ink + 2] = (225 - 120 * u) * shade;
      } else {
        target.pixels[ink] = (highlight ? 253 : color[0]) * shade;
        target.pixels[ink + 1] = (highlight ? 180 : color[1]) * shade;
        target.pixels[ink + 2] = (highlight ? 76 : color[2]) * shade;
      }
      target.pixels[ink + 3] = 255;
    }
  }
}

export function rasterize(
  target: RasterBuffer,
  mesh: Mesh,
  camera: Camera,
  options: RasterOptions,
) {
  target.pixels.fill(0);
  target.depth.fill(Infinity);
  target.faces.fill(-1);
  const project = makeProjector(camera, target.width, target.height);
  const view = scale3(cameraBasis(camera).forward, -1);
  // Keep a well-defined half direction even with the camera opposite the key light.
  const half = add3(view, keyLight);
  const halfway = dot3(half, half) > 1e-8 ? unit(half) : keyLight;
  const vertices: RasterVertex[] = mesh.vertices.map((vertex) => ({
    ...project(vertex.position),
    front: lightAt(vertex.normal, view, halfway),
    back: lightAt(scale3(vertex.normal, -1), view, halfway),
    u: vertex.uv[0],
    v: vertex.uv[1],
  }));
  const color = palette[mesh.settings.kind];
  for (let start = 0; start < mesh.indices.length; start += 3) {
    const a = vertices[mesh.indices[start]];
    const b = vertices[mesh.indices[start + 1]];
    const c = vertices[mesh.indices[start + 2]];
    rasterFace(target, a, b, c, start / 3, color, options);
  }
}
