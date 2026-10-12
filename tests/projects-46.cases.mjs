import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, authoredLessons, render } from "./site-support.mjs";

const slug = "falling-sand";
const source = path.join(workspace, "examples", `project-46-${slug}`);

test("Project 46 publishes seven complete lessons and an independent SDL3 challenge", async () => {
  const overview = await render(`/projects/${slug}`);
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  assert.match(html, /96 × 64/);
  assert.match(html, /không cần OpenGL/i);
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  assert.equal(lessons.length, 7);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200, lesson.route);
    const body = await response.text();
    assert.ok(Buffer.byteLength(body) < 350 * 1024, lesson.route);
    assert.match(body, /one-dark-pro/);
    assert.match(body, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(body, /katex-error/);
    const mdx = await readFile(path.join(workspace, "content", slug, lesson.file), "utf8");
    for (const [, formula] of mdx.matchAll(/\$\$([\s\S]*?)\$\$/g)) {
      katex.renderToString(formula, { throwOnError: true, strict: "error" });
    }
    assert.match(mdx, new RegExp(`mode="sand-${Number(lesson.file.slice(0, 2))}"`));
  }
});

test("Project 46 introduces visible drawing before input, rules and automatic timing", async () => {
  for (let step = 0; step <= 7; step += 1) {
    const directory = step === 0 ? "starter" : `checkpoints/${String(step).padStart(2, "0")}`;
    const main = await readFile(path.join(source, directory, "src/main.cpp"), "utf8");
    const rules = await readFile(path.join(source, directory, "include/rules.hpp"), "utf8");
    assert.equal(main.includes("sand::drawGrid(renderer, grid)"), step >= 1);
    assert.equal(main.includes("sand::paintStroke("), step >= 2);
    assert.equal(main.includes("sand::stepGrid(grid)"), step >= 3);
    assert.equal(rules.includes("x + direction, y + 1"), step >= 4);
    assert.equal(main.includes("SDLK_3"), step >= 5);
    assert.equal(main.includes("sand::planSteps("), step >= 6);
    assert.equal(main.includes("sand::validateScene()"), step >= 7);
    assert.doesNotMatch(main, /OpenGL|glDispatchCompute/);
  }
});

test("Project 46 explicitly teaches ordered updates and limits of fake water", async () => {
  const readLesson = (name) => readFile(path.join(workspace, "content", slug, name), "utf8");
  assert.match(await readLesson("03-cat-roi-tung-tick.mdx"), /khác CA đồng bộ/);
  assert.match(
    await readLesson("04-cat-truot-va-thu-tu-duyet.mdx"),
    /không đảm bảo đối xứng hoàn toàn/i,
  );
  assert.match(await readLesson("05-nuoc-va-doi-cho.mdx"), /chưa có áp suất/);
  assert.match(
    await readLesson("06-nhip-mo-phong-co-dinh.mdx"),
    /không còn theo kịp thời gian thực/,
  );
  const final = await readLesson("07-kiem-chung-va-hoan-thien.mdx");
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(tests, /2882136376U/);
  assert.match(tests, /\{15, 30, 120\}/);
});
