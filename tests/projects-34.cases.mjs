import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 34 publishes a nine-checkpoint dual-renderer cube", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "34");
  assert.equal(project.slug, "dual-renderer-cube");
  assert.equal(project.sourceDirectory, "project-34-dual-renderer-cube");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.demoId, "dual-renderer-cube");
});

test("Project 34 keeps the shared cube contract traceable across CPU and GPU", async () => {
  const content = path.join(workspace, "content", "dual-renderer-cube");
  const source = path.join(workspace, "examples", "project-34-dual-renderer-cube");
  const lessons = await Promise.all(
    [
      "01-khoa-mot-cube-scene-dung-chung.mdx",
      "02-xay-indexed-cube-mesh.mdx",
      "03-ket-noi-cpu-renderer-voi-scene.mdx",
      "04-ve-cube-gpu-bang-element-buffer.mdx",
      "05-dong-bo-model-view-projection.mdx",
      "06-doi-chieu-depth-buffer-va-depth-test.mdx",
      "07-dong-bo-winding-va-face-culling.mdx",
      "08-chuyen-renderer-bang-f1-f2.mdx",
      "09-hoan-thien-dual-renderer-cube.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  const lessonContracts = [
    [/RendererKind/i, /CubeScene/i, /F1\/F2/i, /handle.*backend|backend.*handle/i],
    [/24 vertices/i, /36 indices/i, /GpuCubeVertex/i, /CCW/i, /offsetof/i],
    [/CPU renderer/i, /Framebuffer/i, /Z-buffer/i, /texture presenter/i],
    [/VBO/i, /EBO/i, /VAO/i, /glDrawElements/i, /GL_UNSIGNED_INT/i],
    [/column-major/i, /uMvp/i, /GL_FALSE/i, /clip/i, /NDC/i],
    [/GL_DEPTH_TEST/i, /GL_LESS/i, /window depth/i, /triangle order/i],
    [/GL_CULL_FACE/i, /GL_CCW/i, /GL_BACK/i, /winding/i],
    [/F1/i, /F2/i, /cùng scene/i, /resize/i, /fixed step/i],
    [/CTest/i, /Debug/i, /Release/i, /Project 35/i, /Mã hoàn chỉnh/i],
  ];
  for (const [index, patterns] of lessonContracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 34 lesson ${index + 1} is missing ${pattern}`);
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
    path.join(workspace, "components", "labs", "dual-renderer-cube-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "RendererKind",
    "CubeScene",
    "GpuCubeVertex",
    "kCubeIndices",
    "rasterizeCpuCube",
    "traceVertex",
    "validateDualRendererCubeContract",
  ]) {
    assert.ok(pipeline.includes(symbol), `Project 34 pipeline source is missing ${symbol}`);
  }
  for (const symbol of [
    "PFNGLDRAWELEMENTSPROC",
    "PFNGLDEPTHFUNCPROC",
    "PFNGLCULLFACEPROC",
    "SDL_GL_GetProcAddress",
  ]) {
    assert.ok(glApi.includes(symbol), `Project 34 OpenGL loader is missing ${symbol}`);
  }
  for (const symbol of [
    "GpuCubeRenderer",
    "CpuTexturePresenter",
    "GL_ELEMENT_ARRAY_BUFFER",
    "DrawElements",
  ]) {
    assert.ok(gpu.includes(symbol), `Project 34 GPU source is missing ${symbol}`);
  }
  assert.match(main, /SDLK_F1/);
  assert.match(main, /SDLK_F2/);
  assert.match(main, /SDL_GetWindowSizeInPixels/);
  assert.match(main, /SDL_GL_SwapWindow/);
  assert.match(tests, /depth-enabled color output ignores triangle order/);
  assert.match(tests, /renderer switch preserves transform state/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Backend đang active/);
});
