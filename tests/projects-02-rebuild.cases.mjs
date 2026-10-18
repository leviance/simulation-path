import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-02-wasd-fps-cap");
test("Project 02 rebuild traces each code excerpt to an actual checkpoint", async () => {
  const folder = path.join(workspace, "content/wasd-fps-cap");
  let count = 0;
  for (const file of (await readdir(folder)).filter((name) => name.endsWith(".mdx"))) {
    const mdx = await readFile(path.join(folder, file), "utf8");
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        path.join(
          root,
          relative.startsWith("tests/")
            ? relative
            : "checkpoints/" + file.slice(0, 2) + "/" + relative,
        ),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      count += 1;
    }
  }
  assert.ok(count >= 30);
});

test("Project 02 rebuild teaches CPU fill before movement and exports complete final source", async () => {
  const first = await readFile(
    path.join(workspace, "content/wasd-fps-cap/01-keyboard-state.mdx"),
    "utf8",
  );
  assert.ok(
    first.indexOf("inline void fillRectangle") < first.indexOf("inline Vec2 directionFromKeys"),
  );
  assert.match(first, /chưa.*chuẩn hóa/i);
  const third = await readFile(
    path.join(workspace, "content/wasd-fps-cap/03-loi-frame-based.mdx"),
    "utf8",
  );
  assert.match(third, /vật tham chiếu riêng/);
  assert.match(third, /không có biên/);
  const fourth = await readFile(
    path.join(workspace, "content/wasd-fps-cap/04-delta-time.mdx"),
    "utf8",
  );
  assert.match(fourth, /0,15/);
  assert.match(fourth, /Fixed timestep/);
  const response = await render("/projects/wasd-fps-cap/06-validation");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const file of [
    "include/framebuffer.hpp",
    "include/presentation.hpp",
    "include/measurement.hpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  assert.match(html, /Toàn bộ mã nguồn của dự án/i);
});

test("Project 02 rebuild final uses CPU fill, focus-safe clock and a guarded limiter", async () => {
  const main = await readFile(path.join(root, "final/src/main.cpp"), "utf8");
  assert.doesNotMatch(main, /SDL_Render(?:FillRect|Point|Line)\(/);
  assert.match(main, /SDL_LOGICAL_PRESENTATION_LETTERBOX/);
  assert.match(main, /SDL_WINDOW_MINIMIZED/);
  assert.match(main, /SDL_WINDOW_INPUT_FOCUS/);
  assert.match(main, /SDLK_F1/);
  assert.match(main, /smokeFrames >= 12/);
  const math = await readFile(path.join(root, "final/include/lab.hpp"), "utf8");
  assert.match(math, /!std::isfinite\(dt\)/);
  assert.match(math, /workNs >= targetNs/);
  assert.doesNotMatch(math, /moveFrameBased/);
});
