import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { workspace, render } from "./site-support.mjs";
import { markedCodeExcerpt, markedSnippetBlockPattern } from "../scripts/code-snippets.mjs";

// Every stage must introduce runnable code, keep the old route available and cite its own snapshot.
export function expeditionCases(id, slug, stages) {
  const dir = path.join(workspace, "examples", "project-" + id + "-" + slug);
  const read = (...parts) => readFile(path.join(dir, ...parts), "utf8");
  if (id !== "58") {
    test("Project " + id + " sends old bookmarks to real lessons in the new course", async () => {
      const { default: manifest } = await import("../course/projects/p" + id + "/manifest.ts");
      const slugs = new Set(manifest.lessons.map((lesson) => lesson.slug));
      const aliases = Object.entries(manifest.lessonAliases);
      assert.ok(aliases.length > 0);
      for (const [old, canonical] of aliases) {
        assert.ok(slugs.has(canonical), old + " redirects to a missing lesson");
        const response = await render("/projects/" + slug + "/" + old);
        assert.equal(response.status, 308, old);
        assert.equal(
          new URL(response.headers.get("location"), "http://localhost").pathname,
          "/projects/" + slug + "/" + canonical,
        );
      }
    });
  }
  test("Project " + id + " documents the C++ files the student actually receives", async () => {
    const headers = await readdir(path.join(dir, "final/include/trail"));
    const paths = [
      "tests/tests.cpp",
      "final/src/main.cpp",
      ...headers.map((name) => "final/include/trail/" + name),
    ];
    for (const file of paths) {
      const source = await read(file);
      assert.match(source, /^\s*\/\/ /m, file + " needs explanatory comments");
      assert.ok(
        (source.match(/\r?\n\s*\r?\n/g) ?? []).length >= 2,
        file + " needs space between logical groups",
      );
      assert.doesNotMatch(source, /\t/);
      for (const line of source.split(/\r?\n/)) {
        assert.equal(line.match(/^ */)[0].length % 4, 0, file + ": " + line);
      }
    }
  });
  test("Project " + id + " adds each feature only at its assigned checkpoint", async () => {
    for (const [index, [file, symbol]] of stages.entries()) {
      const relative = "include/trail/" + file + ".hpp",
        key = String(index + 1).padStart(2, "0");
      const now = await read("checkpoints", key, relative);
      const before = await read(
        index ? "checkpoints/" + String(index).padStart(2, "0") : "starter",
        relative,
      );
      assert.ok(now.includes(symbol), key + " missing " + symbol);
      assert.ok(!before.includes(symbol), key + " prematurely exposes " + symbol);
    }
  });
  test(
    "Project " + id + " publishes the challenge, all lessons, cited code and a runnable final",
    async () => {
      const response = await render("/projects/" + slug);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
      const contentDir = path.join(workspace, "content", slug);
      const files = (await readdir(contentDir)).filter((n) => n.endsWith(".mdx")).sort();
      assert.equal(files.length, stages.length);
      for (const [i, file] of files.entries()) {
        const source = await readFile(path.join(contentDir, file), "utf8");
        const snippets = [...source.matchAll(markedSnippetBlockPattern())];
        assert.ok(snippets.length >= 2, file);
        for (const m of snippets) {
          const raw = await read("checkpoints", String(i + 1).padStart(2, "0"), m[2]);
          assert.ok(
            source.replaceAll("\r", "").includes(markedCodeExcerpt(raw, m[3]).replaceAll("\r", "")),
            m[3],
          );
        }
        const lesson = await render("/projects/" + slug + "/" + file.slice(0, -4));
        assert.equal(lesson.status, 200);
        const html = await lesson.text();
        assert.match(html, /one-dark-pro/);
        assert.match(html, /ma-chay-duoc-sau-bai/);
        assert.doesNotMatch(html, /katex-error/);
        assert.ok(
          Buffer.byteLength(html) < 520 * 1024,
          "lesson should fetch its own source lazily",
        );
        if (i === files.length - 1) {
          assert.match(html, /ma-hoan-chinh-cua-project/);
          assert.ok(html.includes("project-" + id + "-" + slug + ".zip"));
          const headers = await readdir(path.join(dir, "final/include/trail"));
          const paths = [
            "CMakeLists.txt",
            "src/main.cpp",
            "tests/tests.cpp",
            ...headers.map((name) => "include/trail/" + name),
          ];
          for (const file of paths)
            assert.ok(html.includes(file), "Final source viewer is missing " + file);
          assert.match(source, /ctest[^\n]+-C Debug/);
          assert.match(source, /ctest[^\n]+-C Release/);
        }
      }
    },
  );
}
