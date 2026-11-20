import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const get = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Reviewed photon lesson teaches the complete typed transport loop", async () => {
  const lesson = await get("content/photon-rain/05-tan-xa-va-gioi-han.mdx");
  assert.match(lesson, /inline Trace tracePhoton\(Settings settings, int id\)/);
  assert.match(lesson, /for \(int event = 0; event < settings.eventLimit; \+\+event\)/);
  assert.match(lesson, /trace.status = Status::Censored;\s+return trace;/);
  assert.doesNotMatch(lesson, /trace.status = Status::Censored;\s+return;/);
});

test("The old naive mesher stays available when the cliff gains a neighbor-aware mesher", async () => {
  const base = "examples/project-59-voxel-hidden-faces/checkpoints/02/include/trail/";
  assert.match(await get(base + "surface.hpp"), /appendCube\(mesh, cell, block\)/);
  const surface = await get(base + "visibility.hpp");
  assert.match(surface, /exposedFace\(block, other\)/);
  assert.doesNotMatch(surface, /appendCube\(/);
  const region = await get(base + "region.hpp");
  assert.match(region, /markNeighborhood\(key\)/);
});

test("Reviewed CT texture lesson provides the full upload path before sampling controls", async () => {
  const lesson = await get("content/ct-sinogram/05-ghep-thanh-sinogram.mdx");
  for (const pattern of [
    /SDL_CreateTexture\(/,
    /inline void upload\(/,
    /row \* pitch/,
    /destination\[offset \+ 3\] = 255;/,
    /SDL_UnlockTexture\(texture\)/,
    /ct::upload\(/,
    /SDL_RenderTexture\(/,
    /inline std::optional<std::array<int, 2>> pickCell/,
  ])
    assert.match(lesson, pattern);
});
test("Reviewed CT lesson teaches actual resource replacement and same-angle measurements", async () => {
  const mdx = await get("content/ct-sinogram/08-lay-mau-goc-va-do-phan-giai.mdx");
  assert.match(mdx, /resizeSinogramTexture/);
  assert.match(mdx, /SDL_DestroyTexture\(replacement\)/);
  assert.match(mdx, /coarse60\[column\]\.projection, fine60\[column\]\.projection/);
});
test("The read-only DDA lesson includes a full bounded traversal with simultaneous tie steps", async () => {
  const lesson = await get("content/voxel-ray-editor/02-buoc-qua-tung-o.mdx");
  for (const pattern of [
    /Hit probe\(/,
    /hit.visited < 390/,
    /x.cell \+= x.step/,
    /y.cell \+= y.step/,
    /z.cell \+= z.step/,
    /hit.unknown = true/,
    /normal ngược chiều/,
  ])
    assert.match(lesson, pattern);
});

test("Reviewed math illustrations expose uncertainty and winding without replacing core models", async () => {
  const uncertainty = await get("content/photon-rain/07-sai-so-monte-carlo.mdx");
  for (const p of [/154/, /0.26266194/, /mẫu lồng nhau/, /confidence band đồng thời/])
    assert.match(uncertainty, p);
  assert.match(await get("components/labs/voxel-chunk-lab.tsx"), /VoxelFaceInspector/);
  const field = await get("components/labs/voxel-expedition/field-lab.tsx");
  assert.match(field, /VoxelFaceInspector/);
  assert.match(field, /trace\(cells/);
  assert.match(field, /Giữ phép đo/);
  assert.match(await get("components/labs/photon-rain-lab.tsx"), /ConvergencePlot/);
});
