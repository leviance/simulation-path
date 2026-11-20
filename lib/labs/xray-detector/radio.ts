import type { Material, Point } from "./model.ts";

export type RadioPart =
  | "case"
  | "cover"
  | "aerial"
  | "board"
  | "chip"
  | "cell"
  | "contact"
  | "grille"
  | "display"
  | "key";

// Toy attenuation coefficients per world unit, not measured material properties.
const coefficients: Record<RadioPart, [number, number]> = {
  case: [0.42, 0.15],
  cover: [0.42, 0.15],
  aerial: [1.3, 0.48],
  board: [0.95, 0.34],
  chip: [1.8, 0.65],
  cell: [2.1, 0.82],
  contact: [2.8, 1.02],
  grille: [1.55, 0.54],
  display: [0.95, 0.39],
  key: [0.72, 0.27],
};

export function makeRadio(): Material[] {
  const radio: Material[] = [];
  function add(part: RadioPart, minimum: Point, maximum: Point) {
    const [muLow, muHigh] = coefficients[part];
    radio.push({ minimum, maximum, muLow, muHigh, part });
  }
  // A hollow case has six walls, not a solid box with electronics counted twice.
  add("case", [-0.64, -0.86, -0.29], [-0.56, 0.53, 0.26]);
  add("case", [0.56, -0.86, -0.29], [0.64, 0.53, 0.26]);
  add("case", [-0.56, -0.86, -0.29], [0.56, -0.78, 0.26]);
  add("case", [-0.56, 0.45, -0.29], [0.56, 0.53, 0.26]);
  add("cover", [-0.64, -0.86, -0.35], [0.64, 0.53, -0.29]);
  add("cover", [-0.64, -0.86, 0.26], [0.64, 0.53, 0.32]);
  add("aerial", [-0.53, 0.53, -0.15], [-0.3, 0.67, 0.09]);
  add("aerial", [-0.49, 0.67, -0.1], [-0.35, 1.01, 0.04]);
  add("key", [0.26, 0.53, -0.15], [0.49, 0.66, 0.08]);
  add("key", [-0.72, 0.02, -0.18], [-0.64, 0.28, 0.07]);

  add("board", [-0.49, -0.13, 0.08], [0.49, 0.4, 0.17]);
  add("chip", [-0.35, 0.09, -0.05], [-0.12, 0.28, 0.08]);
  add("chip", [0.14, -0.05, -0.03], [0.31, 0.08, 0.08]);
  for (const left of [-0.48, 0.05]) {
    add("cell", [left, -0.71, -0.19], [left + 0.43, -0.21, 0.18]);
    add("contact", [left + 0.13, -0.21, -0.1], [left + 0.29, -0.145, 0.09]);
  }
  for (let rib = 0; rib < 5; rib++) {
    const bottom = -0.105 + 0.102 * rib;
    add("grille", [-0.49, bottom, -0.435], [0.025, bottom + 0.057, -0.35]);
  }
  add("display", [0.115, 0.15, -0.405], [0.49, 0.36, -0.35]);
  add("key", [0.125, -0.05, -0.43], [0.26, 0.07, -0.35]);
  add("key", [0.35, -0.05, -0.43], [0.485, 0.07, -0.35]);
  return radio;
}
