import type {
  MolecularSystem,
  PairSample,
  SystemMetrics,
  Vec2,
} from "@/lib/labs/molecular-dynamics-cpu";
import { rawLennardJones } from "@/lib/labs/molecular-dynamics-cpu";

export interface MolecularHistorySample {
  elapsed: number;
  kinetic: number;
  potential: number;
  total: number;
  temperature: number;
}

export interface MolecularViewport {
  canvasWidth: number;
  canvasHeight: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function makeMolecularViewport(
  canvasWidth: number,
  canvasHeight: number,
  showSidePanel: boolean,
): MolecularViewport {
  const left = 24;
  const top = 28;
  const right = showSidePanel ? canvasWidth * 0.61 : canvasWidth - 24;
  return {
    canvasWidth,
    canvasHeight,
    left,
    top,
    width: Math.max(120, right - left),
    height: Math.max(120, canvasHeight - top - 30),
  };
}

export function worldToMolecularCanvas(
  point: Vec2,
  system: MolecularSystem,
  viewport: MolecularViewport,
): Vec2 {
  return {
    x: viewport.left + (point.x / system.box.width) * viewport.width,
    y: viewport.top + (point.y / system.box.height) * viewport.height,
  };
}

export function molecularCanvasToWorld(
  point: Vec2,
  system: MolecularSystem,
  viewport: MolecularViewport,
): Vec2 {
  return {
    x: ((point.x - viewport.left) / viewport.width) * system.box.width,
    y: ((point.y - viewport.top) / viewport.height) * system.box.height,
  };
}

function drawArrow(context: CanvasRenderingContext2D, start: Vec2, end: Vec2, color: string) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - 6 * Math.cos(angle - 0.45), end.y - 6 * Math.sin(angle - 0.45));
  context.lineTo(end.x - 6 * Math.cos(angle + 0.45), end.y - 6 * Math.sin(angle + 0.45));
  context.closePath();
  context.fill();
}

export function drawMolecularScene(
  context: CanvasRenderingContext2D,
  system: MolecularSystem,
  viewport: MolecularViewport,
  selectedIndex: number,
  showVelocities: boolean,
  showPairConnections: boolean,
) {
  context.fillStyle = "#0b1020";
  context.fillRect(0, 0, viewport.canvasWidth, viewport.canvasHeight);
  context.fillStyle = "#111827";
  context.fillRect(viewport.left, viewport.top, viewport.width, viewport.height);
  context.strokeStyle = "#4b5263";
  context.lineWidth = 2;
  context.strokeRect(viewport.left, viewport.top, viewport.width, viewport.height);

  const selected = system.particles[selectedIndex];
  if (showPairConnections && selected) {
    const start = worldToMolecularCanvas(selected.position, system, viewport);
    context.strokeStyle = "rgba(86, 182, 194, 0.24)";
    context.lineWidth = 1;
    for (let index = selectedIndex + 1; index < system.particles.length; index += 1) {
      const end = worldToMolecularCanvas(system.particles[index].position, system, viewport);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
  }

  const radius = Math.max(1.5, Math.min(4, 70 / Math.sqrt(system.particles.length)));
  for (let index = 0; index < system.particles.length; index += 1) {
    const particle = system.particles[index];
    const screen = worldToMolecularCanvas(particle.position, system, viewport);
    const speed = Math.hypot(particle.velocity.x, particle.velocity.y);
    const speedColor = Math.min(1, speed / 2.5);
    const red = Math.round(97 + speedColor * 127);
    const blue = Math.round(239 - speedColor * 100);
    context.fillStyle = `rgb(${red}, 175, ${blue})`;
    context.beginPath();
    context.arc(screen.x, screen.y, index === selectedIndex ? radius + 2 : radius, 0, Math.PI * 2);
    context.fill();
    if (index === selectedIndex) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.5;
      context.stroke();
    }
    if (showVelocities && index < 96) {
      drawArrow(
        context,
        screen,
        {
          x: screen.x + particle.velocity.x * 7,
          y: screen.y + particle.velocity.y * 7,
        },
        "rgba(229, 192, 123, 0.72)",
      );
    }
  }

  context.fillStyle = "#abb2bf";
  context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillText(
    `${system.particles.length} hạt · hộp ${system.box.width.toFixed(2)} × ${system.box.height.toFixed(2)}`,
    viewport.left + 8,
    viewport.top + 18,
  );
}

function graphFrame(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  title: string,
) {
  context.fillStyle = "#111827";
  context.fillRect(left, top, width, height);
  context.strokeStyle = "#3e4451";
  context.strokeRect(left, top, width, height);
  context.fillStyle = "#abb2bf";
  context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillText(title, left + 8, top + 16);
}

