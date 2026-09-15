import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 19 keeps its catalog contract after Project 17 is published", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  assert.equal(
    catalog.some((project) => project.id === "17"),
    true,
  );
  const project = catalog.find((entry) => entry.id === "19");
  assert.equal(project.slug, "lambert-tetrahedron");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "lambert");
});

test("Project 19 teaches flat Lambert lighting as one traceable pipeline", async () => {
  const contentDirectory = path.join(workspace, "content", "lambert-tetrahedron");
  const sourceDirectory = path.join(workspace, "examples", "project-19-lambert-tetrahedron");

  const mesh = await readFile(
    path.join(contentDirectory, "01-dung-tetrahedron-tu-indexed-mesh.mdx"),
    "utf8",
  );
  assert.match(mesh, /bốn vertex.*bốn face.*index/is);
  assert.match(mesh, /makeTetrahedron/);

  const normal = await readFile(
    path.join(contentDirectory, "02-face-normal-va-outward-winding.mdx"),
    "utf8",
  );
  assert.match(normal, /cross\(edgeAB, edgeAC\)/);
  assert.match(normal, /hasOutwardWinding/);

  const light = await readFile(path.join(contentDirectory, "03-thong-nhat-huong-den.mdx"), "utf8");
  assert.match(light, /surfaceToLight luôn chỉ từ bề mặt về phía nguồn sáng/);

  const diffuse = await readFile(
    path.join(contentDirectory, "04-lambert-diffuse-tu-dot-product.mdx"),
    "utf8",
  );
  assert.match(diffuse, /max\(0,N.*L\)/s);
  assert.match(diffuse, /aligned, perpendicular và opposite/i);

  const material = await readFile(
    path.join(contentDirectory, "05-ambient-material-va-mau-pixel.mdx"),
    "utf8",
  );
  assert.match(material, /ambient\+diffuseStrength.*diffuse/s);
  assert.match(material, /shadeMaterial/);

  const culling = await readFile(
    path.join(contentDirectory, "06-xoay-model-va-back-face-culling.mdx"),
    "utf8",
  );
  assert.match(culling, /V=normalize\(-C\)/);
  assert.match(culling, /isFrontFacing/);

  const finalLesson = await readFile(
    path.join(contentDirectory, "07-ghep-pipeline-va-kiem-chung.mdx"),
    "utf8",
  );
  assert.match(finalLesson, /local.*camera.*lighting.*near.*rasterize/is);
  assert.match(finalLesson, /Project 19 đã hoàn chỉnh/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "lambert-lab.tsx"),
    "utf8",
  );
  assert.match(header, /double lambertDiffuse/);
  assert.match(header, /LightingSample shadeMaterial/);
  assert.match(header, /bool isFrontFacing/);
  assert.match(tests, /back-facing normal clamps negative diffuse to zero/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
});
