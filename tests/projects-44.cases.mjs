import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, authoredLessons, render } from "./site-support.mjs";

const slug = "neighbor-list-skin";
const source = path.join(workspace, "examples", `project-44-${slug}`);

test("Project 44 publishes nine complete neighbor-list lessons", async () => {
  const overview = await render(`/projects/${slug}`);
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  assert.equal(lessons.length, 9);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200, lesson.route);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 350 * 1024, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});

test("Project 44 progressively adds new concepts while retaining the P43 reference solver", async () => {
  const files = [
    "include/neighbor_list.hpp",
    "include/neighbor_dynamics.hpp",
    "include/neighbor_view.hpp",
    "src/main.cpp",
  ];
  const symbols = [
    "drawRadius",
    "rebuildNaive",
    "evaluateListed",
    "maximumDisplacement",
    "rebuildGrid",
    "cachedVerletStep",
    "auditForces",
    "measureWork",
    "validateNeighborList",
  ];
  for (let step = 0; step <= 9; step += 1) {
    const directory = step === 0 ? "starter" : `checkpoints/${String(step).padStart(2, "0")}`;
    const code = (
      await Promise.all(files.map((file) => readFile(path.join(source, directory, file), "utf8")))
    ).join("\n");
    if (step > 0) assert.ok(code.includes(symbols[step - 1]), `checkpoint ${step} missing concept`);
    for (const later of symbols.slice(step))
      assert.ok(!code.includes(later), `checkpoint ${step} leaks ${later}`);
    assert.ok(!code.includes("LAB_CHECKPOINT"));
    const reference = await readFile(path.join(source, directory, "include/dynamics.hpp"), "utf8");
    assert.match(reference, /inline Evaluation evaluate/);
    assert.match(reference, /inline bool verletStep/);
  }
});

test("Project 44 documents half-skin, stale cache, two force checks and honest work counts", async () => {
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  const modes = [
    "nl-cutoff",
    "nl-build",
    "nl-forces",
    "nl-rebuild",
    "nl-grid",
    "nl-verlet",
    "nl-audit",
    "nl-work",
    "nl-final",
  ];
  const contracts = [
    [/SDL_RenderFillRect/, /đứng yên/],
    [/listRadius/, /i<j/],
    [/sample.slope/, /cutoff/],
    [/unwrapped/, /generation/, /skin\/2/],
    [/visited/, /hai ô/, /sort/],
    [/candidateList/, /sau drift/, /8 bước/],
    [/3.2/, /2.4/, /missingPairs/, /khóa/],
    [/buildChecks/, /forceChecks/, /806.400/, /mili giây/],
    [/Mã nguồn hoàn chỉnh/, /timeout 20/, /Debug/, /Release/],
  ];
  for (const [index, lesson] of lessons.entries()) {
    const text = await readFile(path.join(workspace, "content", slug, lesson.file), "utf8");
    assert.ok(text.includes(`mode="${modes[index]}"`));
    for (const formula of text.matchAll(/\$\$([\s\S]*?)\$\$/g)) {
      assert.doesNotThrow(
        () =>
          katex.renderToString(formula[1], {
            displayMode: true,
            strict: "error",
            throwOnError: true,
          }),
        `lesson ${index + 1} has unsupported math glyphs`,
      );
    }
    for (const pattern of contracts[index]) assert.match(text, pattern, `lesson ${index + 1}`);
    const experiments = text
      .split("## Thử làm sai để hiểu đúng")[1]
      .split("## Tự kiểm tra kết quả")[0];
    assert.ok((experiments.match(/^\d+\. /gm) ?? []).length >= 2);
  }
  const main = await readFile(path.join(source, "final/src/main.cpp"), "utf8");
  assert.match(main, /maximumSteps = 8/);
  assert.match(main, /maximumSteps = 1/);
  assert.match(main, /SDLK_SPACE && !frozen/);
  assert.match(main, /SDLK_N && !frozen/);
  const solver = await readFile(path.join(source, "final/include/neighbor_dynamics.hpp"), "utf8");
  assert.equal(
    (
      solver
        .split("inline bool cachedVerletStep")[1]
        .split("struct Audit")[0]
        .match(/ensureList\(/g) ?? []
    ).length,
    2,
  );
});
