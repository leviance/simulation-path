import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { isCourseTextFile, isDisplayableCourseFile } from "./course-file-types.mjs";

const sourceExtensions = new Set([".css", ".mjs", ".ts", ".tsx"]);
const codeExtensions = new Set([
  ".c",
  ".cc",
  ".cmake",
  ".cpp",
  ".cxx",
  ".frag",
  ".glsl",
  ".h",
  ".hh",
  ".hlsl",
  ".hpp",
  ".hxx",
  ".inl",
  ".metal",
  ".vert",
  ".wgsl",
]);
const sourceRoots = ["app", "components", "course", "lib", "scripts", "tests"];
const maxSourceBytes = 32 * 1024;
const maxProjectModuleBytes = 20 * 1024;
const maxSearchShardBytes = 20 * 1024;
const maxLessonRouterBytes = 16 * 1024;
const maxLessonRegistryShardBytes = 12 * 1024;
const maxGlobalCssBytes = 64 * 1024;
const maxLessonBytes = 32 * 1024;
const maxCourseCodeBytes = 32 * 1024;
const maxCourseCodeLines = 900;
const maxAssetBytes = 5 * 1024 * 1024;
const maxAuthoredProjectBytes = 10 * 1024 * 1024;
const maxGeneratedProjectBytes = 20 * 1024 * 1024;
const maxProjectArchiveBytes = 25 * 1024 * 1024;
let failures = 0;

function walkFiles(directory, prefix = "") {
  const output = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(directory, relative));
    else if (entry.isFile()) output.push(path.join(directory, relative));
  }
  return output;
}

function enforceLimit(file, limit, label) {
  const size = statSync(file).size;
  if (size <= limit) return;
  failures += 1;
  process.stderr.write(
    `${path.relative(workspace, file)} is ${size} bytes; ${label} limit is ${limit} bytes.\n`,
  );
}

function enforceLineLimit(file, limit, label) {
  const source = readFileSync(file, "utf8");
  const lines = source.length === 0 ? 0 : source.split(/\r?\n/u).length;
  if (lines <= limit) return;
  failures += 1;
  process.stderr.write(
    `${path.relative(workspace, file)} has ${lines} lines; ${label} limit is ${limit} lines. ` +
      "Split the implementation into focused files before adding more code.\n",
  );
}

for (const root of sourceRoots) {
  for (const file of walkFiles(path.join(workspace, root))) {
    if (sourceExtensions.has(path.extname(file))) {
      enforceLimit(file, maxSourceBytes, "shared source file");
    }
  }
}

const lessonRouter = path.join(workspace, "content", "registry.ts");
enforceLimit(lessonRouter, maxLessonRouterBytes, "root lesson router");
const lessonRegistryDirectory = path.join(workspace, "content", "generated");
for (const file of walkFiles(lessonRegistryDirectory)) {
  enforceLimit(file, maxLessonRegistryShardBytes, "project lesson registry shard");
}

const globalCssFiles = [
  path.join(workspace, "app", "globals.css"),
  ...walkFiles(path.join(workspace, "app", "styles")).filter(
    (file) => path.extname(file).toLowerCase() === ".css",
  ),
];
const globalCssBytes = globalCssFiles.reduce((total, file) => total + statSync(file).size, 0);
if (globalCssBytes > maxGlobalCssBytes) {
  failures += 1;
  process.stderr.write(
    `Global CSS is ${globalCssBytes} bytes; route-wide CSS limit is ${maxGlobalCssBytes} bytes.\n`,
  );
}

