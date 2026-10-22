import {
  lambertAdd,
  lambertScale,
  projectLambertVertex,
  type LambertVec3,
} from "@/lib/labs/lambert";
import {
  worldToView,
  orbitLight,
  type LambertScene,
  type lambertFrame,
} from "@/lib/labs/lambert-scene";
import { setupCanvas, type CanvasSize } from "./lab-shared";
type Frame = ReturnType<typeof lambertFrame>;
export function drawLambert(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: LambertScene,
  frame: Frame,
  stage: number,
  buffer: HTMLCanvasElement,
) {
  setupCanvas(ctx, size);
  buffer.width = frame.width;
  buffer.height = frame.height;
  const source = buffer.getContext("2d");
  if (!source) return;
  const data = source.createImageData(frame.width, frame.height);
  data.data.set(frame.pixels);
  // Grid ở world space: camera xoay thì grid xoay, model xoay thì grid đứng yên.
  const project = (p: LambertVec3) =>
    projectLambertVertex(worldToView(p, scene), size.width, size.height);
  const line = (a: LambertVec3, b: LambertVec3, color: string, width = 1) => {
    const p = project(a),
      q = project(b);
    if (!p || !q) return;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  for (let i = -4; i <= 4; i++) {
    line({ x: i, y: -1.45, z: -4 }, { x: i, y: -1.45, z: 4 }, "#293853");
    line({ x: -4, y: -1.45, z: i }, { x: 4, y: -1.45, z: i }, "#293853");
  }
  // Chỉ compositing pixel thuộc cube; không để nền bitmap phủ mất grid.
  for (let i = 0; i < frame.owner.length; i++) if (frame.owner[i] < 0) data.data[i * 4 + 3] = 0;
  source.putImageData(data, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, 0, 0, size.width, size.height);
  const arrow = (a: LambertVec3, b: LambertVec3, color: string) => {
    line(a, b, color, 2);
    const p = project(a),
      q = project(b);
    if (!p || !q) return;
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(q.x - 10 * Math.cos(angle - 0.45), q.y - 10 * Math.sin(angle - 0.45));
    ctx.lineTo(q.x - 10 * Math.cos(angle + 0.45), q.y - 10 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  if (scene.debug && scene.normals && stage >= 2) {
    const selected = frame.faces[scene.selectedFace];
    arrow(
      selected.centroid,
      lambertAdd(selected.centroid, lambertScale(selected.normal, 0.85)),
      "#fff",
    );
    if (stage >= 3)
      arrow(
        selected.centroid,
        lambertAdd(
          selected.centroid,
          lambertScale(orbitLight(scene.lightAzimuth, scene.lightElevation), 1.5),
        ),
        "#ffdb6e",
      );
  }
  if (stage >= 3) {
    const p = project(lambertScale(orbitLight(scene.lightAzimuth, scene.lightElevation), 2.2));
    if (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#ffdb6e";
      ctx.fill();
    }
  }
}
