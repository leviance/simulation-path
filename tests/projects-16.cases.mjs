import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-16-triangle-rasterizer");
const lessons = [
  "01-dung-khung-tam-giac-screen-space",
  "02-khoanh-vung-bounding-box",
  "03-edge-function-va-winding",
  "04-pixel-center-va-coverage",
  "05-vong-lap-raster",
  "06-top-left-rule",
  "07-barycentric-va-validation",
  "08-tu-rasterizer-den-be-mat-3d",
];
test("Project 16 rebuild has eight teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/triangle-rasterizer")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/triangle-rasterizer", file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        relative.startsWith("tests/")
          ? path.join(root, relative)
          : path.join(root, "checkpoints", String(i + 1).padStart(2, "0"), relative),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      // Một excerpt khớp source vẫn có thể bị cắt giữa khai báo struct/hàm.
      const stack = [];
      const pairs = { "}": "{", ")": "(", "]": "[" };
      for (const token of codeTokens(snippet)) {
        if (["{", "(", "["].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token))
          assert.equal(stack.pop(), pairs[token], file + ": incomplete block " + title);
      }
      assert.equal(stack.length, 0, file + ": unfinished block " + title);
      const actual = source.split(/\r?\n/),
        lines = snippet.split(/\r?\n/);
      const start = actual.findIndex((_, offset) =>
        lines.every((line, j) => actual[offset + j]?.trim() === line.trim()),
      );
      assert.ok(start >= 0, title);
      const original = actual.slice(start, start + lines.length),
        indent = Math.min(...original.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      assert.equal(
        snippet,
        original.map((l) => l.slice(indent)).join("\n"),
        file + " indent drift",
      );
      count++;
    }
    assert.ok(count >= 3, file + " needs substantial source");
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file + " needs explained steps");
    const experiment = mdx
      .split("## Thử làm sai để hiểu đúng")[1]
      .split("## Tự kiểm tra kết quả")[0];
    assert.ok(
      (experiment.match(/^\d+\. /gm) ?? []).length >= 2,
      file + " needs observable experiments",
    );
    assert.doesNotMatch(mdx, /Checkpoint đang xây|TODO|lorem ipsum/);
    for (const role of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(mdx.includes("## " + role));
  }
});

test("Project 16 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/triangle-rasterizer", slug + ".mdx"),
      "utf8",
    );
    const compiled = String(await compile(source, courseMdxOptions));
    assert.match(
      source,
      /^import \{ InteractiveLab \} from "@\/components\/labs\/interactive-lab";/m,
    );
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
    assert.match(compiled, /one-dark-pro/);
    assert.match(compiled, /InteractiveLab/);
    assert.match(compiled, /ma-chay-duoc-sau-bai|tự-kiểm-tra-kết-quả/);
  }
});

test("Project 16 rebuild delivers a real native 3D product and preserves a teachable 2D rasterizer", async () => {
  const get = (f) => readFile(path.join(root, f), "utf8");
  const math = await get("final/include/lab.hpp"),
    view = await get("final/include/view.hpp");
  const scene = await get("final/include/scene.hpp"),
    space = await get("final/include/space.hpp");
  const main = await get("final/src/main.cpp"),
    controls = await get("final/include/controls.hpp");
  assert.match(scene, /bool worldMode = true/);
  for (const fn of [
    "orient2D",
    "sampleTriangle",
    "isTopLeftEdge",
    "interpolateColor",
    "rasterizeTriangle",
  ])
    assert.ok(math.includes(fn));
  assert.match(math, /std::swap\(sample.barycentric.b, sample.barycentric.c\)/);
  assert.match(space, /focal \* view.x \/ view.z/);
  assert.match(space, /view.z < 0.5/);
  assert.match(view, /drawWorldGrid\(image, scene\)/);
  assert.match(view, /color = packColor\(interpolateColor/);
  assert.match(view, /scene.candidateLimit - result.primary.testedCount/);
  assert.ok(view.indexOf("drawWorldGrid(image, scene)") < view.indexOf("if (scene.debug)"));
  for (const token of [
    "SDL_ConvertEventToRenderCoordinates",
    "event.motion.which == owner",
    "SDL_WINDOW_HIGH_PIXEL_DENSITY",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
    "SDL_CaptureMouse(true)",
    "SDL_UpdateTexture",
  ])
    assert.ok(main.includes(token), token);
  for (const key of [
    "SDLK_B",
    "SDLK_F",
    "SDLK_PAGEUP",
    "SDLK_J",
    "SDLK_U",
    "SDLK_EQUALS",
    "SDLK_PLUS",
  ])
    assert.ok(controls.includes(key));
  for (const text of [math, view, main, space])
    assert.doesNotMatch(text, /SDL_RenderGeometry|glDrawArrays|glm::/);
  const tests = await get("tests/tests.cpp");
  for (const text of [
    "reversed input keeps B weight",
    "full quad coverage has no crack",
    "3D independent projection oracle",
    "clean final retains actual 3D filled triangle",
    "both triangles obey one step budget",
    "3D drag preserves grab offset",
  ])
    assert.ok(tests.includes(text), text);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
  for (const [cp, name] of [
    [2, "triangleBounds"],
    [3, "orient2D"],
    [4, "sampleTriangle"],
    [5, "rasterizeTriangle"],
    [6, "isTopLeftEdge"],
    [7, "interpolateColor"],
  ]) {
    const before = await get("checkpoints/" + String(cp - 1).padStart(2, "0") + "/include/lab.hpp");
    const current = await get("checkpoints/" + String(cp).padStart(2, "0") + "/include/lab.hpp");
    assert.doesNotMatch(before, new RegExp("(?:inline [^\\n]*|RasterStats) " + name + "\\("));
    assert.ok(current.includes(name + "("));
  }
});
test("Project 16 rebuild teaches learner-owned code and finishes with a 3D scene", async () => {
  for (const [i, slug] of lessons.entries()) {
    const text = await readFile(
      path.join(workspace, "content/triangle-rasterizer", slug + ".mdx"),
      "utf8",
    );
    assert.match(text, /--target project_16_starter --parallel 2/);
    assert.match(text, /bản tham khảo sau bài/);
    if (i === 7) {
      assert.match(text, /target_include_directories\(project_16_tests PRIVATE starter\/include\)/);
      assert.match(text, /projectTriangle/);
      assert.match(text, /World|world/);
      assert.match(text, /Project 16 đã hoàn chỉnh/);
    }
  }
});
test("Project 16 rebuild renders overview, eight lessons and complete native sources", async () => {
  const overview = await render("/projects/triangle-rasterizer");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Thử thách|thử tự làm/i);
  for (const slug of lessons) {
    const response = await render("/projects/triangle-rasterizer/" + slug);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.ok(html.includes("project_16_starter"));
  }
  const html = await (await render("/projects/triangle-rasterizer/" + lessons.at(-1))).text();
  for (const file of [
    "include/lab.hpp",
    "include/space.hpp",
    "include/scene.hpp",
    "include/framebuffer.hpp",
    "include/view.hpp",
    "include/controls.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  for (const label of [
    "Camera Z",
    "World Z",
    "Vertex 3D",
    "Ẩn debug",
    "raster status",
    "Toàn bộ mã nguồn của dự án",
  ])
    assert.ok(html.includes(label), label);
  assert.match(html, /project-16-triangle-rasterizer\.zip/);
  assert.match(html, /projects\/solid-cube-z-buffer/);
});
