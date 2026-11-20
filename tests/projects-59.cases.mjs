import { expeditionCases } from "./expedition-project-checks.mjs";
expeditionCases("59", "voxel-hidden-faces", [
  ["visibility", "inline bool exposedFace("],
  ["field-scene", "region.load({0, 1})"],
  ["field-controls", "SDLK_M"],
]);
