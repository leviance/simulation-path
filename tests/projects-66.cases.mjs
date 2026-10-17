import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-66-widget-tree");

test("Project66 publishes eight widget-tree lessons, challenge and complete runnable One Dark source", async () => {
  const overview = await render("/projects/widget-tree");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "widget-tree");
  assert.equal(lessons.length, 8);
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
test("Project66 introduces tree, traversal, clip, picking, pointer, keyboard, mutation and audit progressively", async () => {
  for (const [n, file, symbol] of [
    [1, "tree.hpp", "struct Widget {"],
    [2, "traversal.hpp", "inline void visit("],
    [3, "geometry.hpp", "inline Rect intersect("],
    [4, "traversal.hpp", "inline WidgetId hitTest("],
    [5, "input.hpp", "inline void pointerUp("],
    [6, "keyboard.hpp", "inline bool keyDown("],
    [7, "mutation.hpp", "inline bool removeSubtree("],
    [8, "audit.hpp", "inline int audit("],
  ]) {
    const before = await readFile(
      path.join(
        directory,
        n === 1 ? "starter" : "checkpoints/" + String(n - 1).padStart(2, "0"),
        "include",
        file,
      ),
      "utf8",
    );
    const now = await readFile(
      path.join(directory, "checkpoints", String(n).padStart(2, "0"), "include", file),
      "utf8",
    );
    assert.ok(!before.includes(symbol), `early ${symbol}`);
    assert.ok(now.includes(symbol), `missing ${symbol}`);
  }
});
test("Project66 explains retained ownership, coordinate fixtures, reverse picking and lifecycle boundaries", async () => {
  const lessons = (await authoredLessons()).filter((l) => l.project === "widget-tree");
  const text = (
    await Promise.all(
      lessons.map((l) => readFile(path.join(workspace, "content", l.project, l.file), "utf8")),
    )
  ).join("\n");
  for (const pattern of [
    /SDL_CreateWindow/,
    /SDL_Renderer/,
    /SDL_RenderFillRect/,
    /unique_ptr/,
    /std::move/,
    /688,80/,
    /36/,
    /rbegin/,
    /half-open/,
    /reconcile/,
    /WidgetView/,
    /1000/,
    /NDEBUG/,
    /WaitForExit\(10000\)/,
    /-C Debug/,
    /-C Release/,
    /Project 67/,
    /Sắp ra mắt/,
  ])
    assert.match(text, pattern);
  const lab = await readFile(path.join(workspace, "components/labs/widget-tree-lab.tsx"), "utf8");
  for (const pattern of [
    /cancelAnimationFrame/,
    /visibilitychange/,
    /usePauseOnReducedMotion\(stop\)/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /pointer.current!==e.pointerId|pointer.current !== e.pointerId/,
    /onPointerCancel/,
    /onLostPointerCapture/,
    /disabled=\{reduced\}/,
  ])
    assert.match(lab, pattern);
});
