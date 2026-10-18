import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-67-box-layout");
test("Project67 publishes nine progressive box-layout lessons with challenge and full source", async () => {
  const overview = await render("/projects/box-layout");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "box-layout");
  assert.equal(lessons.length, 9);
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
test("Project67 introduces style, measurement, arrangement, nesting, mutation, caching and overflow in order", async () => {
  for (const [n, file, symbol] of [
    [1, "app.hpp", "inline std::string describePause("],
    [2, "style.hpp", "struct BoxStyle {"],
    [3, "layout.hpp", "inline Size measure("],
    [4, "layout.hpp", "inline void arrange("],
    [5, "scene.hpp", "scene.group = add("],
    [6, "runtime.hpp", "inline bool appendLabel("],
    [7, "runtime.hpp", "inline bool setWidth("],
    [8, "runtime.hpp", "inline void setOverflow("],
    [9, "audit.hpp", "inline int auditLayout("],
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
    assert.ok(!before.includes(symbol), "early " + symbol);
    assert.ok(now.includes(symbol), "missing " + symbol);
  }
});
test("Project67 teaches box-model contracts, independent fixtures and bounded verification", async () => {
  const lessons = (await authoredLessons()).filter((l) => l.project === "box-layout"),
    text = (
      await Promise.all(
        lessons.map((l) => readFile(path.join(workspace, "content", l.project, l.file), "utf8")),
      )
    ).join("\n");
  for (const pattern of [
    /SDL_CreateWindow/,
    /SDL_RenderFillRect/,
    /BoxStyle/,
    /cursorY/,
    /656,96/,
    /252/,
    /520/,
    /158/,
    /margin collapsing/,
    /NDEBUG/,
    /WaitForExit\(10000\)/,
    /Project 68/,
    /Sắp ra mắt/,
  ])
    assert.match(text, pattern);
  const lab = await readFile(path.join(workspace, "components/labs/box-layout-lab.tsx"), "utf8");
  for (const pattern of [
    /cancelAnimationFrame/,
    /visibilitychange/,
    /usePauseOnReducedMotion\(stop\)/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /onPointerCancel/,
    /onLostPointerCapture/,
    /disabled=\{reduced\}/,
  ])
    assert.match(lab, pattern);
});
