import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import "./projects-35-tooling.cases.mjs";

const root = new URL("../", import.meta.url);
const dir = "examples/project-35-shader-hot-reload-lab/";
const read = (file) => readFile(new URL(file, root), "utf8");
const modes = [
  "shader-files",
  "compile-diagnostics",
  "program-interface",
  "transactional-reload",
  "file-watcher",
  "live-uniforms",
  "procedural-shader",
  "mandelbrot-shader",
  "noise-shader",
  "shader-validation",
];

test("P35 all ten current lessons compile through the actual math and One Dark MDX pipeline", async () => {
  const files = (await readdir(new URL("content/shader-hot-reload-lab/", root))).filter((file) =>
    file.endsWith(".mdx"),
  );
  for (const file of files) {
    const source = await read("content/shader-hot-reload-lab/" + file);
    const output = String(await compile(source, courseMdxOptions));
    assert.match(output, /one-dark-pro/, file);
    assert.match(output, /InteractiveLab/, file);
  }
  const entry = await read("content/shader-hot-reload-lab/01-dua-glsl-ra-file-rieng.mdx");
  assert.match(entry, /6–8 giờ đọc/);
  assert.match(entry, /17–23 giờ tự viết/);
  assert.match(entry, /5–7 giờ kiểm chứng/);
  assert.match(entry, /chờ build không tính/);
});

