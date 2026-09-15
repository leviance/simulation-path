import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ProcessExitError,
  ProcessSupervisor,
  ProcessTimeoutError,
  installShutdownHandlers,
} from "./process-supervisor.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const supervisor = new ProcessSupervisor();
const removeShutdownHandlers = installShutdownHandlers(supervisor, "full MDX test");
const testName = "development pipeline compiles representative MDX lessons before Oxc";

try {
  await supervisor.run({
    label: "Full MDX development transform",
    command: process.execPath,
    args: ["--test", `--test-name-pattern=${testName}`, "tests/mdx-development.test.mjs"],
    cwd: workspace,
    env: { ...process.env, FULL_MDX_DEV_CHECK: "1" },
    timeoutMs: 10 * 60_000,
  });
} catch (error) {
  process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n`);
  if (error instanceof ProcessTimeoutError) process.exitCode = 124;
  else if (error instanceof ProcessExitError) process.exitCode = error.exitCode;
  else process.exitCode = 1;
} finally {
  removeShutdownHandlers();
  await supervisor.stopAll();
}
