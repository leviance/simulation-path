import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-17-solid-cube-z-buffer");
const lessons = [
  "01-dung-khoi-lap-phuong-dac",
  "02-loi-thu-tu-ve",
  "03-tao-va-clear-depth-buffer",
  "04-noi-suy-ndc-depth",
  "05-depth-test-va-depth-write",
  "06-rasterize-toan-bo-cube",
  "07-kiem-chung-doc-lap-draw-order",
  "08-back-face-culling",
  "09-camera-va-ban-hoan-chinh",
];
test("Project 17 rebuild has nine teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/solid-cube-z-buffer")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/solid-cube-z-buffer", file), "utf8");
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

test("Project 17 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/solid-cube-z-buffer", slug + ".mdx"),
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

test("Project 17 native source implements the complete v4 product with independent correctness oracles", async () => {
  const get = (p) => readFile(path.join(root, p), "utf8");
  const geometry = await get("final/include/geometry.hpp"),
    raster = await get("final/include/raster.hpp"),
    depth = await get("final/include/depth.hpp"),
    renderSource = await get("final/include/render.hpp"),
    view = await get("final/include/view.hpp"),
    main = await get("final/src/main.cpp"),
    controls = await get("final/include/controls.hpp"),
    tests = await get("tests/tests.cpp");
  assert.equal((geometry.match(/IndexedTriangle\{\{/g) ?? []).length, 12);
  for (const token of [
    "struct DepthBuffer",
    "depthTestAndWrite",
    "std::isfinite(newDepth)",
    "newDepth < result.storedDepth",
  ])
    assert.ok(depth.includes(token), token);
  assert.ok(
    renderSource.indexOf("if (cullEnabled && !isFrontFacing") <
      renderSource.indexOf("stats.coveredCount += rasterizeTriangle"),
  );
  for (const token of ["SDLK_C", "SDLK_D", "SDLK_F", "SDLK_J", "SDLK_I"])
    assert.ok(controls.includes(token), token);
  for (const token of [
    "event.motion.which == owner",
    "SDL_CaptureMouse(true)",
    "SDL_ConvertEventToRenderCoordinates",
    "SDL_WINDOW_HIGH_PIXEL_DENSITY",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
    "SDL_UpdateTexture",
  ])
    assert.ok(main.includes(token), token);
  assert.ok(view.indexOf("drawWorldGrid(targets.image, scene)") < view.indexOf("if (scene.debug"));
  for (const text of [geometry, raster, depth, renderSource, main])
    assert.doesNotMatch(text, /SDL_RenderGeometry|glDraw|glm::|std::sort/);
  for (const token of [
    "all pixel depths agree with independent ray-box oracle",
    "all cube windings point outward",
    "culling and reverse order preserve full visible image",
    "depth disabled never writes depth",
    "animation independent of frame splits",
    "clean scene retains projected world grid",
  ])
    assert.ok(tests.includes(token), token);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
  for (const [cp, file, name] of [
    [3, "depth.hpp", "struct DepthBuffer"],
    [4, "depth.hpp", "interpolateNdcDepth"],
    [5, "depth.hpp", "depthTestAndWrite"],
    [7, "render.hpp", "buffersNearlyEqual"],
    [8, "render.hpp", "isFrontFacing"],
  ]) {
    const current = await get("checkpoints/" + String(cp).padStart(2, "0") + "/include/" + file);
    const old = await get("checkpoints/" + String(cp - 1).padStart(2, "0") + "/include/" + file);
    assert.ok(current.includes(name));
    if (cp !== 3) assert.ok(!old.includes(name + "("), name + " leaked before its lesson");
    else assert.ok(!old.includes("bool resize("));
  }
});
test("Project 17 lessons teach learner owned code, full mesh, depth, culling and actual HUD", async () => {
  for (const [index, slug] of lessons.entries()) {
    const mdx = await readFile(
      path.join(workspace, "content/solid-cube-z-buffer", slug + ".mdx"),
      "utf8",
    );
    assert.ok(mdx.includes("--target project_17_starter --parallel 2"));
    assert.ok(mdx.includes("bản tham khảo sau bài"));
    if (index === 0) assert.equal((mdx.match(/IndexedTriangle\{\{/g) ?? []).length, 12);
    if (index === 3) assert.ok(mdx.includes("SDL_RenderDebugText"));
    if (index === 4)
      for (const marker of ["bool depthEnabled{true}", "depthTestAndWrite", "SDL_RenderDebugText"])
        assert.ok(mdx.includes(marker));
    if (index === 7)
      for (const marker of ["isFrontFacing", "cullEnabled", "SDLK_C"])
        assert.ok(mdx.includes(marker));
    if (index === 8)
      for (const marker of [
        "Project 17 đã hoàn chỉnh",
        "target_include_directories(project_17_tests PRIVATE starter/include)",
        "drawWorldGrid",
        "SDLK_F",
        "SDLK_J",
      ])
        assert.ok(mdx.includes(marker));
  }
});
test("Project 17 has complete helper definitions in their first teaching lesson", async () => {
  for (let cp = 1; cp <= 9; cp++) {
    const mdx = await readFile(
      path.join(workspace, "content/solid-cube-z-buffer", lessons[cp - 1] + ".mdx"),
      "utf8",
    );
    const snippets = [
      ...mdx.matchAll(/\x60\x60\x60cpp title="[^"]+"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g),
    ].map((m) => m[1]);
    for (const file of ["geometry.hpp", "render.hpp", "depth.hpp", "scene.hpp"]) {
      const dir = cp === 1 ? "starter" : "checkpoints/" + String(cp - 1).padStart(2, "0");
      const before = await readFile(path.join(root, dir, "include", file), "utf8");
      const current = await readFile(
        path.join(root, "checkpoints", String(cp).padStart(2, "0"), "include", file),
        "utf8",
      );
      for (const sig of current.matchAll(/^inline [^\r\n]+ \{/gm)) {
        if (before.includes(sig[0])) continue;
        const tokens = codeTokens(current.slice(sig.index));
        let depth = 0,
          end = codeTokens(sig[0]).length - 1;
        for (; end < tokens.length; end++) {
          if (tokens[end] === "{") depth++;
          if (tokens[end] === "}" && --depth === 0) break;
        }
        assert.ok(
          snippets.some((s) => isContiguousCodeExcerpt(tokens.slice(0, end + 1).join(" "), s)),
          lessons[cp - 1] + ": missing " + sig[0],
        );
      }
    }
  }
});
test("Project 17 renders overview, nine lessons and complete runnable native source", async () => {
  const overview = await render("/projects/solid-cube-z-buffer");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Thử thách|thử tự làm/i);
  for (const slug of lessons) {
    const r = await render("/projects/solid-cube-z-buffer/" + slug);
    assert.equal(r.status, 200, slug);
    assert.match(await r.text(), /data-theme="one-dark-pro"/);
  }
  const html = await (await render("/projects/solid-cube-z-buffer/" + lessons.at(-1))).text();
  for (const file of [
    "geometry.hpp",
    "raster.hpp",
    "depth.hpp",
    "render.hpp",
    "scene.hpp",
    "view.hpp",
    "controls.hpp",
    "presentation.hpp",
    "framebuffer.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  for (const label of [
    "Back-face culling",
    "Camera X",
    "Camera Z",
    "Ẩn debug",
    "Toàn bộ mã nguồn của dự án",
    "project-17-solid-cube-z-buffer.zip",
  ])
    assert.ok(html.includes(label), label);
});
