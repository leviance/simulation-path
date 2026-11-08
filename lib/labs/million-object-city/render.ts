import {
  add,
  sub,
  mul,
  cross,
  normalized,
  dot,
  toView,
  projectView,
  basis,
  rejectedPlane,
  frustum,
  type Vec3,
  type Camera,
  type CityObject,
} from "./math.ts";
import type { CityView } from "./controller.ts";

interface Face {
  vertices: Vec3[];
  color: [number, number, number];
  id: number;
  windows: boolean;
}
const geometry = new WeakMap<CityObject[], Face[]>();

export function buildingFaces(objects: CityObject[]): Face[] {
  const cached = geometry.get(objects);
  if (cached) return cached;
  const faces: Face[] = [];
  for (const object of objects) {
    const { x, y, z } = object.center,
      half = object.half;
    if (object.mesh === 2) {
      const base = [
        { x: x - half.x, y: y - half.y, z: z - half.z },
        { x: x + half.x, y: y - half.y, z: z - half.z },
        { x: x + half.x, y: y - half.y, z: z + half.z },
        { x: x - half.x, y: y - half.y, z: z + half.z },
      ];
      const apex = { x, y: y + half.y, z };
      for (let i = 0; i < 4; ++i)
        faces.push({
          vertices: [base[i], apex, base[(i + 1) % 4]],
          color: object.color,
          id: object.id,
          windows: false,
        });
      faces.push({ vertices: base, color: object.color, id: object.id, windows: false });
      continue;
    }
    const taper = object.mesh === 1 ? 0.68 : 1;
    const wallTop = y + half.y;
    const corners = [
      { x: x - half.x, y: y - half.y, z: z - half.z },
      { x: x + half.x, y: y - half.y, z: z - half.z },
      { x: x + half.x, y: y - half.y, z: z + half.z },
      { x: x - half.x, y: y - half.y, z: z + half.z },
      { x: x - half.x * taper, y: wallTop, z: z - half.z * taper },
      { x: x + half.x * taper, y: wallTop, z: z - half.z * taper },
      { x: x + half.x * taper, y: wallTop, z: z + half.z * taper },
      { x: x - half.x * taper, y: wallTop, z: z + half.z * taper },
    ];
    const indices = [
      [0, 4, 5, 1],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 4, 0],
      [4, 7, 6, 5],
      [0, 1, 2, 3],
    ];
    for (const face of indices)
      faces.push({
        vertices: face.map((i) => corners[i]),
        color: object.color,
        id: object.id,
        windows: face[0] < 4 && face[1] >= 4,
      });
  }
  geometry.set(objects, faces);
  return faces;
}

function clipPlane(vertices: Vec3[], distance: number, keepGreater: boolean): Vec3[] {
  const output: Vec3[] = [];
  for (let i = 0; i < vertices.length; ++i) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length];
    const aInside = keepGreater ? a.z >= distance : a.z <= distance,
      bInside = keepGreater ? b.z >= distance : b.z <= distance;
    if (aInside) output.push(a);
    if (aInside !== bInside) output.push(add(a, mul(sub(b, a), (distance - a.z) / (b.z - a.z))));
  }
  return output;
}

export function clipDepth(vertices: Vec3[], near: number, far: number): Vec3[] {
  return clipPlane(clipPlane(vertices, near, true), far, false);
}

function screenPolygon(vertices: Vec3[], camera: Camera, width: number, height: number) {
  return clipDepth(
    vertices.map((point) => toView(point, camera)),
    camera.near,
    camera.far,
  ).map((point) => projectView(point, camera, width, height));
}

function path(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) {
  ctx.beginPath();
  points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

function ground(ctx: CanvasRenderingContext2D, state: CityView, width: number, height: number) {
  const extent = Math.sqrt(state.objects.length) * 9 + 50;
  const quad = (x0: number, z0: number, x1: number, z1: number, color: string) => {
    const points = screenPolygon(
      [
        { x: x0, y: -0.08, z: z0 },
        { x: x1, y: -0.08, z: z0 },
        { x: x1, y: -0.08, z: z1 },
        { x: x0, y: -0.08, z: z1 },
      ],
      state.camera,
      width,
      height,
    );
    if (points.length < 3) return;
    path(ctx, points);
    ctx.fillStyle = color;
    ctx.fill();
  };
  quad(-extent, -extent, extent, extent, "#334247");
  const side = Math.ceil(Math.sqrt(state.objects.length));
  for (let i = -1; i < side; ++i) {
    const wide = (i + 1) % 6 === 0;
    const center = (i - (side - 1) / 2) * 12 + Math.floor(i / 6) * 9 + (wide ? 10.5 : 6);
    const half = wide ? 6.2 : 2.0;
    quad(center - half, -extent, center + half, extent, "#17232e");
    quad(-extent, center - half, extent, center + half, "#17232e");
    if (wide) {
      quad(center - 0.18, -extent, center + 0.18, extent, "#a7905d");
      quad(-extent, center - 0.18, extent, center + 0.18, "#a7905d");
    }
  }
  // A low central district opens the skyline; its green square remains world geometry.
  const plazaCenter = Math.floor((side - 1) / 12) * 9;
  quad(plazaCenter - 24, plazaCenter - 24, plazaCenter + 24, plazaCenter + 24, "#3c5b53");
}

function minimap(ctx: CanvasRenderingContext2D, state: CityView, width: number) {
  const left = Math.max(10, width - 208),
    top = 48,
    size = 192;
  ctx.fillStyle = "rgba(6,14,24,0.92)";
  ctx.fillRect(left, top, size, size);
  ctx.strokeStyle = "#52697d";
  ctx.strokeRect(left, top, size, size);
  const extent = Math.max(100, Math.sqrt(state.objects.length) * 10);
  const map = (point: Vec3) => ({
    x: left + size / 2 + (point.x / extent) * size * 0.43,
    y: top + size / 2 + (point.z / extent) * size * 0.43,
  });
  const planes = frustum(state.camera, state.aspect);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, size, size);
  ctx.clip();
  for (const object of state.objects) {
    const p = map(object.center);
    ctx.fillStyle = rejectedPlane(object, planes) < 0 ? "#f6bd65" : "#52667a";
    ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
  }
  const camera = map(state.camera.eye),
    axes = basis(state.camera);
  const range = state.camera.far,
    angle = Math.tan((state.camera.fov * Math.PI) / 360) * state.aspect;
  const a = map(add(state.camera.eye, mul(add(axes.forward, mul(axes.right, angle)), range)));
  const b = map(add(state.camera.eye, mul(sub(axes.forward, mul(axes.right, angle)), range)));
  path(ctx, [camera, a, b]);
  ctx.fillStyle = "rgba(80,191,240,0.09)";
  ctx.fill();
  ctx.strokeStyle = "#66cfff";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#d2e3ef";
  ctx.font = "11px system-ui";
  ctx.fillText("Frustum • màu theo đủ 6 plane", left + 6, top + size + 15);
}

