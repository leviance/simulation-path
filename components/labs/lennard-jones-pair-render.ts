import {
  addLennardJonesPoint,
  evaluateLennardJonesPair,
  lennardJonesCenterOfMass,
  lengthLennardJonesPoint,
  makeLennardJonesPair,
  sampleLennardJonesPotential,
  scaleLennardJonesPoint,
  type LennardJonesHistorySample,
  type LennardJonesPairState,
  type LennardJonesParameters,
  type LennardJonesPoint,
} from "@/lib/labs/lennard-jones-pair";

const MONO = "12px ui-monospace, SFMono-Regular, Consolas, monospace";

const COLORS = {
  panel: "#111a30",
  grid: "#26344f",
  text: "#d7deec",
  muted: "#9caaca",
  atomA: "#61afef",
  atomB: "#e06c75",
  potential: "#c678dd",
  kinetic: "#e5c07b",
  total: "#98c379",
  force: "#56b6c2",
};

export interface LennardJonesViewport {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
  centerX: number;
  centerY: number;
}

export function makeLennardJonesViewport(
  width: number,
  height: number,
  compact: boolean,
): LennardJonesViewport {
  const sceneWidth = compact ? width * 0.52 : width - 36;
  const sceneHeight = height - 52;
  const left = 18;
  const top = 26;
  return {
    left,
    top,
    width: sceneWidth,
    height: sceneHeight,
    scale: Math.max(28, Math.min((sceneWidth - 60) / 5.2, (sceneHeight - 50) / 3.2)),
    centerX: left + sceneWidth * 0.5,
    centerY: top + sceneHeight * 0.5,
  };
}

export function worldToLennardJonesCanvas(point: LennardJonesPoint, view: LennardJonesViewport) {
  return {
    x: view.centerX + point.x * view.scale,
    y: view.centerY - point.y * view.scale,
  };
}

export function lennardJonesCanvasToWorld(point: LennardJonesPoint, view: LennardJonesViewport) {
  return {
    x: (point.x - view.centerX) / view.scale,
    y: (view.centerY - point.y) / view.scale,
  };
}

function drawArrow(
  context: CanvasRenderingContext2D,
  start: LennardJonesPoint,
  vector: LennardJonesPoint,
  color: string,
) {
  const end = addLennardJonesPoint(start, vector);
  const angle = Math.atan2(vector.y, vector.x);
  context.strokeStyle = color;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.lineTo(end.x - 9 * Math.cos(angle - 0.48), end.y - 9 * Math.sin(angle - 0.48));
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - 9 * Math.cos(angle + 0.48), end.y - 9 * Math.sin(angle + 0.48));
  context.stroke();
}

