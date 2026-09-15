import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 36 publishes a nine-checkpoint ray-marched room", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "36");
  assert.equal(project.slug, "ray-marched-shape-room");
  assert.equal(project.sourceDirectory, "project-36-ray-marched-shape-room");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.demoId, "ray-marched-shape-room");
});

test("Project 36 teaches one traceable pixel-to-room pipeline", async () => {
  const content = path.join(workspace, "content", "ray-marched-shape-room");
  const source = path.join(workspace, "examples", "project-36-ray-marched-shape-room");
  const lessons = await Promise.all(
    [
      "01-fullscreen-triangle-va-fragment-coordinates.mdx",
      "02-dung-camera-ray-tu-moi-pixel.mdx",
      "03-signed-distance-cua-sphere.mdx",
      "04-sphere-tracing-co-guard.mdx",
      "05-uoc-luong-normal-va-lambert.mdx",
      "06-sdf-box-va-torus.mdx",
      "07-ghep-scene-va-material-id.mdx",
      "08-soft-shadow-va-orbit-camera.mdx",
      "09-hoan-thien-can-phong-ray-march.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  const lessonContracts = [
    [/gl_VertexID/i, /glDrawArrays/i, /gl_FragCoord/i, /framebuffer pixel/i],
    [/forward/i, /right/i, /up/i, /aspect/i, /normalize/i],
    [/sdSphere/i, /âm/i, /zero/i, /dương/i, /SceneSample/i],
    [/sphere tracing/i, /maximumSteps/i, /maximumDistance/i, /hitEpsilon/i],
    [/central differences/i, /estimateNormal/i, /Lambert/i, /sampleScene/i],
    [/sdBox/i, /sdTorus/i, /halfSize/i, /majorRadius/i, /minorRadius/i],
    [/nearer/i, /materialId/i, /floor/i, /ceiling/i, /back wall/i],
    [/softShadow/i, /normal bias/i, /SDL_CaptureMouse/i, /reduced-motion/i],
    [/Beauty/i, /Steps/i, /Hit/i, /Normal/i, /CTest/i, /Mã hoàn chỉnh/i, /Project 37/i],
  ];
  for (const [index, patterns] of lessonContracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 36 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const math = await readFile(
    path.join(source, "source-template", "include", "raymarch_math.hpp"),
    "utf8",
  );
  const glApi = await readFile(
    path.join(source, "source-template", "include", "gl_api.hpp"),
    "utf8",
  );
  const renderer = await readFile(
    path.join(source, "source-template", "include", "raymarch_renderer.hpp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const vertex = await readFile(
    path.join(source, "source-template", "shaders", "raymarch.vert"),
    "utf8",
  );
  const fragment = await readFile(
    path.join(source, "source-template", "shaders", "raymarch.frag"),
    "utf8",
  );
  assert.match(fragment, /isnan\(value\) \|\| isinf\(value\)/);
  assert.match(fragment, /invalidPosition\(result\.position\)/);
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const cmake = await readFile(path.join(source, "CMakeLists.txt"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "ray-marched-shape-room-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "makeCameraRay",
    "sdSphere",
    "sdBox",
    "sdTorus",
    "marchRay",
    "estimateNormal",
    "softShadow",
    "validateRayMarchRoom",
  ]) {
    assert.ok(math.includes(symbol), `Project 36 math source is missing ${symbol}`);
  }
  for (const symbol of [
    "PFNGLDRAWARRAYSPROC",
    "PFNGLUNIFORM1IPROC",
    "PFNGLUNIFORM3FPROC",
    "SDL_GL_GetProcAddress",
  ]) {
    assert.ok(glApi.includes(symbol), `Project 36 OpenGL loader is missing ${symbol}`);
  }
  for (const symbol of [
    "ProgramCandidate",
    "buildProgramCandidate",
    "RayMarchRenderer",
    "previousProgram",
    "DrawArrays",
  ]) {
    assert.ok(renderer.includes(symbol), `Project 36 renderer is missing ${symbol}`);
  }
  assert.match(vertex, /gl_VertexID/);
  assert.match(fragment, /SceneSample/);
  assert.match(fragment, /uMaximumSteps/);
  assert.match(fragment, /softShadow/);
  assert.match(fragment, /uDebugView/);
  assert.match(main, /SDLK_F5/);
  assert.match(main, /SDL_CaptureMouse/);
  assert.match(main, /SDL_EVENT_WINDOW_FOCUS_LOST/);
  assert.match(main, /SDL_GetWindowSizeInPixels/);
  assert.match(tests, /miss path is bounded/);
  assert.match(tests, /named final validation passes/);
  assert.match(cmake, /COURSE_SHADER_DIRECTORY/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Kết quả kiểm tra/);
  assert.match(canvas, /Sphere SDF/);
  assert.match(canvas, /setIncludeSphere/);
});
