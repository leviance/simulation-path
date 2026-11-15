import { world, potentialAt, inside, type WindField, type Scene, type Vec2 } from "./model.ts";
import { gradient } from "./operators.ts";
export function populate(field: WindField, scene: Scene, stage = 9) {
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x,
        p = world(field, x, y);
      field.scalar[i] = potentialAt(p, scene.potential);
      let v = { x: 1, y: 0.25 };
      if (stage >= 2) {
        if (scene.preset === "source") v = { ...p };
        if (scene.preset === "sink") v = { x: -p.x, y: -p.y };
        if (scene.preset === "rotation") v = { x: -p.y, y: p.x };
        if (scene.preset === "shear") v = { x: p.y, y: 0 };
      }
      field.vx[i] = v.x;
      field.vy[i] = v.y;
    }
  if (stage >= 3 && scene.preset === "gradient") gradient(field);
  if (stage >= 8 && scene.vortex) addVortex(field, scene.center, scene.strength);
}
export function addVortex(field: WindField, center: Vec2, strength: number) {
  if (!inside(center) || !Number.isFinite(strength) || Math.abs(strength) > 2)
    throw new RangeError("Invalid vortex");
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x,
        p = world(field, x, y),
        qx = p.x - center.x,
        qy = p.y - center.y;
      const weight = strength * Math.exp(-(qx * qx + qy * qy) / (0.55 * 0.55));
      field.vx[i] += -qy * weight;
      field.vy[i] += qx * weight;
    }
}
