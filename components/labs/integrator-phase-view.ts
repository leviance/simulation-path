import {
  integratorAngularFrequency,
  finiteIntegratorState,
  type IntegratorOscillatorState,
  type IntegratorOscillatorParameters,
} from "@/lib/labs/integrator-race";
import { drawLine } from "./lab-shared";
const COLORS = { grid: "#24324d", exact: "#f5f7ff" };

export interface PhasePoint {
  label: string;
  state: IntegratorOscillatorState;
}

export function drawPhaseInspector(
  context: CanvasRenderingContext2D,
  bounds: { left: number; top: number; width: number; height: number },
  points: PhasePoint[],
  initial: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  color: string,
) {
  const omega = integratorAngularFrequency(parameters);
  if (
    !Number.isFinite(omega) ||
    omega <= 0 ||
    !points.every((point) => finiteIntegratorState(point.state))
  )
    return;

  const center = {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
  const initialRadius = Math.hypot(initial.position, initial.velocity / omega);
  const pointRadius = Math.max(
    0,
    ...points.map((point) => Math.hypot(point.state.position, point.state.velocity / omega)),
  );
  const extent = Math.max(0.5, initialRadius, pointRadius) * 1.18;
  const scale = Math.min(bounds.width, bounds.height) / (2 * extent);
  const toCanvas = (state: IntegratorOscillatorState) => ({
    x: center.x + state.position * scale,
    y: center.y - (state.velocity / omega) * scale,
  });

  drawLine(
    context,
    { x: bounds.left, y: center.y },
    { x: bounds.left + bounds.width, y: center.y },
    COLORS.grid,
  );
  drawLine(
    context,
    { x: center.x, y: bounds.top },
    { x: center.x, y: bounds.top + bounds.height },
    COLORS.grid,
  );

  context.beginPath();
  context.arc(center.x, center.y, initialRadius * scale, 0, Math.PI * 2);
  context.strokeStyle = COLORS.exact;
  context.globalAlpha = 0.45;
  context.stroke();
  context.globalAlpha = 1;

  context.beginPath();
  points.forEach((point, index) => {
    const canvasPoint = toCanvas(point.state);
    if (index === 0) context.moveTo(canvasPoint.x, canvasPoint.y);
    else context.lineTo(canvasPoint.x, canvasPoint.y);
  });
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.stroke();

  context.font = "11px ui-monospace, monospace";
  for (const point of points) {
    const canvasPoint = toCanvas(point.state);
    context.beginPath();
    context.arc(canvasPoint.x, canvasPoint.y, 4, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.fillStyle = "#dce6f8";
    context.fillText(point.label, canvasPoint.x + 6, canvasPoint.y - 5);
  }

  context.fillStyle = "#aebbd2";
  context.fillText("x (m)", bounds.left + bounds.width - 38, center.y - 6);
  context.fillText("v / ω (m)", center.x + 7, bounds.top + 12);
}
