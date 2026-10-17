import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-63-voxel-procedural-terrain");
test("Project63 publishes nine terrain lessons with challenge, One Dark and full runnable source", async () => {
  const overview = await render("/projects/voxel-procedural-terrain");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-procedural-terrain");
  assert.equal(lessons.length, 9);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 650 * 1024, lesson.file);
  }
});
test("Project63 checkpoints introduce height readout, world signal, hash, interpolation, octaves, layers, generation, inspector and oracle progressively", async () => {
  for (const [n, file, symbol] of [
    [1, "include/view.hpp", "const std::string terrain ="],
    [2, "include/terrain.hpp", "return std::sin(x / 16)"],
    [3, "include/noise.hpp", "inline std::uint32_t latticeHash("],
    [4, "include/noise.hpp", "inline double valueNoise("],
    [5, "include/terrain.hpp", "double weight = 0;"],
    [6, "include/terrain.hpp", "return Block::Grass;"],
    [7, "include/scheduler.hpp", "inline void applyConfig("],
    [8, "include/controller.hpp", "inline ColumnSample inspectColumn("],
    [9, "include/terrain-oracle.hpp", "inline int verifyColumns("],
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
test("Project63 explains value noise, signed seams, sample bounds, configuration transactions and bounded validation", async () => {
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-procedural-terrain");
  const texts = await Promise.all(
    lessons.map((l) => readFile(path.join(workspace, "content", l.project, l.file), "utf8")),
  );
  for (const p of [
    /H=4/,
    /H\(15,z\)=H\(16,z\)/,
    /uint32_t/,
    /value noise/,
    /không chứng minh.*band-limit/,
    /neighbor resident/,
    /generation/,
    /pointercancel/,
    /multiset/,
  ])
    assert.match(texts.join("\n"), p);
  const last = texts.at(-1);
  for (const p of [
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /4263195062/,
    /Các project chưa phát hành/,
    /Sắp ra mắt/,
  ])
    assert.match(last, p);
  const lab = await readFile(
    path.join(workspace, "components/labs/voxel-procedural-terrain-lab.tsx"),
    "utf8",
  );
  for (const p of [
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /onPointerCancel/,
    /contains\(e.relatedTarget\)/,
  ])
    assert.match(lab, p);
});
