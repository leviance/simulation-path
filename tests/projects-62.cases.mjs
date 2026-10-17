import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-62-voxel-chunk-streaming");
test("Project62 publishes ten streaming lessons with challenge, One Dark and runnable source", async () => {
  const r = await render("/projects/voxel-chunk-streaming");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "voxel-chunk-streaming");
  assert.equal(lessons.length, 10);
  for (const l of lessons) {
    const r = await render(l.route),
      html = await r.text();
    assert.equal(r.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 650 * 1024);
  }
});
test("Project62 checkpoints add marker, signed address, wanted, unload, queue, keep, halo, dirty set, route and oracle", async () => {
  for (const [n, file, symbol] of [
    [1, "include/view.hpp", "const ScreenPoint p ="],
    [2, "include/coordinates.hpp", "inline AxisLocation splitAxis("],
    [3, "include/scheduler.hpp", "inline void synchronize("],
    [4, "include/world.hpp", "inline bool unloadChunk("],
    [5, "include/scheduler.hpp", "inline std::vector<Job> plan("],
    [6, "include/world.hpp", "return loadRadius(world) + 1;"],
    [7, "include/meshing.hpp", "inline Mask makeWorldMask("],
    [8, "include/meshing.hpp", "inline void markAffected("],
    [9, "include/controller.hpp", "const std::array<Player, 9> route"],
    [10, "include/oracle.hpp", "inline int verifySurface("],
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
test("Project62 explains finite domain, regeneration limits, retention, synchronous seam commits and bounded verification", async () => {
  const get = (f) => readFile(path.join(workspace, "content/voxel-chunk-streaming", f), "utf8");
  assert.match(await get("02-world-chunk-va-toa-do-am.mdx"), /−0.5/);
  assert.match(await get("04-go-va-tao-lai-chunk.mdx"), /persistence/);
  assert.match(await get("06-giu-vung-du-phong.mdx"), /không.*tải/i);
  assert.match(await get("07-nhin-sang-chunk-hang-xom.mdx"), /source/);
  assert.match(await get("08-chi-dung-lai-mesh-bi-anh-huong.mdx"), /batch đồng bộ/);
  const last = await get("10-kiem-chung-va-hoan-thien.mdx");
  for (const p of [
    /multiset/,
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /lastBudget/,
    /Project 63/,
    /Sắp ra mắt/,
  ])
    assert.match(last, p);
  const lab = await readFile(
    path.join(workspace, "components/labs/voxel-chunk-streaming-lab.tsx"),
    "utf8",
  );
  for (const p of [
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
    /contains\(e.relatedTarget\)/,
  ])
    assert.match(lab, p);
});
