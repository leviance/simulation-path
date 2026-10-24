import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
const root = path.join(workspace, "examples/project-24-collision-tank"),
  content = path.join(workspace, "content/collision-tank");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Project 24 has eleven literal-code lessons with compiled MDX and highlighted source", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const p = catalog.find((p) => p.id === "24");
  assert.equal(p.slug, "collision-tank");
  assert.equal(p.checkpointCount, 11);
  assert.equal(p.sourceDirectory, "project-24-collision-tank");
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 11);
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
    assert.match(mdx, /project_24_starter/);
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.doesNotMatch(mdx, /TODO|Checkpoint đang xây|144 quả bóng/);
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
  }
});

test("Project 24 stages reach 256 heterogeneous bodies, actual 3D and radius-aware impulse physics", async () => {
  for (const [stage, file, absent] of [
    ["starter", "lab.hpp", "makeBallLattice("],
    ["checkpoints/01", "lab.hpp", "integrateBall("],
    ["checkpoints/02", "lab.hpp", "resolveWallCollision("],
    ["checkpoints/03", "lab.hpp", "findCircleContact("],
    ["checkpoints/04", "lab.hpp", "applyCollisionImpulse("],
    ["checkpoints/05", "lab.hpp", "correctBallPenetration("],
    ["checkpoints/06", "lab.hpp", "stepCollisionWorld("],
    ["checkpoints/07", "lab.hpp", "measureWorld("],
    ["checkpoints/08", "sphere.hpp", "findSphereContact("],
    ["checkpoints/09", "projection.hpp", "sphereDepth("],
    ["checkpoints/10", "scene.hpp", "spawnBodies("],
  ])
    assert.ok(!(await read(stage + "/include/" + file)).includes(absent), stage + ": " + absent);
  const final = await read("final/include/lab.hpp"),
    sphere = await read("final/include/sphere.hpp"),
    scene = await read("final/include/scene.hpp");
  assert.match(final, /makeBallLattice\(16, 16/);
  assert.match(final, /balls\[index\].inverseMass = 1.0/);
  assert.match(final, /balls\[index\].restitution =/);
  assert.match(final, /stats.wallImpulse = add/);
  assert.match(final, /secondIndex = firstIndex \+ 1/);
  assert.match(final, /debugContacts.size\(\) < 48/);
  assert.match(sphere, /8; \+\+x/);
  assert.match(sphere, /4; \+\+z/);
  assert.match(sphere, /body.position.z/);
  assert.match(sphere, /normalImpulseMagnitude/);
  assert.match(scene, /history.size\(\) > 601/);
  assert.match(scene, /std::min\(4, scene.fastRemaining\)/);
  assert.match(scene, /spheres.size\(\) < 512/);
  const view = await read("final/include/projection.hpp");
  assert.match(view, /sphereDepth/);
  assert.match(view, /z < depth.values\[index\]/);
  const main = await read("final/src/main.cpp");
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /updateDrag\(event.button.x, event.button.y\)/);
  assert.match(main, /frames >= 32/);
  assert.match(main, /SDL_Delay\(16\)/);
  assert.doesNotMatch(main, /Box2D|glDraw|glm::/);
  const extra = await read("tests/extra-cases.hpp");
  assert.match(extra, /3D oblique unequal-mass impulse hand oracle/);
  assert.match(extra, /P-P0 equals sum/);
  assert.match(extra, /draw-order independent/);
  const overview = await readFile(path.join(workspace, "course/projects/p24/manifest.ts"), "utf8");
  assert.match(overview, /256 sphere/);
  assert.match(overview, /Jwall/);
  assert.match(overview, /11 checkpoint/);
});

test("Project 24 overview and all eleven lesson routes publish full source and downloads", async () => {
  const overview = await render("/projects/collision-tank");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/collision-tank/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    if (file === files.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + name), name);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /extra-cases.hpp/);
      assert.match(html, /project-24-collision-tank.zip/);
    }
  }
});