export function drawCutoffGraph(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  system: MolecularSystem,
  samplePair: (distance: number) => PairSample,
  zoomCutoff = false,
) {
  const left = canvasWidth * 0.64;
  const top = 34;
  const width = canvasWidth - left - 24;
  const height = 185;
  graphFrame(context, left, top, width, height, "FORCE-SHIFTED U(r) · dU/dr");
  const minimumR = zoomCutoff ? system.parameters.cutoff - 0.1 : 0.9 * system.parameters.sigma;
  const maximumR = zoomCutoff ? system.parameters.cutoff + 0.1 : 1.08 * system.parameters.cutoff;
  const centerY = top + height * 0.55;
  context.strokeStyle = "#4b5263";
  context.beginPath();
  context.moveTo(left + 8, centerY);
  context.lineTo(left + width - 8, centerY);
  context.stroke();

  for (const raw of [true, false]) {
    context.setLineDash(raw ? [3, 4] : []);
    context.globalAlpha = raw ? 0.45 : 1;
    for (const [field, color, baseScaleY] of [
      ["potential", "#c678dd", 22],
      ["potentialSlope", "#56b6c2", 8],
    ] as const) {
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      let drawing = false;
      for (let pixel = 0; pixel <= Math.floor(width - 16); pixel += 1) {
        const ratio = pixel / Math.max(1, width - 16);
        const distance = minimumR + ratio * (maximumR - minimumR);
        const sample = raw
          ? { valid: true, ...rawLennardJones(distance, system.parameters) }
          : samplePair(distance);
        if (!sample.valid) {
          drawing = false;
          continue;
        }
        const x = left + 8 + pixel;
        const value = Math.max(-4, Math.min(4, sample[field]));
        const scaleY = zoomCutoff ? 800 : baseScaleY;
        const y = Math.max(top + 24, Math.min(top + height - 20, centerY - value * scaleY));
        if (drawing) {
          context.lineTo(x, y);
        } else {
          context.moveTo(x, y);
          drawing = true;
        }
      }
      context.stroke();
    }
  }
  context.globalAlpha = 1;

  const cutoffX =
    left + 8 + ((system.parameters.cutoff - minimumR) / (maximumR - minimumR)) * (width - 16);
  context.strokeStyle = "#e5c07b";
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(cutoffX, top + 22);
  context.lineTo(cutoffX, top + height - 8);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#e5c07b";
  context.fillText("r cutoff", cutoffX - 26, top + height - 10);
  context.fillStyle = "#abb2bf";
  context.fillText("nét đứt: LJ gốc · liền: đã dịch", left + 8, top + height - 28);
}

export function drawEnergyHistory(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  history: readonly MolecularHistorySample[],
) {
  const left = canvasWidth * 0.64;
  const top = 238;
  const width = canvasWidth - left - 24;
  const height = canvasHeight - top - 30;
  graphFrame(context, left, top, width, height, "U tím · K vàng · E xanh / thời gian");
  if (history.length < 2) {
    return;
  }

  const values = history.flatMap((sample) => [sample.kinetic, sample.potential, sample.total]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(1e-9, maximum - minimum);
  for (const [field, color] of [
    ["potential", "#c678dd"],
    ["kinetic", "#e5c07b"],
    ["total", "#98c379"],
  ] as const) {
    context.strokeStyle = color;
    context.lineWidth = field === "total" ? 2.4 : 1.5;
    context.beginPath();
    history.forEach((sample, index) => {
      const timeSpan = Math.max(1e-12, history[history.length - 1].elapsed - history[0].elapsed);
      const x = left + 8 + ((sample.elapsed - history[0].elapsed) / timeSpan) * (width - 16);
      const y = top + height - 8 - ((sample[field] - minimum) / span) * (height - 34);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  }
}

export function drawScalingPanel(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
) {
  const left = canvasWidth * 0.64;
  const top = 34;
  const width = canvasWidth - left - 24;
  const height = canvasHeight - top - 30;
  graphFrame(context, left, top, width, height, "SỐ CẶP N(N-1)/2");
  const presets = [64, 144, 256, 1_000];
  const maximumPairs = (1_000 * 999) / 2;
  presets.forEach((count, index) => {
    const pairs = (count * (count - 1)) / 2;
    const y = top + 34 + index * ((height - 48) / presets.length);
    const barWidth = Math.max(2, (pairs / maximumPairs) * (width - 92));
    context.fillStyle = "#61afef";
    context.fillRect(left + 62, y, barWidth, 14);
    context.fillStyle = "#abb2bf";
    context.fillText(String(count), left + 10, y + 12);
    context.fillText(pairs.toLocaleString("vi-VN"), left + 68 + barWidth, y + 12);
  });
}

export function appendMolecularHistory(
  history: readonly MolecularHistorySample[],
  system: MolecularSystem,
  metrics: SystemMetrics,
  limit = 180,
): MolecularHistorySample[] {
  const next = [
    ...history,
    {
      elapsed: system.elapsed,
      kinetic: metrics.kineticEnergy,
      potential: metrics.potentialEnergy,
      total: metrics.totalEnergy,
      temperature: metrics.temperature,
    },
  ];
  if (next.length <= limit) {
    return next;
  }
  return next.slice(next.length - limit);
}
