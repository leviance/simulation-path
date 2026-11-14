import type { Vec3 } from "@/lib/labs/normal";
import { canvasChunkCells } from "@/lib/labs/volume-sculptor/brush";
import { cellsOfChunk, type VolumeMesh } from "@/lib/labs/volume-sculptor/mesh-job";
import type { SculptSession } from "@/lib/labs/volume-sculptor/session";
import { slicePoint, type VolumeView } from "@/lib/labs/volume-sculptor/view";
import { makeProjector, type Camera } from "@/lib/labs/shared/orthographic-camera";
import {
  createRasterBuffer,
  rasterizeMesh,
  type RasterBuffer,
  type RasterMesh,
} from "@/lib/labs/shared/mesh-raster";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export interface RasterLayer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  target: RasterBuffer;
  image: ImageData;
}
export interface SliceBox {
  x: number;
  y: number;
  side: number;
}
export function volumeLayout(size: CanvasSize) {
  const side = Math.min(228, Math.max(132, size.width * 0.29), size.height - 130);
  const slice: SliceBox = {
    x: size.width - side - 18,
    y: size.width < 560 ? size.height - side - 25 : 105,
    side,
  };
  const viewportWidth = size.width < 560 ? size.width : size.width - side - 35;
  return { slice, viewportWidth };
}
export function hitSlice(point: { x: number; y: number }, box: SliceBox) {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.side &&
    point.y >= box.y &&
    point.y <= box.y + box.side
  );
}

function layerFor(
  width: number,
  height: number,
  dpr: number,
  old: RasterLayer | null,
): RasterLayer | null {
  const scale = Math.min(dpr, 640 / width, 420 / height);
  const w = Math.max(1, Math.floor(width * scale)),
    h = Math.max(1, Math.floor(height * scale));
  if (old?.target.width === w && old.target.height === h) return old;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const target = createRasterBuffer(w, h);
  return { canvas, context, target, image: new ImageData(target.pixels, w, h) };
}

