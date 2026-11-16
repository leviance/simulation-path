import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { markedCodeExcerpt } from "./code-snippets.mjs";

const args = process.argv.slice(2);
const selection = args.find((value) => /^--project=\d{2}$/.test(value));
if (!selection || args.some((value) => value !== selection && value !== "--check"))
  throw new Error("Usage: node scripts/sync-marked-snippets.mjs --project=47 [--check]");
const project = loadProjectCatalog().find((value) => value.id === selection.slice(10));
if (!project) throw new Error("Selected project is not in the published catalog");
const directory = path.join(workspace, "content", project.slug);
const sourceDirectory = path.join(workspace, "examples", project.sourceDirectory);
const pattern =
  /(\{\/\* snippet ((?:include|src|tests|shaders)\/[a-zA-Z0-9_./-]+)#([a-z0-9-]+) \*\/\}\r?\n(?:\r?\n)*)```(cpp|glsl) title="([^"]+)"\r?\n[\s\S]*?\r?\n```/g;
let excerpts = 0;
let changed = 0;
for (const name of readdirSync(directory).filter((value) => /^\d{2}-.+\.mdx$/.test(value))) {
  const stage = Number(name.slice(0, 2));
  const file = path.join(directory, name);
  const before = readFileSync(file, "utf8");
  const after = before.replace(pattern, (_, annotation, relative, id, language, title) => {
    if (relative.includes("..") || title.split(" — ")[0] !== relative)
      throw new Error(`${name}: snippet title/path mismatch`);
    if ((language === "glsl") !== relative.startsWith("shaders/"))
      throw new Error(`${name}: snippet language/path mismatch`);
    const snapshot = relative.startsWith("tests/")
      ? sourceDirectory
      : path.join(sourceDirectory, "checkpoints", String(stage).padStart(2, "0"));
    const body = markedCodeExcerpt(readFileSync(path.join(snapshot, relative), "utf8"), id);
    excerpts++;
    return `${annotation}\`\`\`${language} title="${title}"\n${body}\n\`\`\``;
  });
  const annotations = [...before.matchAll(/\{\/\* snippet /g)].length;
  const matched = [...before.matchAll(new RegExp(pattern.source, "g"))].length;
  if (annotations !== matched) throw new Error(`${name}: malformed marked snippet`);
  if (after !== before) {
    if (args.includes("--check"))
      throw new Error(`${name}: code block differs from its checkpoint marker`);
    writeFileSync(file, after);
    changed++;
  }
}
if (!excerpts) throw new Error("No marked snippets in selected project");
console.log(`Project ${project.id}: ${excerpts} marked excerpts, ${changed} lessons synchronized.`);
