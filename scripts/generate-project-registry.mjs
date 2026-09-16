import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { interactiveLabUsages } from "./mdx-contracts.mjs";
import { assertSelfContainedModule } from "./typescript-module-contract.mjs";
import { reconcileGeneratedFiles } from "./generated-files.mjs";
import { normalizeSearchText } from "../lib/search-normalization.mjs";
import {
  assertGlossaryModules,
  glossaryRegistrySource,
  loadGlossaryCatalog,
} from "./glossary-catalog.mjs";

const projects = loadProjectCatalog();
const checkOnly = process.argv.includes("--check");
const generatedDirectory = path.join(workspace, "course", "generated");
const searchDirectory = path.join(generatedDirectory, "search");
const progressDirectory = path.join(generatedDirectory, "progress");
const searchShardTargetBytes = 16 * 1024;

async function evaluateTypeScript(relativePath) {
  const sourcePath = path.join(workspace, relativePath);
  const output = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors =
    output.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ) ?? [];
  if (errors.length > 0) {
    const message = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => workspace,
      getNewLine: () => "\n",
    });
    throw new Error(`Cannot read ${relativePath}:\n${message}`);
  }
  assertSelfContainedModule(output.outputText, relativePath);
  const encoded = Buffer.from(output.outputText).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
}

function walkRelativeFiles(directory, prefix = "") {
  const output = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...walkRelativeFiles(directory, relative));
    else if (entry.isFile()) output.push(relative.split(path.sep).join("/"));
  }
  return output;
}

function validateEditorial(project, editorial, lessonIds) {
  assertString(editorial.summary, `Project ${project.id} summary`);
  assertString(editorial.duration, `Project ${project.id} duration`);
  assertStringArray(editorial.prerequisites, `Project ${project.id} prerequisites`);
  assertStringArray(editorial.objectives, `Project ${project.id} objectives`);
  if (!editorial.challenge || typeof editorial.challenge !== "object") {
    throw new Error(`Project ${project.id} is missing its challenge`);
  }
  for (const field of ["timebox", "mission", "outcome"]) {
    assertString(editorial.challenge[field], `Project ${project.id} challenge.${field}`);
  }
  for (const field of ["requirements", "constraints", "definitionOfDone"]) {
    assertStringArray(editorial.challenge[field], `Project ${project.id} challenge.${field}`);
  }
  if (!Array.isArray(editorial.lessons) || editorial.lessons.length !== project.checkpointCount) {
    throw new Error(`Project ${project.id} lesson metadata must match checkpointCount`);
  }

  const contentFiles = readdirSync(path.join(workspace, "content", project.slug))
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  editorial.lessons.forEach((lesson, index) => {
    const order = index + 1;
    const expectedId = `p${project.id}-l${String(order).padStart(2, "0")}`;
    const expectedSlug = contentFiles[index]?.slice(0, -4);
    if (lesson.id !== expectedId) {
      throw new Error(`Project ${project.id} lesson ${order} must use id ${expectedId}`);
    }
    if (lessonIds.has(lesson.id)) {
      throw new Error(`Lesson id ${lesson.id} appears more than once`);
    }
    lessonIds.add(lesson.id);
    if (lesson.order !== order || lesson.slug !== expectedSlug) {
      throw new Error(
        `Project ${project.id} lesson ${order} is out of sync with ${contentFiles[index]}`,
      );
    }
    assertString(lesson.title, `${lesson.id} title`);
    assertString(lesson.summary, `${lesson.id} summary`);
    if (!Number.isInteger(lesson.estimatedMinutes) || lesson.estimatedMinutes < 1) {
      throw new Error(`${lesson.id} estimatedMinutes must be a positive integer`);
    }
    if ("checkpoint" in lesson) {
      throw new Error(
        `${lesson.id} contains the obsolete checkpoint field; order is the checkpoint contract`,
      );
    }
  });
}

