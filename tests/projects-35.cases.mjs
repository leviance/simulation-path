import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 35 publishes an eight-checkpoint shader hot-reload lab", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "35");
  assert.equal(project.slug, "shader-hot-reload-lab");
  assert.equal(project.sourceDirectory, "project-35-shader-hot-reload-lab");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "shader-hot-reload");
});

test("Project 35 teaches a safe file-to-program reload transaction", async () => {
  const content = path.join(workspace, "content", "shader-hot-reload-lab");
  const source = path.join(workspace, "examples", "project-35-shader-hot-reload-lab");
  const lessons = await Promise.all(
    [
      "01-dua-glsl-ra-file-rieng.mdx",
      "02-compile-shader-va-doc-info-log.mdx",
      "03-link-candidate-va-khoa-interface.mdx",
      "04-reload-theo-giao-dich-giu-last-good.mdx",
      "05-theo-doi-file-va-debounce.mdx",
      "06-truyen-time-resolution-va-mouse.mdx",
      "07-viet-fragment-shader-procedural.mdx",
      "08-hoan-thien-shader-hot-reload-lab.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  const lessonContracts = [
    [/embedded shader/i, /ShaderSources/i, /COURSE_SHADER_DIRECTORY/i, /readTextFile/i],
    [/GL_COMPILE_STATUS/i, /glGetShaderInfoLog/i, /stage/i, /line number/i],
    [/candidate program/i, /GL_LINK_STATUS/i, /program info log/i, /uMvp/i],
    [/last-good/i, /generation/i, /attempts/i, /commit/i],
    [/last_write_time/i, /debounce/i, /140 ms/i, /retry storm/i],
    [/uTime/i, /uResolution/i, /uMouse/i, /framebuffer pixels/i, /high-DPI/i],
    [/length\(p\)/i, /rings/i, /mouseGlow/i, /mix\(cold, hot/i],
    [/CTest/i, /Debug/i, /Release/i, /Project 36/i, /Mã hoàn chỉnh/i],
  ];
  for (const [index, patterns] of lessonContracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 35 lesson ${index + 1} is missing ${pattern}`);
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
  const renderer = await readFile(
    path.join(source, "source-template", "include", "shader_renderer.hpp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const fragment = await readFile(
    path.join(source, "source-template", "shaders", "lab.frag"),
    "utf8",
  );
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const cmake = await readFile(path.join(source, "CMakeLists.txt"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "shader-hot-reload-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "ShaderSources",
    "readShaderFiles",
    "ReloadState",
    "recordReloadAttempt",
    "ShaderWatchState",
    "updateShaderWatch",
    "validateShaderLabContract",
  ]) {
    assert.ok(pipeline.includes(symbol), `Project 35 pipeline is missing ${symbol}`);
  }
  for (const symbol of [
    "PFNGLGETSHADERINFOLOGPROC",
    "PFNGLGETPROGRAMINFOLOGPROC",
    "PFNGLUNIFORM1FPROC",
    "PFNGLUNIFORM2FPROC",
  ]) {
    assert.ok(glApi.includes(symbol), `Project 35 OpenGL loader is missing ${symbol}`);
  }
  for (const symbol of [
    "ProgramCandidate",
    "buildProgramCandidate",
    "ShaderLabRenderer",
    "previousProgram",
    "reloadState",
  ]) {
    assert.ok(renderer.includes(symbol), `Project 35 renderer is missing ${symbol}`);
  }
  assert.match(main, /SDLK_F5/);
  assert.match(main, /SDL_GetWindowSizeInPixels/);
  assert.match(main, /reloadFromDisk/);
  assert.match(fragment, /length\(p\)/);
  assert.match(fragment, /uTime/);
  assert.match(fragment, /uMouse/);
  assert.match(tests, /failed reload preserves last-good fingerprint/);
  assert.match(tests, /stable files trigger one reload/);
  assert.match(cmake, /COURSE_SHADER_DIRECTORY/);
  assert.match(cmake, /source_directory}\/shaders/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Candidate fragment shader/);
});
