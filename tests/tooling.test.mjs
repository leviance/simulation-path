import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isCourseTextFile,
  isDisplayableCourseFile,
  materializeSnapshotFile,
} from "../scripts/course-file-types.mjs";
import { interactiveLabUsages } from "../scripts/mdx-contracts.mjs";
import {
  assertSelfContainedModule,
  runtimeModuleSpecifiers,
} from "../scripts/typescript-module-contract.mjs";
import { loadProjectCatalog } from "../scripts/project-catalog.mjs";
import { courseCmake } from "../scripts/course-cmake.mjs";
import { normalizeSearchText } from "../lib/search-normalization.mjs";
import { reconcileGeneratedFiles } from "../scripts/generated-files.mjs";
import rehypeCompactCode from "../lib/rehype-compact-code.mjs";

test("compact One Dark code preserves text, meaningful colors and highlighted tokens", () => {
  const text = (value) => ({ type: "text", value });
  const token = (style, value, extra = {}) => ({
    type: "element",
    tagName: "span",
    properties: { style, ...extra },
    children: [text(value)],
  });
  const line = {
    type: "element",
    tagName: "span",
    properties: { "data-line": "" },
    children: [
      token("color:#C678DD", "int"),
      token("color:#ABB2BF", " count = "),
      token("color:#D19A66", "42"),
      token("color:#ABB2BF", ";", { "data-highlighted-chars": "" }),
    ],
  };
  const code = { type: "element", tagName: "code", children: [line] };
  const pre = {
    type: "element",
    tagName: "pre",
    properties: {
      "data-theme": "one-dark-pro",
      style: "background-color:#282c34;color:#abb2bf",
    },
    children: [code],
  };
  const tree = { type: "root", children: [pre] };
  const original = structuredClone(tree);
  rehypeCompactCode()(tree);
  assert.deepEqual(line.children[1], text(" count = "));
  assert.equal(line.children[0].properties.style, "color:#C678DD");
  assert.equal(line.children[2].properties.style, "color:#D19A66");
  assert.ok("data-highlighted-chars" in line.children[3].properties);
  const readText = (node) => node.value ?? (node.children ?? []).map(readText).join("");
  assert.equal(readText(tree), readText(original));
  const differentTheme = structuredClone(original);
  differentTheme.children[0].properties["data-theme"] = "light";
  const unchanged = structuredClone(differentTheme);
  rehypeCompactCode()(differentTheme);
  assert.deepEqual(differentTheme, unchanged);
});

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Vite dev ignores heavyweight non-web trees and keeps server deps on demand", () => {
  const source = readFileSync(path.join(workspace, "vite.config.ts"), "utf8");

  for (const ignoredTree of [".npm-cache", ".validation", "dist", "examples", "test-results"]) {
    assert.match(source, new RegExp(`\\*\\*/${ignoredTree.replace(".", "\\.")}/\\*\\*`));
  }

  assert.match(source, /name: "simulation-path:server-deps-on-demand"/);
  assert.match(source, /optimizeDeps\.include = \[\]/);
});

test("Canvas labs keep CSS layout separate from the high-DPI bitmap", () => {
  const hookSource = readFileSync(
    path.join(workspace, "components", "labs", "lab-shared.tsx"),
    "utf8",
  );
  const labStyles = readFileSync(path.join(workspace, "app", "styles", "labs.css"), "utf8");

  assert.match(labStyles, /\.lab-canvas,\s*\.lab-body canvas/);
  assert.match(hookSource, /pendingFrame = requestAnimationFrame\(sync\)/);
  assert.match(hookSource, /if \(canvas\.width !== bitmapWidth\) canvas\.width = bitmapWidth/);
  assert.match(hookSource, /if \(canvas\.height !== bitmapHeight\) canvas\.height = bitmapHeight/);
});

