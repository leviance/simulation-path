import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const slug = "heat-plate",
  source = path.join(workspace, "examples", "project-47-" + slug);

test("Project 47 publishes eight heat lessons with a challenge and complete runnable code", async () => {
  const overview = await render("/projects/" + slug);
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  assert.match(html, /64 × 48/);
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  assert.equal(lessons.length, 8);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.ok(Buffer.byteLength(body) < 350 * 1024, lesson.route);
    assert.match(body, /one-dark-pro/);
    assert.match(body, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(body, /katex-error/);
    const mdx = await readFile(path.join(workspace, "content", slug, lesson.file), "utf8");
    for (const [, formula] of mdx.matchAll(/\$\$([\s\S]*?)\$\$/g))
      katex.renderToString(formula, { throwOnError: true, strict: "error" });
    assert.match(mdx, new RegExp('mode="heat-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project 47 introduces drawing, input, 1D, 2D, boundary, scheduling and diagnostics progressively", async () => {
  for (let step = 0; step <= 8; step++) {
    const dir = step === 0 ? "starter" : "checkpoints/" + String(step).padStart(2, "0");
    const file = (name) => readFile(path.join(source, dir, name), "utf8");
    const main = await file("src/main.cpp"),
      solver = await file("include/diffusion.hpp"),
      diagnostics = await file("include/diagnostics.hpp");
    assert.equal(main.includes("heat::drawField(renderer, field)"), step >= 1);
    assert.equal(main.includes("heat::paintStroke("), step >= 2);
    assert.equal(main.includes("heat::diffuse(field, settings)"), step >= 3);
    assert.equal(solver.includes("value += ry * vertical;"), step >= 4);
    assert.equal(main.includes("SDLK_B"), step >= 5);
    assert.equal(main.includes("heat::planSteps("), step >= 6);
    assert.equal(main.includes("heat::measure(field)"), step >= 7);
    assert.equal(diagnostics.includes("validatePlate()"), step >= 8);
    assert.doesNotMatch(main, /glDispatchCompute/);
  }
});
test("Project 47 documents heat boundaries, stability and independent numerical checks", async () => {
  const lesson = (name) => readFile(path.join(workspace, "content", slug, name), "utf8");
  assert.match(await lesson("05-dieu-kien-bien.mdx"), /giữ cả vành ô ngoài bằng 0/);
  assert.match(await lesson("06-buoc-thoi-gian-on-dinh.mdx"), /không theo kịp thời gian thật/);
  assert.match(await lesson("07-do-doc-truong-nhiet.mdx"), /không ghi một đơn vị vật lý/);
  const final = await lesson("08-kiem-chung-va-ban-hoan-chinh.mdx");
  assert.match(final, /của stencil rời rạc/);
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(tests, /discrete cosine decay matches oracle/);
  assert.match(tests, /\{15, 30, 120\}/);
  const solver = await readFile(path.join(source, "final/include/diffusion.hpp"), "utf8");
  assert.ok(
    solver.indexOf("if (!stable(settings))") < solver.indexOf("applyBoundary(field, settings)"),
  );
  assert.doesNotMatch(solver, /field\.next\[index\]\s*=\s*std::clamp/);
});
