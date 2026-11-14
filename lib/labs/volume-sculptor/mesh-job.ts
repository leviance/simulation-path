import type { RasterMesh } from "../shared/mesh-raster.ts";
import { canvasChunkCells, chunksPerAxis } from "./brush.ts";
import type { GridSpec, ScalarGrid } from "./grid.ts";
import { polygonizeCell, surfaceVertices, type SurfaceVertex } from "./topology.ts";

export const meshVertexCapacity = 98_304;
export interface CellRecord {
  x: number;
  y: number;
  z: number;
  id: number;
}
export interface MeshChunk {
  id: number;
  cells: readonly CellRecord[];
  counts: Uint16Array;
  offsets: Uint32Array;
  vertices: readonly SurfaceVertex[];
  degenerate: number;
  normalFallbacks: number;
}
export interface VolumeMesh extends RasterMesh {
  chunks: readonly MeshChunk[];
  spec: GridSpec;
  fieldRevision: number;
  generation: number;
  isovalue: number;
  gradientNormals: boolean;
  activeCells: number;
  degenerate: number;
  normalFallbacks: number;
  processedChunks: number;
  reusedChunks: number;
}
export type JobPhase = "count" | "emit" | "ready" | "failed" | "cancelled";

export function cellsOfChunk(spec: GridSpec, id: number): CellRecord[] {
  const side = chunksPerAxis(spec),
    cells = spec.samples - 1;
  if (!Number.isInteger(id) || id < 0 || id >= side ** 3)
    throw new RangeError("Chunk ID không hợp lệ.");
  const cx = id % side,
    cy = Math.floor(id / side) % side,
    cz = Math.floor(id / (side * side));
  const records: CellRecord[] = [];
  for (let z = cz * canvasChunkCells; z < Math.min(cells, (cz + 1) * canvasChunkCells); ++z)
    for (let y = cy * canvasChunkCells; y < Math.min(cells, (cy + 1) * canvasChunkCells); ++y)
      for (let x = cx * canvasChunkCells; x < Math.min(cells, (cx + 1) * canvasChunkCells); ++x)
        records.push({ x, y, z, id: (z * cells + y) * cells + x });
  return records;
}

// Counts and emit read the same immutable snapshot. No partially emitted mesh
// escapes this job; the session publishes only a complete matching generation.
export class MeshJob {
  readonly snapshot: ScalarGrid;
  readonly isovalue: number;
  readonly gradientNormals: boolean;
  readonly fieldRevision: number;
  readonly generation: number;
  readonly capacity: number;
  readonly chunks: MeshChunk[];
  readonly workIds: readonly number[];
  phase: JobPhase = "count";
  error = "";
  requiredVertices = 0;
  countedCells = 0;
  emittedCells = 0;
  readonly workCells: number;
  private chunkCursor = 0;
  private cellCursor = 0;
  private emitted = 0;

  constructor(
    grid: ScalarGrid,
    isovalue: number,
    gradientNormals: boolean,
    fieldRevision: number,
    generation: number,
    previous: VolumeMesh | null = null,
    dirty: readonly number[] | null = null,
    capacity = meshVertexCapacity,
  ) {
    if (
      !Number.isFinite(isovalue) ||
      Math.abs(isovalue) > 1 ||
      !Number.isSafeInteger(capacity) ||
      capacity < 0 ||
      capacity > meshVertexCapacity
    )
      throw new RangeError("Mesh job/isovalue/capacity không hợp lệ.");
    this.snapshot = grid.clone();
    this.isovalue = isovalue;
    this.gradientNormals = gradientNormals;
    this.fieldRevision = fieldRevision;
    this.generation = generation;
    this.capacity = capacity;
    const count = chunksPerAxis(grid.spec) ** 3;
    const compatible =
      previous?.spec === grid.spec &&
      previous.isovalue === isovalue &&
      previous.gradientNormals === gradientNormals;
    const ids = new Set<number>();
    if (compatible && dirty !== null) {
      for (const id of dirty) {
        if (!Number.isInteger(id) || id < 0 || id >= count)
          throw new RangeError("Dirty chunk ID không hợp lệ.");
        ids.add(id);
      }
    } else for (let id = 0; id < count; ++id) ids.add(id);
    this.workIds = [...ids].sort((a, b) => a - b);
    this.chunks = Array.from({ length: count }, (_, id) => {
      if (!ids.has(id) && previous) return previous.chunks[id];
      const cells = cellsOfChunk(grid.spec, id);
      return {
        id,
        cells,
        counts: new Uint16Array(cells.length),
        offsets: new Uint32Array(cells.length + 1),
        vertices: [],
        degenerate: 0,
        normalFallbacks: 0,
      };
    });
    this.workCells = this.workIds.reduce((sum, id) => sum + this.chunks[id].cells.length, 0);
  }

