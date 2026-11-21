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
    assert.match(mdx, /--target project_11_work --parallel 1/);
    assert.match(mdx, /-DCOURSE_WORKBOOK=ON/);
    assert.doesNotMatch(mdx, /\bstarter\/(?:include|src)\b/);
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

test("Project 11 publishes the star renderer only after the projection/visibility stages and handles actual SDL flight input", async () => {
  const source = async (file) => readFile(path.join(root, file), "utf8");
  const [math, view, field, state, main, hud] = await Promise.all(
    [
      "include/lab.hpp",
      "include/view.hpp",
      "include/starfield.hpp",
      "include/scene.hpp",
      "src/main.cpp",
      "include/presentation.hpp",
    ].map((file) => source("final/" + file)),
  );
  for (const name of [
    "worldToCamera",
    "perspectiveDivide",
    "cameraToNdc",
    "ndcToScreen",
    "screenToCameraAtDepth",
    "validLens",
    "clipDepth",
  ])
    assert.ok(math.includes(name), name);
  assert.ok(math.indexOf("cameraPoint.z <= 0.0") < math.indexOf("const Vec2 ndc = cameraToNdc"));
  assert.match(math, /std::optional<Vec2> screen/);
  assert.match(field, /starCatalog\(/);
  assert.match(field, /projectPerspective\(/);
  assert.match(view, /drawStarfield\(/);
  assert.match(view, /clipScreen\(from, to, viewport\)/);
  assert.match(state, /camera\.position\.z/);
  assert.match(main, /SDL_EVENT_KEY_UP/);
  for (const name of [
    "SDLK_W",
    "SDLK_S",
    "flightDirection",
    "advanceScene",
    "SDL_GetKeyboardState",
    "SDL_ConvertEventToRenderCoordinates",
    "event.motion.which == owner",
    "updateDrag({event.button.x, event.button.y})",
    "SDL_WINDOW_HIGH_PIXEL_DENSITY",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
    "SDL_EVENT_WINDOW_FOCUS_LOST",
    "SDL_EVENT_WINDOW_MINIMIZED",
    "SDL_EVENT_WINDOW_EXPOSED",
    "SDL_CaptureMouse(true)",
  ])
    assert.ok(main.includes(name), name);
  assert.match(main, /2\.0 \* deltaTime \/ length/);
  for (const key of [
    "J",
    "L",
    "EQUALS",
    "MINUS",
    "V",
    "LEFTBRACKET",
    "RIGHTBRACKET",
    "SEMICOLON",
    "APOSTROPHE",
  ])
    assert.ok(main.includes("SDLK_" + key), key);
  const drawing = main.slice(
    main.indexOf("dragging = true"),
    main.indexOf("if (!SDL_CaptureMouse(true))"),
  );
  assert.match(
    drawing,
    /(?:stopFlight\(scene\)|scene\.paused = true)/,
    "drag and cruise may not write the same frame",
  );
  assert.match(drawing, /dirty = true/, "the first grabbed sample must be visible even when idle");
  const clearColor = hud.indexOf("SDL_SetRenderDrawColor(renderer, 17, 24, 43, 255)");
  const clear = hud.indexOf("SDL_RenderClear(renderer)");
  assert.ok(
    clearColor >= 0 && clear > clearColor,
    "the letterbox must not pick up the previous HUD color",
  );
  assert.match(hud, /SDL_RenderClear\(renderer\)/);
  assert.match(hud, /scene\.debug/);
  assert.doesNotMatch(await source("checkpoints/02/include/lab.hpp"), /perspectiveDivide/);
  assert.match(
    await source("checkpoints/03/include/lab.hpp"),
    /const Vec2 divided = perspectiveDivide/,
  );
  assert.doesNotMatch(await source("checkpoints/03/include/lab.hpp"), /inline bool clipDepth/);
  assert.doesNotMatch(await source("checkpoints/04/include/view.hpp"), /drawStarfield/);
  assert.match(await source("checkpoints/05/include/view.hpp"), /drawStarfield/);
  assert.doesNotMatch(await source("checkpoints/05/include/scene.hpp"), /inline void advanceScene/);
  assert.match(await source("checkpoints/06/include/scene.hpp"), /inline void advanceScene/);
  assert.doesNotMatch(await source("checkpoints/06/src/main.cpp"), /SDL_CaptureMouse/);
  assert.match(await source("checkpoints/07/src/main.cpp"), /SDL_CaptureMouse/);
  const nativeTests = await source("tests/tests.cpp");
  assert.match(nativeTests, /485\.0/);
  assert.doesNotMatch(nativeTests, /\bassert\s*\(/, "checks must also run with NDEBUG");
});

test("Project 11 lessons connect real declarations, call sites and the learner's own final test", async () => {
  const lesson = async (i) =>
    readFile(path.join(workspace, "content/perspective-point", lessons[i - 1] + ".mdx"), "utf8");
  // Kiểm tra phía trên còn đối chiếu từng đoạn với đúng checkpoint, không chỉ tìm tên hàm.
  const contracts = [
    ["drawPointMarker", "SDL_UpdateTexture"],
    ["worldToCamera", "camera.position"],
    ["perspectiveDivide", "ProjectionResult", "projectPerspective"],
    ["verticalFocalScale", "cameraToNdc", "ndcToScreen"],
    ["starCatalog", "drawStarfield", "ProjectionStatus"],
    ["advanceScene", "deltaTime", "SDLK_W", "SDLK_S"],
    ["screenToCameraAtDepth", "SDL_CaptureMouse", "grabOffset"],
    ["ctest --test-dir build-work -C Debug", "project_11_tests", "measureDoubleDepth"],
  ];
  for (let i = 0; i < contracts.length; i++) {
    const text = await lesson(i + 1);
    for (const name of contracts[i]) assert.ok(text.includes(name), `Lesson ${i + 1}: ${name}`);
  }
  assert.doesNotMatch(await lesson(3), /inline bool clipDepth|inline void drawStarfield/);
  assert.match(await lesson(7), /tùy chọn/i);
});

test("Project 11 rebuild renders all eight routes and complete runnable source", async () => {
  const overview = await render("/projects/perspective-point");
  assert.equal(overview.status, 200);
  const overviewHtml = await overview.text();
  assert.match(overviewHtml, /Thử thách|thử tự làm/i);
  assert.match(overviewHtml, /field-notes\/perspective-point\/departure\.png/);
  assert.match(overviewHtml, /Bay xuyên trường sao/i);
  for (const slug of lessons) {
    const response = await render("/projects/perspective-point/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
    assert.ok(html.includes("project_11_work"), slug + " must show the learner target");
    assert.ok(html.includes("bản tham khảo sau bài này"), slug + " must distinguish the reference");
  }
  const html = await (await render("/projects/perspective-point/" + lessons.at(-1))).text();
  assert.match(html, /field-notes\/perspective-point\/departure\.png/);
  assert.match(html, /Kiểm hai độ sâu khi dừng bay/);
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/starfield.hpp",
    "include/scene.hpp",
    "include/view.hpp",
    "include/framebuffer.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  assert.match(html, /flight-status/);
  assert.match(html, /Hiện debug/);
  assert.match(html, /Camera\.Z/);
  const probe = await (await render("/projects/perspective-point/" + lessons[6])).text();
  for (const name of ["world point", "camera point", "NDC", "pixel", "trạng thái", "elapsed"])
    assert.ok(probe.includes(name), name);
  assert.match(html, /projects\/rotating-triangle/);
  assert.match(html, /project-11-perspective-point\.zip/);
  assert.match(html.replace(/<[^>]*>/g, ""), /ctest --test-dir build-work -C Debug/);
});
