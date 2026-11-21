import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { learnerBuild, workbookOption } from "../lib/voxel-workbook.ts";
import { markedCodeExcerpt, markedSnippetBlockPattern } from "../scripts/code-snippets.mjs";
import { loadProjectCatalog, workspace } from "../scripts/project-catalog.mjs";

const read = (...parts) =>
  readFileSync(path.join(workspace, ...parts), "utf8").replaceAll("\r\n", "\n");

test("each published ZIP configuration separates learner headers from its reference headers", () => {
  for (const p of loadProjectCatalog()) {
    const cmake = read("examples", p.sourceDirectory, "CMakeLists.txt");
    const plan = learnerBuild(p.id);
    const option = workbookOption(p.id);
    const target = "project_" + Number(p.id);
    const selection = cmake.slice(cmake.indexOf("add_executable(" + target + "_tests"));
    assert.ok(selection.includes("if(" + option + ")"), p.slug);
    for (const [i, tree] of ["work", "starter", "final"].entries()) {
      const branch = selection.split(/\n    (?:elseif\(COURSE_TEST_STARTER\)|else\(\)|endif\(\))/)[
        i
      ];
      assert.deepEqual(
        [...branch.matchAll(/target_include_directories\([^\n]+? PRIVATE ([^)]+)\)/g)].map(
          (m) => m[1],
        ),
        [tree + "/include"],
        p.slug,
      );
    }
    assert.ok(selection.includes('OUTPUT_NAME "' + target + '_${test_tree}_tests"'), p.slug);
    assert.ok(selection.includes("DEPENDS " + target + "_tests"), p.slug);
    assert.ok(selection.includes('-L "^learner$" --no-tests=error'), p.slug);
    assert.ok(cmake.includes("if(" + option + " AND COURSE_TEST_STARTER)"), p.slug);
    assert.equal(plan.target, target + "_" + plan.tree);
    assert.equal(plan.check, target + "_check_work");
    assert.ok(
      plan.flags.includes((plan.tree === "starter" ? "COURSE_TEST_STARTER" : option) + "=ON"),
    );
  }
});

test("P03 and P13 teach complete definitions from the checkpoint where they first matter", () => {
  for (const [slug, file, folder, step, checks] of [
    [
      "mini-paint",
      "03-net-ve-bi-dut.mdx",
      "project-03-mini-paint",
      "03",
      [
        ["apply-stamp", /\+\+state\.stamps;\s*\}$/],
        ["start-stroke", /applyStamp\(framebuffer, state, point\);\s*return true;\s*\}$/],
        ["move-stroke", /state\.previous = current;\s*return true;\s*\}$/],
        [
          "finish-stroke",
          /moveStroke\(framebuffer, state, endpoint, true\)[\s\S]*cancelStroke\(state\);\s*return changed;\s*\}$/,
        ],
      ],
    ],
    [
      "wireframe-cube",
      "01-tam-dinh-va-quy-uoc-index.mdx",
      "project-13-wireframe-cube",
      "01",
      [
        ["projected-cube", /std::size_t projectionCount = 0;\s*\};$/],
        ["project-eight-vertices", /\+\+projected\.projectionCount;[\s\S]*return projected;\s*\}$/],
      ],
    ],
  ]) {
    const mdx = read("content", slug, file);
    const excerpts = [...mdx.matchAll(markedSnippetBlockPattern())];
    let last = -1;
    for (const [marker, required] of checks) {
      const block = excerpts.find((m) => m[3] === marker);
      assert.ok(block && block.index > last, marker + " must appear in dependency order");
      const snapshot = read("examples", folder, "checkpoints", step, block[2]);
      const source = markedCodeExcerpt(snapshot, marker);
      assert.equal(block[0].split(/^```cpp[^\n]*\n/m)[1].replace(/\n```$/, ""), source, marker);
      assert.match(source, required);
      last = block.index;
    }
  }
});
