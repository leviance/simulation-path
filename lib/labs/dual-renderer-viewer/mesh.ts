import { OBJ_PRESETS } from "../obj-presets.ts";
import { parseObjSource } from "../obj-parser.ts";
import { normalizeObjMesh, objCross, objNormalize, objSubtract } from "../obj-geometry.ts";
import type { ViewerMesh } from "./types.ts";

// Cùng công thức/dataset sphere của Project 21; sinh text thay vì chép 4.470 dòng asset vào JS.
export function viewerSphereSource() {
  const rows = ["v 0 1 0"];
  const number = (value: number) => value.toFixed(7);
  for (let ring = 1; ring < 32; ring++) {
    const latitude = (ring * Math.PI) / 32;
    for (let sector = 0; sector < 48; sector++) {
      const longitude = (sector * 2 * Math.PI) / 48;
      rows.push(
        `v ${number(Math.sin(latitude) * Math.cos(longitude))} ${number(Math.cos(latitude))} ${number(Math.sin(latitude) * Math.sin(longitude))}`,
      );
    }
  }
  rows.push("v 0 -1 0");
  for (let sector = 0; sector < 48; sector++) {
    rows.push(`f 1 ${2 + ((sector + 1) % 48)} ${2 + sector}`);
    rows.push(`f 1490 ${1442 + sector} ${1442 + ((sector + 1) % 48)}`);
  }
  for (let ring = 0; ring < 30; ring++) {
    for (let sector = 0; sector < 48; sector++) {
      const a = 2 + ring * 48 + sector,
        b = 2 + ring * 48 + ((sector + 1) % 48);
      const c = a + 48,
        d = b + 48;
      rows.push(`f ${a} ${b} ${c}`, `f ${b} ${d} ${c}`);
    }
  }
  return rows.join("\n");
}

export function prepareViewerMesh(source: string, name: string): ViewerMesh {
  const parsed = parseObjSource(source);
  if (parsed.diagnostics.length) throw new Error(parsed.diagnostics[0].message);
  const normalized = normalizeObjMesh(parsed.mesh);
  if (!normalized) throw new Error("Không thể chuẩn hóa mesh");
  const mesh: ViewerMesh = { name, vertices: [], indices: [] };
  const unique = new Map<string, number>();
  for (const triangle of normalized.mesh.triangles) {
    const [a, b, c] = triangle.indices.map((index) => normalized.mesh.positions[index]);
    const normal = objNormalize(objCross(objSubtract(b, a), objSubtract(c, a)));
    if (!normal) continue;
    for (const position of [a, b, c]) {
      const key = [position.x, position.y, position.z, normal.x, normal.y, normal.z].join(",");
      let index = unique.get(key);
      if (index === undefined) {
        index = mesh.vertices.length;
        mesh.vertices.push({ position, normal });
        unique.set(key, index);
      }
      mesh.indices.push(index);
    }
  }
  return mesh;
}

let cached: ViewerMesh[] | undefined;
export function viewerModels() {
  cached ??= [
    prepareViewerMesh(OBJ_PRESETS.rocket, "low-poly-rocket"),
    prepareViewerMesh(viewerSphereSource(), "faceted-sphere"),
    prepareViewerMesh(OBJ_PRESETS.cube, "cube (fixture)"),
  ];
  return cached;
}