function validateLearning(project, learning, lessons) {
  if (!learning || typeof learning !== "object") {
    throw new Error(`Project ${project.id} learning.ts must export an object`);
  }
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const guideIds = Object.keys(learning.guides ?? {});
  const referenceIds = Object.keys(learning.references ?? {});
  for (const lessonId of lessonIds) {
    if (!guideIds.includes(lessonId)) {
      throw new Error(`Project ${project.id} is missing a code guide for ${lessonId}`);
    }
    if (!referenceIds.includes(lessonId) || learning.references[lessonId].length === 0) {
      throw new Error(`Project ${project.id} is missing references for ${lessonId}`);
    }
  }
  for (const lessonId of [...guideIds, ...referenceIds]) {
    if (!lessonIds.has(lessonId)) {
      throw new Error(`Project ${project.id} learning.ts contains orphan data for ${lessonId}`);
    }
  }
  const sourceDirectory = path.join(workspace, "examples", project.sourceDirectory);
  const availableFiles = new Set([
    "CMakeLists.txt",
    ...walkRelativeFiles(path.join(sourceDirectory, "source-template")),
    ...walkRelativeFiles(path.join(sourceDirectory, "tests")).map((file) => `tests/${file}`),
    ...(existsSync(path.join(sourceDirectory, "assets"))
      ? walkRelativeFiles(path.join(sourceDirectory, "assets")).map((file) => `assets/${file}`)
      : []),
  ]);
  for (const [lessonId, guide] of Object.entries(learning.guides)) {
    assertString(guide.focus, `${lessonId} guide focus`);
    assertString(guide.expected, `${lessonId} guide expected`);
    assertStringArray(guide.files, `${lessonId} guide files`);
    if (!Array.isArray(guide.steps) || guide.steps.length === 0) {
      throw new Error(`${lessonId} guide must contain at least one step`);
    }
    for (const file of guide.files) {
      if (!availableFiles.has(file)) {
        throw new Error(`${lessonId} guide references unknown source file ${file}`);
      }
    }
  }
}

function validateLab(project, lab) {
  if (!lab?.base || typeof lab.modes !== "object") {
    throw new Error(`Project ${project.id} lab.ts must export base and modes`);
  }
  for (const field of ["label", "title", "description"]) {
    assertString(lab.base[field], `Project ${project.id} lab base.${field}`);
  }
  const contentDirectory = path.join(workspace, "content", project.slug);
  const usedModes = new Set();
  for (const file of readdirSync(contentDirectory).filter((name) => name.endsWith(".mdx"))) {
    const source = readFileSync(path.join(contentDirectory, file), "utf8");
    for (const usage of interactiveLabUsages(source, `${project.slug}/${file}`)) {
      if (usage.demo !== project.demoId) {
        throw new Error(
          `${project.slug}/${file} uses demo ${usage.demo} instead of ${project.demoId}`,
        );
      }
      if (usage.mode && !lab.modes[usage.mode]) {
        throw new Error(`${project.slug}/${file} uses undocumented lab mode ${usage.mode}`);
      }
      if (usage.mode) usedModes.add(usage.mode);
    }
  }
  for (const mode of Object.keys(lab.modes)) {
    if (!usedModes.has(mode)) {
      throw new Error(`Project ${project.id} lab.ts contains unused mode ${mode}`);
    }
  }
  const componentPath = path.join(workspace, "components", "labs", `${project.demoId}-lab.tsx`);
  if (!existsSync(componentPath)) {
    throw new Error(`Project ${project.id} is missing components/labs/${project.demoId}-lab.tsx`);
  }
}

const roadmapModule = await evaluateTypeScript(path.join("course", "roadmap.ts"));
assertGlossaryModules(
  readdirSync(path.join(workspace, "lib"))
    .filter((file) => /^glossary(?:-[a-z-]+)?\.ts$/.test(file))
    .map((file) => `lib/${file}`),
);
const glossaryTerms = await loadGlossaryCatalog(evaluateTypeScript);
const roadmap = roadmapModule.roadmapSeed;
const roadmapById = new Map(roadmap.map((item) => [String(item.id).padStart(2, "0"), item]));
const lessonIds = new Set();
const authoredProjects = [];

