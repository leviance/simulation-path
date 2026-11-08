import { add, sub, mul, dot, cross, normalize, length, type Vec3 } from "./math.ts";
import { cameraBasis, projectPoint } from "./camera.ts";
import type { ClothView } from "./controller.ts";
const palette = [
  "#60b5bd",
  "#e5ac6e",
  "#a9bad7",
  "#e58e9a",
  "#b4cd83",
  "#b997d6",
  "#e6d690",
  "#8ca6bf",
  "#67cfb5",
  "#dc9e78",
  "#a9b5ef",
  "#c3cebc",
  "#d2a3c9",
  "#7bb4db",
];
export function renderCloth(
  ctx: CanvasRenderingContext2D,
  state: ClothView,
  width: number,
  height: number,
) {
  const project = (p: Vec3) => projectPoint(p, state.camera, width, height);
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#152735");
  background.addColorStop(0.55, "#0a1724");
  background.addColorStop(1, "#142431");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const line = (a: Vec3, b: Vec3, color: string, thickness = 1) => {
    const p = project(a),
      q = project(b);
    if (!p.visible || !q.visible) return;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  };
  for (let i = -5; i <= 5; i++) {
    line({ x: i, y: 0, z: -5 }, { x: i, y: 0, z: 5 }, i === 0 ? "#3c5d6c" : "#233b4b");
    line({ x: -5, y: 0, z: i }, { x: 5, y: 0, z: i }, i === 0 ? "#3c5d6c" : "#233b4b");
  }
  const light = normalize({ x: -0.4, y: 0.85, z: -0.65 }),
    eye = cameraBasis(state.camera).eye;
  const faces: { points: ReturnType<typeof project>[]; depth: number; color: string }[] = [];
  const face = (a: Vec3, b: Vec3, c: Vec3, base: number[], normal?: Vec3) => {
    const points = [project(a), project(b), project(c)];
    if (points.some((p) => !p.visible)) return;
    const n = normal ?? normalize(cross(sub(b, a), sub(c, a))),
      illumination = 0.35 + 0.65 * Math.abs(dot(n, light));
    faces.push({
      points,
      depth: points.reduce((sum, p) => sum + p.depth, 0) / 3,
      color: `rgb(${base.map((v) => Math.round(v * illumination)).join(" ")})`,
    });
  };
  const sphere = (center: Vec3, radius: number) => {
    const point = (lat: number, lon: number) =>
      add(center, {
        x: radius * Math.sin(lat) * Math.cos(lon),
        y: radius * Math.cos(lat),
        z: radius * Math.sin(lat) * Math.sin(lon),
      });
    for (let lat = 0; lat < 12; lat++)
      for (let lon = 0; lon < 24; lon++) {
        const a = point((lat * Math.PI) / 12, (lon * Math.PI) / 12),
          b = point(((lat + 1) * Math.PI) / 12, (lon * Math.PI) / 12),
          c = point((lat * Math.PI) / 12, ((lon + 1) * Math.PI) / 12),
          d = point(((lat + 1) * Math.PI) / 12, ((lon + 1) * Math.PI) / 12);
        face(a, b, c, [172, 142, 98]);
        face(c, b, d, [172, 142, 98]);
      }
  };
  if (state.preset !== "hanging") sphere({ x: state.settings.obstacleX, y: 1.75, z: 0 }, 1.35);
  if (state.preset === "drop") {
    const x = state.settings.obstacleX;
    sphere({ x: x - 1, y: 0.9, z: -1.75 }, 0.45);
    sphere({ x: x + 1, y: 0.9, z: -1.75 }, 0.45);
    for (let i = 0; i < 20; i++) {
      const p = (side: number, angle: number) => ({
        x: x + side,
        y: 0.9 + Math.cos(angle) * 0.45,
        z: -1.75 + Math.sin(angle) * 0.45,
      });
      const a = p(-1, (i * Math.PI) / 10),
        b = p(1, (i * Math.PI) / 10),
        c = p(-1, ((i + 1) * Math.PI) / 10),
        d = p(1, ((i + 1) * Math.PI) / 10);
      face(a, b, c, [154, 135, 109]);
      face(c, b, d, [154, 135, 109]);
    }
  }
  const { mesh } = state;
  const vertexStrain = new Array<number>(mesh.vertices.length).fill(0);
  if (state.strain)
    for (const c of mesh.constraints)
      if (c.kind === "stretch") {
        const error = Math.abs(
          length(sub(mesh.vertices[c.a].p, mesh.vertices[c.b].p)) / c.rest - 1,
        );
        vertexStrain[c.a] = Math.max(vertexStrain[c.a], error);
        vertexStrain[c.b] = Math.max(vertexStrain[c.b], error);
      }
  mesh.triangles.forEach(([a, b, c], index) => {
    const va = mesh.vertices[a],
      vb = mesh.vertices[b],
      vc = mesh.vertices[c],
      normal = normalize(add(add(va.normal, vb.normal), vc.normal));
    const back = dot(normal, sub(eye, va.p)) < 0,
      row = Math.floor(index / (2 * (mesh.side - 1))),
      col = Math.floor(index / 2) % (mesh.side - 1),
      checker = (Math.floor(row / 2) + Math.floor(col / 2)) % 2;
    const strain = Math.min(1, 5 * Math.max(vertexStrain[a], vertexStrain[b], vertexStrain[c]));
    const base = state.strain
      ? [75 + 180 * strain, 177 - 110 * strain, 187 - 145 * strain]
      : back
        ? checker
          ? [219, 151, 110]
          : [193, 113, 83]
        : checker
          ? [93, 198, 205]
          : [53, 148, 166];
    face(va.p, vb.p, vc.p, base, normal);
  });
  faces.sort((a, b) => b.depth - a.depth);
  for (const f of faces) {
    ctx.beginPath();
    ctx.moveTo(f.points[0].x, f.points[0].y);
    ctx.lineTo(f.points[1].x, f.points[1].y);
    ctx.lineTo(f.points[2].x, f.points[2].y);
    ctx.closePath();
    ctx.fillStyle = f.color;
    ctx.fill();
    // Subpixel seam coverage, not a separate wire mesh.
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 0.45;
    ctx.stroke();
  }
  if (state.wireframe)
    for (const c of mesh.constraints)
      if (c.kind === "stretch" || state.mode === "coloring")
        line(
          mesh.vertices[c.a].p,
          mesh.vertices[c.b].p,
          state.mode === "coloring" ? palette[c.color % palette.length] : "#c9eff18a",
          state.mode === "coloring" ? 1 : 0.6,
        );
  if (state.normals)
    for (let id = 0; id < mesh.vertices.length; id += 16)
      line(
        mesh.vertices[id].p,
        add(mesh.vertices[id].p, mul(mesh.vertices[id].normal, 0.25)),
        "#f3cf8d",
        1.4,
      );
  if (state.debug) {
    const grid = state.diagnostics.grid,
      selectedCell = grid.vertexCells[state.selected],
      selected = grid.coordinates[selectedCell];
    let drawn = 0;
    grid.coordinates.forEach(([x, y, z]) => {
      if (
        drawn >= 16 ||
        Math.max(Math.abs(x - selected[0]), Math.abs(y - selected[1]), Math.abs(z - selected[2])) >
          1
      )
        return;
      drawn++;
      const corners = Array.from({ length: 8 }, (_, i) => ({
        x: (x + (i & 1)) * grid.cellSize,
        y: (y + ((i >> 1) & 1)) * grid.cellSize,
        z: (z + ((i >> 2) & 1)) * grid.cellSize,
      }));
      for (let a = 0; a < 8; a++)
        for (const bit of [1, 2, 4])
          if ((a & bit) === 0) line(corners[a], corners[a | bit], "#f9c46577", 0.8);
    });
    for (const [a, b] of state.diagnostics.pairs.slice(0, 24))
      line(mesh.vertices[a].p, mesh.vertices[b].p, "#ff7990", 2);
    // Draw only selected-ID candidate links, <=24, while the solver traverses every candidate.
    const c = grid.vertexCells[state.selected];
    let links = 0;
    for (let slot = grid.offsets[c]; slot < grid.offsets[c + 1] && links < 24; slot++) {
      const other = grid.ids[slot];
      if (other !== state.selected) {
        line(mesh.vertices[state.selected].p, mesh.vertices[other].p, "#d6b9fb88");
        links++;
      }
    }
  }
  mesh.vertices.forEach((v, id) => {
    if (v.w !== 0 && id !== state.selected) return;
    const p = project(v.p);
    if (!p.visible) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, id === state.selected ? 6 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = v.w === 0 ? "#f8d38b" : "#e4faf6";
    ctx.fill();
    ctx.strokeStyle = "#18353d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (id === state.selected) {
      ctx.fillStyle = "#fff2c5";
      ctx.font = "12px system-ui";
      ctx.fillText(`ID ${id}${v.w === 0 ? " · pin" : ""}`, p.x + 9, p.y - 8);
    }
  });
  if (state.drag) line(state.drag.anchor, state.drag.target, "#ffe6a7", 2.5);
  ctx.fillStyle = "#e4edf1";
  ctx.font = "12px system-ui";
  ctx.fillText(
    `CPU ${mesh.side} × ${mesh.side} · t ${state.seconds.toFixed(3)} s · ${state.paused ? "PAUSE" : "XPBD"} · ${state.tool.toUpperCase()}`,
    16,
    height - 34,
  );
  ctx.fillStyle = "#9bb4c1";
  ctx.fillText(
    state.strain
      ? "Strain |ΔL|/L₀: xanh 0 → đỏ ≥20%"
      : "Mặt trước: xanh · mặt sau: đất nung · vàng: ghim · ô dệt gắn với topology",
    16,
    height - 15,
  );
}
