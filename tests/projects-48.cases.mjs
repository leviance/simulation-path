import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import project from "../course/projects/p48/manifest.ts";
import lab from "../course/projects/p48/lab.ts";
import learning from "../course/projects/p48/learning.ts";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { lessonSectionUsages, interactiveLabUsages } from "../scripts/mdx-contracts.mjs";
import { markedCodeExcerpt, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { workspace, projectCatalog, render } from "./site-support.mjs";
const slug = "wind-map";
const source = path.join(workspace, "examples/project-48-wind-map");
const content = path.join(workspace, "content", slug);
const checkpoint = (stage, file) =>
  readFile(
    path.join(source, stage ? `checkpoints/${String(stage).padStart(2, "0")}` : "starter", file),
    "utf8",
  );

test("Project 48 challenge meets 65x49 scale and progress migrates only its own old lessons", () => {
  const entry = projectCatalog.find((p) => p.id === "48");
  assert.equal(entry.checkpointCount, 9);
  assert.equal(entry.contentRevision, 2);
  assert.equal(project.lessons.length, 9);
  assert.match(project.challenge.outcome, /65×49/);
  assert.match(project.challenge.requirements.join(" "), /không ghi đè vận tốc/);
  assert.match(project.challenge.definitionOfDone.join(" "), /3.185/);
  const migrated = migrateProgressContent(
    { completedLessonIds: ["p47-l01", "p48-l01", "p49-l01"], lastLessonId: "p48-l01" },
    { p48: 2 },
  );
  assert.deepEqual(migrated.completedLessonIds, ["p47-l01", "p49-l01"]);
  assert.equal(migrated.lastLessonId, undefined);
});

test("all nine wind lessons compile with seven teaching roles and exact checkpoint markers", async () => {
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map((l) => l.slug + ".mdx"),
  );
  assert.deepEqual(
    Object.keys(lab.modes),
    project.lessons.map((l) => `wind-${l.order}`),
  );
  let excerpts = 0;
  for (const lesson of project.lessons) {
    const mdx = await readFile(path.join(content, lesson.slug + ".mdx"), "utf8");
    assert.ok(Buffer.byteLength(mdx) < 32 * 1024, lesson.slug);
    assert.deepEqual(
      lessonSectionUsages(mdx).map((s) => s.key),
      lessonSections.map((s) => s.key),
    );
    assert.deepEqual(interactiveLabUsages(mdx), [{ demo: slug, mode: `wind-${lesson.order}` }]);
    assert.ok(learning.guides[lesson.id]);
    for (const relative of learning.guides[lesson.id].files)
      await readFile(
        path.join(
          source,
          relative.startsWith("tests/")
            ? ""
            : `checkpoints/${String(lesson.order).padStart(2, "0")}`,
          relative,
        ),
      );
    const blocks = [
      ...mdx.matchAll(
        /\{\/\* snippet ([a-zA-Z0-9_./-]+)#([a-z0-9-]+) \*\/\}\r?\n\r?\n```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.equal(blocks.length, [...mdx.matchAll(/```cpp/g)].length);
    assert.ok(blocks.length >= 3, lesson.slug);
    for (const [, file, id, title, code] of blocks) {
      assert.equal(title.split(" — ")[0], file);
      const text = await readFile(
        path.join(
          source,
          file.startsWith("tests/") ? "" : `checkpoints/${String(lesson.order).padStart(2, "0")}`,
          file,
        ),
        "utf8",
      );
      assert.equal(code, markedCodeExcerpt(text, id), `${lesson.slug}: ${id}`);
      assert.ok(isContiguousCodeExcerpt(code, text), id);
      excerpts++;
    }
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.doesNotMatch(compiled, /katex-error/);
  }
  assert.equal(excerpts, 36);
});

test("wind snapshots introduce actual algorithms in order instead of a complete hidden starter", async () => {
  for (const [step, file, symbol] of [
    [1, "include/view.hpp", "drawArrow("],
    [2, "include/scenes.hpp", "populate("],
    [3, "include/derivatives.hpp", "gradient("],
    [4, "include/derivatives.hpp", "divergence("],
    [5, "include/derivatives.hpp", "curl("],
    [6, "include/diagnostics.hpp", "gradientError("],
    [7, "include/particles.hpp", "midpointStep("],
    [8, "include/scenes.hpp", "addVortex("],
    [9, "include/diagnostics.hpp", "validateMap("],
  ]) {
    assert.ok((await checkpoint(step, file)).includes(symbol), symbol);
    assert.ok(
      !(await checkpoint(step - 1, file)).includes(symbol),
      `introduced too early: ${symbol}`,
    );
  }
  assert.match(await checkpoint(9, "include/workshop.hpp"), /return Field\(65, 49\)/);
  assert.match(await checkpoint(6, "include/workshop.hpp"), /return Field\(33, 25\)/);
  const app = await checkpoint(9, "src/main.cpp");
  assert.match(app, /handleInput\(renderer, app, event\)/);
  assert.match(app, /app.advance\(elapsed\)/);
  assert.match(app, /drawWorkshop\(renderer, app\)/);
  assert.match(app, /if \(app.layer != wind::Layer::Arrows\)/);
  assert.match(app, /" overlay_nodes=" << coloredNodes/);
  assert.match(app, /" visited_last_step=" << app.visitedLastStep/);
  assert.doesNotMatch(app, /" overlay_nodes=" << app.field.scalar.size\(\)/);
});

test("wind curriculum distinguishes operators, rendering, numerical error and bounded tracers", async () => {
  const lesson = (number) =>
    readFile(path.join(content, project.lessons[number - 1].slug + ".mdx"), "utf8");
  assert.match(await lesson(1), /scaffold|Scaffold/);
  assert.match(await lesson(3), /không gọi hàm ghi vx\/vy/);
  assert.match(await lesson(5), /\*\*không phải omega\*\*/);
  assert.match(await lesson(6), /không còn là cùng thí nghiệm tinh lưới/);
  assert.match(await lesson(7), /mật độ chấm không đo lượng chất lỏng/);
  assert.match(await lesson(7), /ring buffer 24/);
  assert.match(await lesson(7), /không được|không đổi|không phụ thuộc/);
  assert.match(await lesson(8), /không ép số đo về 0/);
  const final = await lesson(9);
  assert.match(final, /không tự chứng minh gradient chính xác/);
  assert.match(final, /ctest[^\n]+-C Debug/);
  assert.match(final, /ctest[^\n]+-C Release/);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  for (const label of [
    "midpoint converges against analytic rotation",
    "Gaussian gradient converges at both interior and boundary",
    "Gaussian vortex converges to continuum derivatives",
    "trail memory bounded after wrap",
  ])
    assert.ok(tests.includes(label));
  assert.match(tests, /\{15, 30, 120\}/);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
});

test("wind C++ files stay small, commented, four-space indented and non-compressed", async () => {
  for (const relative of [
    "src/main.cpp",
    ...(await readdir(path.join(source, "final/include"))).map((f) => "include/" + f),
  ]) {
    const text = await readFile(path.join(source, "final", relative), "utf8");
    assert.ok(Buffer.byteLength(text) < 32 * 1024, relative);
    assert.match(text, /\/\//, relative);
    assert.doesNotMatch(text, /\t|\?/, relative);
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const indent = line.match(/^ */)[0].length;
      assert.equal(indent % 4, 0, `${relative}: ${line}`);
    }
  }
});

test("Project 48 current overview and nine routes render One Dark source and the right Canvas", async () => {
  const overview = await render("/projects/" + slug);
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  for (const lesson of project.lessons) {
    const response = await render("/projects/" + slug + "/" + lesson.slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 350 * 1024, lesson.slug);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.match(html, /Nút đang chọn/);
    if (lesson.order >= 7) assert.match(html, /65.*49/);
  }
});