test("generated-file reconciliation preserves unchanged outputs and prunes stale files", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "simulation-path-generated-"));
  try {
    const expectedTarget = path.join(root, "p01", "registry.ts");
    const staleTarget = path.join(root, "old.ts");
    mkdirSync(path.dirname(expectedTarget), { recursive: true });
    writeFileSync(staleTarget, "stale\n");
    const expectedFiles = new Map([[expectedTarget, "current\n"]]);

    const first = reconcileGeneratedFiles({ expectedFiles, managedRoots: [root], workspace: root });
    assert.deepEqual(first, { changedCount: 1, removedCount: 1, mismatchCount: 0 });
    assert.equal(existsSync(staleTarget), false);

    const second = reconcileGeneratedFiles({
      expectedFiles,
      managedRoots: [root],
      workspace: root,
    });
    assert.deepEqual(second, { changedCount: 0, removedCount: 0, mismatchCount: 0 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("course file classification treats unknown asset formats as binary", () => {
  for (const file of ["mesh.glb", "texture.dds", "volume.bin", "sky.hdr", "data.unknown"]) {
    assert.equal(isCourseTextFile(file), false, file);
  }

  for (const file of [
    "src/main.cpp",
    "shaders/grid.vert",
    "CMakeLists.txt",
    "README.md",
    "model.obj",
  ]) {
    assert.equal(isCourseTextFile(file), true, file);
  }
  assert.equal(isDisplayableCourseFile("src/main.cpp"), true);
  assert.equal(isDisplayableCourseFile("assets/model.obj"), false);
  assert.equal(isDisplayableCourseFile("assets/model.glb"), false);
});

test("binary snapshot materialization preserves every byte and never renders text", () => {
  const source = Buffer.from([0x00, 0xff, 0xfe, 0x80, 0x0a, 0x23, 0x69, 0x66]);
  const result = materializeSnapshotFile({
    source,
    relativePath: "assets/model.glb",
    renderText: () => {
      throw new Error("binary content must not be decoded as text");
    },
  });

  assert.notEqual(result, source, "the helper should return its own buffer");
  assert.deepEqual(result, source);
});

test("text snapshot materialization applies the checkpoint renderer", () => {
  const result = materializeSnapshotFile({
    source: Buffer.from("before LAB_CHECKPOINT after", "utf8"),
    relativePath: "src/main.cpp",
    renderText: (source) => source.replace("LAB_CHECKPOINT", "6"),
  });

  assert.equal(result.toString("utf8"), "before 6 after");
});

function checkpointTeachingFingerprint(directory, prefix = "") {
  const parts = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      parts.push(checkpointTeachingFingerprint(directory, relative));
      continue;
    }
    if (!entry.isFile() || !isCourseTextFile(relative)) continue;
    const normalized = readFileSync(path.join(directory, relative), "utf8")
      .replace(/^#define\s+LAB_CHECKPOINT\s+\d+$/gm, "#define LAB_CHECKPOINT <N>")
      .replace(/"(?:P\d{2}|Project \d+ starter)[^"\r\n]*"/g, '"<window-title>"');
    parts.push(`${relative}\n${normalized}`);
  }
  return parts.sort().join("\n");
}

test("recent course checkpoints add teaching code beyond a renamed window title", () => {
  const projects = loadProjectCatalog({ checkDirectories: false }).filter(
    ({ id }) => Number(id) >= 35,
  );
  for (const project of projects) {
    let previous = null;
    for (let checkpoint = 1; checkpoint <= project.checkpointCount; checkpoint += 1) {
      const directory = path.join(
        workspace,
        "examples",
        project.sourceDirectory,
        "checkpoints",
        String(checkpoint).padStart(2, "0"),
      );
      const current = checkpointTeachingFingerprint(directory);
      if (previous !== null) {
        assert.notEqual(
          current,
          previous,
          `Project ${project.id} checkpoint ${checkpoint} only renames the checkpoint`,
        );
      }
      previous = current;
    }
  }
});

test("generated CMake compiles every translation unit and shares immutable assets", () => {
  const source = courseCmake({ id: "09", checkpointCount: 7 });
  assert.match(source, /project\(project_9 LANGUAGES CXX\)/);
  assert.match(source, /set\(PROJECT_CHECKPOINT_COUNT 7\)/);
  assert.match(source, /GLOB_RECURSE lab_sources CONFIGURE_DEPENDS/);
  assert.match(source, /src\/\*\.cpp/);
  assert.match(source, /add_executable\(\$\{name\} \$\{lab_sources\}\)/);
  assert.match(source, /copy_directory[\s\S]*TARGET_FILE_DIR/);
});

test("generated CMake exposes checkpoint shaders for live editing", () => {
  const source = courseCmake({ id: "35", checkpointCount: 8 }, { hasSnapshotShaders: true });
  assert.match(source, /COURSE_SHADER_DIRECTORY/);
  assert.match(source, /\$\{source_directory\}\/shaders/);
  assert.match(source, /TARGET_FILE_DIR:\$\{name\}>\/shaders/);
});

test("generated CMake copies the selected Windows SDL runtime beside every app target", () => {
  const source = courseCmake({ id: "43", checkpointCount: 8 });
  assert.match(source, /if\(WIN32 AND TARGET SDL3::SDL3-shared\)/);
  assert.match(source, /add_custom_command\(TARGET \$\{name\} POST_BUILD[\s\S]*copy_if_different/);
  assert.match(source, /"\$<TARGET_FILE:SDL3::SDL3-shared>"\s+"\$<TARGET_FILE_DIR:\$\{name\}>"/);
  assert.match(source, /target_link_libraries\(\$\{name\} PRIVATE SDL3::SDL3\)/);
});

test("Vietnamese search normalization accepts queries without diacritics", () => {
  assert.equal(normalizeSearchText("Hai hệ tọa độ — Độ dài"), "hai he toa do — do dai");
  assert.ok(normalizeSearchText("Bản đồ tọa độ").includes(normalizeSearchText("toa do")));
});

test("InteractiveLab metadata is parsed independently of JSX attribute order", () => {
  const usages = interactiveLabUsages(
    `
# Demo

<InteractiveLab
  mode="vector-normalize"
  aria-label="Vector demo"
  demo="vector"
/>
`,
    "fixture.mdx",
  );

  assert.deepEqual(usages, [{ demo: "vector", mode: "vector-normalize" }]);
  assert.throws(
    () => interactiveLabUsages("<InteractiveLab demo={selectedDemo} />", "dynamic.mdx"),
    /static string for demo/,
  );
});

test("generated metadata accepts type imports but rejects runtime dependencies clearly", () => {
  assert.deepEqual(runtimeModuleSpecifiers("export default { title: 'A' };"), []);
  assert.deepEqual(
    runtimeModuleSpecifiers("import value from './shared.js'; export default value;"),
    ["./shared.js"],
  );
  assert.doesNotThrow(() => assertSelfContainedModule("export default {};", "manifest.ts"));
  assert.throws(
    () => assertSelfContainedModule("export { value } from './shared.js';", "manifest.ts"),
    /must be self-contained/,
  );
});

test("CI project matrix is split into bounded shards", () => {
  const output = execFileSync(
    process.execPath,
    [path.join(workspace, "scripts", "ci-project-shards.mjs")],
    { encoding: "utf8", timeout: 10_000 },
  );
  const shards = JSON.parse(output.trim().replace(/^shards=/, ""));
  const projectCount = loadProjectCatalog({ checkDirectories: false }).length;
  assert.ok(shards.length > 0);
  assert.ok(shards.every((shard) => shard.projects.length >= 1 && shard.projects.length <= 10));
  assert.equal(shards.flatMap((shard) => shard.projects).length, projectCount);
});

test("local verification entry points keep hard timeouts and process-tree cleanup", () => {
  const packageManifest = JSON.parse(readFileSync(path.join(workspace, "package.json"), "utf8"));
  for (const script of ["build", "lint", "test:fast", "test:browser", "test"]) {
    assert.match(packageManifest.scripts[script], /run-test-suite\.mjs/);
  }

  const suiteRunner = readFileSync(path.join(workspace, "scripts", "run-test-suite.mjs"), "utf8");
  const browserRunner = readFileSync(
    path.join(workspace, "scripts", "run-browser-tests.mjs"),
    "utf8",
  );
  const fullMdxRunner = readFileSync(path.join(workspace, "scripts", "test-full-mdx.mjs"), "utf8");
  for (const source of [suiteRunner, browserRunner, fullMdxRunner]) {
    assert.match(source, /ProcessSupervisor/);
    assert.match(source, /installShutdownHandlers/);
    assert.match(source, /timeoutMs/);
    assert.doesNotMatch(source, /spawnSync/);
  }

  const playwrightConfig = readFileSync(path.join(workspace, "playwright.config.ts"), "utf8");
  assert.match(playwrightConfig, /globalTimeout:\s*3 \* 60_000/);
});
