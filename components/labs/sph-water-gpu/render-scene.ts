import { WaterDepth } from "@/lib/labs/sph-water-gpu/water-depth";
import { shadeWater } from "@/lib/labs/sph-water-gpu/water-shade";
import { waterProject, type WaterCamera } from "@/lib/labs/sph-water-gpu/lens";
import { tank, type FluidState, type Vec3 } from "@/lib/labs/sph-water-gpu/state";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export type WaterView = "water" | "particles" | "density" | "speed";
interface Cache {
  state: FluidState;
  key: string;
  surface: WaterDepth;
  image: HTMLCanvasElement;
}
const cache = new WeakMap<CanvasRenderingContext2D, Cache>();

export function renderWaterScene(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  state: FluidState,
  camera: WaterCamera,
  view: WaterView,
  dark: boolean,
  interactive: boolean,
  stage = 13,
) {
  setupCanvas(ctx, size);
  const w = Math.max(140, Math.round(Math.min(interactive ? 360 : 640, size.width))),
    h = Math.min(650, Math.max(140, Math.round((w * size.height) / size.width)));
  const key = [
    state.ticks,
    ...state.paddle.position,
    state.paddle.enabled,
    camera.yaw,
    camera.pitch,
    camera.distance,
    view,
    dark,
    stage,
    w,
    h,
  ].join(",");
  let stored = cache.get(ctx);
  if (!stored || stored.state !== state || stored.key !== key) {
    let surface = stored?.surface;
    if (!surface || surface.width !== w || surface.height !== h) surface = new WaterDepth(w, h);
    surface.scene(state, camera, dark);
    if (view === "water") {
      surface.particles(state, camera);
      if (stage >= 9) surface.smooth(state.spacing);
      shadeWater(surface, camera);
    } else surface.rgba.set(surface.background);
    const image = stored?.image ?? document.createElement("canvas");
    image.width = w;
    image.height = h;
    image
      .getContext("2d")!
      .putImageData(new ImageData(new Uint8ClampedArray(surface.rgba), w, h), 0, 0);
    stored = { state, key, surface, image };
    cache.set(ctx, stored);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(stored.image, 0, 0, size.width, size.height);
  if (view !== "water") {
    const list = Array.from({ length: state.count }, (_, i) => ({
      i,
      p: waterProject(
        [state.position[3 * i], state.position[3 * i + 1], state.position[3 * i + 2]],
        camera,
        size.width,
        size.height,
      ),
    }))
      .filter((v) => v.p)
      .sort((a, b) => b.p!.depth - a.p!.depth);
    for (const item of list) {
      const p = item.p!,
        i = item.i,
        r = Math.max(1, (state.spacing * 0.55 * size.height) / (0.9326 * p.depth));
      let t = 0.4;
      if (view === "density") t = Math.max(0, Math.min(1, (state.density[i] / 1000 - 0.7) / 0.5));
      if (view === "speed")
        t = Math.min(
          1,
          Math.hypot(state.velocity[3 * i], state.velocity[3 * i + 1], state.velocity[3 * i + 2]) /
            2.5,
        );
      ctx.fillStyle = `rgb(${Math.round(35 + 210 * t)},${Math.round(175 - 85 * t)},${Math.round(235 - 155 * t)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  const line = (a: Vec3, b: Vec3) => {
    const p = waterProject(a, camera, size.width, size.height),
      q = waterProject(b, camera, size.width, size.height);
    if (!p || !q) return;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  };
  ctx.strokeStyle = dark ? "#7fbbcf70" : "#325a6e55";
  ctx.lineWidth = 1;
  // Keep the showcase clean; the diagnostic views reveal all six tank boundaries.
  if (view !== "water")
    for (let bits = 0; bits < 8; bits++)
      for (let a = 0; a < 3; a++)
        if (!(bits & (1 << a))) {
          const p = [0, 1, 2].map((axis) => (bits & (1 << axis) ? tank[axis] : 0)) as Vec3;
          const q: Vec3 = [...p];
          q[a] = tank[a];
          line(p, q);
        }
  ctx.font = "12px sans-serif";
  ctx.fillStyle = dark ? "#bdd4e2" : "#2c5063";
  ctx.fillText("1.65 × 0.825 × 1.10 m · y ↑", 14, size.height - 15);
  if (state.paddle.enabled) {
    const target = waterProject(state.paddle.target, camera, size.width, size.height);
    if (target) {
      ctx.strokeStyle = "#efab53";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(target.x, target.y, 10, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#d08832";
      ctx.fillText("Đích", target.x + 14, target.y - 8);
    }
  }
}
