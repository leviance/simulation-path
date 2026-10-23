import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-21-obj-mesh-viewer");
const content = path.join(workspace, "content/obj-mesh-viewer");

test("Project 21 rebuilt lessons compile MDX and teach exact, balanced source excerpts", async () => {
  const lessons = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(lessons.length, 8);
  for (const [index, file] of lessons.entries()) {
    const mdx = await readFile(path.join(content, file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        path.join(root, "checkpoints", String(index + 1).padStart(2, "0"), relative),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), `${file}: ${title}`);
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(snippet)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      for (const line of snippet.split("\n"))
        assert.equal(line.match(/^ */)[0].length % 4, 0, title);
      count++;
    }
    assert.ok(count >= 3, file);
    assert.doesNotMatch(mdx, /Checkpoint đang xây|TODO|fallback cube/i);
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
  }
});

test("Project 21 source stages converge on real multi-model viewer with camera and diagnostics", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((p) => p.id === "21");
  assert.equal(project.slug, "obj-mesh-viewer");
  assert.equal(project.checkpointCount, 8);
  const get = (step, file) => readFile(path.join(root, step, "include", file), "utf8");
  assert.doesNotMatch(await get("starter", "obj-parser.hpp"), /parseObj/);
  assert.doesNotMatch(await get("checkpoints/01", "obj-parser.hpp"), /resolveObjPositionIndex/);
  assert.doesNotMatch(await get("checkpoints/02", "obj-parser.hpp"), /token.find\('\/'\)/);
  assert.doesNotMatch(await get("checkpoints/03", "obj-parser.hpp"), /appendTriangleFan/);
  assert.doesNotMatch(await get("checkpoints/04", "normalize.hpp"), /normalizeMesh/);
  assert.doesNotMatch(await get("checkpoints/05", "shading.hpp"), /faceNormal/);
  assert.doesNotMatch(await get("checkpoints/06", "render.hpp"), /renderObjMesh/);
  const parser = await get("final", "obj-parser.hpp");
  assert.match(parser, /record chưa hỗ trợ/);
  assert.match(parser, /isConvexPlanarFace/);
  assert.match(parser, /128/);
  const main = await readFile(path.join(root, "final/src/main.cpp"), "utf8");
  for (const asset of ["cube.obj", "faceted-sphere.obj", "low-poly-rocket.obj"])
    assert.ok(main.includes(asset));
  assert.match(main, /SDL_EVENT_DROP_FILE/);
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /frames >= 8/);
  assert.match(main, /SDL_Delay\(16\)/);
  assert.doesNotMatch(main, /SDL_RenderGeometry|glm::|glDraw/);
  const reference = await readFile(path.join(root, "tests/reference.hpp"), "utf8");
  assert.match(reference, /rayHit/);
  assert.doesNotMatch(reference, /projectVertex\(|interpolateDepth\(|rasterizeTriangle\(/);
  const tests = await readFile(path.join(root, "tests/tests.cpp"), "utf8");
  assert.match(tests, /reference::depthMismatches/);
  assert.match(tests, /camera drag never changes the model/);
  assert.match(await readFile(path.join(root, "assets/LICENSE.txt"), "utf8"), /CC0 1\.0/);
});

test("Project 21 overview and all lesson routes expose full source, challenge and ZIP", async () => {
  const overview = await render("/projects/obj-mesh-viewer");
  assert.equal(overview.status, 200);
  const overviewHtml = await overview.text();
  assert.match(overviewHtml, /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  assert.match(overviewHtml, /2\.976/);
  const lessons = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  for (const file of lessons) {
    const response = await render("/projects/obj-mesh-viewer/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    assert.match(html, /code-copy-enhancer/);
    if (file === lessons.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + name), name);
      assert.match(html, /tests\/reference.hpp/);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-21-obj-mesh-viewer.zip/);
    }
  }
});
