import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render, isTokenSubsequence } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-51-sph-water-gpu");
test("Project51 GLSL snippets match the shader of their teaching checkpoint", async () => {
  const lessons = (await authoredLessons()).filter((l) => l.project === "sph-water-gpu");
  for (const lesson of lessons) {
    const source = await readFile(
      path.join(workspace, "content/sph-water-gpu", lesson.file),
      "utf8",
    );
    assert.match(source, new RegExp('mode="sph3-' + Number(lesson.file.slice(0, 2)) + '"'));
    for (const [, title, snippet] of source.matchAll(
      /```glsl title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      assert.match(relative, /^shaders\/.+\.(?:comp|vert|frag|glsl)$/);
      const shader = await readFile(
        path.join(directory, "checkpoints", lesson.file.slice(0, 2), relative),
        "utf8",
      );
      assert.ok(isTokenSubsequence(snippet, shader), lesson.file + " drifts from " + relative);
    }
  }
});
test("Project51 publishes12 progressive SPH3D lessons with full runnable sources", async () => {
  const overview = await render("/projects/sph-water-gpu");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "sph-water-gpu");
  assert.equal(lessons.length, 12);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(Buffer.byteLength(html) < 450 * 1024, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});
test("Project51 introduces GPU rendering,SPH,CSR,reduction and scale at the taught checkpoints", async () => {
  for (const [step, file, symbol] of [
    [1, "include/model.hpp", "initialPosition("],
    [4, "include/kernel.hpp", "kernel("],
    [5, "include/reference.hpp", "evaluate("],
    [6, "shaders/force.comp", "pairAcceleration("],
    [7, "include/reference.hpp", "integrate("],
    [8, "include/passes.hpp", "buildGrid("],
    [9, "include/passes.hpp", "reduceStats("],
    [12, "include/validation.hpp", "validateGpu("],
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
  const main = await readFile(path.join(directory, "checkpoints/10/src/main.cpp"), "utf8");
  assert.ok(!main.includes("Confirm with Enter"));
  assert.match(
    await readFile(path.join(directory, "final/src/main.cpp"), "utf8"),
    /Confirm with Enter/,
  );
});
test("Project51 documents CPU versus GPU,volume units,bounded work and verification limits", async () => {
  const lesson = (file) => readFile(path.join(workspace, "content/sph-water-gpu", file), "utf8");
  assert.match(await lesson("04-kernel-ba-chieu.mdx"), /kg\/m³/);
  assert.match(await lesson("08-csr-grid-ba-chieu.mdx"), /không.*cắt ngầm/);
  assert.match(await lesson("10-fence-va-ngan-sach.mdx"), /không thu hồi compute/);
  assert.match(await lesson("11-tang-quy-mo.mdx"), /không.*allocation trên GPU của browser/);
  const final = await lesson("12-kiem-chung-va-hoan-thien.mdx");
  assert.match(final, /không chứng nhận solver nước/);
  assert.match(final, /--tail-case/);
  assert.match(final, /-C Release/);
});
