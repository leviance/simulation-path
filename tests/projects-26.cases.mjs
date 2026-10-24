import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
const root = path.join(workspace, "examples/project-26-double-pendulum-chaos"),
  content = path.join(workspace, "content/double-pendulum-chaos");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Project 26 has seven literal-code lessons with compiled MDX and highlighted source", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8")),
    p = catalog.find((p) => p.id === "26");
  assert.equal(p.slug, "double-pendulum-chaos");
  assert.equal(p.checkpointCount, 7);
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 7);
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
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.match(mdx, /project_26_starter/);
    assert.doesNotMatch(mdx, /TODO|Checkpoint đang xây/);
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
  }
});
test("Project 26 checkpoints keep geometry, solver, twins, separation and reference progressive", async () => {
  for (const [stage, file, absent] of [
    ["starter", "lab.hpp", "pendulumGeometry("],
    ["checkpoints/01", "lab.hpp", "pendulumDerivative("],
    ["checkpoints/02", "lab.hpp", "stepRk4("],
    ["checkpoints/03", "lab.hpp", "TwinPendulums"],
    ["checkpoints/04", "lab.hpp", "phaseSpaceSeparation("],
    ["checkpoints/05", "lab.hpp", "ChaosExperiment"],
    ["checkpoints/06", "scene.hpp", "beginAngleDrag("],
  ])
    assert.ok(!(await read(stage + "/include/" + file)).includes(absent), stage + " " + absent);
  const core = await read("final/include/lab.hpp"),
    scene = await read("final/include/scene.hpp"),
    view = await read("final/include/view.hpp"),
    main = await read("final/src/main.cpp");
  assert.match(core, /a11 \* a22 - a12 \* a21/);
  assert.match(core, /ChaosExperiment next = experiment/);
  assert.match(core, /requested > 120000.0/);
  assert.match(scene, /kMaximumSubsteps = 32/);
  assert.match(scene, /scene.history.size\(\) > 751/);
  assert.match(view, /sample|a.time|b.time/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /updateDrag\(event.button.x, event.button.y\)/);
  assert.match(main, /requestFast\(scene, 30.0\)/);
  assert.match(main, /SDL_Delay\(16\)/);
  assert.match(main, /frames >= 32/);
  assert.doesNotMatch(main, /runChaosExperiment\(/);
  assert.match(await read("tests/extra-cases.hpp"), /Newton residual/);
  assert.match(await read("tests/extra-cases.hpp"), /divergence persists when dt is reduced/);
});
test("Project 26 overview and all seven lessons render full source and ZIP download", async () => {
  const overview = await render("/projects/double-pendulum-chaos");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/double-pendulum-chaos/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    if (file === files.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + name), name);
      assert.match(html, /extra-cases.hpp/);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-26-double-pendulum-chaos.zip/);
    }
  }
});
