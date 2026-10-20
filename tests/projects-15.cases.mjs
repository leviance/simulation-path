import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-15-3d-pipeline-inspector");
const lessons = [
  "01-dung-may-soi-vertex",
  "02-vec4-va-mat4",
  "03-model-matrix-local-to-world",
  "04-view-matrix-world-to-camera",
  "05-projection-matrix-va-clip-space",
  "06-perspective-divide-ndc-va-viewport",
  "07-ghep-mvp-va-validation",
];
test("Project 15 rebuild has seven teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/3d-pipeline-inspector")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/3d-pipeline-inspector", file), "utf8");
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

test("Project 15 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/3d-pipeline-inspector", slug + ".mdx"),
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

test("Project 15 rebuild implements a full native inspector with real 3D, six rows and lens controls", async () => {
  const get = (p) => readFile(path.join(root, p), "utf8");
  const lab = await get("final/include/lab.hpp"),
    scene = await get("final/include/scene.hpp"),
    view = await get("final/include/view.hpp"),
    presentation = await get("final/include/presentation.hpp"),
    main = await get("final/src/main.cpp"),
    tests = await get("tests/tests.cpp");
  for (const name of [
    "Mat4",
    "modelMatrix",
    "viewMatrix",
    "projectionMatrix",
    "perspectiveDivide",
    "tracePipeline",
    "mvpMatrix",
    "pipelineAgreementError",
  ])
    assert.ok(lab.includes(name), name);
  for (const name of ["LOCAL", "WORLD", "VIEW", "CLIP", "NDC", "SCREEN"])
    assert.ok(scene.includes('"' + name + '"'));
  assert.match(presentation, /index < inspection.rows.length|index < inspection.rows.size\(\)/);
  assert.match(presentation, /formatRow\(value, sizeof\(value\), inspection.rows\[index\]\)/);
  assert.doesNotMatch(main, /SDL_SetWindowTitle/);
  for (const [key, param] of [
    ["SDLK_EQUALS", "Near"],
    ["SDLK_9", "Far"],
    ["SDLK_LEFTBRACKET", "Fov"],
  ]) {
    const start = main.indexOf("key == " + key),
      end = main.indexOf("\n    }", start);
    assert.ok(main.slice(start, end).includes("Parameter::" + param), key);
  }
  assert.match(lab, /std::optional<Vec3> ndc/);
  assert.match(lab, /clip.w <= kDivideEpsilon/);
  assert.match(lab, /PipelineStatus::BeforeNearPlane/);
  assert.match(lab, /PipelineStatus::BeyondFarPlane/);
  assert.match(scene, /return \{1100.0, 560.0\}/);
  assert.match(scene, /return \{1100.0, 800.0\}/);
  assert.match(view, /clipViewDepth\(a, b, scene.lens\)/);
  assert.match(view, /clipScreen\(from, to, viewportFor\(scene\)\)/);
  assert.match(view, /drawContext\(image, scene\)/);
  assert.match(view, /for \(const auto& edge : kEdges\)/);
  assert.doesNotMatch(view + main, /SDL_Render(?:Line|Lines|Geometry)\(/);
  assert.match(main, /SDL_EVENT_WINDOW_FOCUS_LOST/);
  assert.match(main, /SDL_LOGICAL_PRESENTATION_LETTERBOX/);
  for (const [cp, fn] of [
    [2, "identityMatrix"],
    [3, "modelMatrix"],
    [4, "viewMatrix"],
    [5, "projectionMatrix"],
    [6, "tracePipeline"],
    [7, "mvpMatrix"],
  ]) {
    const previous = await get(
      "checkpoints/" + String(cp - 1).padStart(2, "0") + "/include/lab.hpp",
    );
    const current = await get("checkpoints/" + String(cp).padStart(2, "0") + "/include/lab.hpp");
    assert.doesNotMatch(previous, new RegExp("inline [^\\n]* " + fn + "\\("));
    assert.match(current, new RegExp("inline [^\\n]* " + fn + "\\("));
  }
  for (const text of [
    "hand world oracle",
    "hand NDC oracle",
    "hand screen oracle 1100x560",
    "direction ignores translation",
    "T S independent oracle",
    "near maps to zero and far maps to one",
    "clean mode retains 3D mesh",
    "all six rows expose real runtime values",
  ])
    assert.ok(tests.includes(text), text);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
  const first = await readFile(
    path.join(workspace, "content/3d-pipeline-inspector", lessons[0] + ".mdx"),
    "utf8",
  );
  assert.match(first, /inline Inspection inspectScene/);
  assert.match(first, /inline void drawScene/);
  const final = await readFile(
    path.join(workspace, "content/3d-pipeline-inspector", lessons[6] + ".mdx"),
    "utf8",
  );
  assert.match(final, /target_include_directories\(project_15_tests PRIVATE starter\/include\)/);
  assert.match(final, /550,210/);
});
test("Project 15 rebuild renders overview and seven lessons with all coordinates and complete source", async () => {
  const overview = await render("/projects/3d-pipeline-inspector");
  assert.equal(overview.status, 200);
  const overviewHtml = await overview.text();
  assert.match(overviewHtml, /thử tự làm|Thử thách/i);
  assert.match(overviewHtml, /near\/far/);
  for (const slug of lessons) {
    const response = await render("/projects/3d-pipeline-inspector/" + slug);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
  }
  const html = await (await render("/projects/3d-pipeline-inspector/" + lessons[6])).text();
  for (const label of [
    "LOCAL",
    "WORLD",
    "VIEW",
    "CLIP",
    "NDC",
    "SCREEN",
    "Near plane",
    "Far plane",
    "Pipeline preset",
    "Thao tác kéo",
    "Xoay mô hình",
    "Đổi góc nhìn",
    "MVP agreement error",
    "Ẩn debug",
  ])
    assert.ok(html.includes(label), label);
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
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  // Closed source panels load on demand; inspect the shipped lazy payload, not initial HTML.
  const chunkDirectory = path.join(workspace, "dist/client/_next/static/chunks");
  const chunks = (await readdir(chunkDirectory)).filter((file) => /^final-.*\.js$/.test(file));
  let hasCurrentFinal = false;
  for (const file of chunks) {
    const payload = await readFile(path.join(chunkDirectory, file), "utf8");
    if (
      payload.includes("Project 15 - 3D Pipeline Inspector") &&
      payload.includes("Khởi tạo SDL, window, renderer và texture")
    )
      hasCurrentFinal = true;
  }
  assert.ok(hasCurrentFinal, "Current final source must ship in the lazy client payload");
  assert.match(html, /project-15-3d-pipeline-inspector\.zip/);
  assert.match(html, /projects\/triangle-rasterizer/);
});
