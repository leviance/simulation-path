import { execFileSync } from "node:child_process";

// Keep this policy aligned with .gitignore. It covers future projects without an ID list.
export function isGeneratedCoursePath(file) {
  return (
    /^(?:course\/generated\/|content\/generated\/|lib\/generated-checkpoint-sources\/|public\/downloads\/)/.test(
      file,
    ) ||
    /^(?:content\/registry\.ts|lib\/generated-checkpoint-sources\.ts)$/.test(file) ||
    /^examples\/project-\d{2}-[a-z0-9-]+\/(?:(?:starter|checkpoints|final)\/|CMakeLists\.txt$)/.test(
      file,
    )
  );
}

export function trackedGeneratedFiles(directory) {
  const output = execFileSync("git", ["ls-files", "--cached", "-z"], {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return output.split("\0").filter(isGeneratedCoursePath);
}