for (const project of loadProjectCatalog()) {
  const directory = path.join(workspace, "course", "projects", `p${project.id}`);
  for (const name of ["manifest.ts", "learning.ts", "lab.ts"]) {
    const file = path.join(directory, name);
    try {
      readFileSync(file);
    } catch {
      failures += 1;
      process.stderr.write(
        `Project ${project.id} is missing course/projects/p${project.id}/${name}.\n`,
      );
      continue;
    }
    enforceLimit(file, maxProjectModuleBytes, "project-owned module");
  }

  const contentDirectory = path.join(workspace, "content", project.slug);
  for (const file of walkFiles(contentDirectory)) {
    if (path.extname(file).toLowerCase() === ".mdx") {
      enforceLimit(file, maxLessonBytes, "lesson MDX");
    }
  }

  const exampleDirectory = path.join(workspace, "examples", project.sourceDirectory);
  const sharedAssetsDirectory = path.join(exampleDirectory, "assets");
  const duplicatedAssetsDirectory = path.join(exampleDirectory, "source-template", "assets");
  if (existsSync(duplicatedAssetsDirectory)) {
    failures += 1;
    process.stderr.write(
      `${path.relative(workspace, duplicatedAssetsDirectory)} would be copied into every checkpoint; ` +
        "move shared assets to the project root assets/ directory.\n",
    );
  }
  const topLevelDocs = readdirSync(exampleDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^(?:LICENSE|README)(?:\.[^.]+)?$/i.test(entry.name))
    .map((entry) => path.join(exampleDirectory, entry.name));
  const authoredFiles = [
    path.join(exampleDirectory, "CMakeLists.txt"),
    ...topLevelDocs,
    ...walkFiles(path.join(exampleDirectory, "source-template")),
    ...walkFiles(path.join(exampleDirectory, "tests")),
    ...(existsSync(sharedAssetsDirectory) ? walkFiles(sharedAssetsDirectory) : []),
  ];
  let authoredBytes = 0;
  for (const file of authoredFiles) {
    authoredBytes += statSync(file).size;
    const extension = path.extname(file).toLowerCase();
    if (codeExtensions.has(extension) || path.basename(file) === "CMakeLists.txt") {
      enforceLimit(file, maxCourseCodeBytes, "course code file");
      enforceLineLimit(file, maxCourseCodeLines, "course code file");
    } else if (!isCourseTextFile(file) || !isDisplayableCourseFile(file)) {
      enforceLimit(file, maxAssetBytes, "course asset");
    } else {
      enforceLimit(file, maxSourceBytes, "project text file");
    }
  }
  if (authoredBytes > maxAuthoredProjectBytes) {
    failures += 1;
    process.stderr.write(
      `${path.relative(workspace, exampleDirectory)} has ${authoredBytes} authored bytes; ` +
        `project input limit is ${maxAuthoredProjectBytes} bytes.\n`,
    );
  }

  const generatedDirectories = ["starter", "checkpoints", "final"]
    .map((name) => path.join(exampleDirectory, name))
    .filter(existsSync);
  const generatedBytes = generatedDirectories
    .flatMap((directory) => walkFiles(directory))
    .reduce((total, file) => total + statSync(file).size, 0);
  if (generatedBytes > maxGeneratedProjectBytes) {
    failures += 1;
    process.stderr.write(
      `${path.relative(workspace, exampleDirectory)} has ${generatedBytes} generated snapshot bytes; ` +
        `generated project limit is ${maxGeneratedProjectBytes} bytes.\n`,
    );
  }

  const archive = path.join(workspace, "public", "downloads", `${project.sourceDirectory}.zip`);
  if (existsSync(archive)) enforceLimit(archive, maxProjectArchiveBytes, "project ZIP");
}

const searchDirectory = path.join(workspace, "course", "generated", "search");
for (const file of walkFiles(searchDirectory)) {
  if (path.basename(file) !== "loaders.ts") {
    enforceLimit(file, maxSearchShardBytes, "search shard");
  }
}

for (const obsolete of [
  path.join(workspace, "lib", "lesson-code-guides.ts"),
  path.join(workspace, "lib", "lesson-references.ts"),
  path.join(workspace, "course", "generated", "project-manifests.ts"),
]) {
  try {
    statSync(obsolete);
    failures += 1;
    process.stderr.write(
      `${path.relative(workspace, obsolete)} is an obsolete monolithic registry.\n`,
    );
  } catch {
    // Expected: project-owned modules replaced this file.
  }
}

if (failures > 0) process.exit(1);
process.stdout.write("Architecture budgets and project boundaries are valid.\n");
