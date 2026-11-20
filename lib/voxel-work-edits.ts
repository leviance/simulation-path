import { diffLines } from "./diff-lines.ts";

// Locations refer to the learner's file AFTER the preceding edits. The lines on
// either side are landmarks, not part of the text to type or remove.
export function voxelWorkEdits(before: string, after: string) {
  const rows = diffLines(before.replaceAll("\r", ""), after.replaceAll("\r", ""));
  const groups: { first: number; last: number }[] = [];
  for (const [i, row] of rows.entries()) {
    if (row.kind === "same") continue;
    const previous = groups.at(-1);
    if (previous && i - previous.last <= 4) previous.last = i;
    else groups.push({ first: i, last: i });
  }
  return groups.map(({ first, last }) => {
    const changed = rows.slice(first, last + 1);
    return {
      line: rows[first].newLine,
      above: rows
        .slice(Math.max(0, first - 3), first)
        .filter((r) => r.kind === "same")
        .map((r) => r.text),
      below: rows
        .slice(last + 1, last + 4)
        .filter((r) => r.kind === "same")
        .map((r) => r.text),
      remove: changed.filter((r) => r.kind !== "add").map((r) => r.text),
      write: changed.filter((r) => r.kind !== "remove").map((r) => r.text),
    };
  });
}
