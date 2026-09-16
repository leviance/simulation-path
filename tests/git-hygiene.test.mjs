import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isCompiledArtifact,
  isGeneratedCoursePath,
  trackedCompiledFiles,
  trackedGeneratedFiles,
} from "../scripts/git-hygiene.mjs";

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
const compiled = ["tests.obj", "scratch/tests.o", "scratch/tests.exe", "scratch/tests.pdb"];

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
    for (const file of [...outputs, ...authored, ...compiled]) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, "fixture\n");
    }
    const ignored = git(root, ["check-ignore", "--no-index", "-z", "--stdin"], {
      input: [...outputs, ...authored, ...compiled].join("\0") + "\0",
    })
      .split("\0")
      .filter(Boolean)
      .sort();
    assert.deepEqual(ignored, [...outputs, ...compiled].sort());
    git(root, ["add", "--all"]);
    assert.deepEqual(trackedGeneratedFiles(root), []);

    // .gitignore alone cannot protect against files that were already tracked or force-added.
    git(root, ["add", "--force", "--", outputs[0], outputs[5]]);
    assert.deepEqual(trackedGeneratedFiles(root), [outputs[0], outputs[5]]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function coffHeader(machine = 0x8664) {
  const header = Buffer.alloc(20);
  header.writeUInt16LE(machine, 0);
  header.writeUInt16LE(1, 2);
  return header;
}

test("compiled artifacts are rejected without rejecting Wavefront mesh assets", () => {
  for (const machine of [0x014c, 0x8664, 0xaa64]) {
    assert.equal(isCompiledArtifact("nested/tests.obj", coffHeader(machine)), true);
  }
  const bigObj = Buffer.alloc(28);
  bigObj.writeUInt16LE(0xffff, 2);
  bigObj.writeUInt16LE(2, 4);
  bigObj.writeUInt16LE(0x8664, 6);
  assert.equal(isCompiledArtifact("nested/tests.OBJ", bigObj), true);
  assert.equal(isCompiledArtifact("mesh.obj", Buffer.from("v 0 0 0\nv 1 0 0\nf 1 2 3\n")), false);
  assert.equal(isCompiledArtifact("mesh.obj", Buffer.alloc(0)), false);
  for (const file of compiled.slice(1)) assert.equal(isCompiledArtifact(file), true, file);
});

test("compiled-file guard inspects staged bytes, even if the working file is replaced", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "simulation-path-compiled-policy-"));
  try {
    git(root, ["init", "--quiet"]);
    copyFileSync(path.join(workspace, ".gitignore"), path.join(root, ".gitignore"));
    mkdirSync(path.join(root, "assets"));
    const mesh = "v 0 0 0\nv 1 0 0\nf 1 2 3\n";
    writeFileSync(path.join(root, "assets/mesh.obj"), mesh);
    writeFileSync(path.join(root, "tests.obj"), coffHeader());
    git(root, ["add", "--all"]);
    assert.deepEqual(trackedCompiledFiles(root), []);
    git(root, ["add", "--force", "--", "tests.obj"]);
    writeFileSync(path.join(root, "tests.obj"), mesh);
    assert.deepEqual(trackedCompiledFiles(root), ["tests.obj"]);
    git(root, ["rm", "--cached", "--force", "--", "tests.obj"]);
    assert.deepEqual(trackedCompiledFiles(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
