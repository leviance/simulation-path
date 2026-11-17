// Cubic spline normalized in volume, not the area kernel of Project 50.
export function spline3(r: number, h: number): number {
  const q = r / h;
  if (q >= 2) return 0;
  const normalization = 1 / (Math.PI * h * h * h);
  if (q < 1) return normalization * (1 - 1.5 * q * q + 0.75 * q * q * q);
  return normalization * 0.25 * (2 - q) ** 3;
}

// Multiply this scalar by displacement (xi-xj) to obtain ∇i W.
export function splineGradientFactor(r: number, h: number): number {
  if (r < 1e-12 || r >= 2 * h) return 0;
  const q = r / h;
  let derivative = -0.75 * (2 - q) * (2 - q);
  if (q < 1) derivative = -3 * q + 2.25 * q * q;
  return derivative / (Math.PI * h ** 4 * r);
}
