import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkpointSelection } from "../scripts/checkpoint-selection.mjs";
import { sourceRuntimePayloadNames } from "./source-runtime-support.mjs";

test("checkpoint selection rejects typos and never widens an explicit project scope", () => {
  const projects = [{ id: "01" }, { id: "44" }];
  assert.equal(checkpointSelection(projects, []).projects, projects);
  assert.equal(checkpointSelection(projects, []).scoped, false);
  const selected = checkpointSelection(projects, ["--check", "--project=44"]);
  assert.deepEqual(selected.projects, [projects[1]]);
  assert.equal(selected.checkOnly, true);
  assert.equal(selected.scoped, true);
  for (const args of [
    ["--project=4"],
    ["--project=../"],
    ["--project=78"],
    ["--project=44", "--project=01"],
    ["--projects=44"],
    ["--project", "44"],
  ])
    assert.throws(() => checkpointSelection(projects, args), /project|option|Project/);
});

function put(root, relative, value) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, value);
}
function treeSignature(root, prefix = "") {
  return readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name),
      file = path.join(root, relative);
    if (entry.isDirectory()) return treeSignature(root, relative);
    return [
      [
        relative,
        createHash("sha256").update(readFileSync(file)).digest("hex"),
        statSync(file).mtimeMs,
      ],
    ];
  });
}

