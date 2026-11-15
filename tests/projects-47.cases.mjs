import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import project from "../course/projects/p47/manifest.ts";
import lab from "../course/projects/p47/lab.ts";
import learning from "../course/projects/p47/learning.ts";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { isContiguousCodeExcerpt, markedCodeExcerpt } from "../scripts/code-snippets.mjs";
import { interactiveLabUsages, lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { projectCatalog, render, workspace } from "./site-support.mjs";
const slug = "heat-plate";
const source = path.join(workspace, "examples", "project-47-" + slug);
const content = path.join(workspace, "content", slug);
const checkpoint = (stage, file) =>
  readFile(
    path.join(source, stage ? `checkpoints/${String(stage).padStart(2, "0")}` : "starter", file),
    "utf8",
  );

test("Project 47 has an actual 192-square challenge, nine lessons, aliases and its own progress revision", () => {
  const entry = projectCatalog.find((item) => item.id === "47");
  assert.equal(entry.checkpointCount, 9);
  assert.equal(entry.contentRevision, 2);
  assert.equal(project.lessons.length, 9);
  assert.match(project.challenge.outcome, /192×192 = 36.864/);
  assert.match(project.challenge.constraints.join(" "), /400.*NaN\/Inf.*\|theta\|>16/);
  assert.equal(project.lessonAliases["08-kiem-chung-va-ban-hoan-chinh"], project.lessons[8].slug);
  const migrated = migrateProgressContent(
    {
      completedLessonIds: ["p46-l01", "p47-l01", "p48-l01"],
      lastLessonId: "p47-l01",
      projectContentVersions: { p46: 2 },
    },
    { p47: 2 },
  );
  assert.deepEqual(migrated.completedLessonIds, ["p46-l01", "p48-l01"]);
  assert.equal(migrated.lastLessonId, undefined);
});
test("all nine heat lessons compile with seven roles, correct modes and exact marked checkpoint excerpts", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map((lesson) => lesson.slug + ".mdx"),
  );
  assert.deepEqual(
    Object.keys(lab.modes),
    project.lessons.map((lesson) => `heat-${lesson.order}`),
  );
  let excerpts = 0;
  for (const lesson of project.lessons) {
    const text = await readFile(path.join(content, lesson.slug + ".mdx"), "utf8");
    assert.ok(Buffer.byteLength(text) <= 32 * 1024, lesson.slug);
    assert.deepEqual(
      lessonSectionUsages(text).map((section) => section.key),
      lessonSections.map((section) => section.key),
    );
    assert.deepEqual(interactiveLabUsages(text), [{ demo: slug, mode: `heat-${lesson.order}` }]);
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
    for (const [, relative, id, title, code] of text.matchAll(
      /\{\/\* snippet ([^#]+)#([a-z0-9-]+) \*\/\}\s*```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const actual = await checkpoint(lesson.order, relative);
      assert.equal(title.split(" — ")[0], relative);
      assert.equal(code, markedCodeExcerpt(actual, id), `${lesson.slug}: ${id}`);
      assert.ok(isContiguousCodeExcerpt(code, actual), `${lesson.slug}: ${title}`);
      for (const line of code.split("\n")) assert.equal(line.match(/^ */)[0].length % 4, 0);
      excerpts++;
    }
    assert.doesNotMatch(text, /P47_SNIPPET/);
    const compiled = String(await compile(text, { ...courseMdxOptions, development: false }));
    assert.doesNotMatch(compiled, /katex-error/);
    assert.match(compiled, /one-dark-pro/);
  }
  assert.equal(excerpts, 27);
});
test("heat snapshots progressively add real update, sources, clock, large texture, probe and validation", async () => {
  for (let stage = 0; stage <= 9; stage++) {
    const main = await checkpoint(stage, "src/main.cpp"),
      solver = await checkpoint(stage, "include/diffusion.hpp"),
      brush = await checkpoint(stage, "include/brush.hpp"),
      view = await checkpoint(stage, "include/view.hpp"),
      workshop = await checkpoint(stage, "include/workshop.hpp");
    assert.equal(view.includes("inline void drawGrid("), stage >= 1);
    assert.equal(brush.includes("inline void paintStroke("), stage >= 2);
    assert.equal(solver.includes("inline StepResult diffuse("), stage >= 3);
    assert.equal(solver.includes("value += coefficients.ry * vertical;"), stage >= 4);
    assert.equal(solver.includes("field.pins[index] != Pin::None"), stage >= 5);
    assert.equal(main.includes("heat::planSteps("), stage >= 6);
    assert.equal(view.includes("SDL_LockTexture("), stage >= 7);
    assert.equal(main.includes("heat::drawTexture("), stage >= 7);
    assert.equal(main.includes("heat::drawGrid("), stage >= 1 && stage < 7);
    assert.equal(workshop.includes("state.history[state.historyCount] ="), stage >= 8);
    assert.equal(main.includes("heat::validatePlate("), stage >= 9);
    assert.doesNotMatch(solver, /field\.next\[index\]\s*=\s*std::clamp/);
  }
  const final = await checkpoint(9, "src/main.cpp");
  const options = await checkpoint(9, "include/options.hpp");
  assert.match(options, /size = 192/);
  assert.ok(
    final.indexOf("heat::benchmarkPlate(options)") < final.indexOf("SDL_Init(SDL_INIT_VIDEO)"),
  );
  const solver = await checkpoint(9, "include/diffusion.hpp");
  assert.ok(solver.indexOf("result.maximumAbs > 16") < solver.indexOf("field.current.swap"));
});
test("heat documents boundary/source semantics, real instability, same-domain refinement and bounded benchmark", async () => {
  const lesson = async (number) =>
    readFile(path.join(content, project.lessons[number - 1].slug + ".mdx"), "utf8");
  assert.match(await lesson(5), /không cấp một công suất cố định/);
  assert.match(await lesson(6), /12 bước/);
  assert.match(await lesson(6), /không.*clamp|không bỏ kiểm NaN/);
  assert.match(await lesson(7), /không phải một phép refinement/);
  assert.match(await lesson(8), /120 sample/);
  const final = await lesson(9);
  assert.match(final, /oracle.*không gọi|oracle không gọi/i);
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  assert.match(final, /100 triệu/);
  assert.match(final, /deadline 20 giây/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(tests, /edgeReference/);
  assert.match(tests, /LARGE_FIELD/);
  assert.match(tests, /\{15, 30, 120\}/);
});
test("heat final teaching source has explanatory comments, four-space blocks and explicit cleanup", async () => {
  const files = [
    ...(await readdir(path.join(source, "final/include"))).map((file) => "include/" + file),
    "src/main.cpp",
    "tests/tests.cpp",
  ];
  for (const relative of files) {
    const text = relative.startsWith("tests/")
      ? await readFile(path.join(source, relative), "utf8")
      : await checkpoint(9, relative);
    for (const [index, line] of text.split(/\r?\n/).entries())
      assert.equal(line.match(/^ */)[0].length % 4, 0, `${relative}:${index + 1}`);
    const comments = text
      .split(/\r?\n/)
      .filter(
        (line) =>
          /^\s*\/\/ /.test(line) && !line.includes("namespace") && !line.includes("snippet"),
      );
    assert.ok(comments.length > 0, relative + " needs a real explanatory comment");
    assert.ok((text.match(/\n\s*\n/g) ?? []).length >= 2, relative);
  }
  const main = await checkpoint(9, "src/main.cpp");
  assert.match(main, /\/\/ Khởi tạo SDL/);
  assert.match(main, /\/\/ Giải phóng/);
});

test("Project 47 current routes render complete runnable source and old final URL redirects", async () => {
  const overview = await render(`/projects/${slug}`);
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /192×192/);
  assert.doesNotMatch(html, /aria-label="Chờ nghiệm thu"/);
  assert.match(html, /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  for (const lesson of project.lessons) {
    const response = await render(`/projects/${slug}/${lesson.slug}`);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /one-dark-pro/);
    assert.match(body, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(body, /katex-error/);
    assert.ok(Buffer.byteLength(body) < 450 * 1024, lesson.slug);
  }
  const old = await render(`/projects/${slug}/08-kiem-chung-va-ban-hoan-chinh`);
  assert.ok([301, 302, 307, 308].includes(old.status));
  assert.ok(old.headers.get("location")?.endsWith(project.lessons[8].slug));
});
