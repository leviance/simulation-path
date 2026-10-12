const header = "// Generated from project manifests. Do not edit by hand.\n";
const shardTargetBytes = 8 * 1024;
const shardLimitBytes = 16 * 1024;
function shardSource(summaries) {
  return (
    header +
    'import type { PublishedProjectSummary } from "../../types";\n\n' +
    `export const summaries = ${JSON.stringify(summaries, null, 2)} as const satisfies readonly PublishedProjectSummary[];\n`
  );
}

export function projectSummaryModules(summaries) {
  const groups = [];
  let current = [];
  for (const summary of summaries) {
    if (Buffer.byteLength(shardSource([summary])) > shardLimitBytes)
      throw new Error(`Project ${summary.id} summary exceeds the shard size limit`);
    const candidate = [...current, summary];
    if (
      current.length > 0 &&
      (candidate.length > 10 || Buffer.byteLength(shardSource(candidate)) > shardTargetBytes)
    ) {
      groups.push(current);
      current = [];
    }
    current.push(summary);
  }
  if (current.length > 0) groups.push(current);
  const files = new Map(),
    imports = [],
    entries = [];
  groups.forEach((group, index) => {
    const id = String(index + 1).padStart(2, "0"),
      name = `summaryShard${id}`;
    files.set(`summaries/${id}.ts`, shardSource(group));
    imports.push(`import { summaries as ${name} } from "./summaries/${id}";`);
    entries.push(`    ...${name},`);
  });
  files.set(
    "project-summaries.ts",
    header +
      'import type { PublishedProjectSummary } from "../types";\n' +
      imports.join("\n") +
      `\n\nexport const publishedProjectSummaries = [\n${entries.join("\n")}\n] as const satisfies readonly PublishedProjectSummary[];\n`,
  );
  return files;
}
