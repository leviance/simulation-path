import { expeditionCases } from "./expedition-project-checks.mjs";
expeditionCases("60", "voxel-ray-editor", [
  ["probe", "inline Vec3 eyeRay("],
  ["probe", "Hit probe("],
  ["field-controls", "SDLK_I"],
]);
