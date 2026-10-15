import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const dir = path.join(workspace, "examples/project-57-photon-rain");
test("Project57 publishes eight photon lessons with challenge, staged labs and complete source", async () => {
  const overview = await render("/projects/photon-rain");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "photon-rain");
  assert.equal(lessons.length, 8);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 380 * 1024);
    const mdx = await readFile(path.join(workspace, "content/photon-rain", lesson.file), "utf8");
    assert.match(mdx, new RegExp('mode="photon57-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project57 introduces drawing, RNG, boundary, absorption, scattering, tally, uncertainty and scheduler progressively", async () => {
  for (const [n, file, symbol] of [
    [1, "include/view.hpp", "inline void drawMedium("],
    [2, "include/random.hpp", "class Random"],
    [3, "include/geometry.hpp", "inline double exitDistance("],
    [4, "include/transport.hpp", "inline Trace tracePhoton("],
    [5, "include/transport.hpp", "inline Point scatterDirection("],
    [6, "include/statistics.hpp", "inline int advance("],
    [7, "include/statistics.hpp", "inline std::array<double, 2> wilson("],
    [8, "include/audit.hpp", "inline double audit("],
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
  const beforeAuto = await readFile(path.join(dir, "checkpoints/07/include/controls.hpp"), "utf8");
  assert.doesNotMatch(beforeAuto, /key == SDLK_SPACE/);
});
test("Project57 explains analog accounting, finite paths, censoring, sampling uncertainty and model limits", async () => {
  const get = (file) => readFile(path.join(workspace, "content/photon-rain", file), "utf8");
  assert.match(await get("01-ve-moi-truong-va-photon.mdx"), /SDL_RenderFillRect/);
  assert.match(await get("02-seed-va-quang-duong-tu-do.mdx"), /log1p/);
  assert.match(await get("03-so-quang-duong-voi-bien.mdx"), /min\(S,boundary\)/);
  assert.match(await get("04-hap-thu-thuan.mdx"), /không nhân thêm/);
  assert.match(await get("05-tan-xa-va-gioi-han.mdx"), /Censored/);
  assert.match(await get("06-dem-nhieu-photon.mdx"), /tập con escaped/);
  const uncertainty = await get("07-sai-so-monte-carlo.mdx");
  assert.match(uncertainty, /không confidence interval/);
  assert.match(uncertainty, /không hứa mọi seed/);
  const last = await get("08-hoan-thien-va-kiem-chung.mdx");
  for (const p of [
    /budget = 32/,
    /-C Debug/,
    /-C Release/,
    /WaitForExit\(30000\)/,
    /Không dùng kết quả này/,
    /Sắp ra mắt/,
  ])
    assert.match(last, p);
});
test("Project57 bounds batches/history and preserves pause and lifecycle cleanup", async () => {
  const lab = await readFile(path.join(workspace, "components/labs/photon-rain-lab.tsx"), "utf8");
  for (const p of [
    /advance\(current, 32\)/,
    /cancelAnimationFrame/,
    /usePauseOnReducedMotion\(stop\)/,
    /visibilitychange/,
    /setPointerCapture/,
    /releasePointerCapture/,
  ])
    assert.match(lab, p);
  const stats = await readFile(path.join(dir, "source-template/include/statistics.hpp"), "utf8");
  assert.match(stats, /budget > 32/);
  assert.match(stats, /recent.size\(\) > 24/);
  const main = await readFile(path.join(dir, "source-template/src/main.cpp"), "utf8");
  assert.match(main, /if \(budget > 0\)\s*\{\s*controls.paused = true;/);
  assert.match(main, /const double error = photon::audit\(\);\s*std::cout << "Audit PASS/);
});
