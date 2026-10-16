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

test("Reviewed face refactor preserves appendCube in the checkpoint-two rendering path", async () => {
  const checkpoint = await get(
    "examples/project-59-voxel-hidden-faces/checkpoints/02/include/mesh.hpp",
  );
  assert.match(checkpoint, /appendCube\(result.mesh, origin, static_cast<int>\(block\)\)/);
  assert.doesNotMatch(checkpoint, /appendFace\(/);
  const next = await get("examples/project-59-voxel-hidden-faces/checkpoints/03/include/mesh.hpp");
  assert.match(next, /appendFace\(/);
  assert.doesNotMatch(next, /appendCube\(/);
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
test("Reviewed DDA lesson supplies a complete traversal loop and correct tie experiment", async () => {
  const mdx = await get("content/voxel-ray-editor/04-di-qua-tung-o.mdx");
  for (const pattern of [
    /cell\[axis\] \+= step\[axis\]/,
    /tMax\[axis\] \+= tDelta\[axis\]/,
    /for \(int iteration = 0; iteration < 64/,
    /cả hai bản vẫn có 16 ô/,
    /normal.*0,0,−1/,
  ])
    assert.match(mdx, pattern);
  const boundary = await get("content/voxel-ray-editor/05-hit-va-phap-tuyen.mdx");
  assert.match(boundary, /t=0 \*\*và normal=\(1,0,0\)/);
});
test("Reviewed math illustrations expose uncertainty and winding without replacing core models", async () => {
  const uncertainty = await get("content/photon-rain/07-sai-so-monte-carlo.mdx");
  for (const p of [/154/, /0.26266194/, /mẫu lồng nhau/, /confidence band đồng thời/])
    assert.match(uncertainty, p);
  for (const file of [
    "components/labs/voxel-chunk-lab.tsx",
    "components/labs/voxel-hidden-faces-lab.tsx",
  ])
    assert.match(await get(file), /VoxelFaceInspector/);
  assert.match(await get("components/labs/voxel-ray-editor-lab.tsx"), /DdaReadout/);
  assert.match(await get("components/labs/photon-rain-lab.tsx"), /ConvergencePlot/);
});
