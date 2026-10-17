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
test("Project 65 checkpoints introduce physics, hit-test, button, slider, keyboard, routing and audit only when taught", async () => {
  for (const [n, file, symbol] of [
    [1, "include/simulation.hpp", "inline void stepPhysics("],
    [2, "include/controls.hpp", "inline Control hitTest("],
    [3, "include/controls.hpp", "inline void pointerUp("],
    [4, "include/controls.hpp", "inline void dragGravity("],
    [5, "include/controls.hpp", "inline bool keyDown("],
    [6, "include/controls.hpp", "inline void scenePointerDown("],
    [7, "include/audit.hpp", "inline bool audit("],
  ]) {
    const before = await readFile(
      path.join(
        directory,
        n === 1 ? "starter" : "checkpoints/" + String(n - 1).padStart(2, "0"),
        file,
      ),
      "utf8",
    );
    const now = await readFile(
      path.join(directory, "checkpoints", String(n).padStart(2, "0"), file),
      "utf8",
    );
    assert.ok(!before.includes(symbol), `early implementation: ${symbol}`);
    assert.ok(now.includes(symbol), `missing at lesson ${n}: ${symbol}`);
  }
});
test("Project 65 explains semantics, coordinate units, capture lifetime and bounded independent validation", async () => {
  const lessons = (await authoredLessons()).filter((l) => l.project === "simulator-controls");
  const text = (
    await Promise.all(
      lessons.map((l) => readFile(path.join(workspace, "content", l.project, l.file), "utf8")),
    )
  ).join("\n");
  for (const pattern of [
    /logical pixel\/s²/,
    /clockRevision/,
    /half-open/,
    /active/,
    /focus/,
    /repeat/,
    /consumed/,
    /DPR/,
    /pointercancel/,
    /SDL_ConvertEventToRenderCoordinates/,
    /12000/,
    /tổng cấp số cộng/,
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /Project 66/,
    /Sắp ra mắt/,
  ])
    assert.match(text, pattern);
  const lab = await readFile(
    path.join(workspace, "components/labs/simulator-controls-lab.tsx"),
    "utf8",
  );
  for (const pattern of [
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /onPointerCancel/,
    /onLostPointerCapture/,
    /contains\(e.relatedTarget\)/,
    /pointer.current !== e.pointerId/,
    /disabled=\{reduced\}/,
    /type="range"/,
  ])
    assert.match(lab, pattern);
});