export function drawLennardJonesScene(
  context: CanvasRenderingContext2D,
  view: LennardJonesViewport,
  state: LennardJonesPairState,
  parameters: LennardJonesParameters,
  showForce: boolean,
  showInvariants: boolean,
) {
  context.fillStyle = COLORS.panel;
  context.fillRect(view.left, view.top, view.width, view.height);
  context.strokeStyle = COLORS.grid;
  context.lineWidth = 1;

  for (let coordinate = -2; coordinate <= 2; coordinate += 1) {
    const x = view.centerX + coordinate * view.scale;
    const y = view.centerY - coordinate * view.scale;
    context.beginPath();
    context.moveTo(x, view.top);
    context.lineTo(x, view.top + view.height);
    context.stroke();
    context.beginPath();
    context.moveTo(view.left, y);
    context.lineTo(view.left + view.width, y);
    context.stroke();
  }

  const atomA = worldToLennardJonesCanvas(state.atomA.position, view);
  const atomB = worldToLennardJonesCanvas(state.atomB.position, view);
  context.strokeStyle = COLORS.muted;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(atomA.x, atomA.y);
  context.lineTo(atomB.x, atomB.y);
  context.stroke();

  for (const [atom, color] of [
    [atomA, COLORS.atomA],
    [atomB, COLORS.atomB],
  ] as const) {
    context.beginPath();
    context.arc(atom.x, atom.y, 16, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }

  const interaction = evaluateLennardJonesPair(state, parameters);
  if (showForce && interaction.valid) {
    const visible = Math.min(82, 12 * Math.log1p(Math.abs(interaction.potentialSlope)));
    const forceLength = Math.max(1e-9, lengthLennardJonesPoint(interaction.forceOnA));
    const unitA = scaleLennardJonesPoint(interaction.forceOnA, 1 / forceLength);
    drawArrow(context, atomA, { x: visible * unitA.x, y: -visible * unitA.y }, COLORS.force);
    drawArrow(context, atomB, { x: -visible * unitA.x, y: visible * unitA.y }, COLORS.force);
  }

  if (showInvariants) {
    const center = worldToLennardJonesCanvas(lennardJonesCenterOfMass(state), view);
    context.strokeStyle = COLORS.total;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(center.x - 7, center.y);
    context.lineTo(center.x + 7, center.y);
    context.moveTo(center.x, center.y - 7);
    context.lineTo(center.x, center.y + 7);
    context.stroke();
  }

  context.fillStyle = COLORS.text;
  context.font = MONO;
  context.fillText(
    `r/σ = ${(interaction.distance / parameters.sigma).toFixed(4)}`,
    view.left + 12,
    view.top + 20,
  );
  context.fillStyle = COLORS.muted;
  context.fillText("kéo nguyên tử đỏ", view.left + 12, view.top + view.height - 12);
}

export function drawLennardJonesPotentialGraphs(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: LennardJonesPairState,
  parameters: LennardJonesParameters,
  showForceGraph: boolean,
) {
  const left = width * 0.57;
  const right = width - 20;
  const top = 30;
  const bottom = showForceGraph ? height * 0.29 : height * 0.5 - 10;
  const minimumRatio = 0.78;
  const maximumRatio = 2.6;
  const minimumValue = -1.25 * parameters.epsilon;
  const maximumValue = 2.5 * parameters.epsilon;
  const mapX = (ratio: number) =>
    left + ((ratio - minimumRatio) / (maximumRatio - minimumRatio)) * (right - left);
  const mapY = (value: number) =>
    bottom - ((value - minimumValue) / (maximumValue - minimumValue)) * (bottom - top);

  context.fillStyle = COLORS.panel;
  context.fillRect(left, top, right - left, bottom - top);
  context.strokeStyle = COLORS.grid;
  context.strokeRect(left, top, right - left, bottom - top);
  context.beginPath();
  context.moveTo(left, mapY(0));
  context.lineTo(right, mapY(0));
  context.stroke();

  context.strokeStyle = COLORS.potential;
  context.lineWidth = 2;
  context.beginPath();
  for (let pixel = 0; pixel <= Math.max(1, Math.floor(right - left)); pixel += 1) {
    const ratio = minimumRatio + (pixel / (right - left)) * (maximumRatio - minimumRatio);
    const sample = sampleLennardJonesPotential(ratio * parameters.sigma, parameters);
    const y = mapY(Math.max(minimumValue, Math.min(maximumValue, sample.potential)));
    if (pixel === 0) context.moveTo(left + pixel, y);
    else context.lineTo(left + pixel, y);
  }
  context.stroke();

  const r0Ratio = 2 ** (1 / 6);
  for (const [ratio, color, label] of [
    [1, COLORS.kinetic, "σ"],
    [r0Ratio, COLORS.total, "r₀"],
  ] as const) {
    const x = mapX(ratio);
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, bottom);
    context.stroke();
    context.fillStyle = color;
    context.font = MONO;
    context.fillText(label, x + 4, top + 15);
  }

  const interaction = evaluateLennardJonesPair(state, parameters);
  const currentRatio = interaction.distance / parameters.sigma;
  if (interaction.valid && currentRatio >= minimumRatio && currentRatio <= maximumRatio) {
    context.beginPath();
    context.arc(
      mapX(currentRatio),
      mapY(Math.max(minimumValue, Math.min(maximumValue, interaction.potential))),
      5,
      0,
      Math.PI * 2,
    );
    context.fillStyle = COLORS.text;
    context.fill();
  }
  context.fillStyle = COLORS.text;
  context.font = MONO;
  context.fillText("U(r)", left + 8, bottom - 10);

  if (!showForceGraph) return;

  const forceTop = height * 0.33;
  const forceBottom = height * 0.5 - 10;
  const slopeScale = parameters.epsilon / parameters.sigma;
  const minimumSlope = -6 * slopeScale;
  const maximumSlope = 3 * slopeScale;
  const mapForceY = (value: number) =>
    forceBottom -
    ((value - minimumSlope) / (maximumSlope - minimumSlope)) * (forceBottom - forceTop);

  context.fillStyle = COLORS.panel;
  context.fillRect(left, forceTop, right - left, forceBottom - forceTop);
  context.strokeStyle = COLORS.grid;
  context.strokeRect(left, forceTop, right - left, forceBottom - forceTop);
  context.beginPath();
  context.moveTo(left, mapForceY(0));
  context.lineTo(right, mapForceY(0));
  context.stroke();

  const equilibriumX = mapX(r0Ratio);
  context.strokeStyle = COLORS.total;
  context.beginPath();
  context.moveTo(equilibriumX, forceTop);
  context.lineTo(equilibriumX, forceBottom);
  context.stroke();

  context.strokeStyle = COLORS.force;
  context.lineWidth = 2;
  context.beginPath();
  for (let pixel = 0; pixel <= Math.max(1, Math.floor(right - left)); pixel += 1) {
    const ratio = minimumRatio + (pixel / (right - left)) * (maximumRatio - minimumRatio);
    const sampleState = makeLennardJonesPair(ratio * parameters.sigma, state.atomA.mass);
    const sample = evaluateLennardJonesPair(sampleState, parameters);
    const clipped = Math.max(minimumSlope, Math.min(maximumSlope, sample.potentialSlope));
    const y = mapForceY(clipped);
    if (pixel === 0) context.moveTo(left + pixel, y);
    else context.lineTo(left + pixel, y);
  }
  context.stroke();

  if (interaction.valid && currentRatio >= minimumRatio && currentRatio <= maximumRatio) {
    context.beginPath();
    context.arc(
      mapX(currentRatio),
      mapForceY(Math.max(minimumSlope, Math.min(maximumSlope, interaction.potentialSlope))),
      5,
      0,
      Math.PI * 2,
    );
    context.fillStyle = COLORS.text;
    context.fill();
  }
  context.fillStyle = COLORS.text;
  context.font = MONO;
  context.fillText("Fₐ·d̂ = dU/dr", left + 8, forceBottom - 10);
}

