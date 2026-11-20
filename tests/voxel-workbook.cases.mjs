import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { readdirSync } from "node:fs";
import { loadProjectCatalog, workspace } from "../scripts/project-catalog.mjs";
import { snapshot, textAt, workPaths, replayLesson } from "../scripts/voxel-workbook-replay.mjs";
import { voxelWorkEdits } from "../lib/voxel-work-edits.ts";
import {
  isContiguousCodeExcerpt,
  markedCodeExcerpt,
  markedSnippetBlockPattern,
} from "../scripts/code-snippets.mjs";

for (const p of loadProjectCatalog().filter((p) => p.sourceSeries === "voxel-expedition")) {
  test(
    "Project " + p.id + ": follow every work-file step, starting at the untouched starter",
    () => {
      const dir = path.join(workspace, "examples", p.sourceDirectory);
      const lessons = path.join(workspace, "content", p.slug);
      const learner = snapshot(path.join(dir, "starter"));
      let previous = new Map(learner);
      for (const [index, lesson] of readdirSync(lessons)
        .filter((f) => f.endsWith(".mdx"))
        .sort()
        .entries()) {
        const order = index + 1,
          mdx = textAt(lessons, lesson);
        const after = snapshot(path.join(dir, "checkpoints", String(order).padStart(2, "0")));
        const paths = workPaths(mdx, p.id, order);
        const shown = [...mdx.matchAll(markedSnippetBlockPattern())];
        assert.ok(
          shown.some(([, , file, marker]) => {
            const code = markedCodeExcerpt(after.get(file), marker);
            return paths.includes(file) && !isContiguousCodeExcerpt(code, previous.get(file) ?? "");
          }),
          lesson + " illustrates only code that was already in the previous lesson",
        );
        replayLesson(learner, previous, after, paths);
        const recipe = mdx.split("## Ghép các phần lại")[1].split("## Thử làm sai")[0];
        assert.ok(recipe.includes("--target project_" + p.id + "_work --parallel 1"));
        assert.doesNotMatch(recipe, /--target project_\d+_(?:checkpoint|final)/);
        if (order === p.checkpointCount) {
          assert.match(mdx, /ctest --test-dir build-work -C Debug/);
          assert.match(mdx, /ctest --test-dir build-work -C Release/);
        }
        previous = after;
      }
      assert.deepEqual(learner, snapshot(path.join(dir, "final")));
    },
  );
}

test("work-file insertion, replacement and deletion keep the surrounding learner code", () => {
  const before = ["title", "a", "b", "c", "d", "old", "e", "f", "g", "h", "remove"].join("\n");
  const after = ["first", "title", "a", "b", "c", "d", "new", "e", "f", "g", "h"].join("\n");
  assert.equal(voxelWorkEdits(before, after).length, 3);
  const learner = new Map([["file", before]]);
  replayLesson(learner, new Map(learner), new Map([["file", after]]), ["file"]);
});
