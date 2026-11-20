import { densityAt, type Disk } from "./model.ts";
import { sliceRadius, sliceSide } from "./backprojection.ts";

// Generate the comparison plate in field coordinates. The reconstruction does not import this module.
export function specimenField(scene: readonly Disk[], strength: number, side = sliceSide) {
  if (!Number.isInteger(side) || side < 1 || side > 224)
    throw new RangeError("Invalid reference resolution");
  const reference = new Float64Array(side * side);
  const pitch = (2 * sliceRadius) / side;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      reference[x + y * side] =
        strength *
        densityAt(scene, [-sliceRadius + (x + 0.5) * pitch, sliceRadius - (y + 0.5) * pitch]);
    }
  }
  return reference;
}
