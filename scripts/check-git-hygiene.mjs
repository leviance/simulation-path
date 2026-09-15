import { existsSync } from "node:fs";
import path from "node:path";
import { workspace } from "./project-catalog.mjs";
import { trackedGeneratedFiles } from "./git-hygiene.mjs";

if (!existsSync(path.join(workspace, ".git"))) {
  // GitHub's source ZIP has no index. CI must require the real index check.
  if (process.argv.includes("--required")) {
    throw new Error("A Git checkout is required for the tracked-output check.");
  }
  process.stdout.write("Source archive without .git: tracked-output check skipped.\n");
} else {
  const tracked = trackedGeneratedFiles(workspace);
  if (tracked.length > 0) {
    process.stderr.write(
      `${tracked.length} generated course outputs are tracked in Git:\n` +
        tracked
          .slice(0, 20)
          .map((file) => `  ${file}\n`)
          .join("") +
        "Keep authored inputs in Git; generated outputs belong only in local/build artifacts.\n",
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Git tracks authored course sources, not generated outputs.\n");
  }
}
