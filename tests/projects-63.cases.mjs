import { expeditionCases } from "./expedition-project-checks.mjs";
expeditionCases("63", "voxel-procedural-terrain", [
  ["terrain", "inline Site siteAt("],
  ["terrain", "// [snippet tree-anchors]"],
  ["water", "inline double flowPhase("],
  ["field-render", "// [snippet sea-vertices]"],
  ["field-controls", "SDLK_F5"],
]);
