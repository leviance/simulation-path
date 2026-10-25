import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import "./boids-content.test.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-27-boids-2d");
const content = path.join(workspace, "content/boids-2d");

test("Project 27 catalog describes Boids and nine independent checkpoints", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((entry) => entry.id === "27");
  assert.equal(project.slug, "boids-2d");
  assert.equal(project.demoId, "boids-2d");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.contentRevision, 1);
  const cmake = await readFile(path.join(root, "CMakeLists.txt"), "utf8");
  assert.match(cmake, /set\(PROJECT_CHECKPOINT_COUNT 9\)/);
  assert.match(cmake, /SDL3::SDL3/);
  assert.match(cmake, /3\.4\.8/);
});

test("Project 27 overview and all nine lesson routes expose full source and downloads", async () => {
  const overview = await render("/projects/boids-2d");
  assert.equal(overview.status, 200);
  const overviewHtml = await overview.text();
  assert.match(overviewHtml, /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  assert.match(overviewHtml, /separation/i);
  assert.match(overviewHtml, /1\.024/);
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 9);
  for (const file of files) {
    const response = await render("/projects/boids-2d/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 300 * 1024, file + " exceeds the lesson response budget");
    assert.match(html, /one-dark-pro/);
    assert.match(html, /boids-2d/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
    const order = Number.parseInt(file, 10);
    for (const [stage, label] of [
      [4, "Separation"],
      [5, "Alignment"],
      [6, "Cohesion"],
    ]) {
      const visible = html
        .replace(/<!--[\s\S]*?-->/g, "")
        .includes(`<dt>${label} của cá thể đang chọn</dt>`);
      assert.equal(visible, order >= stage, file + " vector readout: " + label);
    }
    if (file === files.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include"))) {
        assert.ok(html.includes("include/" + name), name);
      }
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-27-boids-2d.zip/);
      assert.match(html, /tests\/tests.cpp/);
    }
  }
});

test("Retired particle-lens routes are not presented as the rebuilt Boids course", async () => {
  const response = await render("/projects/brute-force-particle-query");
  assert.equal(response.status, 404);
});
