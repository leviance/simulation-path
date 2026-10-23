import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-22-projectile-cannon");
const content = path.join(workspace, "content/projectile-cannon");
test("Project 22 rebuilt lessons compile MDX and teach exact balanced checkpoint code", async () => {
  const lessons = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(lessons.length, 7);
  for (const [index, file] of lessons.entries()) {
    const mdx = await readFile(path.join(content, file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const source = await readFile(
        path.join(root, "checkpoints", String(index + 1).padStart(2, "0"), title.split(" — ")[0]),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), `${file}: ${title}`);
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(snippet)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      for (const line of snippet.split("\n"))
        assert.equal(line.match(/^ */)[0].length % 4, 0, title);
      count++;
    }
    assert.ok(count >= 3, file);
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.doesNotMatch(mdx, /Checkpoint đang xây|TODO|firedLaunch|numericalTrail/);
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
  }
});

test("Project 22 source stages converge on interactive cannon, immutable shots and sample error metrics", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((p) => p.id === "22");
  assert.equal(project.slug, "projectile-cannon");
  assert.equal(project.checkpointCount, 7);
  const get = (step, file) => readFile(path.join(root, step, "include", file), "utf8");
  assert.doesNotMatch(await get("starter", "lab.hpp"), /aimFromScreenDrag/);
  for (const [step, absent] of [
    ["starter", "velocityFromPolar"],
    ["checkpoints/01", "velocityFromPolar"],
    ["checkpoints/02", "analyticPosition"],
    ["checkpoints/03", "explicitEulerStep"],
    ["checkpoints/04", "planFixedSteps"],
    ["checkpoints/05", "explicitEulerStepToGround"],
    ["checkpoints/06", "compareProjectile"],
  ]) {
    assert.ok(
      !(await get(step, "lab.hpp")).includes(absent),
      `${step}: future algorithm ${absent}`,
    );
  }
  const simulation = await get("final", "simulation.hpp");
  assert.match(simulation, /shot\.fixedDt = settings\.fixedDt/);
  assert.match(simulation, /shot\.errors\.maximum = std::max/);
  assert.match(simulation, /shot\.errors\.sum \+= error/);
  assert.match(simulation, /history\.size\(\) > 4/);
  assert.match(simulation, /samples\.size\(\) >= 8192/);
  const controls = await get("final", "controls.hpp");
  assert.match(controls, /settings\.gravity = std::max\(2.5/);
  assert.match(controls, /settings\.gravity = std::min\(25.0/);
  const main = await readFile(path.join(root, "final/src/main.cpp"), "utf8");
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /updateAim\(event.button.x, event.button.y\)/);
  assert.match(main, /smokeFrames >= 8/);
  assert.match(main, /SDL_Delay\(8\)/);
  assert.doesNotMatch(main, /Box2D|glDraw|glm::|SDL_RenderGeometry/);
  const tests = await readFile(path.join(root, "tests/tests.cpp"), "utf8");
  assert.match(tests, /arithmetic-series oracle/);
  assert.match(tests, /mean error matches independent per-sample average/);
  const canvas = await readFile(path.join(workspace, "components/labs/projectile-lab.tsx"), "utf8");
  assert.match(canvas, /className="lab-canvas"/);
  const lesson = await readFile(path.join(content, "07-do-sai-so-va-nghiem-thu.mdx"), "utf8");
  assert.match(lesson, /trung bình số học/);
  assert.match(lesson, /cùng thời điểm giảm bốn lần/);
});

test("Project 22 overview and all seven lesson routes expose full source and ZIP", async () => {
  const overview = await render("/projects/projectile-cannon");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/projectile-cannon/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    if (file === files.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + name), name);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-22-projectile-cannon.zip/);
    }
  }
});
