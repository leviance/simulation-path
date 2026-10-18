import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-05-coordinate-map");

test("Project 05 rebuild has seven progressive lessons with exact checkpoint excerpts", async () => {
  const directory = path.join(workspace, "content/coordinate-map");
  const files = (await readdir(directory)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 7);
  let count = 0;
  for (const file of files) {
    const mdx = await readFile(path.join(directory, file), "utf8");
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        path.join(
          root,
          relative.startsWith("tests/")
            ? relative
            : "checkpoints/" + file.slice(0, 2) + "/" + relative,
        ),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      count++;
    }
  }
  assert.ok(count >= 7 * 3);
});

test("Project 05 rebuild starts visible and adds transforms, grid, zoom and multiple point editing separately", async () => {
  const read = (f) => readFile(path.join(root, f), "utf8");
  assert.doesNotMatch(await read("starter/include/scene.hpp"), /Camera2D|points/);
  assert.doesNotMatch(await read("checkpoints/01/include/lab.hpp"), /worldToScreen|screenToWorld/);
  assert.match(await read("checkpoints/01/include/view.hpp"), /const Vec2 markerScreen/);
  assert.doesNotMatch(await read("checkpoints/02/include/lab.hpp"), /screenToWorld/);
  assert.match(await read("checkpoints/03/src/main.cpp"), /SDL_ConvertEventToRenderCoordinates/);
  assert.match(await read("checkpoints/04/include/view.hpp"), /gridSpacing/);
  assert.doesNotMatch(await read("checkpoints/05/include/scene.hpp"), /hitPoint/);
  assert.match(await read("checkpoints/06/include/scene.hpp"), /grabOffset/);
  const main = await read("final/src/main.cpp");
  for (const expected of [
    /SDL_WINDOW_HIGH_PIXEL_DENSITY/,
    /event\.button\.which == owner/,
    /SDL_BUTTON_MASK\(ownerButton\)/,
    /SDL_MOUSEWHEEL_FLIPPED/,
    /event\.wheel\.mouse_x/,
    /smokeFrames >= 12/,
  ])
    assert.match(main, expected);
  assert.doesNotMatch(main, /SDL_Render(?:Line|Point|FillRect|Rect)\(/);
  assert.match(await read("final/include/presentation.hpp"), /SDL_LOGICAL_PRESENTATION_STRETCH/);
  assert.match(await read("tests/tests.cpp"), /pan zoom resize never mutate world points/);
});

test("Project 05 rebuild exports all runnable files and the final multiple-point Canvas", async () => {
  const response = await render("/projects/coordinate-map/07-round-trip-test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/scene.hpp",
    "include/view.hpp",
    "include/framebuffer.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
    "CMakeLists.txt",
  ])
    assert.ok(html.includes(file), file);
  const lesson = await (await render("/projects/coordinate-map/06-dat-va-keo-diem")).text();
  assert.match(lesson, /grabOffset/);
  assert.match(lesson, /Chọn điểm/);
  assert.match(lesson, /Xóa điểm/);
});
