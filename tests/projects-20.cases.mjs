import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt, codeTokens } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
const root = path.join(workspace, "examples/project-20-perspective-checkerboard");
const content = path.join(workspace, "content/perspective-checkerboard");
test("Project 20 eight rebuilt lessons compile real MDX and contain exact, complete source excerpts", async () => {
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 8);
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(content, file), "utf8");
    let blocks = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        relative.startsWith("tests/")
          ? path.join(root, relative)
          : path.join(root, "checkpoints", String(i + 1).padStart(2, "0"), relative),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(snippet)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      for (const line of snippet.split("\n"))
        assert.equal(line.match(/^ */)[0].length % 4, 0, title);
      blocks++;
    }
    assert.ok(blocks >= 3, file);
    const output = String(await compile(mdx, courseMdxOptions));
    assert.match(output, /one-dark-pro/);
    assert.doesNotMatch(output, /_missingMdxReference\("InteractiveLab"/);
    assert.doesNotMatch(mdx, /referenceUvFromCameraDepths|Checkpoint đang xây|TODO/);
  }
});
test("Project 20 source is progressive and keeps rigid rotation, independent oracle and bounded runtime", async () => {
  const get = (step, file) => readFile(path.join(root, step, "include", file), "utf8");
  assert.doesNotMatch(await get("starter", "geometry.hpp"), /struct TexturedVertex/);
  assert.doesNotMatch(await get("checkpoints/01", "sampler.hpp"), /makeCheckerTexture/);
  assert.doesNotMatch(await get("checkpoints/04", "geometry.hpp"), /double oneOverZ/);
  assert.doesNotMatch(await get("checkpoints/05", "interpolation.hpp"), /interpolatePerspectiveUv/);
  assert.doesNotMatch(await get("checkpoints/06", "clip.hpp"), /intersectNearPlane/);
  const reference = await get("final", "reference.hpp");
  assert.match(reference, /referenceUvFromRay/);
  assert.doesNotMatch(reference, /Barycentric|interpolatePerspectiveUv|oneOverZ/);
  const geometry = await get("final", "geometry.hpp");
  assert.match(geometry, /rotateY\(rotateX\(vertex.position, pitch\), yaw\)/);
  const main = await readFile(path.join(root, "final/src/main.cpp"), "utf8");
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /frames >= 8/);
  assert.match(main, /SDL_Delay\(16\)/);
  assert.doesNotMatch(main, /SDL_RenderGeometry|glm::|glDraw/);
});
test("Project 20 overview and all eight routes expose full runnable final source and ZIP", async () => {
  const overview = await render("/projects/perspective-checkerboard");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/perspective-checkerboard/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    // Copy buttons are attached after hydration; their live clipboard behavior is
    // checked in the browser, not inferred from server-only HTML.
    assert.ok(/code-copy-enhancer/.test(html), file + " loads the copy enhancer");
    assert.match(html, /one-dark-pro/);
    assert.match(
      html,
      /class="lab-readout"/,
      file + " must retain textual Canvas state before hydration",
    );
    if (file === files.at(-1)) {
      for (const file of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + file), file);
      assert.match(html, /tests\/tests.cpp/);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-20-perspective-checkerboard.zip/);
    }
  }
});
