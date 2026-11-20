import { extent, type Vec3, type Volume } from "./model.ts";
import { axesFor } from "./sampling.ts";
import { scalarColor, type Color, type DisplayWindow } from "./display.ts";
import {
  add,
  sub,
  mul,
  dot,
  unit,
  cameraFrame,
  cameraRay,
  project,
  type Camera,
  type CameraFrame,
} from "./camera.ts";
import { clipPolygon, contextIso, type Mesh, type Triangle, type Vertex } from "./context-mesh.ts";
type Projection = NonNullable<ReturnType<typeof project>>;
const edge = (a: Projection, b: Projection, x: number, y: number) =>
  (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
const lightA = unit([-0.4, 0.8, 0.6]),
  lightB = unit([0.8, 0.2, -0.6]);
class Raster {
  readonly rgba: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  private depth: Float32Array;
  sectionAxis = -1;
  sectionPlane = 0;
  constructor(width: number, height: number) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 640 ||
      height > 640
    )
      throw new RangeError("Bounded context image required");
    this.width = width;
    this.height = height;
    this.rgba = new Uint8ClampedArray(width * height * 4);
    this.depth = new Float32Array(width * height).fill(Infinity);
  }
  color(index: number, color: Color) {
    this.rgba[index * 4] = Math.floor(Math.max(0, Math.min(1, color[0])) * 255);
    this.rgba[index * 4 + 1] = Math.floor(Math.max(0, Math.min(1, color[1])) * 255);
    this.rgba[index * 4 + 2] = Math.floor(Math.max(0, Math.min(1, color[2])) * 255);
    this.rgba[index * 4 + 3] = 255;
  }
  background(frame: CameraFrame) {
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        let color: Color = [
          0.055 + (0.035 * y) / this.height,
          0.08 + (0.06 * y) / this.height,
          0.105 + (0.065 * y) / this.height,
        ];
        const ray = cameraRay(frame, x + 0.5, y + 0.5);
        if (ray[1] < -1e-8) {
          const t = (-113 - frame.eye[1]) / ray[1],
            p = add(frame.eye, mul(ray, t));
          if (t > 0 && t < 1300) {
            const fade = Math.max(0, 1 - t / 1300);
            const gx = Math.abs(p[0] / 20 - Math.round(p[0] / 20)),
              gz = Math.abs(p[2] / 20 - Math.round(p[2] / 20));
            if (Math.min(gx, gz) < 0.016)
              color = color.map((c, i) => c + ([0.25, 0.37, 0.4][i] - c) * fade * 0.38) as Color;
            const shadow = 0.3 * Math.exp(-(p[0] ** 2 + p[2] ** 2) / 10500);
            color = color.map((c) => c * (1 - shadow)) as Color;
          }
        }
        this.color(x + y * this.width, color);
      }
  }
  triangle(
    frame: CameraFrame,
    vertices: Triangle,
    volume: Volume,
    slice: Float32Array | undefined,
    view: number,
    window: DisplayWindow,
    colored: boolean,
  ) {
    const p0 = project(frame, vertices[0].point),
      p1 = project(frame, vertices[1].point),
      p2 = project(frame, vertices[2].point);
    if (!p0 || !p1 || !p2) return;
    const area = edge(p0, p1, p2.x, p2.y);
    if (Math.abs(area) < 1e-8) return;
    const left = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x))),
      right = Math.min(this.width - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x)));
    const top = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y))),
      bottom = Math.min(this.height - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));
    const axes = axesFor(view),
      size = extent(volume.grid);
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        let a = edge(p1, p2, x + 0.5, y + 0.5) / area,
          b = edge(p2, p0, x + 0.5, y + 0.5) / area,
          c = 1 - a - b;
        if (Math.min(a, b, c) < -1e-8) continue;
        a /= p0.depth;
        b /= p1.depth;
        c /= p2.depth;
        const z = 1 / (a + b + c),
          index = x + y * this.width;
        if (z >= this.depth[index]) continue;
        a *= z;
        b *= z;
        c *= z;
        const point = add(
          add(mul(vertices[0].point, a), mul(vertices[1].point, b)),
          mul(vertices[2].point, c),
        );
        let normal = unit(
          add(
            add(mul(vertices[0].normal, a), mul(vertices[1].normal, b)),
            mul(vertices[2].normal, c),
          ),
        );
        let color: Color = [0.66, 0.73, 0.73];
        const material =
          (vertices[0].material ?? -1) * a +
          (vertices[1].material ?? -1) * b +
          (vertices[2].material ?? -1) * c;
        if (colored && material >= 0) color = scalarColor(material, window, true);
        if (slice) {
          const u =
            (point[axes.horizontal] - volume.grid.origin[axes.horizontal]) / size[axes.horizontal];
          const v =
            (point[axes.vertical] - volume.grid.origin[axes.vertical]) / size[axes.vertical];
          const column = Math.max(0, Math.min(255, Math.floor(u * 256))),
            row = Math.max(0, Math.min(255, Math.floor((1 - v) * 256)));
          const scalar = slice[column + row * 256];
          if (scalar < contextIso) continue;
          color = scalarColor(scalar, window, colored);
        }
        const direction = unit(sub(frame.eye, point));
        if (dot(normal, direction) < 0) normal = mul(normal, -1);
        let light =
          0.48 + 0.46 * Math.max(0, dot(normal, lightA)) + 0.15 * Math.max(0, dot(normal, lightB));
        let glint = 0;
        if (slice)
          light =
            0.72 +
            0.22 * Math.max(0, dot(normal, lightA)) +
            0.06 * Math.max(0, dot(normal, direction));
        else if (material > 0.84) {
          let exposure = 1;
          if (this.sectionAxis >= 0) {
            const setback = Math.max(
              0,
              Math.min(1, (this.sectionPlane - point[this.sectionAxis]) / 37),
            );
            exposure = 1 - 0.66 * setback;
          }
          light *= exposure;
          glint = 0.24 * exposure * Math.max(0, dot(normal, unit(add(lightA, direction)))) ** 18;
        }
        this.color(index, color.map((value) => value * light + glint) as Color);
        this.depth[index] = z;
      }
  }
}
function vertex(mesh: Mesh, offset: number): Vertex {
  const d = mesh.vertices;
  return {
    point: [d[offset], d[offset + 1], d[offset + 2]],
    normal: [d[offset + 3], d[offset + 4], d[offset + 5]],
    material: mesh.materials?.[offset / 6],
  };
}
export function renderContext(
  mesh: Mesh,
  volume: Volume,
  probe: Vec3,
  slices: Float32Array[],
  window: DisplayWindow,
  colored: boolean,
  camera: Camera,
  cut: boolean,
  width = 420,
  height = 360,
  sectionView = 0,
) {
  if (
    !Number.isInteger(mesh.triangles) ||
    mesh.triangles < 0 ||
    mesh.triangles > 240000 ||
    mesh.vertices.length !== mesh.triangles * 18 ||
    (mesh.materials !== undefined && mesh.materials.length !== mesh.triangles * 3)
  )
    throw new RangeError("Invalid context mesh");
  const raster = new Raster(width, height),
    frame = cameraFrame(camera, width, height);
  const sectionAxis = cut && mesh.materials ? axesFor(sectionView).fixed : -1;
  raster.sectionAxis = sectionAxis;
  if (sectionAxis >= 0) raster.sectionPlane = probe[sectionAxis];
  raster.background(frame);
  for (let offset = 0; offset < mesh.vertices.length; offset += 18) {
    const triangle: Triangle = [
      vertex(mesh, offset),
      vertex(mesh, offset + 6),
      vertex(mesh, offset + 12),
    ];
    if (sectionAxis >= 0) {
      const plane = probe[sectionAxis];
      const a = triangle[0].point[sectionAxis],
        b = triangle[1].point[sectionAxis],
        c = triangle[2].point[sectionAxis];
      if (Math.max(a, b, c) <= plane)
        raster.triangle(frame, triangle, volume, undefined, 0, window, colored);
      else if (Math.min(a, b, c) < plane) {
        const face = clipPolygon(triangle, sectionAxis, plane, true);
        for (let i = 1; i + 1 < face.length; i++)
          raster.triangle(
            frame,
            [face[0], face[i], face[i + 1]],
            volume,
            undefined,
            0,
            window,
            colored,
          );
      }
      continue;
    }
    if (!cut || [0, 1, 2].some((axis) => triangle.every((v) => v.point[axis] <= probe[axis]))) {
      raster.triangle(frame, triangle, volume, undefined, 0, window, colored);
      continue;
    }
    if (triangle.every((v) => v.point.every((value, axis) => value >= probe[axis]))) continue;
    let remaining: Vertex[] = triangle;
    for (let axis = 0; axis < 3 && remaining.length; axis++) {
      const outside = clipPolygon(remaining, axis, probe[axis], true);
      for (let i = 1; i + 1 < outside.length; i++)
        raster.triangle(
          frame,
          [outside[0], outside[i], outside[i + 1]],
          volume,
          undefined,
          0,
          window,
          colored,
        );
      remaining = clipPolygon(remaining, axis, probe[axis], false);
    }
  }
  if (cut) {
    const upper = add(volume.grid.origin, extent(volume.grid));
    for (let view = 0; view < 3; view++) {
      if (sectionAxis >= 0 && view !== sectionView) continue;
      const axes = axesFor(view),
        normal: Vec3 = [0, 0, 0];
      normal[axes.fixed] = 1;
      const a: Vec3 = [...probe];
      if (sectionAxis >= 0) {
        a[axes.horizontal] = volume.grid.origin[axes.horizontal];
        a[axes.vertical] = volume.grid.origin[axes.vertical];
      }
      const b: Vec3 = [...a],
        c: Vec3 = [...a],
        d: Vec3 = [...a];
      b[axes.horizontal] = upper[axes.horizontal];
      c[axes.horizontal] = upper[axes.horizontal];
      c[axes.vertical] = upper[axes.vertical];
      d[axes.vertical] = upper[axes.vertical];
      raster.triangle(
        frame,
        [
          { point: a, normal },
          { point: b, normal },
          { point: c, normal },
        ],
        volume,
        slices[view],
        view,
        window,
        colored,
      );
      raster.triangle(
        frame,
        [
          { point: a, normal },
          { point: c, normal },
          { point: d, normal },
        ],
        volume,
        slices[view],
        view,
        window,
        colored,
      );
    }
  }
  return raster.rgba;
}
