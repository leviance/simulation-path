import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";
const chunks = new URL("../dist/client/_next/static/chunks/", import.meta.url);
test("P29 splits advanced diagnostics out of the bounded editor entry chunk", async () => {
  const files = await readdir(chunks);
  for (const prefix of ["quadtree-map-editor-lab-", "map-editor-diagnostics-"]) {
    const file = files.find((name) => name.startsWith(prefix));
    assert.ok(file, prefix);
    assert.ok((await stat(new URL(file, chunks))).size < 24 * 1024, file);
  }
});
test("P29 teaching source avoids compressed ternary and documents every complete file", async () => {
  const root = new URL("../examples/project-29-quadtree-map-editor/", import.meta.url);
  async function walk(dir) {
    const out = [];
    for (const item of await readdir(new URL(dir, root), { withFileTypes: true })) {
      const file = dir + item.name;
      if (item.isDirectory()) out.push(...(await walk(file + "/")));
      else out.push(file);
    }
    return out;
  }
  for (const file of [...(await walk("source-template/")), "tests/tests.cpp"]) {
    const text = await readFile(new URL(file, root), "utf8");
    assert.doesNotMatch(text, /\?[^\r\n:]+:/, file);
    assert.match(text, /^\s*\/\/ /m, file);
    assert.ok((text.match(/\r?\n\s*\r?\n/g) ?? []).length >= 2, file);
  }
  const main = await readFile(new URL("final/src/main.cpp", root), "utf8");
  assert.match(main, /\/\/ Khởi tạo SDL/);
  assert.match(main, /\/\/ Giải phóng/);
});
