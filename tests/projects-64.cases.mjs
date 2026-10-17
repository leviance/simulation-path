import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-64-voxel-sandbox");
test("Project64 publishes ten sandbox lessons, challenge and complete One Dark source", async () => {
  const overview = await render("/projects/voxel-sandbox");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-sandbox");
  assert.equal(lessons.length, 10);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 300 * 1024, lesson.file);
  }
});
test("Project64 checkpoints add crosshair, world ray, DDA, edit, delta, deferred mesh, history, snapshot, presets and oracle", async () => {
  for (const [n, file, symbol] of [
    [1, "include/view.hpp", "const float x ="],
    [2, "include/ray.hpp", "inline Ray cameraRay("],
    [3, "include/query.hpp", "inline Trace traceWorld("],
    [4, "include/editing.hpp", "inline bool editRay("],
    [5, "include/world.hpp", "for (const auto& [cell, material] : world.edits)"],
    [7, "include/editing.hpp", "inline bool history("],
    [8, "include/snapshot.hpp", "inline World importSnapshot("],
    [9, "include/controller.hpp", "inline void choosePreset("],
    [10, "include/oracle.hpp", "inline Trace bruteOracle("],
  ]) {
    const now = await readFile(
      path.join(directory, "checkpoints", String(n).padStart(2, "0"), file),
      "utf8",
    );
    const before = await readFile(
      path.join(
        directory,
        n === 1 ? "starter" : "checkpoints/" + String(n - 1).padStart(2, "0"),
        file,
      ),
      "utf8",
    );
    assert.ok(now.includes(symbol), symbol);
    assert.ok(!before.includes(symbol), symbol);
  }
  const before = await readFile(path.join(directory, "checkpoints/05/include/editing.hpp"), "utf8"),
    after = await readFile(path.join(directory, "checkpoints/06/include/editing.hpp"), "utf8");
  assert.ok(before.includes("keys.clear();"));
  assert.ok(!after.includes("keys.clear();"));
});
test("Project64 explains Unknown, tombstones, counter isolation, bounded snapshots and honest validation scope", async () => {
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-sandbox"),
    text = (
      await Promise.all(
        lessons.map((l) => readFile(path.join(workspace, "content", l.project, l.file), "utf8")),
      )
    ).join("\n");
  for (const pattern of [
    /origin plane/,
    /Unknown/,
    /tombstone Air/,
    /lastMeshes/,
    /record=true/,
    /VXL1/,
    /32768/,
    /SDL_free/,
    /pointercancel/,
    /multiset/,
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /Project 65/,
    /Sắp ra mắt/,
  ])
    assert.match(text, pattern);
  const lab = await readFile(path.join(workspace, "components/labs/voxel-sandbox-lab.tsx"), "utf8");
  for (const pattern of [
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /onPointerCancel/,
    /contains\(e.relatedTarget\)/,
    /state.edits.size > 0 && !replace/,
  ])
    assert.match(lab, pattern);
});
