import {
  computeSteering,
  findNeighbors,
  length,
  multiply,
  vectorEpsilon,
  type Vec2,
} from "@/lib/labs/boids";
import type { BoidsScene } from "@/lib/labs/boids-scene";
import type { CanvasSize } from "./lab-shared";

export function boidsView(size: CanvasSize, scene: BoidsScene) {
  const scale = Math.min(
    (size.width - 32) / scene.params.width,
    (size.height - 32) / scene.params.height,
  );
  return {
    scale,
    left: (size.width - scene.params.width * scale) / 2,
    top: (size.height - scene.params.height * scale) / 2,
  };
}

export function boidsPointer(
  client: Vec2,
  canvas: HTMLCanvasElement,
  size: CanvasSize,
  scene: BoidsScene,
): Vec2 | null {
  const rect = canvas.getBoundingClientRect();
  const point = {
    x: ((client.x - rect.left) * size.width) / rect.width,
    y: ((client.y - rect.top) * size.height) / rect.height,
  };
  const view = boidsView(size, scene);
  const world = { x: (point.x - view.left) / view.scale, y: (point.y - view.top) / view.scale };
  if (world.x < 0 || world.x >= scene.params.width || world.y < 0 || world.y >= scene.params.height)
    return null;
  return world;
}

export function nearestBoid(point: Vec2, scene: BoidsScene): number {
  let best = 0;
  let distance = Infinity;
  scene.boids.forEach((boid, index) => {
    const candidate = Math.hypot(boid.position.x - point.x, boid.position.y - point.y);
    if (candidate < distance) {
      distance = candidate;
      best = index;
    }
  });
  return best;
}

export function drawBoids(context: CanvasRenderingContext2D, scene: BoidsScene, size: CanvasSize) {
  context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  context.fillStyle = "#0b1020";
  context.fillRect(0, 0, size.width, size.height);
  const view = boidsView(size, scene);
  const point = (p: Vec2) => ({ x: view.left + p.x * view.scale, y: view.top + p.y * view.scale });
  const selected = scene.boids[scene.selected];
  if (!selected) return;
  const neighbors =
    scene.stage >= 3 ? findNeighbors(scene.boids, scene.selected, scene.params) : [];
  const neighborSet = new Set(neighbors);
  context.strokeStyle = "#344561";
  context.strokeRect(
    view.left,
    view.top,
    scene.params.width * view.scale,
    scene.params.height * view.scale,
  );
  context.save();
  context.beginPath();
  context.rect(
    view.left,
    view.top,
    scene.params.width * view.scale,
    scene.params.height * view.scale,
  );
  context.clip();
  if (scene.debug && scene.stage >= 3) {
    context.strokeStyle = "#f4ca6480";
    for (const dx of [-scene.params.width, 0, scene.params.width]) {
      for (const dy of [-scene.params.height, 0, scene.params.height]) {
        const center = point({ x: selected.position.x + dx, y: selected.position.y + dy });
        context.beginPath();
        context.arc(center.x, center.y, scene.params.radius * view.scale, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }
  scene.boids.forEach((boid, index) => {
    const center = point(boid.position);
    const speed = length(boid.velocity);
    const direction = speed > vectorEpsilon ? multiply(boid.velocity, 1 / speed) : { x: 1, y: 0 };
    const radius = index === scene.selected && scene.debug ? 8 : 4;
    context.fillStyle =
      index === scene.selected && scene.debug
        ? "#ffffff"
        : neighborSet.has(index) && scene.debug
          ? "#f4ca64"
          : "#53dcb6";
    context.beginPath();
    context.moveTo(center.x + direction.x * radius, center.y + direction.y * radius);
    context.lineTo(
      center.x - direction.x * radius * 0.7 - direction.y * radius * 0.55,
      center.y - direction.y * radius * 0.7 + direction.x * radius * 0.55,
    );
    context.lineTo(
      center.x - direction.x * radius * 0.7 + direction.y * radius * 0.55,
      center.y - direction.y * radius * 0.7 - direction.x * radius * 0.55,
    );
    context.closePath();
    context.fill();
  });
  if (scene.debug && scene.stage >= 4) {
    const steering = computeSteering(
      scene.boids,
      scene.selected,
      neighbors,
      scene.params,
      scene.stage,
    );
    const origin = point(selected.position);
    for (const [vector, color] of [
      [steering.separation, "#ff7b72"],
      [steering.alignment, "#82b8ff"],
      [steering.cohesion, "#6be89b"],
      [steering.acceleration, "#f4ca64"],
    ] as const) {
      // Vector 0 không có hướng; không vẽ một đầu mũi tên giả tại gốc.
      if (length(vector) <= vectorEpsilon) continue;
      const end = {
        x: origin.x + vector.x * view.scale * 1.3,
        y: origin.y + vector.y * view.scale * 1.3,
      };
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(origin.x, origin.y);
      context.lineTo(end.x, end.y);
      const angle = Math.atan2(end.y - origin.y, end.x - origin.x);
      context.moveTo(end.x - Math.cos(angle - 0.5) * 6, end.y - Math.sin(angle - 0.5) * 6);
      context.lineTo(end.x, end.y);
      context.lineTo(end.x - Math.cos(angle + 0.5) * 6, end.y - Math.sin(angle + 0.5) * 6);
      context.stroke();
    }
  }
  context.restore();
  context.lineWidth = 1;
}
