import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-58-voxel-chunk");
test("Project58 publishes seven voxel lessons, challenge and complete source", async () => {
  const overview = await render("/projects/voxel-chunk");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-chunk");
  assert.equal(lessons.length, 7);
  for (const lesson of lessons) {
    const r = await render(lesson.route),
      html = await r.text();
    assert.equal(r.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 400 * 1024);
  }
});
test("Project58 progressively introduces cube, storage, mesh, materials, camera, inspector and audit", async () => {
  for (const [n, file, symbol] of [
    [1, "include/mesh.hpp", "inline void appendCube("],
    [2, "include/model.hpp", "inline int index("],
    [3, "include/mesh.hpp", "inline Mesh buildMesh("],
    [4, "include/model.hpp", "const int height = 4 + x / 4;"],
    [5, "include/raster.hpp", "inline void orbit("],
    [6, "include/inspector.hpp", "inline std::optional"],
    [7, "include/audit.hpp", "inline void audit("],
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
});
test("Project58 keeps baseline scope and documents bounded validation", async () => {
  const get = (file) => readFile(path.join(workspace, "content/voxel-chunk", file), "utf8");
  assert.match(await get("01-ve-cube-dau-tien.mdx"), /SDL_LockTexture/);
  assert.match(await get("02-luu-block-trong-chunk.mdx"), /x \+ side \* \(z \+ side \* y\)/);
  assert.match(await get("03-tu-block-den-mesh.mdx"), /49152/);
  assert.match(await get("06-doc-tung-lop-block.mdx"), /không sửa/);
  const last = await get("07-kiem-chung-va-hoan-thien.mdx");
  for (const p of [/-C Debug/, /-C Release/, /WaitForExit\(30000\)/, /Project 59/, /Sắp ra mắt/])
    assert.match(last, p);
  const lab = await readFile(path.join(workspace, "components/labs/voxel-chunk-lab.tsx"), "utf8");
  for (const p of [
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /Math.min\(0.05/,
  ])
    assert.match(lab, p);
});
