import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
const root = path.join(workspace, "examples/project-25-spring-chain"),
  content = path.join(workspace, "content/spring-chain");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Project 25 has eight literal-code lessons with compiled MDX and highlighted source", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const p = catalog.find((p) => p.id === "25");
  assert.equal(p.slug, "spring-chain");
  assert.equal(p.checkpointCount, 8);
  assert.equal(p.sourceDirectory, "project-25-spring-chain");
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 8);
  for (const [index, file] of files.entries()) {
    const mdx = await readFile(path.join(content, file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0],
        stage = String(index + 1).padStart(2, "0");
      const source = await read(
        relative.startsWith("tests/") ? relative : "checkpoints/" + stage + "/" + relative,
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(snippet)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token))
          assert.equal(stack.pop(), pairs[token], file + ": " + title);
      }
      assert.equal(stack.length, 0, file + ": " + title);
      count++;
    }
    assert.ok(count >= 3, file);
    assert.match(mdx, /project_25_starter/);
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.doesNotMatch(mdx, /TODO|Checkpoint đang xây|18 particles/);
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
  }
});

test("Project 25 checkpoints separate local force, integration, drag, metrics and history", async () => {
  for (const [stage, file, absent] of [
    ["starter", "lab.hpp", "makeVerticalChain("],
    ["checkpoints/01", "lab.hpp", "sampleElasticSpring("],
    ["checkpoints/02", "lab.hpp", "accumulateElasticForces("],
    ["checkpoints/03", "lab.hpp", "integrateParticle("],
    ["checkpoints/04", "lab.hpp", "sampleDampedSpring("],
    ["checkpoints/05", "lab.hpp", "beginDrag("],
    ["checkpoints/06", "metrics.hpp", "measureChain("],
    ["checkpoints/07", "scene.hpp", "recordEnergy("],
  ])
    assert.ok(!(await read(stage + "/include/" + file)).includes(absent), stage + " " + absent);
  const scene = await read("final/include/scene.hpp"),
    core = await read("final/include/lab.hpp"),
    view = await read("final/include/view.hpp"),
    main = await read("final/src/main.cpp");
  assert.match(scene, /int count\{32\}/);
  assert.match(core, /particleCount > 100/);
  assert.match(scene, /scene.history.size\(\) > 1201/);
  assert.match(scene, /std::min\(32, scene.fastRemaining\)/);
  assert.match(scene, /recordEnergy\(scene, true\)/);
  assert.match(scene, /scene.elapsed = double\(scene.steps\)/);
  assert.match(core, /candidate.particles/);
  assert.match(core, /grabOffset/);
  assert.match(core, /relativeSpeed/);
  assert.match(view, /drawEnergy/);
  assert.match(view, /value.gravity/);
  assert.match(view, /const double firstTime/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /updateDrag\(event.button.x, event.button.y\)/);
  assert.match(main, /frames >= 32/);
  assert.match(main, /SDL_Delay\(16\)/);
  assert.doesNotMatch(main, /Box2D|glDraw|glm::/);
  const extra = await read("tests/extra-cases.hpp");
  assert.match(extra, /cos analytic oracle/);
  assert.match(extra, /halving dt/);
  assert.match(extra, /actual energy renderer/);
  const manifest = await readFile(path.join(workspace, "course/projects/p25/manifest.ts"), "utf8");
  assert.match(manifest, /32 khối/);
  assert.match(manifest, /100/);
  assert.doesNotMatch(manifest, /18 particles|18 khối/);
});
test("Project 25 overview and all eight lessons render full source and source download", async () => {
  const overview = await render("/projects/spring-chain");
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  assert.match(html, /trục ngang là giây, trục dọc là Joule/);
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/spring-chain/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    if (file === files.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + name), name);
      assert.match(html, /extra-cases.hpp/);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-25-spring-chain.zip/);
    }
  }
});
