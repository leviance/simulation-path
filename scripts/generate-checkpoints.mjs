import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { courseCmake } from "./course-cmake.mjs";
import { reconcileGeneratedFiles } from "./generated-files.mjs";
import { checkpointSelection } from "./checkpoint-selection.mjs";
import {
  isCourseTextFile,
  isDisplayableCourseFile,
  materializeSnapshotFile,
} from "./course-file-types.mjs";

const projects = loadProjectCatalog();
const selection = checkpointSelection(projects, process.argv.slice(2));
const { checkOnly } = selection;
const generatedSourceDirectory = path.join(workspace, "lib", "generated-checkpoint-sources");
const publicSourceDirectory = path.join(workspace, "public", "project-sources");
function toPosix(value) {
  return value.split(path.sep).join("/");
}

function walkFiles(directory, prefix = "") {
  const output = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(directory, relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output.sort((left, right) => left.localeCompare(right));
}

function languageFor(relativePath) {
  const normalized = toPosix(relativePath);
  const extension = path.extname(normalized).toLowerCase();
  if (path.basename(normalized) === "CMakeLists.txt" || extension === ".cmake") return "cmake";
  if ([".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx", ".inl"].includes(extension))
    return "cpp";
  if (extension === ".md" || extension === ".mdx") return "markdown";
  if ([".comp", ".vert", ".frag", ".geom", ".glsl"].includes(extension)) return "glsl";
  return "text";
}

function evaluate(expression, checkpoint) {
  const match = expression.match(/^LAB_CHECKPOINT\s*(>=|<=|==|>|<)\s*(\d+)$/);
  if (!match) throw new Error(`Unsupported checkpoint expression: ${expression}`);
  const value = Number(match[2]);
  switch (match[1]) {
    case ">=":
      return checkpoint >= value;
    case "<=":
      return checkpoint <= value;
    case "==":
      return checkpoint === value;
    case ">":
      return checkpoint > value;
    case "<":
      return checkpoint < value;
    default:
      return false;
  }
}

function renderTemplate(source, checkpoint, sourcePath) {
  if (!source.includes("LAB_CHECKPOINT")) return source;
  const output = [];
  const stack = [];
  let active = true;

  for (const line of source.split(/\r?\n/)) {
    const directive = line.trim();
    const ifMatch = directive.match(/^#if\s+(LAB_CHECKPOINT.+)$/);
    const elifMatch = directive.match(/^#elif\s+(LAB_CHECKPOINT.+)$/);

    if (directive === "#ifndef LAB_CHECKPOINT") {
      stack.push({ kind: "lab", parentActive: active, branchTaken: false });
      active = false;
      continue;
    }
    if (ifMatch) {
      const condition = evaluate(ifMatch[1].trim(), checkpoint);
      stack.push({ kind: "lab", parentActive: active, branchTaken: condition });
      active = active && condition;
      continue;
    }
    if (/^#if(?:def|ndef)?\b/.test(directive)) {
      stack.push({ kind: "passthrough", parentActive: active });
      if (active) output.push(line);
      continue;
    }
    if (elifMatch) {
      const frame = stack.at(-1);
      if (!frame) throw new Error(`Unexpected #elif in ${sourcePath}`);
      if (frame.kind === "passthrough") {
        if (active) output.push(line);
        continue;
      }
      const condition = !frame.branchTaken && evaluate(elifMatch[1].trim(), checkpoint);
      frame.branchTaken ||= condition;
      active = frame.parentActive && condition;
      continue;
    }
    if (directive === "#else") {
      const frame = stack.at(-1);
      if (!frame) throw new Error(`Unexpected #else in ${sourcePath}`);
      if (frame.kind === "passthrough") {
        if (active) output.push(line);
        continue;
      }
      const condition = !frame.branchTaken;
      frame.branchTaken = true;
      active = frame.parentActive && condition;
      continue;
    }
    if (directive === "#endif") {
      const frame = stack.pop();
      if (!frame) throw new Error(`Unexpected #endif in ${sourcePath}`);
      if (frame.kind === "passthrough" && active) output.push(line);
      active = frame.parentActive;
      continue;
    }
    if (/^#define\s+LAB_CHECKPOINT\s+\d+$/.test(directive)) continue;
    if (active) output.push(line);
  }

  if (stack.length) throw new Error(`Unclosed checkpoint directive in ${sourcePath}`);
  return `${output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

function snapshotDefinitions(project) {
  return [
    { key: "starter", directory: "starter", checkpoint: 0 },
    ...Array.from({ length: project.checkpointCount }, (_, index) => ({
      key: String(index + 1),
      directory: path.join("checkpoints", String(index + 1).padStart(2, "0")),
      checkpoint: index + 1,
    })),
    { key: "final", directory: "final", checkpoint: project.checkpointCount },
  ];
}

function snapshotFiles(project) {
  const projectDirectory = path.join(workspace, "examples", project.sourceDirectory);
  const templateDirectory = path.join(projectDirectory, "source-template");
  const templateFiles = walkFiles(templateDirectory);
  if (templateFiles.length === 0) {
    throw new Error(`${project.sourceDirectory}/source-template must not be empty`);
  }
  const expected = new Map();
  const definitions = snapshotDefinitions(project);
  const renderedSnapshots = new Map();
  // Every checkpoint in this project must see the same authored input bytes.
  // Reading each template once also avoids hundreds of repeated Windows I/O
  // calls for unchanged headers when materializing starter + lessons + final.
  const templateSources = new Map(
    templateFiles.map((relativePath) => {
      const sourcePath = path.join(templateDirectory, relativePath);
      const source = readFileSync(sourcePath);
      return [
        relativePath,
        {
          sourcePath,
          source,
          variesByCheckpoint: isCourseTextFile(relativePath) && source.includes("LAB_CHECKPOINT"),
          rendered: new Map(),
        },
      ];
    }),
  );
  for (const snapshot of definitions) {
    const renderedFiles = new Map();
    for (const relativePath of templateFiles) {
      const template = templateSources.get(relativePath);
      const { sourcePath, source } = template;
      const target = path.join(projectDirectory, snapshot.directory, relativePath);
      // Unversioned text/binary has the same immutable result in every snapshot.
      // Versioned files still validate LAB directives; final reuses checkpoint N.
      // The cache lives only inside this project/input snapshot, never on disk.
      const renderKey = template.variesByCheckpoint ? snapshot.checkpoint : 0;
      let value = template.rendered.get(renderKey);
      if (!value) {
        value = materializeSnapshotFile({
          source,
          relativePath,
          renderText: (text) =>
            renderTemplate(text, renderKey, toPosix(path.relative(workspace, sourcePath))),
        });
        template.rendered.set(renderKey, value);
      }
      expected.set(target, value);
      renderedFiles.set(relativePath, value);
    }
    renderedSnapshots.set(snapshot.key, renderedFiles);
  }

  const changedPaths = {};
  for (const [index, snapshot] of definitions.entries()) {
    if (snapshot.key === "starter") {
      changedPaths[snapshot.key] = templateFiles.map(toPosix);
      continue;
    }
    const previousIndex = snapshot.key === "final" ? Math.max(0, index - 2) : index - 1;
    const previous = renderedSnapshots.get(definitions[previousIndex].key);
    const current = renderedSnapshots.get(snapshot.key);
    changedPaths[snapshot.key] = templateFiles
      .filter((relativePath) => !previous.get(relativePath).equals(current.get(relativePath)))
      .map(toPosix);
  }
  return { expected, templateFiles, changedPaths };
}

function sourceModule(project, sourceDirectory, relativeFiles, expected) {
  const projectDirectory = path.join(workspace, "examples", project.sourceDirectory);
  return relativeFiles.map((relativePath) => {
    if (isDisplayableCourseFile(relativePath)) {
      const source = expected.get(path.join(projectDirectory, sourceDirectory, relativePath));
      return {
        path: toPosix(relativePath),
        language: languageFor(relativePath),
        source: source.toString("utf8"),
      };
    }
    const templatePath = path.join(
      workspace,
      "examples",
      project.sourceDirectory,
      "source-template",
      relativePath,
    );
    const bytes = statSync(templatePath).size;
    const note = `[Asset không hiển thị trong code block — ${bytes} byte. Tệp đầy đủ có trong gói ZIP.]\n`;
    return { path: toPosix(relativePath), language: "text", source: note };
  });
}

function commonModule(project, expected) {
  const projectDirectory = path.join(workspace, "examples", project.sourceDirectory);
  const commonFiles = [
    "CMakeLists.txt",
    ...walkFiles(path.join(projectDirectory, "tests")).map((file) => path.join("tests", file)),
  ].filter((file) => isCourseTextFile(file));
  return commonFiles.map((relativePath) => {
    const absolute = path.join(projectDirectory, relativePath);
    const source = expected.get(absolute) ?? readFileSync(absolute);
    return {
      path: toPosix(relativePath),
      language: languageFor(relativePath),
      source: source.toString("utf8"),
    };
  });
}

// Server imports one JSON payload per snapshot. Browsers fetch its byte-identical
// public copy, without importing the all-course source registry into the client graph.
function emitSourcePayload(project, key, files, expected) {
  const payload = Buffer.from(JSON.stringify({ schemaVersion: 1, files }) + "\n");
  if (payload.length > 5 * 1024 * 1024)
    throw new Error(`Project ${project.id} ${key} source payload exceeds 5 MiB; split its source.`);
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 16);
  const name = `${key}.${hash}.json`;
  const directory = path.join(generatedSourceDirectory, `p${project.id}`);
  expected.set(path.join(directory, "data", name), payload);
  expected.set(path.join(publicSourceDirectory, project.id, name), payload);
  expected.set(
    path.join(directory, `${key}.ts`),
    Buffer.from(
      `import payload from "./data/${name}" with { type: "json" };\nexport const files = payload.files;\nexport const version = "${hash}";\n`,
    ),
  );
  return `/project-sources/${project.id}/${name}`;
}

function projectRegistry(project, changedPaths) {
  const snapshots = snapshotDefinitions(project).map(
    (snapshot) => `        ${JSON.stringify(snapshot.key)}: () => import("./${snapshot.key}"),`,
  );
  return (
    `export const generatedProjectSource = {\n` +
    `    id: "${project.id}",\n` +
    `    directory: "${project.sourceDirectory}",\n` +
    `    targetPrefix: "project_${Number(project.id)}",\n` +
    `    loadCommon: () => import("./common"),\n` +
    `    changedPaths: ${JSON.stringify(changedPaths, null, 4).replaceAll("\n", "\n    ")},\n` +
    `    snapshots: {\n${snapshots.join("\n")}\n    },\n` +
    `} as const;\n`
  );
}

function generatedManifestRegistry() {
  const loaders = projects.map(
    (project) =>
      `    "${project.id}": () => import("@/lib/generated-checkpoint-sources/p${project.id}/registry"),`,
  );
  return `export const generatedCheckpointSourceLoaders = {\n${loaders.join("\n")}\n} as const;\n`;
}

const retainedFiles = new Set();
const result = { changedCount: 0, removedCount: 0, mismatchCount: 0 };
let outputCount = 0;
function accumulate(batch) {
  result.changedCount += batch.changedCount;
  result.removedCount += batch.removedCount;
  result.mismatchCount += batch.mismatchCount;
}
for (const project of selection.projects) {
  // Materialize and reconcile one project at a time. The full course must not
  // retain every starter/checkpoint/final/source payload in RAM until the end.
  const expectedFiles = new Map();
  const { expected, templateFiles, changedPaths } = snapshotFiles(project);
  for (const [target, value] of expected) expectedFiles.set(target, value);
  const projectDirectory = path.join(workspace, "examples", project.sourceDirectory);
  expectedFiles.set(
    path.join(projectDirectory, "CMakeLists.txt"),
    Buffer.from(
      courseCmake(project, {
        hasSnapshotShaders: templateFiles.some((file) => toPosix(file).startsWith("shaders/")),
      }),
    ),
  );
  const generatedProjectDirectory = path.join(generatedSourceDirectory, `p${project.id}`);
  const common = emitSourcePayload(
    project,
    "common",
    commonModule(project, expectedFiles),
    expectedFiles,
  );
  const snapshots = {};
  expectedFiles.set(
    path.join(generatedProjectDirectory, "registry.ts"),
    Buffer.from(projectRegistry(project, changedPaths)),
  );
  for (const snapshot of snapshotDefinitions(project)) {
    snapshots[snapshot.key] = emitSourcePayload(
      project,
      snapshot.key,
      sourceModule(project, snapshot.directory, templateFiles, expected),
      expectedFiles,
    );
  }
  expectedFiles.set(
    path.join(publicSourceDirectory, project.id, "manifest.json"),
    Buffer.from(
      JSON.stringify({ schemaVersion: 1, projectId: project.id, common, snapshots }) + "\n",
    ),
  );
  const generatedSnapshotRoots = [
    path.join(projectDirectory, "starter"),
    path.join(projectDirectory, "checkpoints"),
    path.join(projectDirectory, "final"),
  ];
  accumulate(
    reconcileGeneratedFiles({
      expectedFiles,
      managedRoots: [
        generatedProjectDirectory,
        path.join(publicSourceDirectory, project.id),
        ...generatedSnapshotRoots,
      ],
      checkOnly,
      workspace,
    }),
  );
  outputCount += expectedFiles.size;
  for (const target of expectedFiles.keys()) retainedFiles.add(target);
}
const expectedFiles = new Map();
expectedFiles.set(
  path.join(workspace, "lib", "generated-checkpoint-sources.ts"),
  Buffer.from(generatedManifestRegistry()),
);

accumulate(
  reconcileGeneratedFiles({
    expectedFiles,
    // Scoped runs may prune only the selected project's roots above. A full run
    // also removes orphan project payloads, retaining the batches already checked.
    managedRoots: selection.scoped ? [] : [generatedSourceDirectory, publicSourceDirectory],
    retainedFiles,
    checkOnly,
    workspace,
  }),
);
outputCount += expectedFiles.size;

if (result.mismatchCount > 0) {
  process.stderr.write(
    "Run `npm run generate:checkpoints` to refresh local outputs; commit source-template changes only.\n",
  );
  process.exit(1);
}

if (!checkOnly) {
  process.stdout.write(
    `Synchronized ${outputCount} checkpoint outputs for ${selection.projects.length} projects ` +
      `(${result.changedCount} updated, ${result.removedCount} removed).\n`,
  );
}