test("scoped checkpoint generation preserves other projects, check is read-only, full streaming prunes only stale outputs", () => {
  const prefix = path.join(os.tmpdir(), "simulation-path-checkpoints-");
  const root = mkdtempSync(prefix);
  try {
    const scripts = [
      "generate-checkpoints.mjs",
      "project-catalog.mjs",
      "course-cmake.mjs",
      "generated-files.mjs",
      "course-file-types.mjs",
      "checkpoint-selection.mjs",
    ];
    mkdirSync(path.join(root, "scripts"));
    for (const file of scripts)
      cpSync(new URL("../scripts/" + file, import.meta.url), path.join(root, "scripts", file));
    const projects = [
      {
        id: "01",
        slug: "first",
        sourceDirectory: "project-01-first",
        checkpointCount: 1,
        demoId: "first",
      },
      {
        id: "02",
        slug: "second",
        sourceDirectory: "project-02-second",
        checkpointCount: 1,
        demoId: "second",
      },
    ];
    put(root, "course/projects.json", JSON.stringify(projects));
    for (const [index, project] of projects.entries()) {
      put(root, `content/${project.slug}/01-one.mdx`, "# Lesson\n");
      put(root, `examples/${project.sourceDirectory}/README.md`, "Fixture\n");
      put(
        root,
        `examples/${project.sourceDirectory}/source-template/include/stable.hpp`,
        "#pragma once\n#ifdef _WIN32\ninline int platform() { return 7; }\n#else\ninline int platform() { return 8; }\n#endif\n",
      );
      put(
        root,
        `examples/${project.sourceDirectory}/source-template/packed.bin`,
        Buffer.from([0, 255, 10, 35, 105, 102, 128]),
      );
      put(
        root,
        `examples/${project.sourceDirectory}/tests/tests.cpp`,
        "int main() { return 0; }\n",
      );
      put(
        root,
        `examples/${project.sourceDirectory}/source-template/src/main.cpp`,
        `#define LAB_CHECKPOINT 1\n#if LAB_CHECKPOINT >= 1\nint main() { return ${11 + index}; }\n#else\nint main() { return 0; }\n#endif\n`,
      );
    }
    // A real multi-file payload must split without altering any public bytes.
    for (let part = 0; part < 8; ++part)
      put(
        root,
        `examples/project-01-first/source-template/include/large-${part}.hpp`,
        "#pragma once\n// " + "x".repeat(28000) + "\n",
      );
    const sentinel = "lib/generated-checkpoint-sources/p02/unselected.txt";
    put(root, sentinel, "do not touch\n");
    put(root, "public/project-sources/02/unselected.txt", "also retain\n");
    put(root, "examples/project-02-second/final/unselected.txt", "keep\n");
    const run = (args) =>
      execFileSync(
        process.execPath,
        ["--max-old-space-size=96", path.join(root, "scripts/generate-checkpoints.mjs"), ...args],
        { cwd: root, encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "pipe"] },
      );
    run(["--project=01"]);
    const module = readFileSync(
      path.join(root, "lib/generated-checkpoint-sources/p01/1.mjs"),
      "utf8",
    );
    const runtimeNames = sourceRuntimePayloadNames(module, (name) =>
      readFileSync(path.join(root, "lib/generated-checkpoint-sources/p01", name), "utf8"),
    );
    assert.ok(runtimeNames.length > 1, "fixture must exercise bounded runtime sharding");
    assert.match(module, /await Promise\.all\(/);
    assert.doesNotMatch(module, /import \w+ from/);
    const runtimeFiles = [];
    for (const name of runtimeNames) {
      const bytes = readFileSync(
        path.join(root, "lib/generated-checkpoint-sources/p01/data", name),
      );
      assert.ok(bytes.length <= 128 * 1024);
      runtimeFiles.push(...JSON.parse(bytes).files);
    }
    const firstManifest = JSON.parse(
      readFileSync(path.join(root, "public/project-sources/01/manifest.json"), "utf8"),
    );
    const publicBytes = readFileSync(path.join(root, "public", firstManifest.snapshots["1"]));
    assert.ok(publicBytes.length > 128 * 1024);
    assert.deepEqual(
      runtimeFiles,
      JSON.parse(publicBytes).files,
      "no file lost, duplicated, reordered or truncated",
    );
    assert.equal(readFileSync(path.join(root, sentinel), "utf8"), "do not touch\n");
    assert.equal(
      existsSync(path.join(root, "examples/project-02-second/final/src/main.cpp")),
      false,
    );
    assert.match(
      readFileSync(path.join(root, "lib/generated-checkpoint-sources.ts"), "utf8"),
      /"02"/,
    );
    const sourceRoots = [
      "examples/project-01-first/starter",
      "examples/project-01-first/checkpoints",
      "examples/project-01-first/final",
      "lib/generated-checkpoint-sources",
      "public/project-sources",
    ];
    const before = sourceRoots.map((directory) => treeSignature(path.join(root, directory)));
    run(["--project=01", "--check"]);
    assert.deepEqual(
      sourceRoots.map((directory) => treeSignature(path.join(root, directory))),
      before,
      "no-op check must retain bytes and timestamps",
    );
    const template = path.join(root, "examples/project-01-first/source-template/src/main.cpp");
    writeFileSync(template, readFileSync(template, "utf8").replace("return 11", "return 99"));
    assert.throws(
      () => run(["--project=01", "--check"]),
      (error) => error.status === 1 && error.stderr.includes("Outdated generated file"),
    );
    assert.deepEqual(
      sourceRoots.map((directory) => treeSignature(path.join(root, directory))),
      before,
      "failing check must not write or prune",
    );
    assert.throws(
      () => run(["--project=78"]),
      (error) => error.status === 1,
    );
    assert.deepEqual(
      sourceRoots.map((directory) => treeSignature(path.join(root, directory))),
      before,
      "invalid selection must not write",
    );
    put(root, "lib/generated-checkpoint-sources/p78/stale.json", "{}\n");
    put(root, "public/project-sources/78/stale.json", "{}\n");
    run([]);
    assert.equal(existsSync(path.join(root, sentinel)), false);
    assert.equal(existsSync(path.join(root, "lib/generated-checkpoint-sources/p78")), false);
    assert.equal(existsSync(path.join(root, "public/project-sources/78")), false);
    assert.match(
      readFileSync(path.join(root, "examples/project-01-first/final/src/main.cpp"), "utf8"),
      /return 99/,
    );
    assert.match(
      readFileSync(path.join(root, "examples/project-02-second/final/src/main.cpp"), "utf8"),
      /return 12/,
    );
    for (const project of projects) {
      const stable = readFileSync(
        path.join(root, `examples/${project.sourceDirectory}/final/include/stable.hpp`),
      );
      for (const snapshot of ["starter", "checkpoints/01", "final"]) {
        assert.deepEqual(
          readFileSync(
            path.join(root, `examples/${project.sourceDirectory}/${snapshot}/include/stable.hpp`),
          ),
          stable,
        );
        assert.deepEqual(
          readFileSync(
            path.join(root, `examples/${project.sourceDirectory}/${snapshot}/packed.bin`),
          ),
          Buffer.from([0, 255, 10, 35, 105, 102, 128]),
        );
      }
      const manifest = JSON.parse(
        readFileSync(path.join(root, `public/project-sources/${project.id}/manifest.json`), "utf8"),
      );
      for (const url of [manifest.common, ...Object.values(manifest.snapshots)]) {
        const browser = readFileSync(path.join(root, "public", url));
        const server = readFileSync(
          path.join(
            root,
            `lib/generated-checkpoint-sources/p${project.id}/data`,
            path.basename(url),
          ),
        );
        assert.deepEqual(
          browser,
          server,
          "streaming must preserve byte-identical server/public payloads",
        );
      }
    }
    const complete = sourceRoots.map((directory) => treeSignature(path.join(root, directory)));
    run(["--check"]);
    assert.deepEqual(
      sourceRoots.map((directory) => treeSignature(path.join(root, directory))),
      complete,
    );
    put(
      root,
      "examples/project-01-first/source-template/include/stable.hpp",
      "#if LAB_CHECKPOINT >= 1\ninline int broken() { return 7; }\n",
    );
    assert.throws(
      () => run(["--project=01"]),
      (error) => error.status === 1 && error.stderr.includes("Unclosed checkpoint directive"),
    );
    assert.deepEqual(
      sourceRoots.map((directory) => treeSignature(path.join(root, directory))),
      complete,
      "result reuse must not bypass checkpoint directive validation or mutate outputs on failure",
    );
  } finally {
    assert.ok(root.startsWith(prefix), "cleanup must stay inside the owned temporary fixture");
    rmSync(root, { recursive: true, force: true });
  }
});