export function drawLennardJonesEnergyGraph(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  history: readonly LennardJonesHistorySample[],
  epsilon: number,
) {
  const left = width * 0.57;
  const right = width - 20;
  const top = height * 0.56;
  const bottom = height - 30;
  context.fillStyle = COLORS.panel;
  context.fillRect(left, top, right - left, bottom - top);
  context.strokeStyle = COLORS.grid;
  context.strokeRect(left, top, right - left, bottom - top);
  if (history.length < 2) return;

  const minimumValue = -1.2 * epsilon;
  const maximumValue = 1.2 * epsilon;
  const mapY = (value: number) =>
    bottom -
    ((Math.max(minimumValue, Math.min(maximumValue, value)) - minimumValue) /
      (maximumValue - minimumValue)) *
      (bottom - top);
  const drawSeries = (read: (sample: LennardJonesHistorySample) => number, color: string) => {
    context.strokeStyle = color;
    context.lineWidth = 1.8;
    context.beginPath();
    history.forEach((sample, index) => {
      const x = left + (index / (history.length - 1)) * (right - left);
      const y = mapY(read(sample));
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  };

  drawSeries((sample) => sample.potential, COLORS.potential);
  drawSeries((sample) => sample.kinetic, COLORS.kinetic);
  drawSeries((sample) => sample.total, COLORS.total);
  context.fillStyle = COLORS.text;
  context.font = MONO;
  context.fillText("U / K / E", left + 8, top + 16);
}
