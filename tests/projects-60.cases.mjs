import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-60-voxel-ray-editor");
test("Project60 publishes nine staged ray-editor lessons with challenge and full source", async () => {
  const r = await render("/projects/voxel-ray-editor");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-ray-editor");
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
test("Project60 checkpoints introduce cursor, ray, slab, DDA, hit, break, place, query cache and oracle", async () => {
  for (const [n, file, symbol] of [
    [1, "include/view.hpp", "inline void drawCrosshair("],
    [2, "include/ray.hpp", "inline Ray cameraRay("],
    [3, "include/clip.hpp", "inline std::optional<Interval> clipBox("],
    [4, "include/traversal.hpp", "inline Trace traverse("],
    [5, "include/traversal.hpp", "trace.hit = Hit{"],
    [6, "include/editing.hpp", "inline EditResult breakBlock("],
    [7, "include/editing.hpp", "inline EditResult placeBlock("],
    [8, "include/editor.hpp", "if (!state.pickDirty)"],
    [9, "include/audit.hpp", "inline std::optional<Hit> brutePick("],
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
test("Project60 explains orthographic picking, contact ties, bounded edits and verification limits", async () => {
  const get = (f) => readFile(path.join(workspace, "content/voxel-ray-editor", f), "utf8");
  assert.match(await get("02-tu-pixel-den-ray.mdx"), /trực giao/);
  assert.match(await get("04-di-qua-tung-o.mdx"), /tMax/);
  assert.match(await get("05-hit-va-phap-tuyen.mdx"), /X.*Y.*Z/);
  assert.match(await get("07-dat-block-ke-mat.mdx"), /hit.*normal/);
  const last = await get("09-kiem-chung-va-hoan-thien.mdx");
  for (const p of [
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /oracle/,
    /Project 61/,
    /Sắp ra mắt/,
  ])
    assert.match(last, p);
  const lab = await readFile(
    path.join(workspace, "components/labs/voxel-ray-editor-lab.tsx"),
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
