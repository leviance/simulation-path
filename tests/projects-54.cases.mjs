import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
import "./volume-ray-marching-content.test.mjs";
test("P54 overview and all ten rebuilt routes serve challenge, One Dark and complete runnable sources", async () => {
  const overview = await render("/projects/volume-ray-marching");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter(
    (lesson) => lesson.project === "volume-ray-marching",
  );
  assert.equal(lessons.length, 10);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error|Đồng bộ từ checkpoint/);
    assert.ok(Buffer.byteLength(html) < 300 * 1024, lesson.route + " exceeds unchanged P54 budget");
  }
});
test("P54 lab stays lazy and does not inline the volume data into server-rendered HTML", async () => {
  const folder = path.join(workspace, "dist/client/_next/static/chunks"),
    files = await readdir(folder);
  const entry = files.find(
    (file) => file.startsWith("volume-ray-marching-lab-") && file.endsWith(".js"),
  );
  assert.ok(entry);
  assert.ok((await stat(path.join(folder, entry))).size < 24 * 1024);
  assert.match(
    await readFile("components/labs/volume-ray-marching-lab.tsx", "utf8"),
    /import\("\.\/volume-ray-marching\/workbench"\)/,
  );
});
test("P54 README distinguishes native viewport, GPU oracle, benchmark and CPU Canvas", async () => {
  const body = await readFile("examples/project-54-volume-ray-marching/README.md", "utf8");
  for (const text of [
    "128³",
    "2.097.152",
    "8 MiB",
    "MIP",
    "Average",
    "Alpha",
    "24×18",
    "320×240",
    "median/IQR",
    "--parallel 1",
    "-C Debug",
    "-C Release",
    "CPU reference",
    "không phải",
  ])
    assert.ok(body.includes(text), text);
  assert.doesNotMatch(body, /Count 64×48×40|Target 240×180 cố định/);
});
