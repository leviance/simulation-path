import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render, isTokenSubsequence } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-54-volume-ray-marching");
test("Project54 publishes nine progressive volume lessons with challenge, One Dark and complete sources", async () => {
  const overview = await render("/projects/volume-ray-marching");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "volume-ray-marching");
  assert.equal(lessons.length, 9);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 300 * 1024, lesson.route);
  }
});
test("Project54 GLSL excerpts match the shader of the taught checkpoint", async () => {
  for (const lesson of (await authoredLessons()).filter(
    (l) => l.project === "volume-ray-marching",
  )) {
    const source = await readFile(
      path.join(workspace, "content/volume-ray-marching", lesson.file),
      "utf8",
    );
    assert.match(source, new RegExp('mode="fog54-' + Number(lesson.file.slice(0, 2)) + '"'));
    for (const [, title, snippet] of source.matchAll(
      /```glsl title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      assert.match(relative, /^shaders\/.+\.(?:vert|frag)$/);
      const shader = await readFile(
        path.join(directory, "checkpoints", lesson.file.slice(0, 2), relative),
        "utf8",
      );
      assert.ok(isTokenSubsequence(snippet, shader), lesson.file + " drifts from " + relative);
    }
  }
});
test("Project54 adds visible fullscreen, rays, interval, texture, absorption, march, transfer, early and GPU oracle", async () => {
  for (const [step, file, symbol] of [
    [1, "include/renderer.hpp", "void initialize("],
    [2, "include/model.hpp", "cameraRay("],
    [3, "include/model.hpp", "boxInterval("],
    [4, "include/renderer.hpp", "void upload("],
    [5, "include/reference.hpp", "segmentAlpha("],
    [6, "include/reference.hpp", "inline Result march("],
    [7, "shaders/volume.frag", "uWarm != 0"],
    [8, "shaders/volume.frag", "uEarly != 0"],
    [9, "include/validation.hpp", "verifyGpu("],
  ]) {
    const current = await readFile(
      path.join(directory, "checkpoints", String(step).padStart(2, "0"), file),
      "utf8",
    );
    const previous = await readFile(
      path.join(
        directory,
        step === 1 ? "starter" : "checkpoints/" + String(step - 1).padStart(2, "0"),
        file,
      ),
      "utf8",
    );
    assert.ok(current.includes(symbol), symbol);
    assert.ok(!previous.includes(symbol), symbol);
  }
});
test("Project54 explains midpoint approximation, physical ds, result C/T and safe bounded verification", async () => {
  const lesson = (name) =>
    readFile(path.join(workspace, "content/volume-ray-marching", name), "utf8");
  assert.match(await lesson("04-texture-3d.mdx"), /480 KiB/);
  assert.match(await lesson("05-density-va-opacity.mdx"), /chưa ray marching đầy đủ/);
  assert.match(await lesson("06-front-to-back-march.mdx"), /ds=min/);
  assert.match(await lesson("07-transfer-va-present.mdx"), /không đổi T/);
  assert.match(await lesson("08-quality-va-gioi-han.mdx"), /Cap 512/);
  const last = await lesson("09-kiem-chung-va-hoan-thien.mdx");
  for (const pattern of [
    /16×12/,
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /không preempt GPU/,
    /không phải HU/,
    /Project 55/,
  ])
    assert.match(last, pattern);
});

test("Project54 GPU verification covers zero extinction, transfer and early shader options", async () => {
  const source = await readFile(
    path.join(directory, "source-template/include/validation.hpp"),
    "utf8",
  );
  assert.match(source, /Settings\{0, 0\.17, false, false\}/);
  assert.match(source, /Settings\{8, 0\.04, true, true\}/);
  assert.match(source, /Settings\{8, 0\.17, false, true\}/);
});
