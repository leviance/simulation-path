import type { GalaxyScene, Camera } from "@/lib/labs/galaxy/scene";
import type { Vec3, Bounds3D } from "@/lib/labs/barnes-hut-nbody";
import type { selectedForce } from "@/lib/labs/galaxy/scene";
export function projectGalaxy(point: Vec3, camera: Camera, width: number, height: number) {
  const x = point.x - camera.x,
    y = point.y - camera.y,
    z = point.z;
  const yawX = Math.cos(camera.yaw) * x - Math.sin(camera.yaw) * z,
    yawZ = Math.sin(camera.yaw) * x + Math.cos(camera.yaw) * z;
  const cameraY = Math.cos(camera.pitch) * y - Math.sin(camera.pitch) * yawZ,
    depth = Math.sin(camera.pitch) * y + Math.cos(camera.pitch) * yawZ + camera.distance;
  const scale = (height * 0.5) / Math.tan(Math.PI / 6);
  return {
    x: width / 2 + (yawX * scale) / depth,
    y: height * 0.47 - (cameraY * scale) / depth,
    depth,
    visible: depth > 0.1,
  };
}
function line(
  context: CanvasRenderingContext2D,
  a: ReturnType<typeof projectGalaxy>,
  b: ReturnType<typeof projectGalaxy>,
  color: string,
  width: number,
  height: number,
) {
  if (
    !a.visible ||
    !b.visible ||
    Math.max(Math.abs(a.x), Math.abs(b.x)) > width * 4 ||
    Math.max(Math.abs(a.y), Math.abs(b.y)) > height * 4
  )
    return;
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.stroke();
}
function box(
  context: CanvasRenderingContext2D,
  bounds: Bounds3D,
  scene: GalaxyScene,
  width: number,
  height: number,
  color: string,
) {
  const corners = Array.from({ length: 8 }, (_, i) =>
    projectGalaxy(
      {
        x: i & 1 ? bounds.maximum.x : bounds.minimum.x,
        y: i & 2 ? bounds.maximum.y : bounds.minimum.y,
        z: i & 4 ? bounds.maximum.z : bounds.minimum.z,
      },
      scene.camera,
      width,
      height,
    ),
  );
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4])
      if ((i & bit) === 0) line(context, corners[i], corners[i | bit], color, width, height);
}
export function drawGalaxy(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: GalaxyScene,
  force: ReturnType<typeof selectedForce>,
) {
  let drawn = 0;
  for (let frame = 1; frame < scene.trails.length; frame++)
    for (let body = 0; body < scene.trails[frame].length; body++)
      line(
        context,
        projectGalaxy(scene.trails[frame - 1][body], scene.camera, width, height),
        projectGalaxy(scene.trails[frame][body], scene.camera, width, height),
        "#28445b",
        width,
        height,
      );
  if (scene.debug && scene.stage >= 6) {
    for (const i of force.trace.opened.slice(0, 512))
      box(context, scene.tree.nodes[i].bounds, scene, width, height, "#34536e");
    for (const i of force.trace.accepted.slice(0, 512))
      box(context, scene.tree.nodes[i].bounds, scene, width, height, "#a89251");
  } else if (scene.debug && scene.stage >= 5) {
    for (const node of scene.tree.nodes
      .filter((node) => node.totalMass > 0 && node.children === null)
      .slice(0, 512))
      box(context, node.bounds, scene, width, height, "#34536e");
  }
  const points = scene.bodies
    .map((body, index) => ({
      body,
      index,
      p: projectGalaxy(body.position, scene.camera, width, height),
    }))
    .sort((a, b) => b.p.depth - a.p.depth || a.index - b.index);
  for (const { body, index, p } of points) {
    if (!p.visible || p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue;
    drawn++;
    const speed = Math.min(1, Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z) / 1.5);
    context.fillStyle =
      "rgb(" + Math.round(80 + speed * 160) + ",170," + Math.round(240 - speed * 130) + ")";
    let radius = 1.1;
    if (index === 0) {
      radius = 4;
      context.fillStyle = "#e06c75";
    }
    if (index === scene.selected) {
      radius = 4;
      context.fillStyle = "#e5c07b";
    }
    context.beginPath();
    context.arc(p.x, p.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  if (scene.stage >= 2) {
    const body = scene.bodies[scene.selected],
      a =
        scene.stage >= 6
          ? force.approximate.acceleration
          : scene.stage >= 3
            ? force.exact.acceleration
            : force.pair,
      length = Math.hypot(a.x, a.y, a.z);
    if (length > 1e-12) {
      const end = {
        x: body.position.x + (a.x * 0.1) / length,
        y: body.position.y + (a.y * 0.1) / length,
        z: body.position.z + (a.z * 0.1) / length,
      };
      line(
        context,
        projectGalaxy(body.position, scene.camera, width, height),
        projectGalaxy(end, scene.camera, width, height),
        "#e5c07b",
        width,
        height,
      );
    }
  }
  return drawn;
}
export function pickGalaxy(
  scene: GalaxyScene,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  let selected = scene.selected,
    nearest = 100;
  for (let i = 0; i < scene.bodies.length; i++) {
    const p = projectGalaxy(scene.bodies[i].position, scene.camera, width, height),
      distance = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (p.visible && distance < nearest) {
      selected = i;
      nearest = distance;
    }
  }
  return selected;
}
