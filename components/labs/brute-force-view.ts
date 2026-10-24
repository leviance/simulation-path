import type { BruteScene } from "@/lib/labs/brute-force-scene";
import type { ParticlePoint } from "@/lib/labs/brute-force-particle-query";
import { setupCanvas, type CanvasSize } from "./lab-shared";

export function bruteView(width: number, height: number) {
  const size = Math.max(1, Math.min(width - 40, height - 90));
  return { left: (width - size) / 2, top: 40, size };
}
export function bruteWorldToScreen(point: ParticlePoint, view: ReturnType<typeof bruteView>) {
  return { x: view.left + point.x * view.size, y: view.top + (1 - point.y) * view.size };
}
export function bruteScreenToWorld(point: ParticlePoint, view: ReturnType<typeof bruteView>) {
  return {
    x: Math.max(0, Math.min(1, (point.x - view.left) / view.size)),
    y: Math.max(0, Math.min(1, 1 - (point.y - view.top) / view.size)),
  };
}
export function bruteEventPoint(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  size: CanvasSize,
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * size.width) / rect.width,
    y: ((event.clientY - rect.top) * size.height) / rect.height,
  };
}
export function bruteInView(point: ParticlePoint, view: ReturnType<typeof bruteView>) {
  return (
    point.x >= view.left &&
    point.x <= view.left + view.size &&
    point.y >= view.top &&
    point.y <= view.top + view.size
  );
}
export function makeBruteBitmap(scene: BruteScene, size: CanvasSize) {
  const bitmap = document.createElement("canvas");
  bitmap.width = Math.round(size.width * size.dpr);
  bitmap.height = Math.round(size.height * size.dpr);
  const context = bitmap.getContext("2d");
  if (!context) return bitmap;
  const image = context.createImageData(bitmap.width, bitmap.height);
  const view = bruteView(size.width, size.height);
  for (let index = 0; index < scene.count; index++) {
    const point = bruteWorldToScreen(scene.particles[index], view);
    const x = Math.min(bitmap.width - 1, Math.max(0, Math.round(point.x * size.dpr)));
    const y = Math.min(bitmap.height - 1, Math.max(0, Math.round(point.y * size.dpr)));
    const offset = (y * bitmap.width + x) * 4;
    image.data[offset] = 97;
    image.data[offset + 1] = 115;
    image.data[offset + 2] = 141;
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return bitmap;
}
export function drawBruteCanvas(
  context: CanvasRenderingContext2D,
  scene: BruteScene,
  size: CanvasSize,
  bitmap: HTMLCanvasElement,
) {
  setupCanvas(context, size);
  const view = bruteView(size.width, size.height);
  context.fillStyle = "#11182a";
  context.fillRect(view.left, view.top, view.size, view.size);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  context.strokeStyle = "#34435f";
  context.lineWidth = 1;
  context.strokeRect(view.left - 1, view.top - 1, view.size + 2, view.size + 2);
  context.font = "13px ui-monospace,Consolas,monospace";
  context.fillStyle = "#aebbd2";
  context.fillText(
    scene.count.toLocaleString("vi-VN") + " hạt · vẽ toàn bộ, có thể chồng pixel",
    view.left,
    23,
  );
  if (scene.stage >= 3) {
    context.fillStyle = "#e5c07b";
    for (const index of scene.result.hitIndices) {
      const point = bruteWorldToScreen(scene.particles[index], view);
      context.fillRect(point.x - 1, point.y - 1, 2, 2);
    }
    if (scene.debug && scene.result.nearestIndex >= 0) {
      const point = bruteWorldToScreen(scene.particles[scene.result.nearestIndex], view);
      context.strokeStyle = "#e06c75";
      context.beginPath();
      context.arc(point.x, point.y, 6, 0, Math.PI * 2);
      context.stroke();
    }
  }
  if (scene.stage >= 2) {
    const point = bruteWorldToScreen(scene.query.center, view);
    context.strokeStyle = "#61afef";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(point.x, point.y, scene.query.radius * view.size, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(point.x - 5, point.y);
    context.lineTo(point.x + 5, point.y);
    context.moveTo(point.x, point.y - 5);
    context.lineTo(point.x, point.y + 5);
    context.stroke();
  }
  context.fillStyle = "#aebbd2";
  context.fillText(
    scene.stage >= 3
      ? "Vàng: hit · đỏ: gần tâm nhất (có thể ngoài vòng tròn)"
      : "World [0,1]² · Y hướng lên",
    view.left,
    size.height - 20,
  );
}
