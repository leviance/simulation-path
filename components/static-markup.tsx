"use client";

import { unpackStaticMarkup } from "@/lib/static-markup.mjs";

// SSR and hydration reconstruct the same escaped compiler HTML. Passing compact
// data across this client boundary avoids serializing every repeated token tag.
export function CourseStaticMarkup({
  kind,
  packed,
}: {
  kind: "code" | "math";
  packed: { dictionary: string[]; parts: Array<string | number> };
}) {
  const content = { __html: unpackStaticMarkup(packed) };
  return kind === "code" ? (
    <div data-code-html="" dangerouslySetInnerHTML={content} />
  ) : (
    <span data-math-html="" dangerouslySetInnerHTML={content} />
  );
}
