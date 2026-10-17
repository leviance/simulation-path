import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-61-voxel-greedy-meshing");
test("Project61 publishes nine greedy-meshing lessons with challenge and complete source", async () => {
  const overview = await render("/projects/voxel-greedy-meshing");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-greedy-meshing");
  assert.equal(lessons.length, 9);
  for (const l of lessons) {
    const response = await render(l.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 650 * 1024);
  }
});
test("Project61 progressively adds readout, mask, key, rectangles, mesh, directions, playback, cache and oracle", async () => {
  for (const [n, file, symbol] of [
    [1, "include/app.hpp", "const std::string counts ="],
    [2, "include/mask.hpp", "inline Mask makeMask("],
    [3, "include/rectangles.hpp", "inline bool sameFace("],
    [4, "include/rectangles.hpp", "inline std::vector<Rectangle> extractRectangles("],
    [5, "include/mesh.hpp", "inline Built buildGreedy("],
    [7, "include/stepper.hpp", "inline void tick("],
    [9, "include/oracle.hpp", "inline int verify("],
  ]) {
    const now = await readFile(
      path.join(dir, "checkpoints", String(n).padStart(2, "0"), file),
      "utf8",
    );
    const before = await readFile(
      path.join(dir, n === 1 ? "starter" : "checkpoints/" + String(n - 1).padStart(2, "0"), file),
      "utf8",
    );
    assert.ok(now.includes(symbol), symbol);
    assert.ok(!before.includes(symbol), symbol);
  }
  const cp5 = await readFile(path.join(dir, "checkpoints/05/include/mesh.hpp"), "utf8");
  const cp6 = await readFile(path.join(dir, "checkpoints/06/include/mesh.hpp"), "utf8");
  assert.match(cp5, /if \(face == 2\)/);
  assert.doesNotMatch(cp6, /if \(face == 2\)/);
  const cp7 = await readFile(path.join(dir, "checkpoints/07/include/cache.hpp"), "utf8");
  const cp8 = await readFile(path.join(dir, "checkpoints/08/include/cache.hpp"), "utf8");
  assert.match(cp7, /cache.meshDirty = true;/);
  assert.doesNotMatch(cp8, /cache.meshDirty = true;/);
});
test("Project61 teaches material boundaries, 17 planes, cut, oracle and finite verification", async () => {
  const get = (f) => readFile(path.join(workspace, "content/voxel-greedy-meshing", f), "utf8");
  assert.match(await get("02-trai-mat-thanh-mask.mdx"), /17 vị trí plane/);
  assert.match(await get("03-khi-nao-duoc-gop.mdx"), /Culling/);
  assert.match(await get("05-tu-rectangle-den-quad.mdx"), /1281/);
  assert.match(await get("06-quet-du-sau-huong.mdx"), /576/);
  const last = await get("09-kiem-chung-va-hoan-thien.mdx");
  for (const pattern of [
    /multiset/,
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /T-junction/,
    /Sắp ra mắt/,
  ])
    assert.match(last, pattern);
  const lab = await readFile(
    path.join(workspace, "components/labs/voxel-greedy-meshing-lab.tsx"),
    "utf8",
  );
  for (const pattern of [
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /contains\(e.relatedTarget\)/,
  ])
    assert.match(lab, pattern);
});
