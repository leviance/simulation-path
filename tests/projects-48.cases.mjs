import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const slug = "wind-map",
  source = path.join(workspace, "examples", "project-48-" + slug);

test("Project 48 publishes nine vector-field lessons with a challenge and complete runnable sources", async () => {
  const response = await render("/projects/" + slug);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  assert.equal(lessons.length, 9);
  for (const lesson of lessons) {
    const result = await render(lesson.route);
    assert.equal(result.status, 200);
    const html = await result.text();
    assert.ok(Buffer.byteLength(html) < 350 * 1024, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    const mdx = await readFile(path.join(workspace, "content", slug, lesson.file), "utf8");
    for (const [, formula] of mdx.matchAll(/\$\$([\s\S]*?)\$\$/g))
      katex.renderToString(formula, { throwOnError: true, strict: "error" });
    assert.match(mdx, new RegExp('mode="wind-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project 48 introduces arrows, presets, gradient, divergence, curl, error, particles, vortex and validation progressively", async () => {
  const introductions = [
    [1, "include/view.hpp", "drawArrow("],
    [2, "include/scenes.hpp", "populate("],
    [3, "include/derivatives.hpp", "gradient("],
    [4, "include/derivatives.hpp", "divergence("],
    [5, "include/derivatives.hpp", "curl("],
    [6, "include/diagnostics.hpp", "gradientError("],
    [7, "include/particles.hpp", "midpointStep("],
    [8, "include/scenes.hpp", "addVortex("],
    [9, "include/diagnostics.hpp", "validateMap("],
  ];
  for (const [step, file, symbol] of introductions) {
    const current = "checkpoints/" + String(step).padStart(2, "0"),
      previous = step === 1 ? "starter" : "checkpoints/" + String(step - 1).padStart(2, "0");
    assert.ok((await readFile(path.join(source, current, file), "utf8")).includes(symbol));
    assert.ok(!(await readFile(path.join(source, previous, file), "utf8")).includes(symbol));
  }
});
test("Project 48 explains coordinate signs, tracer limits, boundary error and independent numerical checks", async () => {
  const lesson = (file) => readFile(path.join(workspace, "content", slug, file), "utf8");
  assert.match(await lesson("05-curl-va-xoay-cuc-bo.mdx"), /\*\*không phải omega\*\*/);
  assert.match(await lesson("06-mep-luoi-va-sai-so.mdx"), /không còn là cùng thí nghiệm tinh lưới/);
  assert.match(
    await lesson("07-noi-suy-va-hat-danh-dau.mdx"),
    /mật độ chấm không đo lượng chất lỏng/,
  );
  assert.match(await lesson("08-dat-xoay-bang-chuot.mdx"), /không ép số đo về 0/);
  const final = await lesson("09-kiem-chung-va-hoan-thien.mdx");
  assert.match(final, /không tự chứng minh gradient chính xác/);
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(tests, /midpoint converges against analytic rotation/);
  assert.match(tests, /Gaussian gradient converges at both interior and boundary/);
  assert.match(tests, /\{15, 30, 120\}/);
});
