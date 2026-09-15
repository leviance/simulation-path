import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 21 publishes an eight-checkpoint OBJ mesh viewer", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "21");
  assert.equal(project.slug, "obj-mesh-viewer");
  assert.equal(project.sourceDirectory, "project-21-obj-mesh-viewer");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "obj-viewer");
});

test("Project 21 teaches OBJ ingestion as one traceable parser-to-pixel pipeline", async () => {
  const contentDirectory = path.join(workspace, "content", "obj-mesh-viewer");
  const sourceDirectory = path.join(workspace, "examples", "project-21-obj-mesh-viewer");

  const vertices = await readFile(
    path.join(contentDirectory, "01-doc-vertex-va-ve-point-cloud.mdx"),
    "utf8",
  );
  assert.match(vertices, /std::getline.*lineNumber.*istringstream/is);
  assert.match(vertices, /point cloud.*trước khi xử lý face/is);

  const faces = await readFile(
    path.join(contentDirectory, "02-doc-face-va-index-mot-based.mdx"),
    "utf8",
  );
  assert.match(faces, /index_\{vector\}=index_\{OBJ\}-1/);
  assert.match(faces, /resolveObjPositionIndex/);

  const tokens = await readFile(
    path.join(contentDirectory, "03-giai-ma-face-token-obj.mdx"),
    "utf8",
  );
  assert.match(tokens, /v\/vt\/vn.*negative index/is);
  assert.match(tokens, /static_cast<long long>\(positionCount\) \+ rawIndex/);

  const fan = await readFile(
    path.join(contentDirectory, "04-triangulate-polygon-bang-fan.mdx"),
    "utf8",
  );
  assert.match(fan, /N−2/);
  assert.match(fan, /appendTriangleFan/);

  const normalization = await readFile(
    path.join(contentDirectory, "05-center-va-scale-mesh.mdx"),
    "utf8",
  );
  assert.match(normalization, /uniform scale/i);
  assert.match(normalization, /targetExtent \/ maxExtent/);

  const shading = await readFile(
    path.join(contentDirectory, "06-face-normal-va-lambert.mdx"),
    "utf8",
  );
  assert.match(shading, /faceNormal.*isFrontFacing.*lambertIntensity/is);
  assert.match(shading, /triangle suy biến/i);

  const rendering = await readFile(
    path.join(contentDirectory, "07-clip-z-buffer-va-rasterize-mesh.mdx"),
    "utf8",
  );
  assert.match(rendering, /near clipping.*projection.*top-left.*Z-buffer/is);
  assert.match(rendering, /independent of OBJ face order/);

  const finalLesson = await readFile(
    path.join(contentDirectory, "08-load-file-controls-va-validation.mdx"),
    "utf8",
  );
  assert.match(finalLesson, /I\/O error.*Syntax\/data error.*Geometry error/is);
  assert.match(finalLesson, /Starter, tám checkpoint và final/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "obj-viewer-lab.tsx"),
    "utf8",
  );
  const asset = path.join(sourceDirectory, "assets", "low-poly-rocket.obj");
  assert.match(header, /ObjLoadResult parseObj/);
  assert.match(header, /resolveObjPositionIndex/);
  assert.match(header, /appendTriangleFan/);
  assert.match(header, /normalizeMesh/);
  assert.match(header, /clipTriangleToNearPlane/);
  assert.match(header, /renderObjMesh/);
  assert.match(tests, /negative one resolves to the newest position/);
  assert.match(tests, /Z-buffer color output is independent of OBJ face order/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.ok((await stat(asset)).size > 500, "OBJ asset must be a real non-empty mesh");
  assert.match(
    await readFile(path.join(sourceDirectory, "assets", "LICENSE.txt"), "utf8"),
    /CC0 1\.0/,
  );
});