for (const project of projects) {
  const projectDirectory = path.join("course", "projects", `p${project.id}`);
  const manifestModule = await evaluateTypeScript(path.join(projectDirectory, "manifest.ts"));
  const learningModule = await evaluateTypeScript(path.join(projectDirectory, "learning.ts"));
  const labModule = await evaluateTypeScript(path.join(projectDirectory, "lab.ts"));
  const editorial = manifestModule.default;
  const learning = learningModule.default;
  const lab = labModule.default;
  validateEditorial(project, editorial, lessonIds);
  validateLearning(project, learning, editorial.lessons);
  validateLab(project, lab);
  const roadmapItem = roadmapById.get(project.id);
  if (!roadmapItem) throw new Error(`Project ${project.id} does not exist in course/roadmap.ts`);
  authoredProjects.push({ project, editorial, roadmapItem });
}

const catalogSource =
  `// Generated from course/projects.json. Do not edit by hand.\n` +
  `export const projectCatalog = ${JSON.stringify(projects, null, 2)} as const;\n\n` +
  `export type ProjectCatalogEntry = (typeof projectCatalog)[number];\n` +
  `export type DemoId = ProjectCatalogEntry["demoId"];\n\n` +
  `export const projectCatalogById = new Map<string, ProjectCatalogEntry>(\n` +
  `    projectCatalog.map((project) => [project.id, project] as const),\n` +
  `);\n`;

const summaries = authoredProjects.map(({ project, editorial, roadmapItem }) => ({
  id: project.id,
  slug: project.slug,
  part: roadmapItem.part,
  title: roadmapItem.title,
  summary: editorial.summary,
  status: "published",
  duration: editorial.duration,
  lessonCount: editorial.lessons.length,
  download: `/downloads/${project.sourceDirectory}.zip`,
  demoId: project.demoId,
}));
const summariesSource =
  `// Generated from project manifests. Do not edit by hand.\n` +
  `import type { PublishedProjectSummary } from "../types";\n\n` +
  `export const publishedProjectSummaries = ${JSON.stringify(summaries, null, 2)} as const satisfies readonly PublishedProjectSummary[];\n`;

const manifestEntries = projects.map(
  (project) => `    "${project.slug}": () => import("../projects/p${project.id}/manifest"),`,
);
const learningEntries = projects.map(
  (project) => `    "${project.id}": () => import("../projects/p${project.id}/learning"),`,
);
const labMetadataEntries = projects.map(
  (project) => `    "${project.demoId}": () => import("../projects/p${project.id}/lab"),`,
);
const loadersSource =
  `// Generated from course/projects.json. Do not edit by hand.\n` +
  `import type { PublishedProjectEditorial } from "../types";\n` +
  `import type { ProjectLearningAssets } from "../learning/types";\n\n` +
  `import type { ProjectLabMeta } from "../labs/types";\n\n` +
  `type ManifestModule = { default: PublishedProjectEditorial };\n` +
  `type LearningModule = { default: ProjectLearningAssets };\n\n` +
  `type LabMetadataModule = { default: ProjectLabMeta };\n\n` +
  `export const projectManifestLoaders: Record<string, () => Promise<ManifestModule>> = {\n${manifestEntries.join("\n")}\n};\n\n` +
  `export const projectLearningLoaders: Record<string, () => Promise<LearningModule>> = {\n${learningEntries.join("\n")}\n};\n\n` +
  `export const labMetadataLoaders: Record<string, () => Promise<LabMetadataModule>> = {\n${labMetadataEntries.join("\n")}\n};\n`;

const labComponentEntries = projects.map(
  (project) =>
    `    "${project.demoId}": lazy(() => import("@/components/labs/${project.demoId}-lab")),`,
);
const labLoadersSource =
  `"use client";\n\n` +
  `// Generated Canvas-lab registry. Do not edit by hand.\n` +
  `import { lazy } from "react";\n\n` +
  `export const labComponents = {\n${labComponentEntries.join("\n")}\n} as const;\n`;

function searchItem(title, href, kind, keywords) {
  return {
    title,
    href,
    kind,
    haystack: normalizeSearchText(`${title} ${kind} ${keywords}`),
  };
}

