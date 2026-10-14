import {
  at,
  dot,
  finite,
  inRange,
  length,
  normalize,
  subtract,
  multiply,
  add,
  valid,
  type Hit,
  type Ray,
  type Scene,
} from "./model.ts";
// Validate records against geometry, not completeness of the query's hit list.
export function validateHits(ray: Ray, scene: Scene, hits: (Hit | null)[]) {
  const report = { checks: 0, failures: 0 },
    tolerance = 1e-8;
  const check = (condition: boolean) => {
    report.checks++;
    if (!condition) report.failures++;
  };
  check(valid(ray));
  for (const hit of hits) {
    if (!hit) continue;
    check(inRange(ray, hit.t));
    check(finite(hit.point) && finite(hit.normal));
    check(Math.abs(length(hit.normal) - 1) <= tolerance);
    check(length(subtract(hit.point, at(ray, hit.t))) <= tolerance);
    check(hit.frontFace === dot(ray.direction, hit.normal) < 0);
    if (hit.objectId === 0)
      check(
        Math.abs(dot(subtract(hit.point, scene.plane.point), normalize(scene.plane.normal))) <=
          tolerance,
      );
    else if (hit.objectId === 1)
      check(
        Math.abs(length(subtract(hit.point, scene.sphere.center)) - scene.sphere.radius) <=
          tolerance,
      );
    else if (hit.objectId === 2) {
      const distances = [];
      check(
        (["x", "y", "z"] as const).every(
          (axis) =>
            hit.point[axis] >= scene.box.minimum[axis] - tolerance &&
            hit.point[axis] <= scene.box.maximum[axis] + tolerance,
        ),
      );
      for (const axis of ["x", "y", "z"] as const) {
        distances.push(
          Math.abs(hit.point[axis] - scene.box.minimum[axis]),
          Math.abs(hit.point[axis] - scene.box.maximum[axis]),
        );
      }
      check(Math.min(...distances) <= tolerance);
    } else if (hit.objectId === 3) {
      const reconstructed = add(
        add(multiply(scene.triangle.a, 1 - hit.u - hit.v), multiply(scene.triangle.b, hit.u)),
        multiply(scene.triangle.c, hit.v),
      );
      check(hit.u >= 0 && hit.v >= 0 && hit.u + hit.v <= 1);
      check(length(subtract(reconstructed, hit.point)) <= tolerance);
    } else check(false);
  }
  return report;
}
