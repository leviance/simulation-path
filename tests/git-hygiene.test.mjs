import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isGeneratedCoursePath, trackedGeneratedFiles } from "../scripts/git-hygiene.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputs = [
  "course/generated/catalog.ts",
  "content/generated/p78.ts",
  "content/registry.ts",
  "lib/generated-checkpoint-sources.ts",
  "lib/generated-checkpoint-sources/p78/final.ts",
  "examples/project-78-floating-point/starter/src/main.cpp",
  "examples/project-78-floating-point/checkpoints/12/include/math.hpp",
  "examples/project-78-floating-point/final/src/main.cpp",
  "examples/project-78-floating-point/CMakeLists.txt",
  "public/downloads/project-78-floating-point.zip",
  "public/downloads/manifest.json",
];
const authored = [
  "course/projects.json",
  "course/projects/p78/manifest.ts",
  "content/floating-point/01-intro.mdx",
  "examples/project-78-floating-point/source-template/src/main.cpp",
  "examples/project-78-floating-point/source-template/include/final/math.hpp",
  "examples/project-78-floating-point/tests/tests.cpp",
  "examples/project-78-floating-point/assets/mesh.obj",
  "examples/project-78-floating-point/README.md",
  "scripts/course-cmake.mjs",
  "lib/checkpoint-source.ts",
  "package-lock.json",
];

function git(directory, args, options = {}) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
    ...options,
  });
}

test("generated-output policy covers future projects without excluding authored sources", () => {
  for (const file of outputs) assert.equal(isGeneratedCoursePath(file), true, file);
  for (const file of authored) assert.equal(isGeneratedCoursePath(file), false, file);
});

test("Git ignores generated outputs and the guard catches force-added files", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "simulation-path-git-policy-"));
  try {
    git(root, ["init", "--quiet"]);
    copyFileSync(path.join(workspace, ".gitignore"), path.join(root, ".gitignore"));
    copyFileSync(path.join(workspace, ".gitattributes"), path.join(root, ".gitattributes"));
    for (const file of [...outputs, ...authored]) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, "fixture\n");
    }
    const ignored = git(root, ["check-ignore", "--no-index", "-z", "--stdin"], {
      input: [...outputs, ...authored].join("\0") + "\0",
    })
      .split("\0")
      .filter(Boolean)
      .sort();
    assert.deepEqual(ignored, [...outputs].sort());
    git(root, ["add", "--all"]);
    assert.deepEqual(trackedGeneratedFiles(root), []);

    // .gitignore alone cannot protect against files that were already tracked or force-added.
    git(root, ["add", "--force", "--", outputs[0], outputs[5]]);
    assert.deepEqual(trackedGeneratedFiles(root), [outputs[0], outputs[5]]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