const publishedById = new Map(authoredProjects.map((entry) => [entry.project.id, entry]));
const projectSearchItems = roadmap.map((item) => {
  const id = String(item.id).padStart(2, "0");
  const published = publishedById.get(id);
  return searchItem(
    `Dự án ${id} — ${item.title}`,
    published ? `/projects/${published.project.slug}` : `/roadmap#project-${id}`,
    published ? "Dự án" : "Sắp ra mắt",
    published
      ? `${item.part} ${published.editorial.summary} ${published.editorial.objectives.join(" ")}`
      : item.part,
  );
});
const pageSearchItems = [
  searchItem(
    "Bắt đầu — Cài compiler, CMake và build project đầu tiên",
    "/getting-started",
    "Hướng dẫn",
    "Visual Studio MSVC macOS Linux configure build target checkpoint debug SDL3",
  ),
  searchItem(
    "Lộ trình 78 dự án",
    "/roadmap",
    "Trang",
    "roadmap đồ họa 3D physics GPU molecular fluid ray voxel UI",
  ),
  searchItem(
    `Tải mã nguồn ${projects.length} project đã phát hành`,
    "/downloads",
    "Trang",
    "ZIP starter checkpoint final tests README source code",
  ),
  searchItem(
    "Thuật ngữ C++, SDL3, đồ họa và mô phỏng",
    "/glossary",
    "Trang",
    "glossary từ điển khái niệm định nghĩa",
  ),
];
const glossarySearchItems = glossaryTerms.map((term) =>
  searchItem(
    term.term,
    `/glossary#${term.id}`,
    "Thuật ngữ",
    `${term.definition} ${term.keywords ?? ""}`,
  ),
);

const expectedFiles = new Map([
  [path.join(generatedDirectory, "glossary.ts"), glossaryRegistrySource()],
  [path.join(generatedDirectory, "catalog.ts"), catalogSource],
  [path.join(generatedDirectory, "project-summaries.ts"), summariesSource],
  [path.join(generatedDirectory, "project-loaders.ts"), loadersSource],
  [path.join(generatedDirectory, "lab-loaders.ts"), labLoadersSource],
]);

const progressLoaderEntries = [];
for (const { project, editorial } of authoredProjects) {
  const moduleName = `p${project.id}`;
  const lessons = Object.fromEntries(
    editorial.lessons.map((lesson) => [
      lesson.id,
      {
        id: lesson.id,
        title: lesson.title,
        href: `/projects/${project.slug}/${lesson.slug}`,
      },
    ]),
  );
  expectedFiles.set(
    path.join(progressDirectory, `${moduleName}.ts`),
    `// Generated progress migration data. Do not edit by hand.\n` +
      `export const lessons = ${JSON.stringify(lessons, null, 2)} as const;\n`,
  );
  progressLoaderEntries.push(`    "${moduleName}": () => import("./${moduleName}"),`);
}
const progressLoadersSource =
  `// Generated progress migration loaders. Do not edit by hand.\n` +
  `export type StoredLesson = { id: string; title: string; href: string };\n` +
  `type ProgressModule = { lessons: Record<string, StoredLesson> };\n\n` +
  `const loaders: Record<string, () => Promise<ProgressModule>> = {\n${progressLoaderEntries.join("\n")}\n};\n\n` +
  `export async function loadStoredLesson(lessonId: string): Promise<StoredLesson | undefined> {\n` +
  `    const projectId = lessonId.match(/^(p\\d{2})-l\\d{2}$/)?.[1];\n` +
  `    const load = projectId ? loaders[projectId] : undefined;\n` +
  `    return load ? (await load()).lessons[lessonId] : undefined;\n` +
  `}\n`;
expectedFiles.set(path.join(progressDirectory, "loaders.ts"), progressLoadersSource);

const overviewSearchShardImports = [];
const detailSearchShardImports = [];
function searchShardSource(items, description) {
  return (
    `// Generated ${description}. Do not edit by hand.\n` +
    `import type { SearchItem } from "../../search/types";\n\n` +
    `export const items = ${JSON.stringify(items, null, 2)} as const satisfies readonly SearchItem[];\n`
  );
}