  advance(budget = 256) {
    if (!Number.isInteger(budget) || budget < 1 || budget > 2048)
      throw new RangeError("Batch cần 1…2048 cells.");
    if (this.phase !== "count" && this.phase !== "emit") return false;
    try {
      let remaining = budget;
      while (remaining > 0 && this.chunkCursor < this.workIds.length) {
        const chunk = this.chunks[this.workIds[this.chunkCursor]],
          cell = chunk.cells[this.cellCursor];
        const surface = polygonizeCell(this.snapshot, cell.x, cell.y, cell.z, this.isovalue);
        if (this.phase === "count") {
          chunk.counts[this.cellCursor] = surface.triangles.length * 3;
          chunk.degenerate += surface.degenerate;
          ++this.countedCells;
        } else {
          if (surface.triangles.length * 3 !== chunk.counts[this.cellCursor])
            throw new Error("Count/emit không cùng snapshot.");
          const emitted = surfaceVertices(this.snapshot, surface.triangles, this.gradientNormals);
          (chunk.vertices as SurfaceVertex[]).push(...emitted.vertices);
          chunk.normalFallbacks += emitted.fallbacks;
          this.emitted += emitted.vertices.length;
          ++this.emittedCells;
        }
        ++this.cellCursor;
        --remaining;
        if (this.cellCursor === chunk.cells.length) {
          this.cellCursor = 0;
          ++this.chunkCursor;
        }
      }
      if (this.chunkCursor === this.workIds.length) {
        if (this.phase === "count") this.finishCount();
        else {
          const reusedVertices = this.chunks.reduce(
            (sum, chunk) => sum + (this.workIds.includes(chunk.id) ? 0 : chunk.vertices.length),
            0,
          );
          if (this.emitted + reusedVertices !== this.requiredVertices)
            throw new Error("Emit không điền đủ vùng đã count.");
          this.phase = "ready";
        }
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Mesh job thất bại.";
      this.phase = "failed";
      // Drop private payloads on failure; the previous chunks stay owned by last-good.
      for (const id of this.workIds) this.chunks[id].vertices = [];
    }
    return true;
  }

  private finishCount() {
    let required = 0;
    const work = new Set(this.workIds);
    for (const chunk of this.chunks) {
      if (!work.has(chunk.id)) {
        required += chunk.vertices.length;
        continue;
      }
      for (let index = 0; index < chunk.counts.length; ++index)
        chunk.offsets[index + 1] = chunk.offsets[index] + chunk.counts[index];
      required += chunk.offsets[chunk.counts.length];
    }
    this.requiredVertices = required;
    if (required > this.capacity)
      throw new RangeError(
        `Cần ${required} vertices, capacity chỉ ${this.capacity}; giữ mesh last-good.`,
      );
    this.chunkCursor = 0;
    this.cellCursor = 0;
    this.phase = "emit";
  }

  cancel() {
    if (this.phase === "ready" || this.phase === "failed" || this.phase === "cancelled") return;
    this.phase = "cancelled";
    for (const id of this.workIds) this.chunks[id].vertices = [];
  }

  takeMesh(): VolumeMesh {
    if (this.phase !== "ready") throw new Error("Không công bố mesh chưa xong.");
    const vertices = this.chunks.flatMap((chunk) => chunk.vertices);
    return {
      vertices,
      indices: Uint32Array.from({ length: vertices.length }, (_, index) => index),
      chunks: this.chunks,
      spec: this.snapshot.spec,
      fieldRevision: this.fieldRevision,
      generation: this.generation,
      isovalue: this.isovalue,
      gradientNormals: this.gradientNormals,
      activeCells: this.chunks.reduce(
        (sum, chunk) => sum + chunk.counts.reduce((active, count) => active + Number(count > 0), 0),
        0,
      ),
      degenerate: this.chunks.reduce((sum, chunk) => sum + chunk.degenerate, 0),
      normalFallbacks: this.chunks.reduce((sum, chunk) => sum + chunk.normalFallbacks, 0),
      processedChunks: this.workIds.length,
      reusedChunks: this.chunks.filter(
        (chunk) => !this.workIds.includes(chunk.id) && chunk.vertices.length > 0,
      ).length,
    };
  }
}
