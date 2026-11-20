import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-65-simulator-controls");
test("Project 65 publishes seven controls lessons, challenge and complete One Dark source", async () => {
  const overview = await render("/projects/simulator-controls");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "simulator-controls");
  assert.equal(lessons.length, 7);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(
      Buffer.byteLength(html) < 300 * 1024,
      `${lesson.file}: ${Buffer.byteLength(html)} bytes`,
    );
  }
});
test("Project 65 uses the real P28 grid in every standalone snapshot and stages the new UI", async () => {
  for (const [stage, file, symbol] of [
    [1, "simulation.hpp", "inline void stepPhysics("],
    [2, "controls.hpp", "inline Control hitTest("],
    [3, "controls.hpp", "inline void pointerUp("],
    [4, "controls.hpp", "inline void dragSlider("],
    [5, "controls.hpp", "inline bool keyDown("],
    [6, "controls.hpp", "inline void scenePointerDown("],
    [7, "audit.hpp", "inline bool audit("],
  ]) {
    const now = String(stage).padStart(2, "0");
    const old = stage === 1 ? "starter" : "checkpoints/" + String(stage - 1).padStart(2, "0");
    assert.ok(
      !(await readFile(path.join(directory, old, "include", file), "utf8")).includes(symbol),
    );
    assert.ok(
      (await readFile(path.join(directory, "checkpoints", now, "include", file), "utf8")).includes(
        symbol,
      ),
    );
  }
  for (const header of [
    "boids/lab",
    "boids/flock",
    "boids/neighbors",
    "boids/steering",
    "grid/coordinates",
    "grid/storage",
    "grid/query",
  ]) {
    const expected = await readFile(
      path.join(workspace, "examples/project-28-boids-spatial-grid/final/include", header + ".hpp"),
    );
    for (const snapshot of ["starter", "checkpoints/04", "final"])
      assert.deepEqual(
        await readFile(path.join(directory, snapshot, "include", header + ".hpp")),
        expected,
      );
  }
});
test("Project 65 teaches flock parameters, not the retired gravity scene; code and real screenshots match the lesson", async () => {
  const { markedCodeExcerpt, markedSnippetBlockPattern } =
    await import("../scripts/code-snippets.mjs");
  for (const lesson of (await authoredLessons()).filter(
    (item) => item.project === "simulator-controls",
  )) {
    const source = await readFile(
      path.join(workspace, "content", lesson.project, lesson.file),
      "utf8",
    );
    assert.doesNotMatch(source, /trọng lực|bóng nảy|dragGravity/i);
    const matches = [...source.matchAll(markedSnippetBlockPattern())];
    assert.ok(matches.length >= 2);
    for (const [, , file, marker] of matches) {
      const root = file.startsWith("tests/")
        ? directory
        : path.join(directory, "checkpoints", lesson.file.slice(0, 2));
      const body = markedCodeExcerpt(await readFile(path.join(root, file), "utf8"), marker);
      assert.ok(source.replaceAll("\r", "").includes(body.replaceAll("\r", "")));
    }
  }
  const overview = await (await render("/projects/simulator-controls")).text();
  assert.match(overview, /p65-final\.png/);
  assert.doesNotMatch(overview, /CANVAS 2D · LIVE/);
});
