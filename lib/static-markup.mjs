/**
 * Intern repeated HTML tags. Plain text is never interpreted as a marker, so
 * Unicode, entities and code containing tag-like strings round-trip exactly.
 * Only trusted compiler output (Shiki/KaTeX) may use this HTML transport.
 * @param {string} html
 * @returns {{dictionary: string[], parts: (string | number)[]}}
 */
export function packStaticMarkup(html) {
  const dictionary = [];
  const indices = new Map();
  const parts = [];
  let cursor = 0;
  for (const match of html.matchAll(/<[^>]*>/g)) {
    if (match.index > cursor) parts.push(html.slice(cursor, match.index));
    let index = indices.get(match[0]);
    if (index === undefined) {
      index = dictionary.length;
      dictionary.push(match[0]);
      indices.set(match[0], index);
    }
    parts.push(index);
    cursor = match.index + match[0].length;
  }
  if (cursor < html.length) parts.push(html.slice(cursor));
  return { dictionary, parts };
}

/** @param {{dictionary: string[], parts: (string | number)[]}} packed */
export function unpackStaticMarkup({ dictionary, parts }) {
  return parts.map((part) => (typeof part === "number" ? dictionary[part] : part)).join("");
}
