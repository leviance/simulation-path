import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const slug = "stable-fluids",
  source = path.join(workspace, "examples", "project-49-" + slug);
test("Project 49 publishes eleven Stable Fluids lessons with a challenge and full runnable code", async () => {
  const overview = await render("/projects/" + slug);
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  assert.equal(lessons.length, 11);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 350 * 1024, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    const mdx = await readFile(path.join(workspace, "content", slug, lesson.file), "utf8");
    for (const [, formula] of mdx.matchAll(/\$\$([\s\S]*?)\$\$/g))
      katex.renderToString(formula, { throwOnError: true, strict: "error" });
    assert.match(mdx, new RegExp('mode="fluid-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project 49 introduces scalar, input, transport, MAC, pressure, projection and the remaining solver stages progressively", async () => {
  const introductions = [
    [1, "view.hpp", "drawGrid("],
    [2, "input.hpp", "paintStroke("],
    [3, "transport.hpp", "advectDensity("],
    [4, "pressure.hpp", "computeDivergence("],
    [5, "pressure.hpp", "solvePressure("],
    [6, "pressure.hpp", "project("],
    [7, "transport.hpp", "advectVelocity("],
    [8, "diffusion.hpp", "diffuseVelocity("],
    [9, "input.hpp", "addBuoyancy("],
    [10, "simulation.hpp", "planSteps("],
    [11, "diagnostics.hpp", "validateFluid("],
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
test("Project 49 teaches residual, scalar limits, consistent MAC operators and bounded verification explicitly", async () => {
  const lesson = (name) => readFile(path.join(workspace, "content", slug, name), "utf8");
  assert.match(
    await lesson("03-backtrace-va-advection.mdx"),
    /không bảo toàn tổng scalar chính xác/,
  );
  assert.match(await lesson("05-pressure-poisson.mdx"), /không đổi u\/v/);
  const pressureLesson = await lesson("05-pressure-poisson.mdx");
  assert.match(pressureLesson, /Ca Jacobi 8×8/);
  assert.match(pressureLesson, /0\.19921875/);
  assert.match(pressureLesson, /beginPressure\(grid\)/);
  assert.match(pressureLesson, /jacobiIteration\(grid\)/);
  const pressureHtml = await render("/projects/stable-fluids/05-pressure-poisson");
  assert.match(await pressureHtml.text(), /Tiến một vòng Jacobi/);
  assert.match(await lesson("06-projection-va-residual.mdx"), /dt\*residual/);
  assert.match(
    await lesson("09-khuay-chuot-va-luc-noi.mdx"),
    /không tuyên bố mọi tần suất mouse event/,
  );
  const final = await lesson("11-kiem-chung-va-hoan-thien.mdx");
  assert.match(final, /PASS không thay thế div\/residual/);
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(tests, /independent Poisson residual oracle/);
  assert.match(tests, /shared C\+\+ and Canvas projection fixture/);
  assert.match(tests, /implicit viscosity equation oracle/);
  assert.match(tests, /\{15, 30, 120\}/);
});
