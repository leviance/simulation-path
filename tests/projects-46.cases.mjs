import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import project from "../course/projects/p46/manifest.ts";
import lab from "../course/projects/p46/lab.ts";
import learning from "../course/projects/p46/learning.ts";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { interactiveLabUsages, lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { projectCatalog, render, workspace } from "./site-support.mjs";

const slug = "falling-sand";
const source = path.join(workspace, "examples", `project-46-${slug}`);
const content = path.join(workspace, "content", slug);
const checkpoint = (stage, file) =>
  readFile(
    path.join(source, stage ? `checkpoints/${String(stage).padStart(2, "0")}` : "starter", file),
    "utf8",
  );

test("Project 46 publishes a real 512x320 challenge, nine lessons and its own progress revision", () => {
  const entry = projectCatalog.find((item) => item.id === "46");
  assert.equal(entry.checkpointCount, 9);
  assert.equal(entry.contentRevision, 2);
  assert.equal(project.lessons.length, 9);
  assert.match(project.challenge.outcome, /512×320 = 163.840/);
  assert.match(project.challenge.constraints.join(" "), /Empty.*Water/);
  assert.match(project.challenge.constraints.join(" "), /không phải nghiệm chất lưu/);
  assert.match(project.prerequisites.join(" "), /Không cần OpenGL/);
  assert.deepEqual(project.lessonAliases, {
    "07-kiem-chung-va-hoan-thien": "09-kiem-chung-va-hoan-thien",
  });
  const migrated = migrateProgressContent(
    {
      completedLessonIds: ["p45-l01", "p46-l01", "p46-l07", "p47-l01"],
      lastLessonId: "p46-l07",
      projectContentVersions: { p45: 2 },
    },
    { p46: 2 },
  );
  assert.deepEqual(migrated.completedLessonIds, ["p45-l01", "p47-l01"]);
  assert.equal(migrated.lastLessonId, undefined);
  assert.equal(migrated.projectContentVersions.p45, 2);
  assert.equal(migrated.projectContentVersions.p46, 2);
  assert.deepEqual(
    migrateProgressContent(
      { completedLessonIds: ["p46-l09"], projectContentVersions: { p46: 2 } },
      { p46: 2 },
    ).completedLessonIds,
    ["p46-l09"],
  );
});

test("all nine sand lessons teach a coherent step with strictly contiguous real checkpoint code", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map((lesson) => lesson.slug + ".mdx"),
  );
  assert.deepEqual(
    Object.keys(lab.modes),
    project.lessons.map((lesson) => `sand-${lesson.order}`),
  );
  let excerpts = 0;
  for (const lesson of project.lessons) {
    const text = await readFile(path.join(content, lesson.slug + ".mdx"), "utf8");
    assert.deepEqual(
      lessonSectionUsages(text).map((section) => section.key),
      lessonSections.map((section) => section.key),
    );
    assert.deepEqual(interactiveLabUsages(text), [{ demo: slug, mode: `sand-${lesson.order}` }]);
    assert.ok(learning.guides[lesson.id]);
    for (const relative of learning.guides[lesson.id].files)
      await readFile(
        path.join(
          source,
          relative.startsWith("tests/")
            ? relative
            : `checkpoints/${String(lesson.order).padStart(2, "0")}/${relative}`,
        ),
      );
    for (const [, title, snippet] of text.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const actual = relative.startsWith("tests/")
        ? await readFile(path.join(source, relative), "utf8")
        : await checkpoint(lesson.order, relative);
      assert.ok(isContiguousCodeExcerpt(snippet, actual), `${lesson.slug}: ${title}`);
      for (const line of snippet.split("\n")) assert.equal(line.match(/^ */)[0].length % 4, 0);
      excerpts += 1;
    }
    const compiled = String(await compile(text, { ...courseMdxOptions, development: false }));
    assert.doesNotMatch(compiled, /katex-error/);
    assert.match(compiled, /one-dark-pro/);
  }
  assert.ok(excerpts >= 35);
});

