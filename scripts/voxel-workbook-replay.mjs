import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { voxelWorkEdits } from "../lib/voxel-work-edits.ts";

export const textAt = (dir, file) =>
  readFileSync(path.join(dir, file), "utf8").replaceAll("\r", "").trimEnd();

// Read the ordered instructions in the lesson, not changedPaths or the final file list.
export function workPaths(mdx, project, step) {
  const body = mdx.split("## Viết code từng bước")[1].split("## Ghép các phần lại")[0];
  const tags = [
    ...body.matchAll(/<VoxelWorkFile project="(\d\d)" step=\{(\d+)\} file="([a-z-]+)"\s*\/>/g),
  ];
  assert.ok(tags.length, "No implementation steps");
  const paths = tags.map(([, id, number, name]) => {
    assert.equal(id, project);
    assert.equal(Number(number), step);
    return "include/trail/" + name + ".hpp";
  });
  assert.equal(new Set(paths).size, paths.length, "A work file is assigned twice");
  return paths;
}

export function snapshot(dir) {
  const tree = new Map();
  function visit(prefix) {
    for (const entry of readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
      const rel = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.isDirectory()) visit(rel);
      else tree.set(rel, textAt(dir, rel));
    }
  }
  visit("");
  return tree;
}

export function replayLesson(current, previous, solution, paths) {
  let count = 0;
  for (const file of paths) {
    const rows = current.get(file).split("\n");
    const edits = voxelWorkEdits(previous.get(file), solution.get(file));
    assert.ok(edits.length, file + ": no edit to make");
    for (const { line, above, below, remove, write } of edits) {
      const at = line - 1;
      assert.deepEqual(rows.slice(at - above.length, at), above, file + ": upper landmark");
      assert.deepEqual(rows.slice(at, at + remove.length), remove, file + ": old block");
      assert.deepEqual(
        rows.slice(at + remove.length, at + remove.length + below.length),
        below,
        file + ": lower landmark",
      );
      rows.splice(at, remove.length, ...write);
      ++count;
    }
    current.set(file, rows.join("\n"));
  }
  // Crucially, check ALL files, so omitting an integration step cannot pass.
  assert.deepEqual(current, solution, "Following the lesson did not reconstruct this stage");
  return count;
}