test("P35 publishes ten substantial lessons leading to the canonical four-effect tool", async () => {
  const catalog = JSON.parse(await read("course/projects.json"));
  const project = catalog.find((entry) => entry.id === "35");
  assert.equal(project.checkpointCount, 10);
  assert.equal(project.shaderRuntimePerTarget, true);
  assert.equal(project.contentRevision, 2);
  const manifest = (await import("../course/projects/p35/manifest.ts")).default;
  assert.equal(manifest.lessons.length, 10);
  assert.match(manifest.challenge.mission, /gradient, circle, Mandelbrot và noise/);
  const files = (await readdir(new URL("content/shader-hot-reload-lab/", root)))
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    manifest.lessons.map((lesson) => lesson.slug + ".mdx"),
  );
  const sectionNames = [
    "Vấn đề cần giải quyết",
    "Hiểu ý tưởng trước khi viết code",
    "Viết code từng bước",
    "Ghép các phần lại",
    "Thử làm sai để hiểu đúng",
    "Tự kiểm tra kết quả",
    "Bài tập mở rộng",
  ];
  for (const [index, lesson] of manifest.lessons.entries()) {
    const text = await read("content/shader-hot-reload-lab/" + lesson.slug + ".mdx");
    assert.ok(text.includes("# " + lesson.title));
    assert.ok(text.includes('mode="' + modes[index] + '"'));
    for (const name of sectionNames)
      assert.ok(text.includes("## " + name), lesson.slug + ": " + name);
    assert.ok(
      (text.match(/^### Bước /gm) ?? []).length >= 3,
      lesson.slug + " needs explained steps",
    );
    assert.ok(
      (text.match(/^```(?:cpp|glsl|cmake|bash) title="[^\"]+"$/gm) ?? []).length >= 3,
      lesson.slug + " needs detailed code blocks",
    );
    const experiments = text
      .split("## Thử làm sai để hiểu đúng")[1]
      .split("## Tự kiểm tra kết quả")[0];
    assert.ok(
      (experiments.match(/^\d+\. /gm) ?? []).length >= 2,
      lesson.slug + " needs observable experiments",
    );
    assert.doesNotMatch(text, /\{\{CPP|\{\{GLSL|uMvp|vLocalPosition|kCubeVertices/);
    const blocks = [
      ...text.matchAll(/\x60\x60\x60(cpp|glsl) title="([^"]+)"\n([\s\S]*?)\n\x60\x60\x60/g),
    ];
    assert.ok(blocks.length >= 1, lesson.slug + " needs actual source code");
    for (const [, language, title, snippet] of blocks) {
      const file = title.split(" — ")[0];
      const source = await read(
        dir + "checkpoints/" + String(lesson.order).padStart(2, "0") + "/" + file,
      );
      assert.ok(
        isContiguousCodeExcerpt(snippet, source),
        lesson.slug + ": " + title + " must be contiguous checkpoint code",
      );
      if (language === "glsl")
        assert.ok(source.includes(snippet.trim()), "GLSL must be exact snapshot source");
      const stack = [];
      for (const token of codeTokens(snippet)) {
        if (token === "{") stack.push(token);
        if (token === "}") assert.ok(stack.pop(), title + " unmatched }");
      }
      assert.equal(stack.length, 0, title + " unfinished block");
    }
  }
});

test("P35 native verifier covers real compiler/linker/reflection and fixed-snapshot last-good", async () => {
  const renderer = await read(dir + "source-template/include/shader_renderer.hpp");
  assert.match(renderer, /GL_COMPILE_STATUS/);
  assert.match(renderer, /GL_LINK_STATUS/);
  assert.match(renderer, /GetActiveUniform/);
  assert.match(renderer, /type == requiredType && size == 1/);
  assert.ok(
    renderer.indexOf("gl.UseProgram(activeProgram);", renderer.indexOf("bool reload(")) <
      renderer.indexOf("gl.DeleteProgram(previousProgram)"),
  );
  const verify = await read(dir + "source-template/include/shader_validation.hpp");
  for (const invariant of [
    "effect < kEffects.size()",
    "verifyShaderPixels",
    "verifyShaderUniforms",
    "sampledPixels += 5",
    "fragment compile",
    "vertex compile",
    '"[link]"',
    "Wrong type/array size for uMouse",
    "== lastGoodImage",
    "renderer.locations == locations",
    "verifyDeletedShaders",
    "gl.IsTexture(texture)",
    "textPixels > 100",
    "15000",
  ]) {
    assert.ok(verify.includes(invariant), invariant);
  }
  const app = await read(dir + "source-template/include/shader_application.hpp");
  assert.match(app, /SDL_GetWindowSizeInPixels/);
  assert.match(app, /SDL_CaptureMouse/);
  assert.match(app, /beforeRead/);
  assert.match(app, /--shader-dir/);
  assert.match(app, /SDL_EVENT_WINDOW_FOCUS_LOST/);
  assert.ok(app.indexOf("overlay.destroy(gl)") < app.indexOf("SDL_GL_DestroyContext(context)"));
});

test("P35 early checkpoints introduce logging and reflection in the lesson that teaches them", async () => {
  const first = await read(dir + "checkpoints/01/include/shader_renderer.hpp");
  const second = await read(dir + "checkpoints/02/include/shader_renderer.hpp");
  const third = await read(dir + "checkpoints/03/include/shader_renderer.hpp");
  assert.doesNotMatch(first, /inline std::string shaderInfoLog/);
  assert.match(second, /inline std::string shaderInfoLog/);
  assert.doesNotMatch(second, /inline bool findUniform/);
  assert.match(third, /inline bool findUniform/);
  assert.match(third, /GetActiveUniform/);
});

test("P35 Canvas does not claim a JavaScript token scanner is a real GLSL compiler", async () => {
  const facade = await read("lib/labs/shader-hot-reload.ts");
  assert.doesNotMatch(facade, /validateShaderStage|validateProgramInterface/);
  const canvas = await read("components/labs/shader-hot-reload-lab.tsx");
  for (const contract of [
    "không chạy GLSL",
    "Lưu bản sửa",
    "Thử bản đã lưu",
    "140",
    "lastAttemptedVersion",
    "setPointerCapture",
    "onLostPointerCapture",
    "usePauseOnReducedMotion",
    "visibilitychange",
    "SPEED",
    "mô phỏng",
    "framebuffer",
  ]) {
    assert.ok(canvas.includes(contract), contract);
  }
  assert.doesNotMatch(canvas, /getContext\(["']webgl/);
});
