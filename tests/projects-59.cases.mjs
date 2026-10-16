import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-59-voxel-hidden-faces");
test("Project59 publishes eight hidden-face lessons, challenge and complete One Dark source", async () => {
  const overview = await render("/projects/voxel-hidden-faces");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-hidden-faces");
  assert.equal(lessons.length, 8);
  for (const l of lessons) {
    const r = await render(l.route),
      html = await r.text();
    assert.equal(r.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 550 * 1024);
  }
});
test("Project59 checkpoints add baseline, per-face geometry, neighbors, cases, cut, inspection, cache and oracle", async () => {
  for (const [n, file, symbol] of [
    [1, "include/geometry.hpp", "inline void appendCube("],
    [2, "include/geometry.hpp", "inline void appendFace("],
    [3, "include/mesh.hpp", "inline bool activeSolid("],
    [4, "include/model.hpp", "set(chunk, 8, 8, 8, Block::Air);"],
    [5, "include/model.hpp", "return slice;"],
    [6, "include/inspection.hpp", "inline std::string inspectFace("],
    [7, "include/cache.hpp", "if (cache.meshDirty)"],
    [8, "include/audit.hpp", "inline int oracleFaces("],
  ]) {
    const now = await readFile(
        path.join(dir, "checkpoints", String(n).padStart(2, "0"), file),
        "utf8",
      ),
      before = await readFile(
        path.join(dir, n === 1 ? "starter" : "checkpoints/" + String(n - 1).padStart(2, "0"), file),
        "utf8",
      );
    assert.ok(now.includes(symbol), symbol);
    assert.ok(!before.includes(symbol), symbol);
  }
});
test("Project59 documents visibility distinctions, cut caps and bounded independent checks", async () => {
  const get = (f) => readFile(path.join(workspace, "content/voxel-hidden-faces", f), "utf8");
  assert.match(await get("01-do-ban-chua-toi-uu.mdx"), /SDL_RenderTexture/);
  assert.match(await get("03-bo-mat-tiep-giap.mdx"), /3072/);
  assert.match(await get("04-bien-chunk-va-khoang-rong.mdx"), /1542/);
  assert.match(await get("05-giu-mat-o-lop-cat.mdx"), /1152/);
  assert.match(await get("07-khong-dung-lai-mesh-khi-xoay.mdx"), /meshDirty/);
  const last = await get("08-kiem-chung-va-hoan-thien.mdx");
  for (const p of [
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /6N/,
    /Project 60/,
    /Sắp ra mắt/,
  ])
    assert.match(last, p);
  const lab = await readFile(
    path.join(workspace, "components/labs/voxel-hidden-faces-lab.tsx"),
    "utf8",
  );
  for (const p of [
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
  ])
    assert.match(lab, p);
});