test("sand snapshots introduce visible drawing, input, rules, clock, texture, controls then validation", async () => {
  for (let stage = 0; stage <= 9; stage += 1) {
    const main = await checkpoint(stage, "src/main.cpp");
    const rules = await checkpoint(stage, "include/rules.hpp");
    const workshop = await checkpoint(stage, "include/workshop.hpp");
    assert.equal(
      main.includes("sand::drawGrid("),
      stage >= 1 && stage < 7,
      `stage ${stage} small renderer`,
    );
    assert.equal(main.includes("sand::pollInput("), true, `stage ${stage} SDL system events`);
    assert.equal(workshop.includes("inline void stamp("), stage >= 2, `stage ${stage} brush`);
    assert.equal(rules.includes("inline StepStats stepGrid("), stage >= 3, `stage ${stage} rules`);
    assert.equal(rules.includes("x + direction, y + 1"), stage >= 4, `stage ${stage} diagonal`);
    assert.equal(
      rules.includes("grid.cells[source] == Cell::Sand && grid.cells[destination] == Cell::Water"),
      stage >= 5,
      `stage ${stage} swap`,
    );
    assert.equal(main.includes("sand::planSteps("), stage >= 6, `stage ${stage} clock`);
    assert.equal(main.includes("sand::uploadGrid("), stage >= 7, `stage ${stage} texture`);
    assert.equal(
      main.includes("sand::drawPanel("),
      stage >= 7,
      `stage ${stage} large-grid readout`,
    );
    assert.equal(main.includes("sand::runBenchmark("), stage >= 9, `stage ${stage} benchmark`);
    assert.equal(main.includes("state.drawing && state.previousValid"), stage >= 8);
    assert.equal(workshop.includes("state.drawing && state.previousValid"), false);
    assert.doesNotMatch(main, /OpenGL|glDispatchCompute/);
  }
  const presets = await checkpoint(9, "include/presets.hpp");
  assert.match(presets, /int columns = 512, int rows = 320/);
  assert.match(presets, /Grid grid\(columns, rows\)/);
  const view = await checkpoint(9, "include/view.hpp");
  assert.match(view, /SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING/);
  assert.match(view, /SDL_LockTexture/);
  assert.match(view, /pitch/);
});

test("sand docs distinguish vacancy rules, fake water, timed work and testing the student's code", async () => {
  const readLesson = (order) =>
    readFile(path.join(content, project.lessons[order - 1].slug + ".mdx"), "utf8");
  assert.match(await readLesson(3), /Empty/);
  assert.match(await readLesson(4), /thứ tự/);
  assert.match(await readLesson(5), /áp suất/);
  assert.match(await readLesson(6), /speed/);
  assert.match(await readLesson(7), /pitch/);
  assert.match(await readLesson(7), /không phải GPU time/i);
  assert.match(await readLesson(8), /seed/i);
  const final = await readLesson(9);
  assert.match(final, /oracle/i);
  assert.match(final, /starter\/include/);
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  assert.match(final, /--benchmark/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(tests, /524100528U/);
  assert.match(tests, /3694149450U/);
  assert.match(tests, /std::set/);
  assert.doesNotMatch(tests, /#include\s*<cassert>|\bassert\s*\(/);
});

test("Project 46 renders its nine lessons, complete source and migrated final URL", async () => {
  const overview = await render(`/projects/${slug}`);
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  assert.match(html, /512×320/);
  assert.doesNotMatch(html, /Bản xây lại đang nghiệm thu/);
  for (const lesson of project.lessons) {
    const route = `/projects/${slug}/${lesson.slug}`;
    const response = await render(route);
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(Buffer.byteLength(body) < 350 * 1024, route);
    assert.match(body, /one-dark-pro/);
    assert.match(body, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(body, /katex-error/);
    if (lesson.order === 9) assert.match(body, /ma-hoan-chinh-cua-project/);
  }
  const old = await render(`/projects/${slug}/07-kiem-chung-va-hoan-thien`);
  assert.equal(old.status, 308);
  assert.equal(old.headers.get("location"), `/projects/${slug}/09-kiem-chung-va-hoan-thien`);
});
