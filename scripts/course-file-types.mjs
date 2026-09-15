import path from "node:path";

// Treat unknown formats as binary. This is deliberately an allowlist: decoding an
// unfamiliar asset as UTF-8 and encoding it again can silently change its bytes.
const textExtensions = new Set([
  ".bat",
  ".c",
  ".cc",
  ".cmake",
  ".comp",
  ".cpp",
  ".css",
  ".cxx",
  ".cfg",
  ".csv",
  ".frag",
  ".geom",
  ".glsl",
  ".h",
  ".hh",
  ".hlsl",
  ".hpp",
  ".htm",
  ".html",
  ".hxx",
  ".ini",
  ".inl",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".metal",
  ".mjs",
  ".mtl",
  ".obj",
  ".props",
  ".ps1",
  ".py",
  ".sh",
  ".slang",
  ".tesc",
  ".tese",
  ".toml",
  ".ts",
  ".tsv",
  ".tsx",
  ".txt",
  ".vert",
  ".wgsl",
  ".xml",
  ".yaml",
  ".yml",
]);

const displayableExtensions = new Set([
  ".bat",
  ".c",
  ".cc",
  ".cmake",
  ".comp",
  ".cpp",
  ".css",
  ".cxx",
  ".cfg",
  ".frag",
  ".geom",
  ".glsl",
  ".h",
  ".hh",
  ".hlsl",
  ".hpp",
  ".htm",
  ".html",
  ".hxx",
  ".ini",
  ".inl",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".metal",
  ".mjs",
  ".props",
  ".ps1",
  ".py",
  ".sh",
  ".slang",
  ".tesc",
  ".tese",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vert",
  ".wgsl",
  ".xml",
  ".yaml",
  ".yml",
]);

const textBasenames = new Set(["CMakeLists.txt", "LICENSE", "Makefile", "README"]);

export function isCourseTextFile(relativePath) {
  const basename = path.basename(relativePath);
  if (textBasenames.has(basename)) return true;
  if (/^(?:LICENSE|README)(?:\.[^.]+)?$/i.test(basename)) return true;
  return textExtensions.has(path.extname(basename).toLowerCase());
}

export function isDisplayableCourseFile(relativePath) {
  const basename = path.basename(relativePath);
  if (textBasenames.has(basename) || /^(?:LICENSE|README)(?:\.[^.]+)?$/i.test(basename)) {
    return true;
  }
  return displayableExtensions.has(path.extname(basename).toLowerCase());
}

export function materializeSnapshotFile({ source, relativePath, renderText }) {
  if (!isCourseTextFile(relativePath)) return Buffer.from(source);
  return Buffer.from(renderText(source.toString("utf8")), "utf8");
}
