import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { markedCodeExcerpt, markedSnippetBlockPattern } from "./code-snippets.mjs";

const args = process.argv.slice(2);
const selection = args.find((value) => /^--project=\d{2}$/.test(value));
if (!selection || args.some((value) => value !== selection && value !== "--check"))
  throw new Error("Usage: node scripts/sync-marked-snippets.mjs --project=47 [--check]");
const project = loadProjectCatalog().find((value) => value.id === selection.slice(10));
if (!project) throw new Error("Selected project is not in the published catalog");
const directory = path.join(workspace, "content", project.slug);
const sourceDirectory = path.join(workspace, "examples", project.sourceDirectory);
const pattern = markedSnippetBlockPattern();
let excerpts = 0;
let changed = 0;
for (const name of readdirSync(directory).filter((value) => /^\d{2}-.+\.mdx$/.test(value))) {
  const stage = Number(name.slice(0, 2));
  const file = path.join(directory, name);
  const before = readFileSync(file, "utf8");
  let after = before.replace(pattern, (_, annotation, relative, id, language, title) => {
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
  const matched = [...before.matchAll(markedSnippetBlockPattern())].length;
  if (annotations !== matched) throw new Error(`${name}: malformed marked snippet`);
  // TinyHTML/CSS fixtures are executable inputs; adding C++ comment markers would
  // change their grammar. Include the short, complete file, never a second copy.
  const assetBlock =
    /(\{\/\* asset (assets\/[a-z0-9-]+\.(html|css|tiny)) \*\/\}\r?\n(?:\r?\n)*)```([^ ]+) title="([^"]+)"\r?\n[\s\S]*?^```[ \t]*(?=\r?$)/gm;
  if ([...after.matchAll(assetBlock)].length !== [...after.matchAll(/\{\/\* asset /g)].length)
    throw new Error(`${name}: malformed teaching asset`);
  after = after.replace(assetBlock, (_, annotation, relative, extension, language, title) => {
    if (
      title.split(" — ")[0] !== relative ||
      language !== (extension === "tiny" ? "javascript" : extension)
    )
      throw new Error(`${name}: asset title/language mismatch`);
    const source = readFileSync(path.join(sourceDirectory, relative), "utf8")
      .replace(/\r\n/g, "\n")
      .trimEnd();
    if (!source || Buffer.byteLength(source) > 16 * 1024)
      throw new Error(`${name}: unbounded teaching asset`);
    excerpts++;
    return `${annotation}\`\`\`${language} title="${title}"\n${source}\n\`\`\``;
  });
  if (after !== before) {
    if (args.includes("--check"))
      throw new Error(`${name}: code block differs from its checkpoint marker`);
    writeFileSync(file, after);
    changed++;
  }
}
if (!excerpts) throw new Error("No marked snippets in selected project");
console.log(`Project ${project.id}: ${excerpts} marked excerpts, ${changed} lessons synchronized.`);
