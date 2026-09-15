import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 13 grows a cube from indexed vertices instead of a fixed six-lesson template", async () => {
  const contentDirectory = path.join(workspace, "content", "wireframe-cube");
  const sourceDirectory = path.join(workspace, "examples", "project-13-wireframe-cube");
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "13");

  assert.equal(project.checkpointCount, 5);

  const vertices = await readFile(
    path.join(contentDirectory, "01-tam-dinh-va-quy-uoc-index.mdx"),
    "utf8",
  );
  assert.match(vertices, /using CubeVertices = std::array/);
  assert.match(vertices, /projectCube/);
  assert.match(vertices, /projectionCount/);

  const edges = await readFile(
    path.join(contentDirectory, "02-muoi-hai-canh-tu-edge-list.mdx"),
    "utf8",
  );
  assert.match(edges, /struct Edge/);
  assert.match(edges, /kCubeEdges/);
  assert.match(edges, /degree/i);
  assert.match(edges, /không gọi `projectPerspective` bên trong loop/i);

  const transform = await readFile(
    path.join(contentDirectory, "03-xoay-ca-khoi-lap-phuong.mdx"),
    "utf8",
  );
  assert.match(transform, /rotateCube/);
  assert.match(transform, /translateCube/);
  assert.match(transform, /topology không có tọa độ để xoay/i);

  const depth = await readFile(
    path.join(contentDirectory, "04-depth-order-va-depth-cue.mdx"),
    "utf8",
  );
  assert.match(depth, /averageDepth/);
  assert.match(depth, /sort giảm dần/i);
  assert.match(depth, /chưa phải Z-buffer/i);

  const finalLesson = await readFile(
    path.join(contentDirectory, "05-tuong-tac-va-validation.mdx"),
    "utf8",
  );
  assert.match(finalLesson, /hasValidCubeTopology/);
  assert.match(finalLesson, /projectionCount == 8/);
  assert.match(finalLesson, /Project 13 đã hoàn chỉnh/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const main = await readFile(
    path.join(sourceDirectory, "source-template", "src", "main.cpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const lab = await readFile(
    path.join(workspace, "components", "labs", "wireframe-cube-lab.tsx"),
    "utf8",
  );

  assert.match(header, /std::array<Edge, 12> kCubeEdges/);
  assert.match(header, /visibleEdgesBackToFront/);
  assert.match(header, /maximumCubeEdgeLengthError/);
  assert.match(main, /SDL_EVENT_WINDOW_FOCUS_LOST/);
  assert.match(main, /projected\.projectionCount/);
  assert.match(tests, /every cube vertex has degree three/);
  assert.match(tests, /visible edges are sorted from far to near/);
  assert.match(lab, /setPointerCapture\(event\.pointerId\)/);
  assert.match(lab, /projection\.projectionCount/);
});
