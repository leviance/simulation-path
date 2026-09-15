import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const windowsCandidates = [
  "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Tools/Llvm/bin/clang-format.exe",
  "C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Tools/Llvm/x64/bin/clang-format.exe",
  "C:/Program Files/LLVM/bin/clang-format.exe",
];
const candidates = [
  process.env.CLANG_FORMAT,
  "clang-format",
  ...(process.platform === "win32" ? windowsCandidates : []),
].filter(Boolean);

const clangFormat = candidates.find((candidate) => {
  if (path.isAbsolute(candidate) && !existsSync(candidate)) return false;
  return spawnSync(candidate, ["--version"], { encoding: "utf8", timeout: 5_000 }).status === 0;
});

if (!clangFormat) {
  throw new Error("clang-format was not found. Install it or set CLANG_FORMAT.");
}

function formatCpp(source, filename) {
  const result = spawnSync(clangFormat, ["-style=file", `-assume-filename=${filename}`], {
    cwd: workspace,
    input: source,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`clang-format failed for ${filename}: ${result.stderr}`);
  }
  return result.stdout.trimEnd();
}

function walk(directory, predicate) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target, predicate));
    else if (predicate(target)) files.push(target);
  }
  return files;
}

let changed = 0;
const templateFiles = walk(path.join(workspace, "examples"), (file) =>
  /[\\/](?:source-template|tests)[\\/].*\.(?:cpp|hpp)$/.test(file),
);
for (const file of templateFiles) {
  const source = readFileSync(file, "utf8");
  const formatted = `${formatCpp(source, file)}\n`;
  if (formatted !== source) {
    writeFileSync(file, formatted);
    changed += 1;
  }
}

const lessonFiles = walk(path.join(workspace, "content"), (file) => file.endsWith(".mdx"));
for (const file of lessonFiles) {
  const source = readFileSync(file, "utf8");
  const formatted = source.replace(
    /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    (block, title, code) => {
      try {
        return `\`\`\`cpp title="${title}"\n${formatCpp(code, file)}\n\`\`\``;
      } catch {
        return block;
      }
    },
  );
  if (formatted !== source) {
    writeFileSync(file, formatted);
    changed += 1;
  }
}

process.stdout.write(`Formatted course C++ in ${changed} files with ColumnLimit 0.\n`);
