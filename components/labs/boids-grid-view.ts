import type { GridQuery, BoidsGrid } from "@/lib/labs/boids-grid";
import { boidsView, drawBoids, type BoidsViewState } from "./boids-view";
import type { CanvasSize } from "./lab-shared";

export function drawBoidsGrid(
  context: CanvasRenderingContext2D,
  state: BoidsViewState,
  size: CanvasSize,
  grid: BoidsGrid,
  query: GridQuery,
  showCells: boolean,
  showOccupancy: boolean,
) {
  const view = boidsView(size, state);
  const visited = new Set(query.cells);
  drawBoids(context, state, size, {
    neighbors: query.neighbors,
    candidates: query.candidates,
    underlay: () => {
      if (!state.debug) return;
      for (let row = 0; row < grid.rows; row++) {
        for (let column = 0; column < grid.columns; column++) {
          const index = row * grid.columns + column;
          const x = column * grid.cellSize;
          const y = row * grid.cellSize;
          const width = Math.min(grid.cellSize, grid.width - x) * view.scale;
          const height = Math.min(grid.cellSize, grid.height - y) * view.scale;
          const left = view.left + x * view.scale;
          const top = view.top + y * view.scale;
          if (showOccupancy && grid.buckets[index].length > 0) {
            const alpha =
              0.12 + (0.45 * grid.buckets[index].length) / Math.max(1, grid.maximumOccupancy);
            context.fillStyle = `rgba(199,146,234,${alpha})`;
            context.fillRect(left, top, width, height);
          }
          if (visited.has(index)) {
            context.fillStyle = "#82b8ff18";
            context.fillRect(left, top, width, height);
          }
          if (showCells) {
            context.strokeStyle = visited.has(index) ? "#82b8ff80" : "#34456160";
            context.strokeRect(left, top, width, height);
          }
        }
      }
    },
  });
}
