import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-11-perspective-point");
const lessons = [
  "01-diem-3d-va-marker-tren-framebuffer",
  "02-tu-world-space-sang-camera-space",
  "03-perspective-divide",
  "04-fov-aspect-ndc-va-pixel",
  "05-near-plane-va-view-frustum",
  "06-dieu-khien-va-chuyen-dong",
  "07-keo-diem-tai-depth-co-dinh",
  "08-hoan-thien-va-kiem-chung",
];
test("Project 11 rebuild has eight teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/perspective-point")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/perspective-point", file), "utf8");
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
    assert.match(mdx, /--target project_11_starter --parallel 2/);
    assert.match(mdx, /bản tham khảo sau bài này/);
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

test("Project 11 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/perspective-point", slug + ".mdx"),
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

test("Project 11 rebuild uses genuine depth geometry, safe projection, owned inverse and clean mode", async () => {
  const source = async (file) => readFile(path.join(root, file), "utf8");
  const math = await source("final/include/lab.hpp"),
    view = await source("final/include/view.hpp"),
    main = await source("final/src/main.cpp");
  for (const name of [
    "worldToCamera",
    "perspectiveDivide",
    "cameraToNdc",
    "ndcToScreen",
    "screenToCameraAtDepth",
    "validLens",
    "clipDepth",
  ])
    assert.ok(math.includes(name));
  assert.ok(math.indexOf("cameraPoint.z <= 0.0") < math.indexOf("const Vec2 ndc = cameraToNdc"));
  assert.match(math, /std::optional<Vec2> screen/);
  assert.match(view, /for \(double z : \{2.0, 4.0, 8.0, 12.0\}\)/);
  assert.match(view, /clipScreen\(from, to, viewport\)/);
  assert.match(main, /SDL_GetKeyboardState/);
  assert.match(main, /2.0 \* deltaTime \/ length/);
  for (const text of [
    "SDL_ConvertEventToRenderCoordinates",
    "event.motion.which == owner",
    "updateDrag({event.button.x, event.button.y})",
    "SDL_WINDOW_HIGH_PIXEL_DENSITY",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
  ])
    assert.ok(main.includes(text));
  const hud = await source("final/include/presentation.hpp");
  assert.match(hud, /if \(!scene.debug\)/);
  assert.ok(
    hud.indexOf("SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255)") <
      hud.indexOf("SDL_RenderClear(renderer)"),
  );
  assert.match(main, /SDL_EVENT_WINDOW_MINIMIZED/);
  assert.match(main, /SDL_EVENT_WINDOW_EXPOSED/);
  assert.match(main, /dragging = true;\s+scene.paused = true;\s+dirty = true;/);
  for (const key of [
    "J",
    "L",
    "I",
    "K",
    "U",
    "O",
    "EQUALS",
    "MINUS",
    "V",
    "LEFTBRACKET",
    "RIGHTBRACKET",
    "SEMICOLON",
    "APOSTROPHE",
  ])
    assert.match(
      main,
      new RegExp(`if \\(event.key.key == SDLK_${key}[^\\n]*\\) \\{\\s+scene.paused = true;`),
    );
  assert.doesNotMatch(await source("checkpoints/02/include/lab.hpp"), /perspectiveDivide/);
  assert.match(
    await source("checkpoints/03/include/lab.hpp"),
    /const Vec2 divided = perspectiveDivide/,
  );
  assert.doesNotMatch(await source("checkpoints/05/include/lab.hpp"), /flightPoint/);
  assert.doesNotMatch(await source("checkpoints/06/src/main.cpp"), /SDL_CaptureMouse/);
  assert.match(await source("checkpoints/07/src/main.cpp"), /SDL_CaptureMouse/);
  const tests = await source("tests/tests.cpp");
  assert.match(tests, /485.0/);
  assert.match(tests, /scene.debug = false/);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
});

test("Project 11 rebuild teaches declarations, call sites and testing the learner's own source", async () => {
  const lesson = async (i) =>
    readFile(path.join(workspace, "content/perspective-point", lessons[i - 1] + ".mdx"), "utf8");
  assert.match(await lesson(1), /không khai báo thêm một Vec3 hay Scene trùng tên/);
  assert.match(await lesson(2), /if \(event.key.key == SDLK_J\)/);
  for (const declaration of [
    "enum class ProjectionStatus",
    "struct ProjectionResult",
    "inline bool validLens",
    "inline bool isInsideNdc",
    "inline bool clipDepth",
    "inline const char* statusText",
    "inline bool presentFramebuffer",
  ])
    assert.ok((await lesson(3)).includes(declaration), declaration);
  assert.match(await lesson(4), /focalPixels \*= verticalFocalScale/);
  assert.match(await lesson(4), /SDLK_EQUALS/);
  assert.match(await lesson(5), /SDLK_APOSTROPHE/);
  assert.match(await lesson(6), /if \(!scene.paused\) \{\s+lab::advanceScene\(scene, deltaTime\)/);
  for (const declaration of [
    "bool dragging = false;",
    "SDL_MouseID owner{};",
    "lab::Vec2 grabOffset{};",
    "double dragDepth = 0.0;",
    "const auto cancelDrag",
  ])
    assert.ok((await lesson(7)).includes(declaration), declaration);
  assert.match(
    await lesson(8),
    /target_include_directories\(project_11_tests PRIVATE starter\/include\)/,
  );
  assert.match(await lesson(8), /point.screen && close\(point.screen->x, 485.0\)/);
});

test("Project 11 rebuild renders all eight routes and complete runnable source", async () => {
  const overview = await render("/projects/perspective-point");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Thử thách|thử tự làm/i);
  for (const slug of lessons) {
    const response = await render("/projects/perspective-point/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
    assert.ok(html.includes("project_11_starter"), slug + " must show the learner target");
    assert.ok(html.includes("bản tham khảo sau bài này"), slug + " must distinguish the reference");
  }
  const html = await (await render("/projects/perspective-point/" + lessons.at(-1))).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/scene.hpp",
    "include/view.hpp",
    "include/framebuffer.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  for (const label of [
    "world point",
    "camera point",
    "NDC",
    "pixel",
    "trạng thái",
    "round-trip error",
    "Ẩn debug",
  ])
    assert.ok(html.includes(label), label);
  assert.match(html, /projects\/rotating-triangle/);
  assert.match(html, /project-11-perspective-point\.zip/);
  assert.match(
    html.replace(/<[^>]*>/g, ""),
    /target_include_directories\(project_11_tests PRIVATE starter\/include\)/,
  );
});
