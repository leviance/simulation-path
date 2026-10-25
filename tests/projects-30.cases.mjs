import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, render } from "./site-support.mjs";

test("Project 30 publishes the eleven-lesson point cloud survey product", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((entry) => entry.id === "30");
  assert.equal(project.slug, "point-cloud-octree");
  assert.equal(project.checkpointCount, 11);
  assert.equal(project.contentRevision, 1);
  const response = await render("/projects/point-cloud-octree");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["100.000", "CSV", "centroid", "point-cloud-octree.zip"])
    assert.ok(html.includes(text), text);
});
test("Project 30 serves all new lessons and full source without retaining obsolete tree-demo lessons", async () => {
  const project = (await import("../course/projects/p30/manifest.ts")).default;
  for (const lesson of project.lessons) {
    const response = await render("/projects/point-cloud-octree/" + lesson.slug);
    assert.equal(response.status, 200, lesson.slug);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.ok(Buffer.byteLength(html) <= 300 * 1024, lesson.slug + " exceeds response budget");
    if (lesson.order === 11)
      for (const file of [
        "io/csv.hpp",
        "spatial/octree.hpp",
        "survey/statistics.hpp",
        "app/application.hpp",
        "tests/tests.cpp",
      ])
        assert.ok(html.includes(file), file);
  }
  assert.equal(
    (await render("/projects/point-cloud-octree/09-hoan-thien-point-cloud-octree")).status,
    404,
  );
});
test("Project 30 Canvas, controls and diagnostics chunks stay below 24 KiB", async () => {
  const chunks = path.join(workspace, "dist/client/_next/static/chunks");
  const files = await readdir(chunks);
  for (const prefix of [
    "point-cloud-octree-lab-",
    "cloud-survey-controls-",
    "cloud-survey-diagnostics-",
  ]) {
    const file = files.find((name) => name.startsWith(prefix));
    assert.ok(file, prefix);
    assert.ok((await stat(path.join(chunks, file))).size < 24 * 1024, file);
  }
});
