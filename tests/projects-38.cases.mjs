import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 38 publishes a ten-checkpoint five-million particle fountain", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "38");
  assert.equal(project.slug, "five-million-particle-fountain");
  assert.equal(project.sourceDirectory, "project-38-five-million-particle-fountain");
  assert.equal(project.checkpointCount, 10);
  assert.equal(project.demoId, "five-million-particle-fountain");
});

test("Project 38 teaches one traceable GPU-resident particle pipeline", async () => {
  const content = path.join(workspace, "content", "five-million-particle-fountain");
  const source = path.join(workspace, "examples", "project-38-five-million-particle-fountain");
  const lessonFiles = [
    "01-khoa-hop-dong-mo-phong-particle.mdx",
    "02-khoi-tao-deterministic-va-trai-tuoi-hat.mdx",
    "03-capability-budget-va-ssbo-160-mb.mdx",
    "04-compute-update-trong-luc-va-respawn.mdx",
    "05-render-ssbo-bang-gl-vertexid.mdx",
    "06-barrier-tu-compute-sang-vertex-shader.mdx",
    "07-dieu-khien-thoi-gian-pause-va-single-step.mdx",
    "08-timer-query-ring-va-thang-do-5-trieu.mdx",
    "09-validation-probe-khong-readback-toan-bo.mdx",
    "10-hoan-thien-dai-phun-5-trieu-hat.mdx",
  ];
  const lessons = await Promise.all(
    lessonFiles.map((file) => readFile(path.join(content, file), "utf8")),
  );
  const lessonContracts = [
    [/Particle/i, /semi-implicit Euler/i, /stepParticleCpu/i, /preview nhỏ trên CPU/i],
    [/deterministic/i, /random01/i, /spawnEpoch/i, /age ban đầu/i],
    [/160\.000\.000/i, /GL_MAX_SHADER_STORAGE_BLOCK_SIZE/i, /fallback/i, /binding 0/i],
    [/local_size_x = 256/i, /gl_GlobalInvocationID/i, /19\.532/i, /192/i],
    [/gl_VertexID/i, /GL_POINTS/i, /VAO rỗng/i, /point sprite/i],
    [/GL_SHADER_STORAGE_BARRIER_BIT/i, /GL_BUFFER_UPDATE_BARRIER_BIT/i, /full readback/i],
    [/1\/30/i, /1\/120/i, /pause/i, /single-step/i],
    [/GL_QUERY_RESULT_AVAILABLE/i, /query ring/i, /median/i, /5m/i],
    [/64 particle/i, /2\.048 byte/i, /mixed tolerance/i, /first mismatch/i],
    [/Mã hoàn chỉnh/i, /không full readback/i, /Project 39/i, /cleanup/i],
  ];
  for (const [index, patterns] of lessonContracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 38 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const math = await readFile(
    path.join(source, "source-template", "include", "particle_math.hpp"),
    "utf8",
  );
  const glApi = await readFile(
    path.join(source, "source-template", "include", "gl_api.hpp"),
    "utf8",
  );
  const engine = await readFile(
    path.join(source, "source-template", "include", "particle_gpu_engine.hpp"),
    "utf8",
  );
  const computeShader = await readFile(
    path.join(source, "source-template", "shaders", "particle_update.comp"),
    "utf8",
  );
  const vertexShader = await readFile(
    path.join(source, "source-template", "shaders", "particle.vert"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "five-million-particle-fountain-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "alignas(16)",
    "makeInitialParticle",
    "stepParticleCpu",
    "makeDispatchPlan",
    "particleStorageBytes",
    "chooseLargestSupportedCount",
    "selectSimulationDt",
    "validateParticles",
  ]) {
    assert.ok(math.includes(symbol), `Project 38 math source is missing ${symbol}`);
  }
  for (const symbol of [
    "PFNGLDISPATCHCOMPUTEPROC",
    "PFNGLDRAWARRAYSPROC",
    "PFNGLGETQUERYOBJECTIVPROC",
    "SDL_GL_GetProcAddress",
  ]) {
    assert.ok(glApi.includes(symbol), `Project 38 GL loader is missing ${symbol}`);
  }
  for (const symbol of [
    "GL_SHADER_STORAGE_BARRIER_BIT",
    "GL_BUFFER_UPDATE_BARRIER_BIT",
    "GL_QUERY_RESULT_AVAILABLE",
    "runProbeValidation",
    "TimerQueryRing",
  ]) {
    assert.ok(engine.includes(symbol), `Project 38 engine is missing ${symbol}`);
  }
  assert.match(computeShader, /layout\(local_size_x = 256\)/);
  assert.match(computeShader, /index >= uint\(uParticleCount\)/);
  assert.match(vertexShader, /particles\[index\]/);
  assert.match(vertexShader, /gl_VertexID/);
  assert.match(main, /5'000'000U/);
  assert.match(main, /SDLK_V/);
  assert.match(main, /engine\.destroy\(gl\)/);
  assert.match(tests, /bounds guard rejects 192 tail invocations/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Canvas 2D không phải phép đo GPU/);
  assert.match(canvas, /Gravity:/);
  assert.match(canvas, /Bỏ qua respawn/);
});
