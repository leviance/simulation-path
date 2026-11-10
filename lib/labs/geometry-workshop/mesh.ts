import type { Vec3 } from "../normal.ts";
import { usesSweep, validateSettings, type SurfaceSettings } from "./settings.ts";
import {
  fullTurn,
  sampleMobius,
  samplePatch,
  sampleTorus,
  surfaceNormal,
  unit,
} from "./surfaces.ts";
import { buildSweepFrames, sampleSweep, type Sweep } from "./sweep.ts";

export const maxRowsPerBatch = 8;

export interface Vertex {
  position: Vec3;
  normal: Vec3;
  tangentU: Vec3;
  tangentV: Vec3;
  uv: readonly [number, number];
}

export interface Mesh {
  settings: Readonly<SurfaceSettings>;
  sweep: Sweep | null;
  vertices: readonly Vertex[];
  indices: readonly number[];
  minimumY: number;
}

export function vertexId(row: number, column: number, vSegments: number): number {
  return row * (vSegments + 1) + column;
}

export function gridCell(row: number, column: number, vSegments: number) {
  const a = vertexId(row, column, vSegments);
  const b = a + 1;
  const c = a + vSegments + 1;
  const d = c + 1;
  return { a, b, c, d };
}

function appendGridCell(indices: number[], row: number, column: number, settings: SurfaceSettings) {
  const { a, b, c, d } = gridCell(row, column, settings.vSegments);
  // In the winding experiment only the first triangle of each cell changes.
  if (settings.reverseWinding) indices.push(a, c, b);
  else indices.push(a, b, c);
  indices.push(b, d, c);
}

export class MeshBuild {
  readonly settings: Readonly<SurfaceSettings>;
  private readonly sweep: Sweep | null;
  private readonly vertices: Vertex[] = [];
  private readonly indices: number[] = [];
  private minimumY = Infinity;
  private nextRow = 0;

  constructor(settings: SurfaceSettings) {
    validateSettings(settings);
    this.settings = { ...settings };
    this.sweep = usesSweep(settings.kind) ? buildSweepFrames(this.settings) : null;
  }

  get completedRows() {
    return this.nextRow;
  }

  get ready() {
    return this.nextRow === this.settings.uSegments + 1;
  }

  advance() {
    const end = Math.min(this.nextRow + maxRowsPerBatch, this.settings.uSegments + 1);
    while (this.nextRow < end) {
      this.appendRow(this.nextRow);
      ++this.nextRow;
    }
  }

  takeMesh(): Mesh {
    if (!this.ready) throw new Error("Ứng viên chưa đủ hàng.");
    return {
      settings: this.settings,
      sweep: this.sweep,
      vertices: this.vertices,
      indices: this.indices,
      minimumY: this.minimumY,
    };
  }

  private sampleVertex(row: number, column: number, u: number, v: number) {
    const settings = this.settings;
    if (settings.kind === "patch") return samplePatch(u, v, settings.patchHeight);

    let angleV = fullTurn * v;
    if (column === settings.vSegments) angleV = 0;
    if (this.sweep) return sampleSweep(this.sweep, row, angleV);

    const lastRow = row === settings.uSegments;
    let angleU = fullTurn * u;
    if (lastRow) angleU = 0;
    if (settings.kind === "torus") {
      return sampleTorus(angleU, angleV, settings.radius, settings.thickness);
    }

    let stripV = v;
    if (lastRow) stripV = (settings.vSegments - column) / settings.vSegments;
    const offset = settings.thickness * (2 * stripV - 1);
    const sample = sampleMobius(angleU, offset, settings.radius, settings.halfTwists);
    if (lastRow) {
      const { x, y, z } = sample.tangentV;
      sample.tangentV = { x: -x, y: -y, z: -z };
    }
    return sample;
  }

  private appendRow(row: number) {
    const settings = this.settings;
    const u = row / settings.uSegments;
    for (let column = 0; column <= settings.vSegments; ++column) {
      const v = column / settings.vSegments;
      const sample = this.sampleVertex(row, column, u, v);
      this.vertices.push({
        position: sample.position,
        normal: surfaceNormal(sample),
        tangentU: unit(sample.tangentU),
        tangentV: unit(sample.tangentV),
        uv: [u, v],
      });
      this.minimumY = Math.min(this.minimumY, sample.position.y);
    }
    if (row === 0) return;
    for (let column = 0; column < settings.vSegments; ++column) {
      appendGridCell(this.indices, row - 1, column, settings);
    }
  }
}

export function buildMesh(settings: SurfaceSettings): Mesh {
  const build = new MeshBuild(settings);
  // The settings have already been checked against the web mesh limits.
  for (let row = 0; row <= settings.uSegments; row += maxRowsPerBatch) build.advance();
  return build.takeMesh();
}
