import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { markedCodeExcerpt } from "../scripts/code-snippets.mjs";

const root = process.cwd();
const directory = path.join(root, "examples/project-53-volume-slicer");
test("P53 teaching code is exactly marked in the checkpoint being taught", () => {
  let count = 0;
  for (const file of readdirSync("content/volume-slicer").filter((f) => f.endsWith(".mdx"))) {
    const stage = file.slice(0, 2);
    const body = readFileSync(path.join("content/volume-slicer", file), "utf8");
    const fences = [...body.matchAll(/```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g)];
    const marked = [
      ...body.matchAll(
        /\{\/\* snippet ([^#]+)#([a-z0-9-]+) \*\/\}\r?\n(?:\r?\n)*```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.equal(marked.length, fences.length, file + " must mark every C++ block");
    for (const [, relative, marker, title, code] of marked) {
      assert.equal(title.split(" — ")[0], relative);
      const base = relative.startsWith("tests/")
        ? directory
        : path.join(directory, "checkpoints", stage);
      const source = readFileSync(path.join(base, relative), "utf8");
      assert.equal(code.replace(/\r/g, ""), markedCodeExcerpt(source, marker), file + "#" + marker);
      count++;
    }
    for (const heading of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(body.includes("## " + heading), file + " needs " + heading);
  }
  assert.ok(count >= 23);
});

test("P53 release uses real 128^3, explicit presets and cached image stages", () => {
  const model = readFileSync(path.join(directory, "source-template/include/model.hpp"), "utf8");
  assert.match(model, /128, 128, 128/);
  for (const name of ["Sphere", "Gaussian", "Layers", "Ramp"]) assert.ok(model.includes(name));
  const native = readFileSync(path.join(directory, "source-template/include/state.hpp"), "utf8");
  assert.match(native, /#if LAB_CHECKPOINT >= 7\s+side = 128;/);
  assert.match(native, /ready = loadDataset\(Preset::Phantom, side\)/);
  const finalState = readFileSync(path.join(directory, "final/include/state.hpp"), "utf8");
  assert.match(finalState, /side = 128;\s+ready = loadDataset\(Preset::Phantom, side\)/);
  const canvas = readFileSync("components/labs/volume-slicer-lab.tsx", "utf8");
  assert.match(canvas, /data-volume53-ready/);
  assert.match(canvas, /rawXY/);
  const dataset = readFileSync("lib/labs/volume-slicer/dataset.ts", "utf8");
  assert.match(dataset, /histogram\(volume\)/);
  assert.match(dataset, /extractSurface\(volume\)/);
  assert.match(canvas, /createDataset\(side, preset, stage >= 3\)/);
  assert.match(canvas, /if \(!ready \|\| stage < 2\)/);
  assert.match(canvas, /stage >= 7 \? 128 : 64/);
  assert.match(canvas, /Ctrl\+mũi tên/);
  assert.match(canvas, /Nguyên khối/);
  assert.match(canvas, /Cắt mở/);
  assert.match(canvas, /pointer\.current/);
  const readme = readFileSync(path.join(directory, "README.md"), "utf8");
  assert.match(readme, /128³ = 2\.097\.152/);
  assert.match(readme, /--parallel 1/);
  assert.doesNotMatch(readme, /--parallel 2/);
});
