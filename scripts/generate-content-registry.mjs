import { readdirSync } from "node:fs";
import path from "node:path";
import { reconcileGeneratedFiles } from "./generated-files.mjs";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";

const projects = loadProjectCatalog();
const checkOnly = process.argv.includes("--check");
const target = path.join(workspace, "content", "registry.ts");
const generatedDirectory = path.join(workspace, "content", "generated");
const expectedFiles = new Map();
const projectEntries = [];
let lessonCount = 0;

for (const project of projects) {
  const files = readdirSync(path.join(workspace, "content", project.slug))
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  lessonCount += files.length;

  const lessonEntries = files.map((file) => {
    const lessonSlug = file.slice(0, -4);
    return `  "${lessonSlug}": () => import("@/content/${project.slug}/${file}"),`;
  });
  expectedFiles.set(
    path.join(generatedDirectory, `p${project.id}.ts`),
    `// Generated lesson registry for Project ${project.id}. Do not edit by hand.\n` +
      `import type { ComponentType } from "react";\n\n` +
      `type LessonModule = { default: ComponentType };\n` +
      `type LessonLoader = () => Promise<LessonModule>;\n\n` +
      `export const lessonLoaders: Record<string, LessonLoader> = {\n` +
      `${lessonEntries.join("\n")}\n` +
      `};\n`,
  );
  projectEntries.push(`  "${project.slug}": () => import("./generated/p${project.id}"),`);
}

expectedFiles.set(
  target,
  `// Generated project-level lesson router. Do not edit by hand.\n` +
    `import { createElement, type ComponentType, type ReactElement } from "react";\n\n` +
    `type LessonModule = { default: ComponentType };\n` +
    `type LessonLoader = () => Promise<LessonModule>;\n` +
    `type ProjectRegistryModule = { lessonLoaders: Record<string, LessonLoader> };\n\n` +
    `const projectRegistryLoaders: Record<string, () => Promise<ProjectRegistryModule>> = {\n` +
    `${projectEntries.join("\n")}\n` +
    `};\n\n` +
    `export async function renderLesson(projectSlug: string, lessonSlug: string): Promise<ReactElement | null> {\n` +
    `  const loadProject = projectRegistryLoaders[projectSlug];\n` +
    `  if (!loadProject) return null;\n` +
    `  const { lessonLoaders } = await loadProject();\n` +
    `  const loadLesson = lessonLoaders[lessonSlug];\n` +
    `  if (!loadLesson) return null;\n` +
    `  const { default: Component } = await loadLesson();\n` +
    `  return createElement(Component);\n` +
    `}\n`,
);

const result = reconcileGeneratedFiles({
  expectedFiles,
  managedRoots: [generatedDirectory],
  checkOnly,
  workspace,
});

if (result.mismatchCount > 0) {
  process.stderr.write(
    "Run `npm run generate:course` to refresh local lesson registries; do not commit them.\n",
  );
  process.exit(1);
}

if (!checkOnly) {
  process.stdout.write(
    `Synchronized ${projects.length} project lesson registries for ${lessonCount} lessons ` +
      `(${result.changedCount} updated, ${result.removedCount} removed).\n`,
  );
}
