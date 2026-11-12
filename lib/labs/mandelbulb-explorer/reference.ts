import { add, dot, finite, scale, length, validate, type Settings, type Vec3 } from "./math.ts";
// Deliberately independent of field.ts: integer complex multiplication instead of trig.
export function referenceOrbit(c: Vec3, s: Settings) {
  let x = 0,
    y = 0,
    z = 0,
    derivative = 1;
  if (!finite(c)) return { escaped: false, invalid: true, distance: 0, evaluations: 0 };
  for (let iteration = 0; iteration < s.iterations; iteration++) {
    const r = Math.sqrt(x * x + y * y + z * z);
    if (!Number.isFinite(r) || !Number.isFinite(derivative) || derivative <= 0)
      return { escaped: false, invalid: true, distance: 0, evaluations: iteration + 1 };
    if (r > s.bailout) {
      const distance = (Math.log(r) * r) / (2 * derivative);
      return {
        escaped: true,
        invalid: !Number.isFinite(distance) || distance <= 0,
        distance,
        evaluations: iteration + 1,
      };
    }
    if (r < 1e-15) {
      x = c.x;
      y = c.y;
      z = c.z;
      derivative = 1;
      continue;
    }
    const rho = Math.sqrt(x * x + y * y),
      ct = z / r,
      st = rho / r;
    let cp = 1,
      sp = 0;
    if (rho > 1e-15) {
      cp = x / rho;
      sp = y / rho;
    }
    let polarReal = 1,
      polarImaginary = 0,
      azimuthReal = 1,
      azimuthImaginary = 0,
      rp = 1,
      rpPrevious = 1;
    for (let factor = 0; factor < s.power; factor++) {
      const pr = polarReal * ct - polarImaginary * st,
        pi = polarReal * st + polarImaginary * ct;
      const ar = azimuthReal * cp - azimuthImaginary * sp,
        ai = azimuthReal * sp + azimuthImaginary * cp;
      polarReal = pr;
      polarImaginary = pi;
      azimuthReal = ar;
      azimuthImaginary = ai;
      rpPrevious = rp;
      rp *= r;
    }
    derivative = s.power * rpPrevious * derivative + 1;
    x = rp * polarImaginary * azimuthReal + c.x;
    y = rp * polarImaginary * azimuthImaginary + c.y;
    z = rp * polarReal + c.z;
  }
  return { escaped: false, invalid: false, distance: 0, evaluations: s.iterations };
}
export function referenceRay(origin: Vec3, direction: Vec3, s: Settings, step = 0.001) {
  validate(s);
  if (!finite(origin) || !finite(direction) || Math.abs(length(direction) - 1) > 1e-6)
    throw new Error("Reference ray cần origin hữu hạn và hướng đơn vị.");
  if (!Number.isFinite(step) || step < 0.00025 || step > 0.01)
    throw new Error("Bước tham chiếu hữu hạn: 0.00025–0.01.");
  const b = dot(origin, direction),
    discriminant = b * b - dot(origin, origin) + 4;
  if (discriminant < 0) return { hit: false, t: 0, probes: 0 };
  const root = Math.sqrt(discriminant),
    start = Math.max(0.001, -b - root),
    farT = Math.min(s.farBound, -b + root);
  const contains = (t: number) => {
    const f = referenceOrbit(add(origin, scale(direction, t)), s);
    if (f.invalid) throw new Error("Oracle overflow");
    return !f.escaped || f.distance < s.epsilon;
  };
  let previous = start,
    probes = 0;
  for (let t = start; t <= farT; t += step) {
    if (++probes > 17000) throw new Error("Reference ray vượt 17.000 probe.");
    if (contains(t)) {
      let low = previous,
        high = t;
      for (let refinement = 0; refinement < 14; refinement++) {
        const middle = (low + high) * 0.5;
        if (contains(middle)) high = middle;
        else low = middle;
      }
      return { hit: true, t: (low + high) * 0.5, probes };
    }
    previous = t;
  }
  return { hit: false, t: 0, probes };
}
