// Giữ nguyên literal và toán tử; chỉ bỏ comment và khoảng trắng giữa các token.
// Không bỏ token trong source: `return;` không được khớp với `return trace;`.
export function codeTokens(source) {
  const tokens =
    source.match(
      /\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|(?:u8|u|U|L)?"(?:\\.|[^"\\])*"|(?:u8|u|U|L)?'(?:\\.|[^'\\])*'|[A-Za-z_][A-Za-z0-9_]*|\d[\w.']*|::|->|==|!=|<=|>=|\+=|-=|\*=|\/=|&&|\|\||<<|>>|\+\+|--|[^\s]/g,
    ) ?? [];
  return tokens.filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
}

export function isContiguousCodeExcerpt(fragment, source) {
  const expected = codeTokens(fragment);
  if (expected.length === 0) return false;
  const delimiter = "\u0000";
  const haystack = delimiter + codeTokens(source).join(delimiter) + delimiter;
  return haystack.includes(delimiter + expected.join(delimiter) + delimiter);
}

// Return a fresh expression: callers may replace or iterate without sharing lastIndex.
export function markedSnippetBlockPattern() {
  return /(\{\/\* snippet ((?:include|src|tests|shaders)\/[a-zA-Z0-9_./-]+)#([a-z0-9-]+) \*\/\}\r?\n(?:\r?\n)*)```(cpp|glsl) title="([^"]+)"\r?\n[\s\S]*?^```[ \t]*(?=\r?$)/gm;
}

// Markers survive snapshot generation; read the exact checkpoint, not the template.
export function markedCodeExcerpt(source, id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid snippet marker: ${id}`);
  const start = new RegExp(`^ *// \\[snippet ${id}\\] *$`, "gm");
  const end = new RegExp(`^ *// \\[/snippet ${id}\\] *$`, "gm");
  const begins = [...source.matchAll(start)];
  const ends = [...source.matchAll(end)];
  if (begins.length !== 1 || ends.length !== 1 || ends[0].index <= begins[0].index)
    throw new Error(`Missing, repeated or reversed snippet marker: ${id}`);
  const body = source
    .slice(begins[0].index + begins[0][0].length, ends[0].index)
    .replace(/^ *\/\/ \[\/?snippet [a-z0-9-]+\] *\r?\n/gm, "")
    .replace(/^\r?\n/, "")
    .trimEnd();
  if (!body.trim()) throw new Error(`Empty snippet marker: ${id}`);
  const indent = Math.min(
    ...body
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => line.match(/^ */)[0].length),
  );
  return body
    .split(/\r?\n/)
    .map((line) => line.slice(indent))
    .join("\n");
}