function addSearchShard(name, items, description, group) {
  const source = searchShardSource(items, description);
  expectedFiles.set(path.join(searchDirectory, `${name}.ts`), source);
  group.push(`    () => import("./${name}"),`);
}

function addSizedSearchShards(prefix, itemGroups, description, loaders) {
  const shards = [];
  let current = [];
  for (const itemGroup of itemGroups) {
    const candidate = [...current, ...itemGroup];
    if (
      current.length > 0 &&
      Buffer.byteLength(searchShardSource(candidate, description), "utf8") > searchShardTargetBytes
    ) {
      shards.push(current);
      current = [...itemGroup];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) shards.push(current);
  for (const [index, items] of shards.entries()) {
    addSearchShard(`${prefix}-${String(index + 1).padStart(2, "0")}`, items, description, loaders);
  }
}

addSearchShard("pages", pageSearchItems, "page-search shard", overviewSearchShardImports);
addSizedSearchShards(
  "glossary",
  glossarySearchItems.map((item) => [item]),
  "glossary-search shard",
  detailSearchShardImports,
);
addSizedSearchShards(
  "projects",
  projectSearchItems.map((item) => [item]),
  "project-search shard",
  overviewSearchShardImports,
);
addSizedSearchShards(
  "lessons",
  authoredProjects.map(({ project, editorial }) =>
    editorial.lessons.map((lesson) =>
      searchItem(
        lesson.title,
        `/projects/${project.slug}/${lesson.slug}`,
        `Dự án ${project.id}`,
        lesson.summary,
      ),
    ),
  ),
  "lesson-search shard",
  detailSearchShardImports,
);
const searchLoadersSource =
  `// Generated search-shard registry. Do not edit by hand.\n` +
  `import type { SearchItem } from "../../search/types";\n\n` +
  `type SearchShard = { items: readonly SearchItem[] };\n` +
  `const overviewLoaders: Array<() => Promise<SearchShard>> = [\n${overviewSearchShardImports.join("\n")}\n];\n` +
  `const detailLoaders: Array<() => Promise<SearchShard>> = [\n${detailSearchShardImports.join("\n")}\n];\n\n` +
  `async function loadShards(loaders: Array<() => Promise<SearchShard>>): Promise<SearchItem[]> {\n` +
  `    const shards = await Promise.all(loaders.map((load) => load()));\n` +
  `    return shards.flatMap((shard) => [...shard.items]);\n` +
  `}\n\n` +
  `export function loadSearchOverviewItems(): Promise<SearchItem[]> {\n` +
  `    return loadShards(overviewLoaders);\n` +
  `}\n\n` +
  `export function loadSearchDetailItems(): Promise<SearchItem[]> {\n` +
  `    return loadShards(detailLoaders);\n` +
  `}\n`;
expectedFiles.set(path.join(searchDirectory, "loaders.ts"), searchLoadersSource);

const result = reconcileGeneratedFiles({
  expectedFiles,
  managedRoots: [generatedDirectory],
  checkOnly,
  workspace,
});

const expectedProjectDirectories = new Set(projects.map((project) => `p${project.id}`));
for (const entry of readdirSync(path.join(workspace, "course", "projects"), {
  withFileTypes: true,
})) {
  if (
    entry.isDirectory() &&
    /^p\d{2}$/.test(entry.name) &&
    !expectedProjectDirectories.has(entry.name)
  ) {
    result.mismatchCount += 1;
    process.stderr.write(`Unregistered project directory: course/projects/${entry.name}\n`);
  }
}

if (result.mismatchCount > 0) {
  process.stderr.write("Run `npm run generate:course` after updating project metadata.\n");
  process.exit(1);
}

if (!checkOnly) {
  process.stdout.write(
    `Synchronized registries for ${projects.length} published projects ` +
      `(${result.changedCount} updated, ${result.removedCount} removed).\n`,
  );
}
