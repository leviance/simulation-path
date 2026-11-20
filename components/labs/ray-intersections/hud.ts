import {
  add,
  project,
  type Camera,
  type Scene,
  type Vec3,
  type Ray,
  type Hit,
} from "@/lib/labs/ray-intersections";
import type { CanvasSize } from "../lab-shared";
import type { Chord } from "./beam";
import { v3 } from "./specimens";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
const paper = "#17232d",
  line = "#485e64",
  type = "#e8f0eb",
  muted = "#a7bcc3";
const source = "#98f3dd",
  amber = "#ffb85f";
export function sourceRect(size: CanvasSize): Rect {
  const width = Math.min(240, size.width * 0.36),
    height = (width * 190) / 280;
  return { x: 12, y: size.height - height - 12, width, height };
}
export function stripRect(size: CanvasSize): Rect {
  const aim = sourceRect(size),
    x = aim.x + aim.width + 14;
  return { x, y: size.height - 78, width: Math.max(0, size.width - x - 12), height: 66 };
}
export function isReadout(size: CanvasSize, x: number, y: number) {
  const strip = stripRect(size),
    aim = sourceRect(size);
  return (
    (x >= strip.x && x < strip.x + strip.width && y >= strip.y && y < strip.y + strip.height) ||
    (x >= aim.x && x < aim.x + aim.width && y >= aim.y - 24 && y < aim.y)
  );
}

function rule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function label(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: string,
  color: string,
  font = "12px system-ui, sans-serif",
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}
const contains = (r: Rect, x: number, y: number) =>
  x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;

export function observerOverlay(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  camera: Camera,
  scene: Scene,
  ray: Ray,
  stage: number,
  hit: Hit | null,
  chord: Chord,
  debug: boolean,
) {
  ctx.save();
  const aim = sourceRect(size),
    rect = stripRect(size);
  ctx.fillStyle = source;
  ctx.fillRect(13, 14, 3, 28);
  label(ctx, 24, 27, "Bàn đo quang học", type, "600 18px system-ui, sans-serif");
  label(ctx, 25, 44, "GÓC QUAN SÁT  /  1 Ô LỚN = 1 ĐƠN VỊ", muted, "11px ui-monospace, monospace");
  if (debug && size.width >= 465) {
    const marks: [Vec3, string, string, number, number][] = [
      [add(scene.plane.point, v3(-3.2, 0, 0.75)), "Mặt chuẩn", "#a9bcbe", -52, 18],
      [add(scene.sphere.center, v3(0, scene.sphere.radius, 0)), "Mẫu cầu", "#6dded3", -81, -21],
      [
        v3(scene.box.maximum.x, scene.box.maximum.y, scene.box.minimum.z),
        "AABB",
        "#f4b262",
        10,
        -16,
      ],
      [scene.triangle.c, "Tấm tam giác", "#ccb6f8", 12, -10],
    ];
    if (stage >= 2) marks.push([ray.origin, "Nguồn O", source, -80, -24]);
    for (const [point, name, color, dx, dy] of marks) {
      const pixel = project(point, camera, size.width, size.height);
      if (!pixel) continue;
      ctx.font = "12px system-ui, sans-serif";
      const x = pixel.x + dx,
        y = pixel.y + dy,
        w = ctx.measureText(name).width + 16;
      if (
        pixel.x < 0 ||
        pixel.x >= size.width ||
        x < 4 ||
        x + w >= size.width - 2 ||
        y < 51 ||
        y + 19 >= size.height
      )
        continue;
      if (
        stage >= 2 &&
        (contains({ ...aim, y: aim.y - 24, height: aim.height + 24 }, x, y + 18) ||
          contains(rect, x, y + 18))
      )
        continue;
      rule(ctx, pixel.x, pixel.y, Math.min(x + w - 3, Math.max(x + 3, pixel.x)), y + 10, color);
      ctx.fillStyle = paper;
      ctx.fillRect(x, y, w, 19);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 2, 19);
      label(ctx, x + 7, y + 14, name, type);
    }
  }
  if (stage >= 2 && rect.width >= 124) {
    const left = rect.x + 10,
      right = rect.x + rect.width - 10,
      y = rect.y + 39;
    const along = (t: number) =>
      left + Math.max(0, Math.min(1, (t - ray.tMin) / (ray.tMax - ray.tMin))) * (right - left);
    ctx.fillStyle = paper;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    rule(ctx, rect.x, rect.y, rect.x + rect.width, rect.y, line);
    label(
      ctx,
      left,
      rect.y + 19,
      rect.width > 310 ? "Thước đo dọc theo tia" : "Thước đo tia",
      type,
      "600 13px system-ui, sans-serif",
    );
    if (rect.width > 185) {
      ctx.textAlign = "right";
      label(ctx, right, rect.y + 19, "tMax " + ray.tMax.toFixed(1), muted);
      ctx.textAlign = "left";
    }
    ctx.fillStyle = line;
    ctx.fillRect(left, y, right - left, 3);
    ctx.fillStyle = source;
    ctx.fillRect(left, y, along(hit?.t ?? ray.tMax) - left, 3);
    if (chord) {
      ctx.fillStyle = amber;
      ctx.fillRect(
        along(chord.from),
        y - 2,
        Math.max(1, along(chord.until) - along(chord.from)),
        7,
      );
    }
    if (hit) {
      const t = along(hit.t);
      rule(ctx, t, y - 9, t, y + 2, type);
      ctx.fillStyle = type;
      ctx.fillRect(t - 2, y - 10, 4, 3);
    }
    label(ctx, left, y + 20, "O", muted);
    if (chord && rect.width > 140) {
      ctx.textAlign = "right";
      label(ctx, right, y + 20, "Trong vật: " + (chord.until - chord.from).toFixed(2), amber);
      ctx.textAlign = "left";
    }
  }
  ctx.restore();
}

export function sourceOverlay(ctx: CanvasRenderingContext2D, rect: Rect, u: number, v: number) {
  ctx.save();
  ctx.fillStyle = paper;
  ctx.fillRect(rect.x - 1, rect.y - 24, rect.width + 2, 24);
  ctx.fillStyle = source;
  ctx.fillRect(rect.x - 1, rect.y - 24, 3, 24);
  label(
    ctx,
    rect.x + 8,
    rect.y - 7,
    rect.width >= 190 ? "Ô ngắm · kéo để đổi tia" : "Ô ngắm",
    type,
  );
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  const x = rect.x + u * rect.width,
    y = rect.y + v * rect.height;
  for (const s of [-1, 1]) {
    rule(ctx, x + 3 * s, y, x + 9 * s, y, type);
    rule(ctx, x, y + 3 * s, x, y + 9 * s, type);
  }
  ctx.restore();
}
