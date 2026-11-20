import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { markedCodeExcerpt, markedSnippetBlockPattern } from "../scripts/code-snippets.mjs";
import { workspace, projectCatalog, authoredLessons, render } from "./site-support.mjs";

const stages = [
  ["68", 6, "survey.html"],
  ["69", 5, "field.css"],
  ["70", 6, "column.css"],
  ["71", 5, "survey.html"],
  ["72", 7, "close-study.tiny"],
];
for (const [id, count, fixture] of stages) {
  const project = projectCatalog.find((item) => item.id === id);
  const root = path.join(workspace, "examples", project.sourceDirectory);
  test(
    "Project " + id + ": every worked excerpt belongs to this checkpoint or its editable asset",
    async () => {
      const lessons = (await authoredLessons()).filter((lesson) => lesson.project === project.slug);
      assert.equal(lessons.length, count);
      let assetsShown = 0;
      for (const [index, { file }] of lessons.entries()) {
        const source = (
          await readFile(path.join(workspace, "content", project.slug, file), "utf8")
        ).replaceAll("\r", "");
        const snippets = [...source.matchAll(markedSnippetBlockPattern())];
        assert.ok(snippets.length >= 2, file);
        for (const marker of snippets) {
          const where = marker[2].startsWith("tests/")
            ? root
            : path.join(root, "checkpoints", String(index + 1).padStart(2, "0"));
          const body = markedCodeExcerpt(
            (await readFile(path.join(where, marker[2]), "utf8")).replaceAll("\r", ""),
            marker[3],
          );
          assert.ok(marker[0].includes("\n" + body + "\n```"), file + " " + marker[3]);
        }
        for (const m of source.matchAll(
          /\{\/\* asset (assets\/[\w.-]+) \*\/\}\s*```[^\n]+\n([\s\S]*?)\n```/g,
        )) {
          const expected = await readFile(path.join(root, m[1]), "utf8");
          assert.equal(m[2], expected.trimEnd().replaceAll("\r", ""), file + " " + m[1]);
          assetsShown++;
        }
      }
      assert.ok(assetsShown > 0);
    },
  );
  test(
    "Project " +
      id +
      ": challenge, native illustrations, editable files and standalone final are reachable",
    async () => {
      const overview = await render("/projects/" + project.slug);
      assert.equal(overview.status, 200);
      assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
      const lessons = (await authoredLessons()).filter((lesson) => lesson.project === project.slug);
      for (const [i, lesson] of lessons.entries()) {
        const response = await render(lesson.route);
        const html = await response.text();
        assert.equal(response.status, 200, lesson.file);
        assert.match(html, /data-native-media/);
        assert.match(html, /one-dark-pro/);
        assert.match(html, /ma-chay-duoc-sau-bai/);
        assert.doesNotMatch(html, /katex-error/);
        if (i !== lessons.length - 1) continue;
        for (const text of [
          "ma-hoan-chinh-cua-project",
          project.sourceDirectory + ".zip",
          "assets/" + fixture,
          "src/main.cpp",
          "tests/tests.cpp",
        ]) {
          assert.ok(html.includes(text), project.slug + ": " + text);
        }
      }
    },
  );
}
