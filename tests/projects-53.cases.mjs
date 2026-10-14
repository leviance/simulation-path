import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-53-volume-slicer");
test("Project53 publishes seven volume lessons with challenge, One Dark and complete sources", async () => {
  const overview = await render("/projects/volume-slicer");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "volume-slicer");
  assert.equal(lessons.length, 7);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 250 * 1024);
    const source = await readFile(
      path.join(workspace, "content/volume-slicer", lesson.file),
      "utf8",
    );
    assert.match(source, new RegExp('mode="slice53-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project53 draws first then progressively adds volume, axes, contrast, interpolation and audit", async () => {
  for (const [step, file, symbol] of [
    [1, "include/display.hpp", "makeImage("],
    [2, "include/volume.hpp", "sampleNearest("],
    [3, "include/model.hpp", "return {0, 2, 1}"],
    [4, "include/display.hpp", "windowValue("],
    [5, "include/sampling.hpp", "sampleLinear("],
    [6, "include/layout.hpp", "pickSlice("],
    [7, "include/diagnostics.hpp", "auditVolume("],
  ]) {
    const now = await readFile(
        path.join(directory, "checkpoints", String(step).padStart(2, "0"), file),
        "utf8",
      ),
      before = await readFile(
        path.join(
          directory,
          step === 1 ? "starter" : "checkpoints/" + String(step - 1).padStart(2, "0"),
          file,
        ),
        "utf8",
      );
    assert.ok(now.includes(symbol));
    assert.ok(!before.includes(symbol));
  }
  const image = await readFile(path.join(directory, "checkpoints/02/include/display.hpp"), "utf8");
  assert.ok(!image.includes("value = phantom(point)"));
});
test("Project53 documents physical spacing, centre sampling, boundary and synthetic-data limits", async () => {
  const lesson = (name) => readFile(path.join(workspace, "content/volume-slicer", name), "utf8");
  assert.match(await lesson("02-voxel-va-memory-layout.mdx"), /960 KiB/);
  assert.match(await lesson("03-ba-huong-cat.mdx"), /không dùng radiology/);
  assert.match(await lesson("04-window-level.mdx"), /không thay dataset/);
  assert.match(await lesson("05-noi-suy-giua-cac-lat.mdx"), /Ngoài box phải miss/);
  const final = await lesson("07-kiem-chung-va-hoan-thien.mdx");
  assert.match(final, /-C Debug/);
  assert.match(final, /-C Release/);
  assert.match(final, /không phải HU/);
  assert.match(final, /không kiểm mouse capture/);
});
