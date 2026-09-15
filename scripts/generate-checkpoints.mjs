import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { courseCmake } from "./course-cmake.mjs";
import { reconcileGeneratedFiles } from "./generated-files.mjs";
import {
  isCourseTextFile,
  isDisplayableCourseFile,
  materializeSnapshotFile,
} from "./course-file-types.mjs";

const projects = loadProjectCatalog();
const checkOnly = process.argv.includes("--check");
const generatedSourceDirectory = path.join(workspace, "lib", "generated-checkpoint-sources");
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
  for (const snapshot of definitions) {
    const renderedFiles = new Map();
    for (const relativePath of templateFiles) {
      const sourcePath = path.join(templateDirectory, relativePath);
      const target = path.join(projectDirectory, snapshot.directory, relativePath);
      const source = readFileSync(sourcePath);
      const value = materializeSnapshotFile({
        source,
        relativePath,
        renderText: (text) =>
          renderTemplate(text, snapshot.checkpoint, toPosix(path.relative(workspace, sourcePath))),
      });
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

function sourceModule(project, moduleName, sourceDirectory, relativeFiles) {
  const displayFiles = relativeFiles.filter(isDisplayableCourseFile);
  const imports = displayFiles.map(
    (relativePath, index) =>
      `import source${index} from "@/examples/${project.sourceDirectory}/${toPosix(path.join(sourceDirectory, relativePath))}?raw";`,
  );
  const importIndex = new Map(displayFiles.map((relativePath, index) => [relativePath, index]));
  const entries = relativeFiles.map((relativePath) => {
    const index = importIndex.get(relativePath);
    if (index !== undefined) {
      return `    { path: ${JSON.stringify(toPosix(relativePath))}, language: ${JSON.stringify(languageFor(relativePath))}, source: source${index} },`;
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
    return `    { path: ${JSON.stringify(toPosix(relativePath))}, language: "text", source: ${JSON.stringify(note)} },`;
  });
  return `${imports.join("\n")}\n\nexport const files = [\n${entries.join("\n")}\n] as const;\n`;
}

function commonModule(project) {
  const projectDirectory = path.join(workspace, "examples", project.sourceDirectory);
  const commonFiles = [
    "CMakeLists.txt",
    ...walkFiles(path.join(projectDirectory, "tests")).map((file) => path.join("tests", file)),
  ].filter((file) => isCourseTextFile(file));
  const imports = commonFiles.map(
    (relativePath, index) =>
      `import source${index} from "@/examples/${project.sourceDirectory}/${toPosix(relativePath)}?raw";`,
  );
  const entries = commonFiles.map(
    (relativePath, index) =>
      `    { path: ${JSON.stringify(toPosix(relativePath))}, language: ${JSON.stringify(languageFor(relativePath))}, source: source${index} },`,
  );
  return `${imports.join("\n")}\n\nexport const files = [\n${entries.join("\n")}\n] as const;\n`;
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

const expectedFiles = new Map();
const generatedSnapshotRoots = [];
for (const project of projects) {
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
  expectedFiles.set(
    path.join(generatedProjectDirectory, "common.ts"),
    Buffer.from(commonModule(project)),
  );
  expectedFiles.set(
    path.join(generatedProjectDirectory, "registry.ts"),
    Buffer.from(projectRegistry(project, changedPaths)),
  );
  for (const snapshot of snapshotDefinitions(project)) {
    expectedFiles.set(
      path.join(generatedProjectDirectory, `${snapshot.key}.ts`),
      Buffer.from(sourceModule(project, snapshot.key, snapshot.directory, templateFiles)),
    );
  }
  generatedSnapshotRoots.push(
    path.join(projectDirectory, "starter"),
    path.join(projectDirectory, "checkpoints"),
    path.join(projectDirectory, "final"),
  );
}
expectedFiles.set(
  path.join(workspace, "lib", "generated-checkpoint-sources.ts"),
  Buffer.from(generatedManifestRegistry()),
);

const result = reconcileGeneratedFiles({
  expectedFiles,
  managedRoots: [generatedSourceDirectory, ...generatedSnapshotRoots],
  checkOnly,
  workspace,
});

if (result.mismatchCount > 0) {
  process.stderr.write(
    "Run `npm run generate:checkpoints` to refresh local outputs; commit source-template changes only.\n",
  );
  process.exit(1);
}

if (!checkOnly) {
  process.stdout.write(
    `Synchronized ${expectedFiles.size} checkpoint outputs ` +
      `(${result.changedCount} updated, ${result.removedCount} removed).\n`,
  );
}
