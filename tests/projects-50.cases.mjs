import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const slug = "sph-water",
  source = path.join(workspace, "examples", "project-50-" + slug);
test("Project 50 publishes ten progressive SPH lessons with runnable source", async () => {
  const overview = await render("/projects/" + slug);
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((value) => value.project === slug);
  assert.equal(lessons.length, 10);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(Buffer.byteLength(html) < 350 * 1024);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    const mdx = await readFile(path.join(workspace, "content", slug, lesson.file), "utf8");
    for (const [, formula] of mdx.matchAll(/\$\$([\s\S]*?)\$\$/g))
      katex.renderToString(formula, { throwOnError: true, strict: "error" });
    assert.match(mdx, new RegExp('mode="sph-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project 50 introduces each solver responsibility at its teaching checkpoint", async () => {
  const introductions = [
    [1, "view.hpp", "state.particles[i]"],
    [2, "solver.hpp", "integrate("],
    [3, "kernel.hpp", "kernel("],
    [4, "solver.hpp", "computeDensity("],
    [5, "solver.hpp", "computePressure("],
    [6, "kernel.hpp", "artificialViscosity("],
    [7, "neighbors.hpp", "buckets.find("],
    [8, "emitter.hpp", "pour("],
    [9, "timing.hpp", "advanceFrame("],
    [10, "diagnostics.hpp", "validateWater("],
  ];
  for (const [step, file, symbol] of introductions) {
    const current = "checkpoints/" + String(step).padStart(2, "0"),
      previous = step === 1 ? "starter" : "checkpoints/" + String(step - 1).padStart(2, "0");
    assert.ok(
      (await readFile(path.join(source, current, "include", file), "utf8")).includes(symbol),
    );
    assert.ok(
      !(await readFile(path.join(source, previous, "include", file), "utf8")).includes(symbol),
    );
  }
});
test("Project 50 explains 2D units, boundary approximations and bounded verification", async () => {
  const lesson = (name) => readFile(path.join(workspace, "content", slug, name), "utf8");
  assert.match(await lesson("04-density-va-mau-tuong.mdx"), /kg\/m²/);
  assert.match(await lesson("05-pressure-va-luc-doi-xung.mdx"), /không giải Poisson/);
  assert.match(await lesson("06-artificial-viscosity.mdx"), /không phải.*độ nhớt thực/);
  assert.match(await lesson("05-pressure-va-luc-doi-xung.mdx"), /Cặp hạt độc lập/);
  assert.match(await lesson("05-pressure-va-luc-doi-xung.mdx"), /211,561054/);
  assert.match(await lesson("06-artificial-viscosity.mdx"), /−3,609163/);
  assert.match(await lesson("09-substep-va-ngan-sach.mdx"), /0,00073125/);
  assert.match(await lesson("09-substep-va-ngan-sach.mdx"), /acceleration thiếu phần tử/);
  assert.match(await lesson("09-substep-va-ngan-sach.mdx"), /64/);
  const final = await lesson("10-kiem-chung-va-hoan-thien.mdx");
  assert.match(final, /PASS không thay thế/);
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(tests, /independent 2D normalization oracle/);
  assert.match(tests, /shared C\+\+ and Canvas EOS fixture/);
  assert.match(tests, /\{30, 60, 120\}/);
});