function path(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  color: string,
  width = 1,
  close = false,
) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  if (close) ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function sceneBackground(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  camera: Camera,
  width: number,
) {
  setupCanvas(ctx, size);
  const background = ctx.createLinearGradient(0, 0, 0, size.height);
  background.addColorStop(0, "#0a1223");
  background.addColorStop(1, "#172c3d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size.width, size.height);
  const project = makeProjector(camera, width, size.height);
  for (let index = -8; index <= 8; ++index) {
    const at = index * 0.25,
      color = index === 0 ? "#6ba9c07a" : "#577e9d35";
    path(ctx, [project({ x: at, y: -1.52, z: -2 }), project({ x: at, y: -1.52, z: 2 })], color);
    path(ctx, [project({ x: -2, y: -1.52, z: at }), project({ x: 2, y: -1.52, z: at })], color);
  }
  return project;
}

export function paintMesh(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  width: number,
  mesh: RasterMesh,
  camera: Camera,
  wireframe: boolean,
  old: RasterLayer | null,
) {
  const layer = layerFor(width, size.height, size.dpr, old);
  if (layer) {
    rasterizeMesh(
      layer.target,
      mesh,
      camera,
      { wireframe, uv: false, cullBack: false, highlightCell: false, highlightFace: null },
      [96, 201, 209],
    );
    layer.context.putImageData(layer.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(layer.canvas, 0, 0, width, size.height);
  }
  return layer;
}

function drawChunk(
  ctx: CanvasRenderingContext2D,
  session: SculptSession,
  id: number,
  project: (point: Vec3) => { x: number; y: number },
  color: string,
) {
  const cells = cellsOfChunk(session.grid.spec, id),
    first = cells[0],
    last = cells[cells.length - 1];
  const low = session.grid.spec.worldFromGrid(first),
    high = session.grid.spec.worldFromGrid({ x: last.x + 1, y: last.y + 1, z: last.z + 1 });
  const corners = Array.from({ length: 8 }, (_, mask) =>
    project({
      x: mask & 1 ? high.x : low.x,
      y: mask & 2 ? high.y : low.y,
      z: mask & 4 ? high.z : low.z,
    }),
  );
  for (let corner = 0; corner < 8; ++corner)
    for (const bit of [1, 2, 4])
      if (!(corner & bit)) path(ctx, [corners[corner], corners[corner | bit]], color);
}

function drawNormals(
  ctx: CanvasRenderingContext2D,
  mesh: VolumeMesh,
  camera: Camera,
  width: number,
  height: number,
  layer: RasterLayer | null,
) {
  if (!layer) return;
  const project = makeProjector(camera, width, height),
    stride = Math.max(3, Math.ceil(mesh.vertices.length / 64 / 3) * 3);
  for (let index = 0; index < mesh.vertices.length; index += stride) {
    const { position, normal } = mesh.vertices[index],
      from = project(position);
    const px = Math.floor((from.x / width) * layer.target.width),
      py = Math.floor((from.y / height) * layer.target.height);
    if (px < 0 || py < 0 || px >= layer.target.width || py >= layer.target.height) continue;
    if (from.depth > layer.target.depth[py * layer.target.width + px] + 0.025) continue;
    path(
      ctx,
      [
        from,
        project({
          x: position.x + normal.x * 0.14,
          y: position.y + normal.y * 0.14,
          z: position.z + normal.z * 0.14,
        }),
      ],
      "#ffcc80",
      1.3,
    );
  }
}

function drawSlice(
  ctx: CanvasRenderingContext2D,
  box: SliceBox,
  session: SculptSession,
  view: VolumeView,
) {
  ctx.fillStyle = "#0b1324f2";
  ctx.fillRect(box.x - 10, box.y - 52, box.side + 20, box.side + 94);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#c4d5e5";
  ctx.fillText(`${view.slice.axis} · lát cắt / mặt phẳng đặt cọ`, box.x, box.y - 31);
  ctx.fillStyle = "#8da5bc";
  ctx.fillText(`Field revision ${session.fieldRevision} · F < iso: trong`, box.x, box.y - 12);
  const samples = session.grid.spec.samples,
    pixel = box.side / samples;
  for (let y = 0; y < samples; ++y)
    for (let x = 0; x < samples; ++x) {
      const point = slicePoint(session.grid.spec, {
        ...view.slice,
        u: (x + 0.5) / samples,
        v: 1 - (y + 0.5) / samples,
      });
      const value = session.grid.sample(point) - session.isovalue,
        intensity = Math.min(1, Math.abs(value) / 0.5);
      if (value < 0)
        ctx.fillStyle = `rgb(${Math.round(238 - intensity * 120)},${Math.round(170 - intensity * 92)},${Math.round(94 - intensity * 45)})`;
      else
        ctx.fillStyle = `rgb(${Math.round(55 - intensity * 32)},${Math.round(158 - intensity * 91)},${Math.round(205 - intensity * 102)})`;
      ctx.fillRect(box.x + x * pixel, box.y + y * pixel, pixel + 0.5, pixel + 0.5);
    }
  const px = box.x + view.slice.u * box.side,
    py = box.y + (1 - view.slice.v) * box.side;
  ctx.strokeStyle = view.brush.mode === "add" ? "#82f1bf" : "#ffbd88";
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(px, py, (view.brush.radius / session.grid.spec.extent) * box.side, 0, 2 * Math.PI);
  ctx.stroke();
  path(
    ctx,
    [
      { x: px - 5, y: py },
      { x: px + 5, y: py },
    ],
    "#fff",
    1.3,
  );
  path(
    ctx,
    [
      { x: px, y: py - 5 },
      { x: px, y: py + 5 },
    ],
    "#fff",
    1.3,
  );
  ctx.strokeStyle = "#668398";
  ctx.strokeRect(box.x, box.y, box.side, box.side);
  ctx.fillStyle = "#b9cdde";
  ctx.fillText("Kéo trong ô này để nặn field 3D", box.x, box.y + box.side + 20);
  ctx.fillStyle = "#8da5bc";
  ctx.fillText("Camera bên trái không sửa field", box.x, box.y + box.side + 37);
}

export function paintVolume(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  session: SculptSession,
  view: VolumeView,
  old: RasterLayer | null,
) {
  const { slice, viewportWidth } = volumeLayout(size),
    project = sceneBackground(ctx, size, view.camera, viewportWidth);
  let layer = old;
  if (session.lastGood)
    layer = paintMesh(ctx, size, viewportWidth, session.lastGood, view.camera, view.wireframe, old);
  if (view.normals && session.lastGood)
    drawNormals(ctx, session.lastGood, view.camera, viewportWidth, size.height, layer);
  const sliceCorners = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].map(([u, v]) => project(slicePoint(session.grid.spec, { ...view.slice, u, v })));
  path(ctx, sliceCorners, "#e8b66a91", 1.2, true);
  const center = slicePoint(session.grid.spec, view.slice);
  const preview = Array.from({ length: 49 }, (_, index) => {
    const angle = (index / 48) * Math.PI * 2,
      r = view.brush.radius / session.grid.spec.extent;
    const du = r * session.grid.spec.extent * Math.cos(angle),
      dv = r * session.grid.spec.extent * Math.sin(angle);
    if (view.slice.axis === "X")
      return project({ x: center.x, y: center.y + du, z: center.z + dv });
    if (view.slice.axis === "Y")
      return project({ x: center.x + dv, y: center.y, z: center.z + du });
    return project({ x: center.x + du, y: center.y + dv, z: center.z });
  });
  path(ctx, preview, "#ffe0a7", 1.7);
  if (view.chunkBoxes) {
    const total = Math.ceil((session.grid.spec.samples - 1) / canvasChunkCells) ** 3;
    for (const id of session.job?.workIds ?? []) drawChunk(ctx, session, id, project, "#dd9e4f22");
    drawChunk(ctx, session, Math.min(view.selectedChunk, total - 1), project, "#99e0ffcc");
  }
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#a8cadc";
  ctx.fillText(
    `CPU / Canvas 2D · ${session.grid.spec.samples}³ samples · camera trực giao`,
    18,
    25,
  );
  ctx.fillStyle = session.current ? "#92ebc4" : "#ffd28a";
  const label = session.lastGood
    ? session.current
      ? "Mesh khớp field"
      : "LAST-GOOD — mesh đang giữ của generation cũ"
    : "Đang dựng mesh đầu tiên…";
  ctx.fillText(label, 18, 47, size.width - 30);
  drawSlice(ctx, slice, session, view);
  return layer;
}
