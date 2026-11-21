import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { markedCodeExcerpt, markedSnippetBlockPattern } from "../scripts/code-snippets.mjs";
import "./projects-35-tooling.cases.mjs";
const root = new URL("../", import.meta.url);
const native = "examples/project-35-shader-hot-reload-lab/";
const course = "content/shader-hot-reload-lab/";
const read = (file) => readFile(new URL(file, root), "utf8");
const manifest = (await import("../course/projects/p35/manifest.ts")).default;
const lab = (await import("../course/projects/p35/lab.ts")).default;

test("P35 renders seven runnable lessons; every teaching excerpt comes from the checkpoint the reader builds", async () => {
  const files = (await readdir(new URL(course, root))).filter((f) => f.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    manifest.lessons.map((l) => l.slug + ".mdx"),
  );
  assert.equal(files.length, 7);
  for (const [i, file] of files.entries()) {
    const text = await read(course + file);
    const html = String(await compile(text, courseMdxOptions));
    assert.match(html, /one-dark-pro/);
    assert.match(html, /InteractiveLab/);
    for (const heading of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(text.includes("## " + heading), file + " " + heading);
    const blocks = [...text.matchAll(markedSnippetBlockPattern())];
    assert.ok(blocks.length >= 3, file + " needs complete working examples");
    for (const [block, , relative, marker] of blocks) {
      const code = markedCodeExcerpt(
        await read(native + "checkpoints/0" + (i + 1) + "/" + relative),
        marker,
      );
      assert.ok(block.replaceAll("\r", "").includes("\n" + code + "\n"), file + " " + marker);
    }
    assert.ok(text.includes("project_35_work"), file);
  }
  for (const target of Object.values(manifest.lessonAliases))
    assert.ok(files.includes(target + ".mdx"));
});

test("P35 stage boundaries teach the light framebuffer before the surface comparison, filtering and live reload", async () => {
  const cp = (i, file) => read(native + "checkpoints/0" + i + "/" + file);
  assert.doesNotMatch(await cp(2, "include/room_drawing.hpp"), /recordDepth\(gl,/);
  assert.match(await cp(3, "include/shadow_target.hpp"), /GL_DEPTH_ATTACHMENT/);
  assert.match(await cp(3, "include/room_drawing.hpp"), /recordDepth\(gl,/);
  assert.doesNotMatch(await cp(3, "shaders/room.frag"), /float compareDepth/);
  assert.match(await cp(4, "shaders/room.frag"), /texelFetch\(uShadow/);
  assert.doesNotMatch(await cp(4, "shaders/room.frag"), /float filteredVisibility/);
  assert.match(await cp(5, "shaders/room.frag"), /litSamples \/ 9\.0/);
  assert.doesNotMatch(await cp(5, "include/shader_application.hpp"), /inline bool reloadMaterial/);
  assert.match(await cp(6, "include/shader_application.hpp"), /inline bool reloadMaterial/);
  assert.match(await cp(7, "include/shader_validation.hpp"), /GL_DEPTH_COMPONENT, GL_FLOAT/);
});

test("P35 uses distinct native framebuffer evidence, independently of the Canvas illustration", async () => {
  const media = lab.native;
  assert.ok(media.withDemo);
  const images = new Set();
  for (const { poster, source } of Object.values(media.takes)) {
    assert.match(source, /C\+\+\/SDL3\/OpenGL/);
    const data = await readFile(new URL("public" + media.directory + "/" + poster, root));
    assert.equal(data.readUInt32BE(0), 0x89504e47);
    assert.ok(data.readUInt32BE(16) >= 900 && data.readUInt32BE(20) >= 600);
    images.add(data.toString("base64"));
  }
  assert.equal(images.size, 4);
  const shaders = await readdir(new URL(native + "final/shaders/", root));
  assert.deepEqual(shaders.sort(), ["depth.frag", "depth.vert", "room.frag", "room.vert"]);
  const gpu = await read(native + "final/include/shader_validation.hpp");
  for (const label of [
    "one floor normal",
    "moving the crate",
    "orbit does not drag",
    "GL_DEPTH_COMPONENT",
    'reject(candidate, "fragment")',
    'reject(candidate, "link")',
    'reject(candidate, "uColor")',
    "last-good image",
  ])
    assert.ok(gpu.includes(label), label);
});
