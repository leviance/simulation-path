import { add3, scale3, type Vec3 } from "@/lib/labs/normal";
import type { ScreenPoint } from "@/lib/labs/geometry-workshop/camera";
import { inspectCell, inspectSeam, inspectVertex } from "@/lib/labs/geometry-workshop/inspection";
import { vertexId, type Mesh } from "@/lib/labs/geometry-workshop/mesh";
import { frameAtProbe, type GeometryMode, type View } from "@/lib/labs/geometry-workshop/view";

export type Projector = (point: Vec3) => ScreenPoint;

export function strokePath(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  color: string,
  width: number,
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; ++index) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function marker(ctx: CanvasRenderingContext2D, point: ScreenPoint, color: string, label?: string) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#101829";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  if (label) {
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0a111f";
    ctx.strokeText(label, point.x + 8, point.y - 6);
    ctx.fillStyle = color;
    ctx.fillText(label, point.x + 8, point.y - 6);
  }
}

function arrow(
  ctx: CanvasRenderingContext2D,
  project: Projector,
  origin: Vec3,
  direction: Vec3,
  length: number,
  color: string,
  label: string,
) {
  const start = project(origin);
  const end = project(add3(origin, scale3(direction, length)));
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const screenLength = Math.hypot(dx, dy);
  if (screenLength < 4) return;
  strokePath(ctx, [start, end], color, 2);
  const x = dx / screenLength;
  const y = dy / screenLength;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - x * 8 + y * 4, end.y - y * 8 - x * 4);
  ctx.lineTo(end.x - x * 8 - y * 4, end.y - y * 8 + x * 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.font = "600 11px ui-monospace, monospace";
  ctx.strokeStyle = "#0a111f";
  ctx.lineWidth = 3;
  ctx.strokeText(label, end.x + 5, end.y - 4);
  ctx.fillText(label, end.x + 5, end.y - 4);
}

function rowPath(mesh: Mesh, row: number, project: Projector) {
  const { vSegments } = mesh.settings;
  const points: ScreenPoint[] = [];
  for (let column = 0; column <= vSegments; ++column) {
    points.push(project(mesh.vertices[vertexId(row, column, vSegments)].position));
  }
  return points;
}

export function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  mesh: Mesh,
  mode: GeometryMode,
  view: View,
  project: Projector,
) {
  const { kind, uSegments, vSegments } = mesh.settings;
  if (view.seams && kind !== "patch") {
    // This overlay intentionally shows both sides of the seam, including the hidden portion.
    strokePath(ctx, rowPath(mesh, 0, project), "#ffd68a", 2.4);
    ctx.setLineDash([4, 4]);
    strokePath(ctx, rowPath(mesh, uSegments, project), "#7ddfed", 2);
    ctx.setLineDash([]);
    if (kind !== "mobius") {
      const vSeam: ScreenPoint[] = [];
      for (let row = 0; row <= uSegments; ++row) {
        vSeam.push(project(mesh.vertices[vertexId(row, 0, vSegments)].position));
      }
      strokePath(ctx, vSeam, "#8de5bf", 1.25);
    }
    if (kind !== "shell") {
      const seam = inspectSeam(mesh, view.probeV);
      marker(ctx, project(seam.start.position), "#ffda97", "u=0");
      if (seam.gap > 1e-6) marker(ctx, project(seam.end.position), "#7ddfed", "u=1");
      if (kind === "mobius" && view.normals) {
        arrow(ctx, project, seam.start.position, seam.start.tangentV, 0.38, "#ffda97", "v đầu");
        arrow(ctx, project, seam.end.position, seam.end.tangentV, 0.38, "#7ddfed", "v cuối");
      }
    }
  }

  if (view.section && mesh.sweep) {
    ctx.setLineDash([4, 5]);
    strokePath(
      ctx,
      mesh.sweep.frames.map((frame) => project(frame.center)),
      "#eee0b799",
      1.4,
    );
    ctx.setLineDash([]);
    const { frame, row } = frameAtProbe(mesh, view.probeU);
    if (frame) {
      strokePath(ctx, rowPath(mesh, row, project), "#ffe1a3", 2.6);
      marker(ctx, project(frame.center), "#ffe1a3");
      const axis = Math.max(0.22, frame.sectionRadius * 1.55);
      arrow(ctx, project, frame.center, frame.tangent, axis, "#ffcc83", "T");
      arrow(ctx, project, frame.center, frame.normal, axis, "#8ef3c7", "N");
      arrow(ctx, project, frame.center, frame.binormal, axis, "#cbb0f8", "B");
    }
  }

  if (view.normals && !(kind === "mobius" && view.seams)) {
    const { vertex } = inspectVertex(mesh, view.probeU, view.probeV);
    marker(ctx, project(vertex.position), "#f6f8ff");
    arrow(ctx, project, vertex.position, vertex.tangentU, 0.48, "#ffd487", "u");
    arrow(ctx, project, vertex.position, vertex.tangentV, 0.48, "#c4b1f3", "v");
    arrow(ctx, project, vertex.position, vertex.normal, 0.62, "#80f2b9", "N");
  }

  if (mode === "topology" || mode === "export") {
    const { corners } = inspectCell(mesh, view.probeU, view.probeV);
    for (const [name, id] of Object.entries(corners)) {
      marker(ctx, project(mesh.vertices[id].position), "#ffe1a3", name + ":" + id);
    }
  }
}
