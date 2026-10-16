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