export function renderCity(
  ctx: CanvasRenderingContext2D,
  state: CityView,
  width: number,
  height: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#10243c");
  sky.addColorStop(0.6, "#47627b");
  sky.addColorStop(1, "#8b9b9e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ground(ctx, state, width, height);
  const planes = frustum(state.camera, width / height),
    accepted = new Set(state.result.visibleIds);
  const visible = new Set(
    state.objects.filter((object) => rejectedPlane(object, planes) < 0).map((object) => object.id),
  );
  const light = normalized({ x: -0.6, y: 1, z: 0.4 });
  const faces = buildingFaces(state.objects)
    .filter((face) => visible.has(face.id))
    .map((face) => ({
      face,
      depth:
        face.vertices.reduce((sum, v) => sum + toView(v, state.camera).z, 0) / face.vertices.length,
    }))
    .sort((a, b) => b.depth - a.depth);
  for (const { face, depth } of faces) {
    const normal = normalized(
      cross(sub(face.vertices[1], face.vertices[0]), sub(face.vertices[2], face.vertices[0])),
    );
    if (dot(normal, sub(state.camera.eye, face.vertices[0])) <= 0) continue;
    const points = screenPolygon(face.vertices, state.camera, width, height);
    if (
      points.length < 3 ||
      points.every((p) => p.x < 0) ||
      points.every((p) => p.x > width) ||
      points.every((p) => p.y < 0) ||
      points.every((p) => p.y > height)
    )
      continue;
    const brightness = 0.44 + Math.max(0, dot(normal, light)) * 0.58;
    const color = face.color.map((channel) => Math.min(255, Math.round(channel * brightness)));
    if (state.debug && !accepted.has(face.id)) {
      color[0] = 130;
      color[1] = 75;
      color[2] = 89;
    }
    path(ctx, points);
    ctx.fillStyle = `rgb(${color.join(",")})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(12,27,39,0.35)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    if (face.windows && depth < 320 && points.length === 4) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "rgba(24,47,63,0.45)";
      ctx.lineWidth = 0.8;
      const floors = Math.max(2, Math.floor((face.vertices[1].y - face.vertices[0].y) / 3.6));
      for (let i = 1; i < floors; ++i) {
        const start = toView(
          add(face.vertices[0], mul(sub(face.vertices[1], face.vertices[0]), i / floors)),
          state.camera,
        );
        const end = toView(
          add(face.vertices[3], mul(sub(face.vertices[2], face.vertices[3]), i / floors)),
          state.camera,
        );
        const segment = clipDepth([start, end], state.camera.near, state.camera.far);
        if (segment.length < 2) continue;
        const a = projectView(segment[0], state.camera, width, height);
        const b = projectView(segment[1], state.camera, width, height);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (face.id === state.selected) {
      path(ctx, points);
      ctx.strokeStyle = "#ffe18d";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(5,13,24,0.82)";
  ctx.fillRect(0, 0, width, 36);
  ctx.fillStyle = "#d8e9f8";
  ctx.font = "12px system-ui";
  ctx.fillText(
    `CITY / CPU SAMPLE · ${state.objects.length.toLocaleString("vi-VN")} records · seed ${state.seed} · ${state.culling ? "CULL ON" : "CULL OFF"}`,
    12,
    23,
  );
  if (state.debug) minimap(ctx, state, width);
  ctx.strokeStyle = "rgba(236,243,248,0.6)";
  ctx.beginPath();
  ctx.moveTo(width / 2 - 5, height / 2);
  ctx.lineTo(width / 2 + 5, height / 2);
  ctx.moveTo(width / 2, height / 2 - 5);
  ctx.lineTo(width / 2, height / 2 + 5);
  ctx.stroke();
  ctx.fillStyle = "rgba(5,13,24,0.8)";
  ctx.fillRect(0, height - 28, width, 28);
  ctx.fillStyle = "#c1d5e5";
  ctx.fillText(
    "Kéo: nhìn quanh · WASD: đi · Q/E: xuống/lên · Click: chọn bounds · Space: dừng/chạy",
    12,
    height - 10,
  );
}
