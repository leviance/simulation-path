import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, render } from "./site-support.mjs";
import "./map-editor-production.test.mjs";

test("Project 29 publishes an eleven-lesson area-bearing Quadtree Map Editor", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((entry) => entry.id === "29");
  assert.equal(project.slug, "quadtree-map-editor");
  assert.equal(project.sourceDirectory, "project-29-quadtree-map-editor");
  assert.equal(project.checkpointCount, 11);
  assert.equal(project.demoId, project.slug);
  const overview = await render("/projects/" + project.slug);
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /100.000/);
  assert.match(html, /thử thách/i);
  assert.match(html, /project-29-quadtree-map-editor.zip/);
});

test("Project 29 serves every new lesson, complete source and no obsolete point-demo route", async () => {
  const metadata = await import("../course/projects/p29/manifest.ts");
  for (const lesson of metadata.default.lessons) {
    const response = await render("/projects/quadtree-map-editor/" + lesson.slug);
    assert.equal(response.status, 200, lesson.slug);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.ok(Buffer.byteLength(html) <= 300 * 1024, lesson.slug);
    if (lesson.order === 11) {
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      for (const file of [
        "model/dataset.hpp",
        "spatial/quadtree.hpp",
        "editor/scene.hpp",
        "app/application.hpp",
        "tests/tests.cpp",
      ])
        assert.ok(html.includes(file), file);
    }
  }
  assert.equal(
    (await render("/projects/visible-quadtree/01-vung-chon-va-quy-uoc-aabb")).status,
    404,
  );
});
