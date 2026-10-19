import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-06-vector-playground");

test("Project 06 rebuild provides eight contiguous, four-space checkpoint lessons", async () => {
  const directory = path.join(workspace, "content/vector-playground");
  const files = (await readdir(directory)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 8);
  let count = 0;
  for (const file of files) {
    const mdx = await readFile(path.join(directory, file), "utf8");
    let lessonSnippets = 0;
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
      const actual = source.split(/\r?\n/),
        lines = snippet.split(/\r?\n/);
      const start = actual.findIndex((_, index) =>
        lines.every((line, j) => actual[index + j]?.trim() === line.trim()),
      );
      assert.ok(start >= 0);
      const original = actual.slice(start, start + lines.length);
      const indent = Math.min(
        ...original.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length),
      );
      assert.equal(
        snippet,
        original.map((line) => line.slice(indent)).join("\n"),
        file + " indentation drift",
      );
      count++;
      lessonSnippets++;
    }
    assert.ok(lessonSnippets >= 3, file);
  }
  assert.ok(count >= 24);
});

test("Project 06 rebuild separates geometry, input, arithmetic, units and interpolation progressively", async () => {
  const read = (file) => readFile(path.join(root, file), "utf8");
  assert.doesNotMatch(await read("starter/include/scene.hpp"), /vectorA|vectorB/);
  assert.doesNotMatch(await read("checkpoints/01/include/lab.hpp"), /arrowHead|normalize/);
  assert.match(await read("checkpoints/02/include/lab.hpp"), /const double largest/);
  assert.doesNotMatch(
    await read("checkpoints/02/src/main.cpp"),
    /SDL_ConvertEventToRenderCoordinates/,
  );
  assert.match(await read("checkpoints/03/include/scene.hpp"), /grabOffset/);
  assert.doesNotMatch(await read("checkpoints/04/include/view.hpp"), /vectorDifference/);
  assert.match(await read("checkpoints/05/include/view.hpp"), /vectorDifference/);
  assert.match(await read("checkpoints/06/include/scene.hpp"), /ViewMode::Scalar/);
  assert.match(await read("checkpoints/07/include/view.hpp"), /drawCircle/);
  assert.doesNotMatch(await read("checkpoints/07/include/lab.hpp"), /inline Vec2 lerp/);
  const main = await read("final/src/main.cpp");
  for (const re of [
    /SDL_WINDOW_HIGH_PIXEL_DENSITY/,
    /SDL_LOGICAL_PRESENTATION_LETTERBOX/,
    /SDL_ConvertEventToRenderCoordinates/,
    /event\.motion\.which == owner/,
    /SDL_BUTTON_LMASK/,
    /lab::moveEndpoint\(scene, \{event\.button\.x/,
    /smokeFrames >= 12/,
  ])
    assert.match(main, re);
  assert.doesNotMatch(main, /SDL_Render(?:Line|Point|FillRect|Rect)\(/);
  assert.match(await read("tests/tests.cpp"), /denorm_min/);
  assert.match(await read("tests/tests.cpp"), /lerp endpoint remains visible at t=0\/1/);
});

test("Project 06 rebuild exports the entire runnable project and keeps required results in final Canvas", async () => {
  const references = [
    ["01-vec2-va-do-doi", "vector-2d", "Vector 2D"],
    ["02-magnitude-va-arrow-head", "magnitude", "Magnitude"],
    ["03-keo-endpoint", "pointer-capture", "Pointer capture"],
    ["04-cong-tru-vector", "vector-addition", "Vector addition"],
    ["05-hieu-vector", "vector-subtraction", "Vector subtraction"],
    ["06-scalar-va-distance", "distance", "Distance"],
    ["07-vector-don-vi", "normalization", "Normalization"],
    ["08-lerp-va-validation", "linear-interpolation", "Linear interpolation"],
  ];
  for (const [slug, anchor, label] of references) {
    const response = await render("/projects/vector-playground/" + slug);
    assert.equal(response.status, 200, slug);
    assert.match(
      await response.text(),
      new RegExp('href="/glossary#' + anchor + '"[^>]*>' + label + "</a>"),
      slug + " glossary reference",
    );
  }
  const html = await (await render("/projects/vector-playground/08-lerp-va-validation")).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/camera.hpp",
    "include/scene.hpp",
    "include/framebuffer.hpp",
    "include/view.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
    "CMakeLists.txt",
  ])
    assert.ok(html.includes(file), file);
  assert.match(html, /Chỉ cộng\/trừ/);
  assert.match(html, /A\+B/);
  assert.match(html, /A−B/);
  assert.match(html, /Lớp bổ sung/);
  const zero = await (await render("/projects/vector-playground/07-vector-don-vi")).text();
  assert.match(zero, /không phải vector đơn vị/);
});
