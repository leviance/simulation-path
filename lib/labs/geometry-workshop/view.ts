import { defaultCamera, type Camera } from "./camera.ts";
import { inspectCell, inspectVertex } from "./inspection.ts";
import type { Mesh } from "./mesh.ts";
import type { RasterOptions } from "./raster.ts";
import type { SurfaceKind } from "./settings.ts";

export const modeShapes = {
  patch: "patch",
  topology: "patch",
  torus: "torus",
  mobius: "mobius",
  shell: "shell",
  knot: "knot",
  preview: "shell",
  export: "torus",
  showcase: "knot",
} satisfies Record<string, SurfaceKind>;

export type GeometryMode = keyof typeof modeShapes;

export function geometryMode(mode: string | undefined): GeometryMode {
  if (mode && Object.hasOwn(modeShapes, mode)) return mode as GeometryMode;
  return "showcase";
}

export interface View {
  camera: Camera;
  wireframe: boolean;
  uv: boolean;
  normals: boolean;
  seams: boolean;
  section: boolean;
  cullBack: boolean;
  probeU: number;
  probeV: number;
  faceHalf: 0 | 1;
  oneBased: boolean;
}

export function initialView(mode: GeometryMode): View {
  const exportMode = mode === "export";
  return {
    camera: defaultCamera(),
    wireframe: mode === "topology" || exportMode,
    uv: mode === "torus",
    normals: mode === "patch" || mode === "mobius",
    seams: mode === "torus" || mode === "mobius" || mode === "knot",
    section: mode === "shell" || mode === "knot",
    cullBack: mode === "topology",
    probeU: exportMode ? 0 : 0.5,
    probeV: exportMode ? 0 : 0.25,
    faceHalf: 0,
    oneBased: true,
  };
}

export function rasterOptions(mesh: Mesh, view: View, mode: GeometryMode): RasterOptions {
  let highlightFace: number | null = null;
  if (mode === "topology" || mode === "export") {
    const cell = inspectCell(mesh, view.probeU, view.probeV);
    highlightFace = cell.face;
    if (mode === "export") highlightFace += view.faceHalf;
  }
  return {
    wireframe: view.wireframe,
    uv: view.uv,
    cullBack: mesh.settings.kind !== "mobius" && view.cullBack,
    highlightFace,
    highlightCell: mode === "topology",
  };
}

export function frameAtProbe(mesh: Mesh, u: number) {
  const { row } = inspectVertex(mesh, u, 0);
  return { row, frame: mesh.sweep?.frames[row] };
}

export function probeAtFace(view: View, mesh: Mesh, face: number): View {
  if (!Number.isInteger(face) || face < 0 || face >= mesh.indices.length / 3) return view;
  const cell = Math.floor(face / 2);
  const { uSegments, vSegments } = mesh.settings;
  return {
    ...view,
    probeU: Math.floor(cell / vSegments) / uSegments,
    probeV: (cell % vSegments) / vSegments,
    faceHalf: face % 2 === 0 ? 0 : 1,
  };
}
