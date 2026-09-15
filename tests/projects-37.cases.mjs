import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 37 publishes a nine-checkpoint million-vector GPU calculator", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "37");
  assert.equal(project.slug, "million-vector-gpu");
  assert.equal(project.sourceDirectory, "project-37-million-vector-gpu");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.demoId, "million-vector-gpu");
});

test("Project 37 teaches one traceable CPU-to-GPU compute contract", async () => {
  const content = path.join(workspace, "content", "million-vector-gpu");
  const source = path.join(workspace, "examples", "project-37-million-vector-gpu");
  const lessonFiles = [
    "01-khoa-workload-va-cpu-oracle.mdx",
    "02-yeu-cau-opengl-43-va-doc-compute-limits.mdx",
    "03-dong-goi-vec4-vao-ssbo-std430.mdx",
    "04-compute-shader-dau-tien-mot-workgroup.mdx",
    "05-dispatch-hon-mot-trieu-vector.mdx",
    "06-memory-barrier-va-readback.mdx",
    "07-doi-chieu-cpu-gpu.mdx",
    "08-do-thoi-gian-gpu-dung-cach.mdx",
    "09-hoan-thien-may-tinh-vector-gpu.mdx",
  ];
  const lessons = await Promise.all(
    lessonFiles.map((file) => readFile(path.join(content, file), "utf8")),
  );
  const lessonContracts = [
    [/CPU oracle/i, /Vec4/i, /deterministic/i, /element-wise/i],
    [/OpenGL 4\.3/i, /maximumInvocations/i, /SSBO/i, /capability/i],
    [/std430/i, /binding = 0/i, /binding = 1/i, /binding = 2/i, /sentinel/i],
    [/GL_COMPUTE_SHADER/i, /gl_GlobalInvocationID/i, /glDispatchCompute\(1, 1, 1\)/i],
    [/ceilDiv/i, /1\.000\.003/i, /3\.907/i, /189/i, /bounds guard/i],
    [/GL_BUFFER_UPDATE_BARRIER_BIT/i, /glGetBufferSubData/i, /readback/i],
    [/allFinite/i, /maximumAbsoluteError/i, /firstMismatch/i, /mixed/i],
    [/GL_TIME_ELAPSED/i, /warm-up/i, /chín/i, /median/i],
    [/Add/i, /AXPY/i, /Difference/i, /Mã hoàn chỉnh/i, /Project 38/i],
  ];
  for (const [index, patterns] of lessonContracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 37 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const math = await readFile(
    path.join(source, "source-template", "include", "vector_compute_math.hpp"),
    "utf8",
  );
  const glApi = await readFile(
    path.join(source, "source-template", "include", "gl_api.hpp"),
    "utf8",
  );
  const engine = await readFile(
    path.join(source, "source-template", "include", "vector_compute_engine.hpp"),
    "utf8",
  );
  const shader = await readFile(
    path.join(source, "source-template", "shaders", "vector_ops.comp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "million-vector-gpu-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "alignas(16)",
    "makeVectorInputs",
    "computeCpu",
    "makeDispatchPlan",
    "validateCapabilities",
    "validateOutput",
    "medianMilliseconds",
  ]) {
    assert.ok(math.includes(symbol), `Project 37 math source is missing ${symbol}`);
  }
  for (const symbol of [
    "PFNGLDISPATCHCOMPUTEPROC",
    "PFNGLMEMORYBARRIERPROC",
    "PFNGLGETQUERYOBJECTUI64VPROC",
    "SDL_GL_GetProcAddress",
  ]) {
    assert.ok(glApi.includes(symbol), `Project 37 GL loader is missing ${symbol}`);
  }
  for (const symbol of [
    "GL_BUFFER_UPDATE_BARRIER_BIT",
    "glGetBufferSubData",
    "BeginQuery",
    "GL_TIME_ELAPSED",
  ]) {
    assert.ok(engine.includes(symbol), `Project 37 engine is missing ${symbol}`);
  }
  assert.match(shader, /layout\(local_size_x = 256\)/);
  assert.match(shader, /layout\(std430, binding = 2\)/);
  assert.match(shader, /index >= uint\(uElementCount\)/);
  assert.match(main, /1'000'003U/);
  assert.match(main, /SDLK_B/);
  assert.match(main, /engine\.destroy\(gl\)/);
  assert.match(tests, /bounds guard rejects 189 tail invocations/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /không phải phép đo GPU của trình duyệt/);
  assert.match(canvas, /Hiện upload trong timeline/);
  assert.match(canvas, /Hiện readback trong timeline/);
});
