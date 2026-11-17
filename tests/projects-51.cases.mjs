import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
import "./sph-water-gpu-content.test.mjs";
const directory = path.join(workspace, "examples/project-51-sph-water-gpu");
test("P51 lazy lab entry remains within the unchanged 24 KiB production budget", async () => {
  const chunks = path.join(workspace, "dist/client/_next/static/chunks");
  const entry = (await readdir(chunks)).find(
    (file) => file.startsWith("sph-water-gpu-lab-") && file.endsWith(".js"),
  );
  assert.ok(entry);
  assert.ok((await stat(path.join(chunks, entry))).size < 24 * 1024);
  const hook = await readFile(
    path.join(workspace, "components/labs/sph-water-gpu/use-water-renderer.ts"),
    "utf8",
  );
  assert.match(hook, /import\("\.\/render-scene"\)/);
});
test("P51 overview and all thirteen lesson routes expose readable complete source", async () => {
  const overview = await render("/projects/sph-water-gpu");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((x) => x.project === "sph-water-gpu");
  assert.equal(lessons.length, 13);
  for (const l of lessons) {
    const response = await render(l.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(Buffer.byteLength(html) < 450 * 1024, l.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});
test("P51 checkpoint source genuinely introduces kernel and GPU passes at the taught stage", async () => {
  for (const [step, file, symbol] of [
    [2, "include/fluid/kernel.hpp", "inline double kernel3"],
    [3, "shaders/sph/initialize.comp", "position[i] ="],
    [4, "shaders/sph/density.comp", "float density ="],
    [5, "shaders/sph/force.comp", "vec3 pairForce"],
    [6, "shaders/sph/scan.comp", "shared uint"],
    [6, "include/gpu/passes.hpp", "for (std::size_t level"],
  ]) {
    const now = await readFile(
        path.join(directory, "checkpoints", String(step).padStart(2, "0"), file),
        "utf8",
      ),
      before = await readFile(
        path.join(directory, "checkpoints", String(step - 1).padStart(2, "0"), file),
        "utf8",
      );
    assert.ok(now.includes(symbol), file);
    assert.ok(!before.includes(symbol), file + " appeared too early");
  }
  const starter = await readFile(path.join(directory, "starter/src/main.cpp"), "utf8");
  assert.doesNotMatch(starter, /Engine engine/);
  const final = await readFile(path.join(directory, "final/include/fluid/model.hpp"), "utf8");
  assert.match(final, /lessonStage = 13|lessonStage=13/);
});
