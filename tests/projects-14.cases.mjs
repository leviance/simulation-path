import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-14-fps-camera-room");
const lessons = [
  "01-dung-can-phong-wireframe",
  "02-camera-position-va-view-translation",
  "03-inverse-yaw-va-pitch",
  "04-forward-right-up-cua-camera",
  "05-wasd-theo-huong-nhin-va-delta-time",
  "06-walk-fly-va-dieu-khien-doc",
  "07-relative-mouse-mode-va-pitch-clamp",
  "08-gioi-han-phong-va-che-do-demo",
  "09-hoan-thien-va-kiem-chung",
];
test("Project 14 rebuild has nine teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/fps-camera-room")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/fps-camera-room", file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        relative.startsWith("tests/")
          ? path.join(root, relative)
          : path.join(root, "checkpoints", String(i + 1).padStart(2, "0"), relative),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      const actual = source.split(/\r?\n/),
        lines = snippet.split(/\r?\n/);
      const start = actual.findIndex((_, offset) =>
        lines.every((line, j) => actual[offset + j]?.trim() === line.trim()),
      );
      assert.ok(start >= 0, title);
      const original = actual.slice(start, start + lines.length),
        indent = Math.min(...original.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      assert.equal(
        snippet,
        original.map((l) => l.slice(indent)).join("\n"),
        file + " indent drift",
      );
      count++;
    }
    assert.ok(count >= 3, file + " needs substantial source");
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file + " needs explained steps");
    const experiment = mdx
      .split("## Thử làm sai để hiểu đúng")[1]
      .split("## Tự kiểm tra kết quả")[0];
    assert.ok(
      (experiment.match(/^\d+\. /gm) ?? []).length >= 2,
      file + " needs observable experiments",
    );
    assert.doesNotMatch(mdx, /Checkpoint đang xây|TODO|lorem ipsum/);
    for (const role of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(mdx.includes("## " + role));
  }
});

test("Project 14 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/fps-camera-room", slug + ".mdx"),
      "utf8",
    );
    const compiled = String(await compile(source, courseMdxOptions));
    assert.match(
      source,
      /^import \{ InteractiveLab \} from "@\/components\/labs\/interactive-lab";/m,
    );
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
    assert.match(compiled, /one-dark-pro/);
    assert.match(compiled, /InteractiveLab/);
    assert.match(compiled, /ma-chay-duoc-sau-bai|tự-kiểm-tra-kết-quả/);
  }
});

test("Project 14 rebuild implements the required native FPS product progressively", async () => {
  const source = (f) => readFile(path.join(root, f), "utf8");
  const lab = await source("final/include/lab.hpp"),
    room = await source("final/include/room.hpp"),
    scene = await source("final/include/scene.hpp"),
    view = await source("final/include/view.hpp"),
    main = await source("final/src/main.cpp");
  for (const fn of [
    "worldToCameraTranslation",
    "worldToCamera",
    "cameraBasis",
    "groundForward",
    "movementDirection",
    "advanceCamera",
    "applyMouseLook",
    "cameraToWorld",
    "basisError",
    "viewRoundTripError",
  ])
    assert.ok(lab.includes(fn), fn);
  assert.match(lab, /rotateY\(relative, -camera.yaw\)/);
  assert.match(lab, /rotateX\(yawNeutral, camera.pitch\)/);
  assert.match(lab, /direction.y \+= input.lift/);
  assert.match(room, /maxZ = 22.0/);
  assert.match(room, /appendBox\(room/);
  assert.match(scene, /return \{0.0, 0.0, 1100.0, 800.0\}/);
  assert.match(view, /clipDepth\(a, b, scene.lens\)/);
  assert.match(view, /clipScreen\(from, to, viewportFor\(\)\)/);
  assert.doesNotMatch(main + view, /SDL_Render(?:Line|Lines|Geometry)\(/);
  for (const text of [
    "SDL_SetWindowRelativeMouseMode",
    "SDL_GetWindowRelativeMouseMode",
    "SDL_GetKeyboardState",
    "SDL_WINDOW_INPUT_FOCUS",
    "SDL_EVENT_WINDOW_FOCUS_LOST",
    "SDL_EVENT_WINDOW_HIDDEN",
    "SDL_EVENT_WINDOW_RESIZED",
    "const lab::RoomGeometry worldRoom",
    "inputArmed = false",
  ])
    assert.ok(main.includes(text), text);
  const motionStart = main.indexOf("if (event.type == SDL_EVENT_MOUSE_MOTION");
  const motion = main.slice(
    motionStart,
    main.indexOf("dirty = true;", motionStart) + "dirty = true;".length,
  );
  assert.doesNotMatch(motion, /ConvertEventToRenderCoordinates|deltaTime/);
  assert.doesNotMatch(
    await source("checkpoints/01/include/lab.hpp"),
    /inline Vec3 worldToCameraTranslation/,
  );
  assert.match(
    await source("checkpoints/02/include/lab.hpp"),
    /inline Vec3 worldToCameraTranslation/,
  );
  assert.doesNotMatch(
    await source("checkpoints/02/include/lab.hpp"),
    /inline Vec3 worldToCamera\(/,
  );
  assert.doesNotMatch(await source("checkpoints/04/src/main.cpp"), /SDL_GetKeyboardState/);
  assert.match(await source("checkpoints/05/src/main.cpp"), /SDL_GetKeyboardState/);
  assert.doesNotMatch(await source("checkpoints/05/include/lab.hpp"), /direction.y \+= input.lift/);
  assert.match(await source("checkpoints/06/include/lab.hpp"), /direction.y \+= input.lift/);
  assert.doesNotMatch(
    await source("checkpoints/06/src/main.cpp"),
    /SDL_SetWindowRelativeMouseMode/,
  );
  assert.match(await source("checkpoints/07/src/main.cpp"), /SDL_SetWindowRelativeMouseMode/);
  assert.doesNotMatch(
    await source("checkpoints/07/include/scene.hpp"),
    /inline FpsCamera clampCameraToRoom/,
  );
  assert.match(
    await source("checkpoints/08/include/scene.hpp"),
    /inline FpsCamera clampCameraToRoom/,
  );
  assert.doesNotMatch(await source("checkpoints/08/include/lab.hpp"), /inline Vec3 cameraToWorld/);
  const tests = await source("tests/tests.cpp");
  assert.match(tests, /yaw 90 independent view oracle/);
  assert.match(tests, /fly pitch45 independent movement oracle/);
  assert.match(tests, /clean mode retains walls/);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
});
test("Project 14 rebuild renders nine routes and complete runnable room source", async () => {
  for (const slug of lessons) {
    const response = await render("/projects/fps-camera-room/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
  }
  const html = await (await render("/projects/fps-camera-room/" + lessons.at(-1))).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/room.hpp",
    "include/scene.hpp",
    "include/view.hpp",
    "include/projection.hpp",
    "include/rotation.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  for (const text of [
    "Mode:",
    "Walk",
    "FPS thí nghiệm",
    "Ẩn debug",
    "basis error",
    "round-trip error",
  ])
    assert.ok(html.includes(text), text);
  assert.match(html, /projects\/3d-pipeline-inspector/);
});
