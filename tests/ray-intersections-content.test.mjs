import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt, markedCodeExcerpt } from "../scripts/code-snippets.mjs";

const root = path.resolve(import.meta.dirname, "..");
const project = path.join(root, "examples/project-52-ray-intersections");
const content = path.join(root, "content/ray-intersections");

test("P52 every teaching block is its exact marked checkpoint, including complete functions and caller wiring", async () => {
  const files = (await readdir(content)).filter((name) => /^\d{2}-.+\.mdx$/.test(name)).sort();
  assert.equal(files.length, 8);
  let count = 0;
  for (const file of files) {
    const mdx = await readFile(path.join(content, file), "utf8");
    const blocks = [...mdx.matchAll(/```cpp title=/g)];
    const marked = [
      ...mdx.matchAll(
        /\{\/\* snippet ([\w./-]+)#([a-z0-9-]+) \*\/\}\s*```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.equal(marked.length, blocks.length, file + " has an unmarked block");
    assert.ok(marked.length >= 2, file + " lacks implementation context");
    for (const [, relative, id, title, snippet] of marked) {
      assert.equal(title.split(" — ")[0], relative);
      const source = await readFile(
        path.join(
          project,
          relative.startsWith("tests/") ? "" : "checkpoints/" + file.slice(0, 2),
          relative,
        ),
        "utf8",
      );
      assert.equal(snippet, markedCodeExcerpt(source, id), file + "#" + id);
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + "#" + id);
      assert.doesNotMatch(snippet, /Đồng bộ từ source checkpoint/);
      count++;
    }
  }
  assert.ok(count >= 26);
});

test("P52 teaches supplied rasterizer, observer/emitter separation, translation and surface interval semantics", async () => {
  const read = (relative) => readFile(path.join(root, relative), "utf8");
  const first = await read("content/ray-intersections/01-canh-3d.mdx");
  assert.match(first, /Phần được cung cấp/);
  assert.match(first, /drawWorkshop/);
  const second = await read("content/ray-intersections/02-tao-tia-tu-chuot.mdx");
  for (const term of ["observer", "emitter", "280/190", "SDL_CaptureMouse", "aimRect"])
    assert.ok(second.includes(term), term);
  const fourth = await read("content/ray-intersections/04-giao-voi-sphere.mdx");
  assert.match(fourth, /SphereInterval/);
  assert.match(fourth, /entry.*âm/);
  const final = await read("content/ray-intersections/08-kiem-chung-va-hoan-thien.mdx");
  for (const term of ["--frames 2", "--parallel 1", "không phải oracle độc lập", "không thay"])
    assert.ok(final.includes(term), term);
  const guides = await read("course/projects/p52/learning.ts");
  const manifest = await read("course/projects/p52/manifest.ts");
  assert.doesNotMatch(
    guides + manifest,
    /Cửa sổ C\+\+ cố định camera|Phím V kiểm|bằng khung dây|ghi lên title/,
  );
});

test("P52 independent render scaffold never calls analytic intersections and finite smoke has a hard frame bound", async () => {
  const read = (file) => readFile(path.join(project, "final", file), "utf8");
  const drawing =
    (await read("include/raster.hpp")) +
    (await read("include/mesh-drawing.hpp")) +
    (await read("include/scene-drawing.hpp"));
  assert.doesNotMatch(
    drawing,
    /intersectPlane\(|intersectSphere\(|intersectBox\(|intersectTriangle\(/,
  );
  assert.match(drawing, /inverseDepth/);
  assert.match(drawing, /nearDepth/);
  const main = await read("src/main.cpp");
  assert.match(main, /frame >= options\.frames/);
  assert.ok(main.indexOf("SDL_RenderReadPixels") < main.indexOf("SDL_RenderPresent"));
  assert.match(await read("include/run-options.hpp"), /parsed <= 600/);
  const input = await read("include/input.hpp");
  assert.match(input, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(input, /state\.observer\.camera\(\)/);
  assert.match(input, /state\.selected = hit->objectId/);
  assert.match(input, /SDL_CaptureMouse\(true\)/);
  const panel = await read("include/panel.hpp");
  assert.match(panel, /sphereInterval/);
  assert.match(panel, /boxInterval/);
  assert.match(panel, /Surface|SURFACE/);
});
