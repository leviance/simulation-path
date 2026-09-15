import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 32 publishes an eight-checkpoint AoS versus SoA experiment", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "32");
  assert.equal(project.slug, "memory-layout-race");
  assert.equal(project.sourceDirectory, "project-32-memory-layout-race");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "memory-layout-race");
});

test("Project 32 keeps workload, correctness, traffic and timing traceable", async () => {
  const content = path.join(workspace, "content", "memory-layout-race");
  const source = path.join(workspace, "examples", "project-32-memory-layout-race");
  const lessons = await Promise.all(
    [
      "01-khoa-workload-mot-trieu-particles.mdx",
      "02-cap-nhat-particles-trong-aos.mdx",
      "03-do-baseline-aos.mdx",
      "04-chuyen-state-sang-soa.mdx",
      "05-doi-chieu-hai-kernel.mdx",
      "06-cache-line-stride-va-useful-bytes.mdx",
      "07-benchmark-va-scaling-release.mdx",
      "08-hoan-thien-memory-layout-race.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  const lessonContracts = [
    [/sáu/i, /float/i, /24 MB/i, /ParticleAoS/i, /makeParticlesAoS/i],
    [/hot loop/i, /velocity/i, /wrap/i, /renderer.*lấy mẫu/i],
    [/positionX/i, /velocityOnly/i, /integrate/i, /warm-up/i, /checksum/i],
    [/sáu vector/i, /cùng size/i, /conversion/i],
    [/float/i, /maximum difference/i, /checksum/i],
    [/cache line/i, /64 byte/i, /usefulBytes/i, /loadedBytes/i, /efficiency/i],
    [/median/i, /10\.000/i, /100k/i, /1\.000\.000/i, /Release/i],
    [/CTest/i, /Debug/i, /Release/i, /Project 33/i, /OpenGL/i],
  ];
  for (const [index, patterns] of lessonContracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 32 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const particles = await readFile(
    path.join(source, "source-template", "include", "particles.hpp"),
    "utf8",
  );
  const benchmark = await readFile(
    path.join(source, "source-template", "include", "benchmark.hpp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "memory-layout-race-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "ParticleAoS",
    "makeParticlesAoS",
    "ParticlesSoA",
    "makeParticlesSoA",
    "integrateAoS",
    "integrateSoA",
    "maximumLayoutDifference",
  ]) {
    assert.ok(particles.includes(symbol), `Project 32 particle source is missing ${symbol}`);
  }
  for (const symbol of [
    "benchmarkAoSBaseline",
    "estimateMemoryTraffic",
    "benchmarkLayoutRace",
    "makeLayoutScalingStudy",
    "validateMemoryLayoutExperiment",
  ]) {
    assert.ok(benchmark.includes(symbol), `Project 32 benchmark source is missing ${symbol}`);
  }
  assert.match(main, /1'000'000U/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /SoA loads fewer lines for one field/);
  assert.match(tests, /layout benchmark observes equal outputs/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Chạy scaling/);
  assert.match(canvas, /AoS ↔ SoA agreement/);
});
