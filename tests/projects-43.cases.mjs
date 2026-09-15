import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";

const slug = "periodic-molecular-box";
const source = path.join(workspace, "examples", `project-43-${slug}`);

test("Project 43 publishes eight complete periodic-boundary lesson routes", async () => {
  const overview = await render(`/projects/${slug}`);
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  assert.equal(lessons.length, 8);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200, lesson.route);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 300 * 1024, lesson.route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});

test("Project 43 introduces geometry, dynamics and diagnostics progressively", async () => {
  const starter = await readFile(path.join(source, "starter/include/dynamics.hpp"), "utf8");
  assert.ok(!starter.includes("makePair"), "starter must not contain the first lesson's setup");
  const symbols = [
    "makePair",
    "wrapCoordinate",
    "minimumImage",
    "shiftedPair",
    "verletStep",
    "imagePositions",
    "unwrapped",
    "validateRun",
  ];
  for (let checkpoint = 1; checkpoint <= 8; checkpoint += 1) {
    const directory = path.join(source, "checkpoints", String(checkpoint).padStart(2, "0"));
    const code = (
      await Promise.all(
        ["include/periodic.hpp", "include/dynamics.hpp", "include/view.hpp", "src/main.cpp"].map(
          (file) => readFile(path.join(directory, file), "utf8"),
        ),
      )
    ).join("\n");
    assert.ok(
      code.includes(symbols[checkpoint - 1]),
      `checkpoint ${checkpoint} missing new concept`,
    );
    for (const later of symbols.slice(checkpoint)) {
      assert.ok(!code.includes(later), `checkpoint ${checkpoint} leaks ${later}`);
    }
    assert.ok(!code.includes("LAB_CHECKPOINT"));
  }
});

test("Project 43 keeps explanations, force invariants and bounded work in the delivered source", async () => {
  const lessons = (await authoredLessons()).filter((lesson) => lesson.project === slug);
  const modes = [
    "pbc-box",
    "pbc-wrap",
    "pbc-distance",
    "pbc-forces",
    "pbc-verlet",
    "pbc-images",
    "pbc-unwrapped",
    "pbc-final",
  ];
  const contracts = [
    [/SDL_RenderFillRect/, /đứng yên/],
    [/floor/, /velocity/],
    [/nửa hộp/, /minimumImage/],
    [/force-shifted/, /cutoff/, /sample.slope/],
    [/candidate/, /maximumSteps/],
    [/vector<Vec2>/, /showImages/],
    [/displacement/, /240/, /unwrapped/],
    [/Mã nguồn hoàn chỉnh/, /timeout 20/, /Debug/, /Release/, /chín ảnh/],
  ];
  for (let index = 0; index < lessons.length; index += 1) {
    const text = await readFile(path.join(workspace, "content", slug, lessons[index].file), "utf8");
    assert.ok(text.includes(`mode="${modes[index]}"`));
    for (const pattern of contracts[index])
      assert.match(text, pattern, `Lesson ${index + 1} missing ${pattern}`);
    const experiments = text
      .split("## Thử làm sai để hiểu đúng")[1]
      .split("## Tự kiểm tra kết quả")[0];
    assert.ok((experiments.match(/^\d+\. /gm) ?? []).length >= 2);
  }
  const math = await readFile(path.join(source, "final/include/dynamics.hpp"), "utf8");
  const main = await readFile(path.join(source, "final/src/main.cpp"), "utf8");
  const nativeTests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components/labs/periodic-molecular-box-lab.tsx"),
    "utf8",
  );
  assert.match(math, /cutoff < 0\.5 \* std::min/);
  assert.match(math, /system = std::move\(candidate\)/);
  assert.match(main, /maximumSteps = 1/);
  assert.match(nativeTests, /interacting pair really crosses a seam/);
  assert.match(nativeTests, /rollback unwrapped/);
  assert.match(canvas, /setPointerCapture/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /cancelAnimationFrame/);
  assert.match(canvas, /Nửa cạnh ngắn nhất/);
});
