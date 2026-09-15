export const CODE_THEME = "one-dark-pro";

export type HighlightLanguage = "bash" | "cmake" | "cpp" | "diff" | "markdown" | "text";

const colors = {
  foreground: "#abb2bf",
  comment: "#7f848e",
  keyword: "#c678dd",
  function: "#61afef",
  string: "#98c379",
  number: "#d19a66",
  type: "#56b6c2",
  deleted: "#e06c75",
};

const cppKeywords = new Set([
  "alignas",
  "alignof",
  "and",
  "asm",
  "auto",
  "bool",
  "break",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "constexpr",
  "continue",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "explicit",
  "extern",
  "false",
  "float",
  "for",
  "friend",
  "if",
  "inline",
  "int",
  "long",
  "namespace",
  "new",
  "noexcept",
  "nullptr",
  "operator",
  "or",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "struct",
  "switch",
  "template",
  "this",
  "throw",
  "true",
  "try",
  "typedef",
  "typename",
  "union",
  "unsigned",
  "using",
  "virtual",
  "void",
  "volatile",
  "while",
]);

const shellKeywords = new Set([
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "then",
  "while",
]);
const cmakeKeywords = new Set([
  "add_executable",
  "cmake_minimum_required",
  "enable_testing",
  "include",
  "option",
  "project",
  "set",
  "target_compile_features",
  "target_include_directories",
  "target_link_libraries",
]);
const tokenPattern =
  /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|#[^\r\n]*$|\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[fFuUlL]+)?)\b|\b[A-Za-z_][A-Za-z0-9_]*\b/g;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function span(value: string, color: string) {
  return `<span style="color:${color}">${escapeHtml(value)}</span>`;
}

function tokenColor(token: string, line: string, end: number, language: HighlightLanguage) {
  if (token.startsWith("//") || token.startsWith("#")) return colors.comment;
  if (token.startsWith('"') || token.startsWith("'")) return colors.string;
  if (/^(?:0[xX][\da-fA-F]+|\d)/.test(token)) return colors.number;
  if (language === "cpp" && cppKeywords.has(token)) return colors.keyword;
  if (language === "bash" && shellKeywords.has(token)) return colors.keyword;
  if (language === "cmake" && cmakeKeywords.has(token.toLowerCase())) return colors.keyword;
  if (language === "bash" && line.trimStart().startsWith(token)) return colors.function;
  if (/^SDL_[A-Za-z0-9_]+$/.test(token) || /^[A-Z][A-Za-z0-9_]*$/.test(token)) return colors.type;
  if (/^\s*\(/.test(line.slice(end))) return colors.function;
  return null;
}

function highlightLine(line: string, language: HighlightLanguage) {
  if (language === "diff") {
    if (line.startsWith("+++ ") || line.startsWith("--- ")) return span(line, colors.type);
    if (line.startsWith("+")) return span(line, colors.string);
    if (line.startsWith("-")) return span(line, colors.deleted);
    if (line.startsWith("@@")) return span(line, colors.function);
  }
  if (language === "markdown" && /^\s*#{1,6}\s/.test(line)) return span(line, colors.function);
  if (language === "cpp" && /^\s*#/.test(line)) return span(line, colors.keyword);

  let html = "";
  let cursor = 0;
  tokenPattern.lastIndex = 0;
  for (const match of line.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(line.slice(cursor, index));
    const color = tokenColor(match[0], line, index + match[0].length, language);
    html += color ? span(match[0], color) : escapeHtml(match[0]);
    cursor = index + match[0].length;
  }
  return html + escapeHtml(line.slice(cursor));
}

// Source snapshots are highlighted during rendering. This compact tokenizer is
// deterministic and fast enough for request-time use; MDX still uses Shiki at
// build time for full grammar coverage.
export function highlightCode(code: string, language: HighlightLanguage) {
  const body = code
    .split("\n")
    .map((line) => `<span class="line">${highlightLine(line, language)}</span>`)
    .join("\n");
  return `<pre class="shiki one-dark-pro" data-theme="one-dark-pro" style="background-color:#282c34;color:${colors.foreground}" tabindex="0"><code>${body}</code></pre>`;
}
