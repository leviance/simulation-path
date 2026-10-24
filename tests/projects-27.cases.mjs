import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
const root = path.join(workspace, "examples/project-27-brute-force-particle-query");
const content = path.join(workspace, "content/brute-force-particle-query");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Project 27 seven literal lessons compile MDX with full functions and One Dark", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((p) => p.id === "27");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.slug, "brute-force-particle-query");
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 7);
  for (const [index, file] of files.entries()) {
    const text = await readFile(path.join(content, file), "utf8");
    let count = 0;
    for (const [, title, snippet] of text.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0],
        source = await read(
          relative.startsWith("tests/")
            ? relative
            : "checkpoints/" + String(index + 1).padStart(2, "0") + "/" + relative,
        );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(snippet)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      count++;
    }
    assert.ok(count >= 3, file);
    assert.ok((text.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.match(text, /project_27_starter/);
    assert.doesNotMatch(text, /TODO|Checkpoint đang xây/);
    assert.match(String(await compile(text, courseMdxOptions)), /one-dark-pro/);
  }
});

test("Project 27 snapshots introduce data, circle, scan, workspace and jobs progressively", async () => {
  for (const [stage, file, absent] of [
    ["starter", "lab.hpp", "makeParticleCloud("],
    ["checkpoints/01", "lab.hpp", "CircleQuery"],
    ["checkpoints/02", "lab.hpp", "queryBruteForce("],
    ["checkpoints/03", "lab.hpp", "QueryWorkspace"],
    ["checkpoints/04", "scene.hpp", "requestBenchmark("],
    ["checkpoints/05", "lab.hpp", "ScalingRow"],
    ["checkpoints/06", "main.cpp", "scene.phase +="],
  ]) {
    const relative = file === "main.cpp" ? "src/" + file : "include/" + file;
    assert.ok(!(await read(stage + "/" + relative)).includes(absent), stage + " leaks " + absent);
  }
  const view = await read("final/include/view.hpp"),
    main = await read("final/src/main.cpp"),
    scene = await read("final/include/scene.hpp"),
    hud = await read("final/include/presentation.hpp");
  assert.match(view, /index < scene.count/);
  assert.doesNotMatch(view, /drawStride|hitStride/);
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /event.button.which == owner/);
  assert.match(main, /moveQuery\(event.button.x, event.button.y\)/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /if \(key == SDLK_J\) \{[^}]*scene.paused = true;/);
  assert.match(scene, /job.warmup < job.probes.size/);
  assert.match(scene, /job.cursor != job.probes.size\(\) \* kRepetitions/);
  assert.match(hud, /SDL_RenderDebugText/);
  assert.match(hud, /us\/query/);
  assert.match(hud, /scene.rows/);
  assert.match(await read("tests/extra-cases.hpp"), /independent hypot oracle/);
  assert.match(await read("tests/extra-cases.hpp"), /visible == 100'000/);
});

test("Project 27 overview and all seven lesson routes render downloadable full source", async () => {
  const overview = await render("/projects/brute-force-particle-query");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/brute-force-particle-query/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    if (file === files.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + name), name);
      assert.match(html, /extra-cases.hpp/);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-27-brute-force-particle-query.zip/);
    }
  }
});
