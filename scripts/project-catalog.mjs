import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isCourseTextFile } from "./course-file-types.mjs";

export const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const catalogPath = path.join(workspace, "course", "projects.json");

function fail(message) {
  throw new Error(`Invalid course catalog: ${message}`);
}

function assertUnique(projects, field) {
  const values = new Set();
  for (const project of projects) {
    if (values.has(project[field])) {
      fail(`${field} "${project[field]}" appears more than once`);
    }
    values.add(project[field]);
  }
}

function walkFiles(directory, prefix = "") {
  const output = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(directory, relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

export function loadProjectCatalog({ checkDirectories = true } = {}) {
  const projects = JSON.parse(readFileSync(catalogPath, "utf8"));
  if (!Array.isArray(projects) || projects.length === 0) {
    fail("course/projects.json must contain at least one project");
  }

  assertUnique(projects, "id");
  assertUnique(projects, "slug");
  assertUnique(projects, "sourceDirectory");

  let previousNumericId = 0;
  for (const [index, project] of projects.entries()) {
    if (!/^\d{2}$/.test(project.id)) {
      fail(`entry ${index + 1} must use a two-digit id`);
    }
    const numericId = Number(project.id);
    if (numericId < 1 || numericId > 78) {
      fail(`project ${project.id} must use an id from 01 through 78`);
    }
    if (numericId <= previousNumericId) {
      fail(
        `project ${project.id} must appear after project ${String(previousNumericId).padStart(2, "0")}`,
      );
    }
    previousNumericId = numericId;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
      fail(`project ${project.id} has an invalid slug`);
    }
    if (project.sourceDirectory !== `project-${project.id}-${project.slug}`) {
      fail(`project ${project.id} sourceDirectory must match its id and slug`);
    }
    if (!Number.isInteger(project.checkpointCount) || project.checkpointCount < 1) {
      fail(`project ${project.id} must have a positive checkpointCount`);
    }
    if (!checkDirectories) continue;

    const contentDirectory = path.join(workspace, "content", project.slug);
    const sourceDirectory = path.join(workspace, "examples", project.sourceDirectory);
    for (const [label, directory] of [
      ["content", contentDirectory],
      ["source", sourceDirectory],
    ]) {
      if (!existsSync(directory)) {
        fail(
          `project ${project.id} is missing its ${label} directory: ${path.relative(workspace, directory)}`,
        );
      }
    }

    const lessons = readdirSync(contentDirectory)
      .filter((file) => file.endsWith(".mdx"))
      .sort();
    if (lessons.length !== project.checkpointCount) {
      fail(
        `project ${project.id} has ${lessons.length} MDX lessons but ${project.checkpointCount} checkpoints`,
      );
    }
    for (let lesson = 1; lesson <= lessons.length; lesson += 1) {
      const prefix = `${String(lesson).padStart(2, "0")}-`;
      if (!lessons[lesson - 1].startsWith(prefix)) {
        fail(`project ${project.id} lesson ${lesson} must start with "${prefix}"`);
      }
    }

    // Validate authored inputs only: generated CMake/snapshots do not exist on a fresh clone.
    for (const relativeFile of ["README.md", "tests/tests.cpp"]) {
      if (!existsSync(path.join(sourceDirectory, relativeFile))) {
        fail(`project ${project.id} is missing ${relativeFile}`);
      }
    }
    const templateDirectory = path.join(sourceDirectory, "source-template");
    if (!existsSync(templateDirectory)) {
      fail(`project ${project.id} is missing source-template`);
    }
    const templateFiles = walkFiles(templateDirectory);
    if (templateFiles.length === 0) {
      fail(`project ${project.id} source-template must not be empty`);
    }

    let checkpointTemplateCount = 0;
    for (const template of templateFiles) {
      if (!isCourseTextFile(template)) continue;
      const source = readFileSync(path.join(templateDirectory, template), "utf8");
      const match = source.match(/^#define\s+LAB_CHECKPOINT\s+(\d+)$/m);
      if (!match) continue;
      checkpointTemplateCount += 1;
      if (Number(match[1]) !== project.checkpointCount) {
        fail(
          `project ${project.id} source-template/${template} checkpoint count does not match the catalog`,
        );
      }
    }
    if (checkpointTemplateCount === 0) {
      fail(`project ${project.id} source-template has no LAB_CHECKPOINT definition`);
    }
  }

  if (checkDirectories) {
    const catalogSlugs = new Set(projects.map((project) => project.slug));
    const contentDirectories = readdirSync(path.join(workspace, "content"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "generated")
      .map((entry) => entry.name);
    for (const directory of contentDirectories) {
      if (!catalogSlugs.has(directory)) {
        fail(`content/${directory} is not registered in course/projects.json`);
      }
    }

    const catalogSources = new Set(projects.map((project) => project.sourceDirectory));
    const sourceDirectories = readdirSync(path.join(workspace, "examples"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("project-"))
      .map((entry) => entry.name);
    for (const directory of sourceDirectories) {
      if (!catalogSources.has(directory)) {
        fail(`examples/${directory} is not registered in course/projects.json`);
      }
    }
  }

  return projects;
}
