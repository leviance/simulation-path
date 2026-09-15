import type { Point } from "./geometry.ts";

export type RasterStep = {
  point: Point;
  error?: number;
  e2?: number;
  movesX?: boolean;
  movesY?: boolean;
  x?: number;
  y?: number;
};

export type CircleStep = {
  x: number;
  y: number;
  decision: number;
  points: Point[];
};

// std::lround làm tròn trường hợp .5 ra xa zero; Math.round không làm vậy với số âm.
export function roundLikeCpp(value: number) {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function bresenhamSteps(start: Point, end: Point): RasterStep[] {
  let x = roundLikeCpp(start.x);
  let y = roundLikeCpp(start.y);
  const endX = roundLikeCpp(end.x);
  const endY = roundLikeCpp(end.y);
  const dx = Math.abs(endX - x);
  const stepX = x < endX ? 1 : -1;
  const dy = -Math.abs(endY - y);
  const stepY = y < endY ? 1 : -1;
  let error = dx + dy;
  const output: RasterStep[] = [];

  for (;;) {
    const doubledError = 2 * error;
    if (x === endX && y === endY) {
      output.push({ point: { x, y }, error, e2: doubledError, movesX: false, movesY: false });
      break;
    }
    const movesX = doubledError >= dy;
    const movesY = doubledError <= dx;
    output.push({ point: { x, y }, error, e2: doubledError, movesX, movesY });
    if (movesX) {
      error += dy;
      x += stepX;
    }
    if (movesY) {
      error += dx;
      y += stepY;
    }
  }
  return output;
}

export function ddaSteps(start: Point, end: Point): RasterStep[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const count = Math.max(Math.abs(dx), Math.abs(dy));
  if (count === 0) {
    return [
      { point: { x: roundLikeCpp(start.x), y: roundLikeCpp(start.y) }, x: start.x, y: start.y },
    ];
  }
  const output: RasterStep[] = [];
  for (let index = 0; index <= count; index += 1) {
    const x = start.x + (dx * index) / count;
    const y = start.y + (dy * index) / count;
    output.push({ point: { x: roundLikeCpp(x), y: roundLikeCpp(y) }, x, y });
  }
  return output;
}

function pointKey(point: Point) {
  return `${point.x},${point.y}`;
}

function uniqueSortedPoints(points: Point[]) {
  const unique = new Map<string, Point>();
  for (const point of points) {
    unique.set(pointKey(point), point);
  }
  return [...unique.values()].sort((left, right) => left.x - right.x || left.y - right.y);
}

export function rectanglePixels(first: Point, second: Point, filled: boolean) {
  const left = Math.min(roundLikeCpp(first.x), roundLikeCpp(second.x));
  const right = Math.max(roundLikeCpp(first.x), roundLikeCpp(second.x));
  const top = Math.min(roundLikeCpp(first.y), roundLikeCpp(second.y));
  const bottom = Math.max(roundLikeCpp(first.y), roundLikeCpp(second.y));
  const points: Point[] = [];

  if (filled) {
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        points.push({ x, y });
      }
    }
    return points;
  }

  points.push(
    ...bresenhamSteps({ x: left, y: top }, { x: right, y: top }).map((step) => step.point),
  );
  points.push(
    ...bresenhamSteps({ x: right, y: top }, { x: right, y: bottom }).map((step) => step.point),
  );
  points.push(
    ...bresenhamSteps({ x: right, y: bottom }, { x: left, y: bottom }).map((step) => step.point),
  );
  points.push(
    ...bresenhamSteps({ x: left, y: bottom }, { x: left, y: top }).map((step) => step.point),
  );
  return uniqueSortedPoints(points);
}

function symmetricCirclePoints(center: Point, x: number, y: number) {
  return uniqueSortedPoints([
    { x: center.x + x, y: center.y + y },
    { x: center.x + y, y: center.y + x },
    { x: center.x - y, y: center.y + x },
    { x: center.x - x, y: center.y + y },
    { x: center.x - x, y: center.y - y },
    { x: center.x - y, y: center.y - x },
    { x: center.x + y, y: center.y - x },
    { x: center.x + x, y: center.y - y },
  ]);
}

export function midpointCircleSteps(center: Point, radius: number): CircleStep[] {
  const safeCenter = {
    x: roundLikeCpp(center.x),
    y: roundLikeCpp(center.y),
  };
  let x = Math.max(0, roundLikeCpp(radius));
  let y = 0;
  let decision = 1 - x;
  const steps: CircleStep[] = [];

  while (x >= y) {
    steps.push({
      x,
      y,
      decision,
      points: symmetricCirclePoints(safeCenter, x, y),
    });
    y += 1;
    if (decision <= 0) {
      decision += 2 * y + 1;
    } else {
      x -= 1;
      decision += 2 * (y - x) + 1;
    }
  }
  return steps;
}

export function midpointCircle(center: Point, radius: number) {
  return uniqueSortedPoints(midpointCircleSteps(center, radius).flatMap((step) => step.points));
}
