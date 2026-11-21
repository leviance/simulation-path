import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadProjectCatalog, workspace } from "../scripts/project-catalog.mjs";
import { snapshot, replayLesson, workPaths } from "../scripts/voxel-workbook-replay.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { hasGuidedWorkFiles, workbookOption } from "../lib/voxel-workbook.ts";

for (const project of loadProjectCatalog().filter(
  (p) => hasGuidedWorkFiles(p.id) && workbookOption(p.id) === "COURSE_WORKBOOK",
)) {
  test(
    "A learner can reconstruct every file of Project " + project.id + " from the authored lessons",
    () => {
      const root = path.join(workspace, "examples", project.sourceDirectory);
      const articles = path.join(workspace, "content", project.slug);
      const cmake = readFileSync(path.join(root, "CMakeLists.txt"), "utf8");
      assert.match(cmake, /if\(COURSE_WORKBOOK\)[\s\S]*?if\(NOT EXISTS "[^"]+\/work"\)/);
      assert.ok(
        cmake.includes(
          "target_include_directories(project_" + project.id + "_tests PRIVATE work/include)",
        ),
      );
      let previous = snapshot(path.join(root, "starter"));
      const work = new Map(previous);
      const lessons = readdirSync(articles)
        .filter((name) => name.endsWith(".mdx"))
        .sort();
      assert.equal(lessons.length, project.checkpointCount);
      for (const [i, lesson] of lessons.entries()) {
        const step = i + 1;
        const text = readFileSync(path.join(articles, lesson), "utf8");
        const body = text.split("## Viết code từng bước")[1]?.split("## Ghép các phần lại")[0];
        assert.ok(body, lesson);
        const files = workPaths(text, project.id, step);
        const solution = snapshot(path.join(root, "checkpoints", String(step).padStart(2, "0")));
        assert.match(
          body,
          /\{\/\* snippet /,
          lesson + ": include at least one source-bound teaching example",
        );
        for (const block of text.matchAll(
          /^```(?:cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)^```/gm,
        )) {
          const file = block[1].split(" — ")[0];
          const source = file.startsWith("tests/")
            ? readFileSync(path.join(root, file), "utf8")
            : solution.get(file);
          assert.ok(
            source && isContiguousCodeExcerpt(block[2], source),
            lesson + ": example differs from " + file,
          );
        }
        try {
          replayLesson(work, previous, solution, files);
        } catch (err) {
          throw new Error(lesson + ": " + String(err.message).slice(0, 330), {
            cause: new Error("Workbook mismatch"),
          });
        }
        previous = solution;
      }
      assert.deepEqual(work, snapshot(path.join(root, "final")));
    },
  );
}
