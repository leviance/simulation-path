import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 15 traces one vertex through seven content-driven checkpoints", async () => {
  const contentDirectory = path.join(workspace, "content", "3d-pipeline-inspector");
  const sourceDirectory = path.join(workspace, "examples", "project-15-3d-pipeline-inspector");
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "15");
  assert.equal(project.checkpointCount, 7);

  const local = await readFile(path.join(contentDirectory, "01-dung-may-soi-vertex.mdx"), "utf8");
  assert.match(local, /Local.*World.*Camera.*Clip.*NDC.*Screen/s);
  assert.match(local, /previewLocalVertex/);

  const homogeneous = await readFile(path.join(contentDirectory, "02-vec4-va-mat4.mdx"), "utf8");
  assert.match(homogeneous, /toPoint/);
  assert.match(homogeneous, /toDirection/);
  assert.match(homogeneous, /row-major/);
  assert.match(homogeneous, /column vector/);

  const model = await readFile(
    path.join(contentDirectory, "03-model-matrix-local-to-world.mdx"),
    "utf8",
  );
  assert.match(model, /modelMatrix/);
  assert.match(model, /Translation × Rotation × Scale/);

  const view = await readFile(
    path.join(contentDirectory, "04-view-matrix-world-to-camera.mdx"),
    "utf8",
  );
  assert.match(view, /viewMatrix/);
  assert.match(view, /worldToCameraDirect/);

  const projection = await readFile(
    path.join(contentDirectory, "05-projection-matrix-va-clip-space.mdx"),
    "utf8",
  );
  assert.match(projection, /projectionMatrix/);
  assert.match(projection, /clip\.w=camera\.z/);

  const viewport = await readFile(
    path.join(contentDirectory, "06-perspective-divide-ndc-va-viewport.mdx"),
    "utf8",
  );
  assert.match(viewport, /perspectiveDivide/);
  assert.match(viewport, /BeforeNearPlane/);
  assert.match(viewport, /BeyondFarPlane/);

  const finalLesson = await readFile(
    path.join(contentDirectory, "07-ghep-mvp-va-validation.mdx"),
    "utf8",
  );
  assert.match(finalLesson, /mvpMatrix/);
  assert.match(finalLesson, /pipelineAgreementError/);
  assert.match(finalLesson, /Project 15 đã hoàn chỉnh/i);

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
    path.join(workspace, "components", "labs", "pipeline3d-lab.tsx"),
    "utf8",
  );

  assert.match(header, /struct Mat4/);
  assert.match(header, /tracePipeline/);
  assert.match(header, /mvpMatrix/);
  assert.match(main, /drawPipelineRail/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /projection stores camera depth in clip w/);
  assert.match(tests, /separate Model View Projection matches composed MVP/);
  assert.match(lab, /setPointerCapture\(event\.pointerId\)/);
  assert.match(lab, /prefers-reduced-motion|useReducedMotion/);
});
