import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 33 publishes a nine-checkpoint CPU versus GPU triangle", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "33");
  assert.equal(project.slug, "cpu-gpu-triangle");
  assert.equal(project.sourceDirectory, "project-33-cpu-gpu-triangle");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.demoId, "cpu-gpu-triangle");
});

test("Project 33 keeps every CPU and OpenGL stage traceable", async () => {
  const content = path.join(workspace, "content", "cpu-gpu-triangle");
  const source = path.join(workspace, "examples", "project-33-cpu-gpu-triangle");
  const lessons = await Promise.all(
    [
      "01-tao-opengl-context-tu-sdl3.mdx",
      "02-bien-dich-shader-dau-tien.mdx",
      "03-dua-triangle-vao-vbo-va-vao.mdx",
      "04-ve-cung-triangle-bang-cpu.mdx",
      "05-doi-chieu-transform-voi-vertex-shader.mdx",
      "06-ndc-viewport-va-hai-he-truc-y.mdx",
      "07-noi-suy-mau-trong-fragment-shader.mdx",
      "08-doc-lai-gpu-va-do-sai-khac.mdx",
      "09-hoan-thien-cpu-gpu-triangle.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  const lessonContracts = [
    [
      /OpenGL 3\.3 Core/i,
      /SDL_GL_CreateContext/i,
      /SDL_GL_GetProcAddress/i,
      /SDL_GetWindowSizeInPixels/i,
    ],
    [/compile/i, /link/i, /GL_COMPILE_STATUS/i, /info log/i],
    [/GpuVertex/i, /VBO/i, /VAO/i, /glDrawArrays/i, /offsetof/i],
    [/CPU rasterizer/i, /barycentric/i, /glTexSubImage2D/i, /texture/i],
    [/rotate/i, /scale/i, /translate/i, /uniform/i, /radians/i],
    [/top-left/i, /bottom-left/i, /round-trip/i, /high-DPI/i],
    [/barycentric weights/i, /fragment shader/i, /RGBA8/i, /solid/i, /smooth/i],
    [/glReadPixels/i, /centroid/i, /tolerance/i, /edge/i],
    [/CTest/i, /Debug/i, /Release/i, /Project 34/i, /Mã hoàn chỉnh/i],
  ];
  for (const [index, patterns] of lessonContracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 33 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const pipeline = await readFile(
    path.join(source, "source-template", "include", "pipeline.hpp"),
    "utf8",
  );
  const glApi = await readFile(
    path.join(source, "source-template", "include", "gl_api.hpp"),
    "utf8",
  );
  const gpu = await readFile(
    path.join(source, "source-template", "include", "gpu_renderer.hpp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "cpu-gpu-triangle-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "GpuVertex",
    "Transform2D",
    "rasterizeCpuTriangle",
    "ndcToCpuScreen",
    "ndcToGpuWindow",
    "sampleTriangleAtNdc",
    "validateCpuGpuTriangleContract",
  ]) {
    assert.ok(pipeline.includes(symbol), `Project 33 pipeline source is missing ${symbol}`);
  }
  for (const symbol of [
    "SDL_GL_GetProcAddress",
    "PFNGLCREATESHADERPROC",
    "PFNGLGENVERTEXARRAYSPROC",
  ]) {
    assert.ok(glApi.includes(symbol), `Project 33 OpenGL loader is missing ${symbol}`);
  }
  for (const symbol of [
    "compileShader",
    "createProgram",
    "GpuTriangleRenderer",
    "CpuTexturePresenter",
    "readGpuProbe",
  ]) {
    assert.ok(gpu.includes(symbol), `Project 33 GPU source is missing ${symbol}`);
  }
  assert.match(main, /SDL_WINDOW_OPENGL/);
  assert.match(main, /SDL_GetWindowSizeInPixels/);
  assert.match(main, /SDL_GL_SwapWindow/);
  assert.match(tests, /CPU top-left viewport round-trips NDC/);
  assert.match(tests, /RGBA8 error stays within half a color step/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /CPU ↔ RGBA8 GPU/);
});
