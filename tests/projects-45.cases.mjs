import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, authoredLessons, render, isTokenSubsequence } from "./site-support.mjs";

const slug = "molecular-lab-gpu";
const source = path.join(workspace, "examples", `project-45-${slug}`);

test("Project 45 publishes ten complete GPU MD lessons with safe scaling boundaries", async () => {
  const overview = await render(`/projects/${slug}`);
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  assert.equal(lessons.length, 10);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200, lesson.route);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 350 * 1024, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    const mdx = await readFile(path.join(workspace, "content", slug, lesson.file), "utf8");
    for (const [, formula] of mdx.matchAll(/\$\$([\s\S]*?)\$\$/g))
      katex.renderToString(formula, { throwOnError: true, strict: "error" });
    for (const [, title, snippet] of mdx.matchAll(
      /```glsl title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const file = title.split(" — ")[0];
      const checkpoint = lesson.file.slice(0, 2);
      const shader = await readFile(path.join(source, "checkpoints", checkpoint, file), "utf8");
      assert.ok(isTokenSubsequence(snippet, shader), `${lesson.file}: shader snippet drift`);
    }
  }
});

test("Project 45 enables one new stage per checkpoint without auto-running large GPU jobs", async () => {
  const features = new Map([
    [4, "features.force = true"],
    [5, "features.grid = true"],
    [6, "features.integrate = true"],
    [7, "features.cache = true"],
    [8, "features.diagnostics = true"],
  ]);
  for (let step = 0; step <= 10; step += 1) {
    const directory = step === 0 ? "starter" : `checkpoints/${String(step).padStart(2, "0")}`;
    const main = await readFile(path.join(source, directory, "src/main.cpp"), "utf8");
    for (const [introduced, symbol] of features)
      assert.equal(main.includes(symbol), step >= introduced, `${directory}: ${symbol}`);
    assert.match(main, /initialCount = 64/);
    assert.equal(main.includes("counts.at(event.key.key - SDLK_1)"), step >= 9);
    assert.equal(main.includes('argument == "--verify-gpu"'), step >= 10);
  }
  const queue = await readFile(path.join(source, "final/include/gpu_queue.hpp"), "utf8");
  assert.match(queue, /ClientWaitSync\(fence_, 0, 0\)/);
  assert.match(queue, /chrono::seconds\(5\)/);
  assert.doesNotMatch(queue, /glFinish|while\s*\(/);
  const shader = await readFile(path.join(source, "final/shaders/force.comp"), "utf8");
  assert.match(shader, /referencePositions\[i\]\.xy/);
  assert.match(shader, /count > cellCapacity/);
  assert.match(shader, /0\.5 \* \(value\.x/);
});
