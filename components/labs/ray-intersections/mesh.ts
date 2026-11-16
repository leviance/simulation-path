import { add, multiply, type Scene, type Vec3 } from "@/lib/labs/ray-intersections";
import { Raster, type Color } from "./raster";

export function drawScene(raster: Raster, scene: Scene, selected: number, debug: boolean) {
  const colors: Color[] = [
    [66, 105, 132],
    [86, 190, 250],
    [244, 177, 76],
    [200, 125, 239],
  ];
  if (selected >= 0)
    colors[selected] = colors[selected].map((n) => Math.min(255, n * 1.12)) as Color;
  const p = scene.plane.point;
  const a = add(p, { x: -6, y: 0, z: -5 }),
    b = add(p, { x: 6, y: 0, z: -5 });
  const c = add(p, { x: 6, y: 0, z: 7 }),
    d = add(p, { x: -6, y: 0, z: 7 });
  raster.triangle(a, b, c, colors[0]);
  raster.triangle(a, c, d, colors[0]);
  const vertex = (lat: number, lon: number): Vec3 => {
    const phi = -Math.PI / 2 + (lat * Math.PI) / 20,
      theta = (lon * 2 * Math.PI) / 40;
    return add(
      scene.sphere.center,
      multiply(
        {
          x: Math.cos(phi) * Math.cos(theta),
          y: Math.sin(phi),
          z: Math.cos(phi) * Math.sin(theta),
        },
        scene.sphere.radius,
      ),
    );
  };
  for (let lat = 0; lat < 20; lat++)
    for (let lon = 0; lon < 40; lon++) {
      const a = vertex(lat, lon),
        b = vertex(lat, lon + 1),
        c = vertex(lat + 1, lon + 1),
        d = vertex(lat + 1, lon);
      raster.triangle(a, b, c, colors[1]);
      raster.triangle(a, c, d, colors[1]);
    }
  const corners = Array.from({ length: 8 }, (_, i) => ({
    x: i & 1 ? scene.box.maximum.x : scene.box.minimum.x,
    y: i & 2 ? scene.box.maximum.y : scene.box.minimum.y,
    z: i & 4 ? scene.box.maximum.z : scene.box.minimum.z,
  }));
  for (const [a, b, c, d] of [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ]) {
    raster.triangle(corners[a], corners[b], corners[c], colors[2]);
    raster.triangle(corners[a], corners[c], corners[d], colors[2]);
  }
  raster.triangle(scene.triangle.a, scene.triangle.b, scene.triangle.c, colors[3]);
  if (debug) {
    for (let i = -5; i <= 5; i++) {
      raster.line(
        add(p, { x: i, y: 0.002, z: -5 }),
        add(p, { x: i, y: 0.002, z: 7 }),
        [68, 102, 128],
      );
      raster.line(
        add(p, { x: -6, y: 0.002, z: i }),
        add(p, { x: 6, y: 0.002, z: i }),
        [68, 102, 128],
      );
    }
    const zero = { x: 0, y: 0, z: 0 };
    raster.line(zero, { x: 1, y: 0, z: 0 }, [248, 100, 103], true, 1);
    raster.line(zero, { x: 0, y: 1, z: 0 }, [110, 234, 151], true, 1);
    raster.line(zero, { x: 0, y: 0, z: 1 }, [103, 170, 250], true, 1);
  }
}
