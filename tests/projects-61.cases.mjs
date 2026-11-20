import { expeditionCases } from "./expedition-project-checks.mjs";
expeditionCases("61", "voxel-greedy-meshing", [
  ["greedy", "Mesh greedyMesh("],
  ["wind", "inline Vec3 sway("],
  ["field-render", "inline void drawTuft("],
  ["field-scene", "region.lastBuildMs"],
]);
