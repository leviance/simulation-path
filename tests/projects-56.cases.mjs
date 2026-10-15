import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-56-ct-sinogram");
test("Project56 publishes nine CT lessons with challenge, staged labs and complete One Dark source", async () => {
  const overview = await render("/projects/ct-sinogram");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "ct-sinogram");
  assert.equal(lessons.length, 9);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 350 * 1024);
    const source = await readFile(path.join(workspace, "content/ct-sinogram", lesson.file), "utf8");
    assert.match(source, new RegExp('mode="ct56-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project56 source progresses through drawing, fan rays, chords, projection, storage, acquisition, trace, sampling and audit", async () => {
  for (const [n, file, symbol] of [
    [1, "include/view.hpp", "inline void drawDisk("],
    [2, "include/geometry.hpp", "inline Beam detectorRay("],
    [3, "include/geometry.hpp", "inline double chordLength("],
    [4, "include/projection.hpp", "inline Measurement measure("],
    [5, "include/scan.hpp", "inline Scan makeScan("],
    [6, "include/scan.hpp", "inline int advance("],
    [7, "include/geometry.hpp", "inline double pointOffset("],
    [8, "include/scan.hpp", "inline double samplingAngle("],
    [9, "include/audit.hpp", "inline double audit("],
  ]) {
    const now = await readFile(
      path.join(dir, "checkpoints", String(n).padStart(2, "0"), file),
      "utf8",
    );
    const before = await readFile(
      path.join(dir, n === 1 ? "starter" : "checkpoints/" + String(n - 1).padStart(2, "0"), file),
      "utf8",
    );
    assert.ok(now.includes(symbol), symbol);
    assert.ok(!before.includes(symbol), symbol);
  }
});
test("Project56 documents fan geometry, unmeasured cells, acquisition bounds and independent validation", async () => {
  const get = (file) => readFile(path.join(workspace, "content/ct-sinogram", file), "utf8");
  assert.match(await get("01-ve-phantom-bang-sdl3.mdx"), /SDL_RenderFillRect/);
  assert.match(await get("02-quay-nguon-va-detector.mdx"), /không pixel nào nằm đúng/);
  assert.match(await get("03-chieu-dai-xuyen-dia.mdx"), /clip với đoạn/);
  assert.match(await get("04-mot-hang-detector.mdx"), /cộng mu/);
  assert.match(await get("05-ghep-thanh-sinogram.mdx"), /NaN/);
  assert.match(await get("06-quet-dan-va-quan-ly-du-lieu.mdx"), /tối đa hai hàng/);
  assert.match(await get("07-vet-cua-diem-lech-tam.mdx"), /không phải đường sin thuần/);
  assert.match(await get("08-lay-mau-goc-va-do-phan-giai.mdx"), /cùng góc vật lý/);
  const last = await get("09-kiem-chung-va-hoan-thien.mdx");
  for (const pattern of [
    /oracle độc lập/,
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /Không reconstruction/,
    /Sắp ra mắt/,
  ])
    assert.match(last, pattern);
});
test("Project56 Canvas has bounded acquisition and persistent lifecycle cleanup", async () => {
  const lab = await readFile(path.join(workspace, "components/labs/ct-sinogram-lab.tsx"), "utf8");
  for (const pattern of [
    /advance\(scan.current, 2\)/,
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
  ])
    assert.match(lab, pattern);
  const scan = await readFile(path.join(dir, "source-template/include/scan.hpp"), "utf8");
  assert.match(scan, /quiet_NaN/);
  assert.match(scan, /budget > 2/);
  const main = await readFile(path.join(dir, "source-template/src/main.cpp"), "utf8");
  assert.match(main, /if \(controls.step\)\s*\{\s*controls.paused = true;\s*\}/);
  assert.match(main, /const double maximumError = ct::audit\(\);\s*std::cout << "Audit PASS/);
  const firstMain = await readFile(path.join(dir, "checkpoints/01/src/main.cpp"), "utf8");
  assert.doesNotMatch(firstMain, /Space: scan|T: point trace|V: independent/);
});
