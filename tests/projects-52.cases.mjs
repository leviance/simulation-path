import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";
const directory = path.join(workspace, "examples/project-52-ray-intersections");
test("Project52 publishes eight staged ray lessons with challenge, One Dark and runnable source", async () => {
  const overview = await render("/projects/ray-intersections");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  const lessons = (await authoredLessons()).filter(
    (lesson) => lesson.project === "ray-intersections",
  );
  assert.equal(lessons.length, 8);
  for (const lesson of lessons) {
    const response = await render(lesson.route),
      html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
    assert.ok(Buffer.byteLength(html) < 250 * 1024);
    const source = await readFile(
      path.join(workspace, "content/ray-intersections", lesson.file),
      "utf8",
    );
    assert.match(source, new RegExp('mode="ray52-' + Number(lesson.file.slice(0, 2)) + '"'));
  }
});
test("Project52 starts with visible scene then introduces each intersection only when taught", async () => {
  for (const [step, file, symbol] of [
    [1, "include/view.hpp", "drawScene("],
    [2, "include/camera.hpp", "cameraRay("],
    [3, "include/hit.hpp", "intersectPlane("],
    [4, "include/sphere.hpp", "intersectSphere("],
    [5, "include/box.hpp", "boxInterval("],
    [6, "include/triangle.hpp", "intersectTriangle("],
    [7, "include/query.hpp", "nearestHit("],
    [8, "include/validation.hpp", "validateHits("],
  ]) {
    const now = await readFile(
        path.join(directory, "checkpoints", String(step).padStart(2, "0"), file),
        "utf8",
      ),
      before = await readFile(
        path.join(
          directory,
          step === 1 ? "starter" : "checkpoints/" + String(step - 1).padStart(2, "0"),
          file,
        ),
        "utf8",
      );
    assert.ok(now.includes(symbol));
    assert.ok(!before.includes(symbol));
  }
});
test("Project52 explains surface versus volume, nonunit t, two-sided triangles and verification limits", async () => {
  const lesson = (name) =>
    readFile(path.join(workspace, "content/ray-intersections", name), "utf8");
  assert.match(await lesson("02-tao-tia-tu-chuot.mdx"), /SDL_ConvertEventToRenderCoordinates/);
  const boxLesson = await lesson("05-giao-voi-box.mdx");
  assert.match(boxLesson, /Đừng kẹp entry bằng tMin/);
  assert.match(boxLesson, /đoạn tia vẫn nằm trong thể tích nhưng chưa chạm mặt nào hợp lệ/);
  assert.match(await lesson("06-giao-voi-triangle.mdx"), /không watertight/);
  assert.match(await lesson("07-chon-hit-gan-nhat.mdx"), /cùng ray/);
  const final = await lesson("08-kiem-chung-va-hoan-thien.mdx");
  assert.match(final, /-C Debug/);
  assert.match(final, /-C Release/);
  assert.match(final, /không phải oracle độc lập/);
});
