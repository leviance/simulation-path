import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt, codeTokens } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
const root = path.join(workspace, "examples/project-19-lambert-tetrahedron");
const slugs = [
  "01-dung-tetrahedron-tu-indexed-mesh",
  "02-face-normal-va-outward-winding",
  "03-thong-nhat-huong-den",
  "04-lambert-diffuse-tu-dot-product",
  "05-ambient-material-va-mau-pixel",
  "06-xoay-model-va-back-face-culling",
  "07-ghep-pipeline-va-kiem-chung",
];
test("Project 19 rebuild teaches seven progressive runnable checkpoints with exact source", async () => {
  const files = (await readdir(path.join(workspace, "content/lambert-tetrahedron")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    slugs.map((s) => s + ".mdx"),
  );
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  assert.equal(catalog.find((p) => p.id === "19").checkpointCount, 7);
  for (const [i, slug] of slugs.entries()) {
    const mdx = await readFile(
      path.join(workspace, "content/lambert-tetrahedron", slug + ".mdx"),
      "utf8",
    );
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const file = title.split(" — ")[0];
      const source = await readFile(
        file.startsWith("tests/")
          ? path.join(root, file)
          : path.join(root, "checkpoints", String(i + 1).padStart(2, "0"), file),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), slug + ": " + title);
      const stack = [],
        pairs = { "}": "{", ")": "(", "]": "[" };
      for (const token of codeTokens(snippet)) {
        if (["{", "(", "["].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token))
          assert.equal(stack.pop(), pairs[token], title + " unbalanced");
      }
      assert.equal(stack.length, 0, title + " incomplete");
      for (const line of snippet.split("\n"))
        assert.equal(line.match(/^ */)[0].length % 4, 0, title + " indentation");
      count++;
    }
    assert.ok(count >= 3, slug + " needs three source examples");
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
    assert.doesNotMatch(
      mdx,
      /TODO|Checkpoint đang xây|Tetrahedron lồi cho phép ta chưa cần Z-buffer/,
    );
  }
});
test("Project 19 native keeps CPU depth clipping and independent Lambert verification", async () => {
  const get = (p) => readFile(path.join(root, "final", p), "utf8");
  const geometry = await get("include/geometry.hpp"),
    lighting = await get("include/lighting.hpp");
  const raster = await get("include/raster.hpp"),
    renderSource = await get("include/render.hpp"),
    main = await get("src/main.cpp");
  assert.match(geometry, /array<Vec3, 8>/);
  assert.match(geometry, /array<Face, 12>/);
  assert.match(lighting, /std::clamp\(cosine, 0.0, 1.0\)/);
  assert.match(lighting, /orbitLight/);
  assert.match(lighting, /material.ambient \+ material.diffuseStrength \* sample.diffuse/);
  assert.match(raster, /previous.z >= nearPlane/);
  assert.match(renderSource, /inverseZ <= image.inverseDepth\[pixel\]/);
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /SDL_EVENT_WINDOW_FOCUS_LOST/);
  assert.match(main, /frames >= 8/);
  assert.doesNotMatch(
    geometry + lighting + raster + renderSource + main,
    /SDL_RenderGeometry|#include\s*[<"]glm|glDraw/,
  );
  const native = await readFile(path.join(root, "tests/tests.cpp"), "utf8");
  assert.match(native, /rayCube/);
  assert.match(native, /independent ray\/AABB oracle/);
  const oracle = native.slice(
    native.indexOf("std::optional<RayHit> rayCube"),
    native.indexOf("lab::Vec3 inverseModel"),
  );
  assert.doesNotMatch(oracle, /rasterizeTriangle|clipNear|lambertDiffuse|shadeMaterial/);
  const first = await readFile(path.join(root, "checkpoints/01/include/render.hpp"), "utf8");
  assert.match(first, /rasterizeTriangle/);
  assert.match(first, /image.inverseDepth/);
  assert.doesNotMatch(first, /faceUnitNormal|orbitLight/);
  const third = await readFile(path.join(root, "checkpoints/03/include/lighting.hpp"), "utf8");
  assert.match(third, /orbitLight/);
  assert.doesNotMatch(third, /double lambertDiffuse/);
  const fifth = await readFile(path.join(root, "checkpoints/05/include/scene.hpp"), "utf8");
  assert.doesNotMatch(fifth, /scene.camera.yaw \+= dx/);
});
test("Project 19 website serves every lesson with final source and source-only ZIP", async () => {
  const overview = await render("/projects/lambert-tetrahedron");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /cube|Cube/);
  for (const slug of slugs) {
    const response = await render("/projects/lambert-tetrahedron/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    assert.match(html, /lambert/);
  }
  const html = await (await render("/projects/lambert-tetrahedron/" + slugs.at(-1))).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "geometry.hpp",
    "lighting.hpp",
    "scene.hpp",
    "raster.hpp",
    "render.hpp",
    "view.hpp",
    "framebuffer.hpp",
    "presentation.hpp",
    "controls.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
    "CMakeLists.txt",
  ])
    assert.ok(html.includes(file), file);
  const manifest = JSON.parse(
    await readFile(path.join(workspace, "public/downloads/manifest.json"), "utf8"),
  );
  assert.ok(JSON.stringify(manifest).includes("project-19-lambert-tetrahedron"));
});
