import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const sourceDirectory = path.join(workspace, "examples/project-01-hello-pixels");

test("Project 01 rebuild teaches all four required scenes before safe resize", async () => {
  const manifest = await readFile(path.join(workspace, "course/projects/p01/manifest.ts"), "utf8");
  assert.match(manifest, /1\/2\/3\/4.*solid\/gradient\/checker\/noise/);
  assert.match(manifest, /16|giới hạn cấp phát/);
  const lesson3 = await readFile(
    path.join(workspace, "content/hello-pixels/03-putpixel-va-rgba.mdx"),
    "utf8",
  );
  assert.match(lesson3, /SDL_UpdateTexture/);
  assert.match(lesson3, /pitch.*byte/i);
  assert.match(lesson3, /BLENDMODE_NONE/);
  assert.doesNotMatch(lesson3, /Bài 5 sẽ giải thích kỹ hơn về.*pitch/);
  const lesson4 = await (await render("/projects/hello-pixels/04-pattern-dau-tien")).text();
  assert.match(lesson4, /solid, gradient, checkerboard và noise/i);
  assert.match(lesson4, /dirty/);
  const final = await (await render("/projects/hello-pixels/06-validation")).text();
  assert.match(final, /Toàn bộ mã nguồn của dự án/i);
  assert.match(final, /include\/presentation.hpp/);
  assert.match(final, /include\/smoke.hpp/);
});

test("Project 01 rebuild uses contiguous excerpts from each actual checkpoint", async () => {
  const directory = path.join(workspace, "content/hello-pixels");
  let count = 0;
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const checkpoint = file.slice(0, 2);
    const mdx = await readFile(path.join(directory, file), "utf8");
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        path.join(
          sourceDirectory,
          relative.startsWith("tests/") ? relative : "checkpoints/" + checkpoint + "/" + relative,
        ),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      count += 1;
    }
  }
  assert.ok(count >= 25, "Detailed lessons need real code excerpts, not only prose");
});

test("Project 01 rebuild keeps native milestones and bounded resource behavior", async () => {
  const read = (relative) => readFile(path.join(sourceDirectory, relative), "utf8");
  const first = await read("checkpoints/01/src/main.cpp");
  assert.doesNotMatch(first, /lab::Framebuffer|uploadFramebuffer|runSmoke/);
  assert.match(first, /SDL_Delay\(10\)/);
  const third = await read("checkpoints/03/include/lab.hpp");
  assert.match(third, /void putPixel/);
  assert.doesNotMatch(third, /void gradient|void noise/);
  const fourth = await read("checkpoints/04/src/main.cpp");
  assert.match(fourth, /SDLK_4/);
  assert.doesNotMatch(fourth, /replaceFramebuffer/);
  const fifth = await read("checkpoints/05/src/main.cpp");
  assert.match(fifth, /SDL_WINDOW_MINIMIZED/);
  assert.match(fifth, /replaceFramebuffer/);
  const final = await read("final/include/lab.hpp");
  assert.match(final, /maximumPixelCount \/ rows/);
  assert.match(final, /catch \(const std::bad_alloc&\)/);
  const smoke = await read("final/include/smoke.hpp");
  assert.match(smoke, /step < 12/);
  assert.doesNotMatch(await read("final/src/main.cpp"), /SDL_Render(?:Point|Line|FillRect)\(/);
});
