import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, render } from "./site-support.mjs";

test("Project 28 publishes ten staged lessons for the moving Boids product", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((entry) => entry.id === "28");
  assert.equal(project.slug, "boids-spatial-grid");
  assert.equal(project.sourceDirectory, "project-28-boids-spatial-grid");
  assert.equal(project.checkpointCount, 10);
  assert.equal(project.demoId, "boids-spatial-grid");
  assert.equal(project.contentRevision, 1);
});

test("Project 28 overview and all ten lessons render with the complete-source handoff", async () => {
  const files = (await readdir(path.join(workspace, "content/boids-spatial-grid")))
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  assert.equal(files.length, 10);
  const routes = [
    "/projects/boids-spatial-grid",
    ...files.map((file) => "/projects/boids-spatial-grid/" + file.slice(0, -4)),
  ];
  for (const route of routes) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) <= 300 * 1024, route + " HTML budget");
    assert.match(html, /boids-spatial-grid/);
    if (route.endsWith("10-hoan-thien-dan-boids-lon")) {
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-28-boids-spatial-grid.zip/);
      assert.match(html, /one-dark-pro/);
    }
  }
  assert.equal((await render("/projects/spatial-grid-neighbor-query")).status, 404);
});
