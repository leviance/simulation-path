import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
import "./volume-slicer-content.test.mjs";
test("P53 overview and all nine new lesson routes serve challenge, One Dark and runnable complete source", async () => {
  const overview = await render("/projects/volume-slicer");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((l) => l.project === "volume-slicer");
  assert.equal(lessons.length, 9);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(
      Buffer.byteLength(html) < 250 * 1024,
      lesson.route + " exceeds unchanged 250 KiB budget",
    );
  }
});
test("P53 local lab entry stays lazy and under the unchanged 24 KiB entry budget", async () => {
  const directory = path.join(workspace, "dist/client/_next/static/chunks");
  const file = (await readdir(directory)).find(
    (name) => name.startsWith("volume-slicer-lab-") && name.endsWith(".js"),
  );
  assert.ok(file);
  assert.ok((await stat(path.join(directory, file))).size < 24 * 1024);
  const entry = await readFile(
    path.join(workspace, "components/labs/volume-slicer-lab.tsx"),
    "utf8",
  );
  assert.match(entry, /import\("\.\/volume-slicer\/workbench"\)/);
});
test("P53 sources and teaching name actual Float32 memory, mm orientation and non-CT limits", async () => {
  const doc = await readFile(
    path.join(workspace, "examples/project-53-volume-slicer/README.md"),
    "utf8",
  );
  for (const token of [
    "2.097.152",
    "8 MiB",
    "160 × 192 × 224 mm",
    "128³",
    "-C Debug",
    "-C Release",
    "--parallel 1",
    "CT reconstruction",
    "nearest",
    "trilinear",
  ])
    assert.ok(doc.includes(token), token);
  assert.doesNotMatch(doc, /isovalue 0\.18|stride 3|16 MiB|lõi xoắn/);
});
