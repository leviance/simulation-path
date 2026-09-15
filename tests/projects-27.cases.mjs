import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 27 publishes a seven-checkpoint brute-force particle query", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "27");
  assert.equal(project.slug, "brute-force-particle-query");
  assert.equal(project.sourceDirectory, "project-27-brute-force-particle-query");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "brute-force-particle-query");
});

test("Project 27 teaches a measurable O(N) baseline before spatial indexing", async () => {
  const content = path.join(workspace, "content", "brute-force-particle-query");
  const source = path.join(workspace, "examples", "project-27-brute-force-particle-query");
  const lessons = await Promise.all(
    [
      "01-tao-cloud-100000-particles.mdx",
      "02-bien-con-tro-thanh-query-circle.mdx",
      "03-quet-toan-bo-particles-bang-brute-force.mdx",
      "04-bo-sqrt-va-tai-su-dung-bo-dem.mdx",
      "05-do-thoi-gian-khong-tu-danh-lua-minh.mdx",
      "06-doc-duong-tang-chi-phi-theo-n.mdx",
      "07-hoan-thien-kinh-lup-va-nghiem-thu.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  assert.match(lessons[0], /100\.000.*seed.*deterministic/is);
  assert.match(lessons[1], /screen.*world.*boundary/is);
  assert.match(lessons[2], /scanned.*hits.*nearest/is);
  assert.match(lessons[3], /sqrt.*radius.*capacity/is);
  assert.match(lessons[4], /warm-up.*checksum.*totalScanned/is);
  assert.match(lessons[5], /prefix.*1\.000.*10\.000.*100\.000/is);
  assert.match(lessons[6], /Spatial Grid.*baseline.*oracle/is);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "brute-force-particle-query-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "makeParticleCloud",
    "insideCircleWithDistance",
    "queryBruteForce",
    "queryBruteForceSquared",
    "benchmarkBruteForce",
    "makeScalingStudy",
    "validateBruteForceExperiment",
  ]) {
    assert.ok(header.includes(symbol), `Project 27 header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /benchmark checksum is deterministic/);
  assert.match(tests, /one-hundred-thousand row reports exact scan work/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Draw sample \/ query workload/);
  assert.match(canvas, /Chạy scaling/);
});
