import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-55-xray-detector");
test("Project55 publishes eight detector lessons with challenge and complete One Dark source", async () => {
  const overview = await render("/projects/xray-detector");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "xray-detector");
  assert.equal(lessons.length, 8);
  for (const l of lessons) {
    const r = await render(l.route),
      html = await r.text();
    assert.equal(r.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 300 * 1024);
    const mdx = await readFile(path.join(workspace, "content/xray-detector", l.file), "utf8");
    assert.match(mdx, new RegExp('mode="xray55-' + Number(l.file.slice(0, 2)) + '"'));
  }
});
test("Project55 introduces image, ray, chord, attenuation, midpoint, log, spectrum and audit progressively", async () => {
  for (const [n, file, symbol] of [
    [1, "include/detector.hpp", "inline Image makeImage("],
    [2, "include/geometry.hpp", "inline Beam detectorRay("],
    [3, "include/geometry.hpp", "boxInterval("],
    [4, "include/projection.hpp", "exactDepth("],
    [5, "include/projection.hpp", "midpointDepth("],
    [6, "include/projection.hpp", "logProjection = -std::log"],
    [7, "include/projection.hpp", "settings.lowWeight * std::exp"],
    [8, "include/audit.hpp", "inline double audit("],
  ]) {
    const now = await readFile(
        path.join(dir, "checkpoints", String(n).padStart(2, "0"), file),
        "utf8",
      ),
      before = await readFile(
        path.join(dir, n === 1 ? "starter" : "checkpoints/" + String(n - 1).padStart(2, "0"), file),
        "utf8",
      );
    assert.ok(now.includes(symbol), symbol);
    assert.ok(!before.includes(symbol), symbol);
  }
});
test("Project55 documents finite beams, additive overlap, raw/display separation and model limits", async () => {
  const get = (file) => readFile(path.join(workspace, "content/xray-detector", file), "utf8");
  assert.match(await get("02-source-detector-va-ray.mdx"), /không ray vô hạn/);
  assert.match(await get("04-beer-lambert-nhieu-lop.mdx"), /cộng mu/);
  assert.match(await get("05-midpoint-va-sai-so-bien.mdx"), /không nhất thiết giảm đơn điệu/);
  assert.match(await get("06-flat-field-va-anh-log.mdx"), /ratio raw không bị sửa/);
  assert.match(await get("07-pho-hai-nang-luong.mdx"), /Cộng intensity trước khi log/);
  const last = await get("08-kiem-chung-va-hoan-thien.mdx");
  for (const p of [
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /không photon|Không noise/,
    /Sắp ra mắt/,
  ])
    assert.match(last, p);
});
