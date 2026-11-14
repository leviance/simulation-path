import { Cell, createGrid, setCell, countMaterials } from "./model.ts";
import { makeSmallScene } from "./presets.ts";
import { stepGrid } from "./rules.ts";

export type Validation = {
  conserved: boolean;
  wallsFixed: boolean;
  oneCellFall: boolean;
  closedBottom: boolean;
  oneCellWater: boolean;
};

export function validateSmallScene(): Validation {
  let grid = createGrid(5, 5);
  setCell(grid, 2, 1, Cell.Sand);
  stepGrid(grid);
  const oneCellFall = grid.cells[1 * 5 + 2] === Cell.Empty && grid.cells[2 * 5 + 2] === Cell.Sand;
  grid = createGrid(5, 5);
  setCell(grid, 2, 4, Cell.Sand);
  stepGrid(grid);
  const closedBottom = grid.cells[4 * 5 + 2] === Cell.Sand;
  grid = createGrid(5, 5);
  setCell(grid, 1, 4, Cell.Water);
  stepGrid(grid);
  const oneCellWater =
    grid.cells[4 * 5 + 2] === Cell.Water && countMaterials(grid)[Cell.Water] === 1;
  grid = makeSmallScene(9);
  const initial = grid.cells.slice();
  const counts = countMaterials(grid);
  let conserved = true;
  let wallsFixed = true;
  for (let tick = 0; tick < 120; tick += 1) {
    stepGrid(grid);
    const next = countMaterials(grid);
    if (next.some((count, index) => count !== counts[index])) conserved = false;
    for (let index = 0; index < initial.length; index += 1) {
      if (initial[index] === Cell.Wall && grid.cells[index] !== Cell.Wall) wallsFixed = false;
    }
  }
  return { conserved, wallsFixed, oneCellFall, closedBottom, oneCellWater };
}

export function validationPassed(result: Validation) {
  return (
    result.conserved &&
    result.wallsFixed &&
    result.oneCellFall &&
    result.closedBottom &&
    result.oneCellWater
  );
}
