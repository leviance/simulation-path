import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ProcessExitError,
  ProcessSupervisor,
  ProcessTimeoutError,
  installShutdownHandlers,
} from "./process-supervisor.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCli =
  process.env.npm_execpath ??
  path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const vinextCli = path.join(workspace, "node_modules", "vinext", "dist", "cli.js");
const eslintCli = path.join(workspace, "node_modules", "eslint", "bin", "eslint.js");
const browserRunner = path.join(workspace, "scripts", "run-browser-tests.mjs");
const mode = process.argv[2] ?? "full";

const packageStage = {
  label: "Đồng bộ course và đóng gói ZIP",
  command: process.execPath,
  args: [npmCli, "run", "package:projects"],
  timeoutMs: 2 * 60_000,
};
const productionBuildStage = {
  label: "Build website production",
  command: process.execPath,
  args: [vinextCli, "build"],
  timeoutMs: 4 * 60_000,
};
const fastStages = [
  { label: "Ngăn generated outputs được đưa vào Git", script: "check:git", timeoutMs: 15_000 },
  { label: "Kiểm tra course generated files", script: "check:course", timeoutMs: 60_000 },
  { label: "Kiểm tra architecture budgets", script: "check:architecture", timeoutMs: 60_000 },
  { label: "Kiểm tra format", script: "check:format", timeoutMs: 2 * 60_000 },
  { label: "TypeScript typecheck", script: "typecheck", timeoutMs: 2 * 60_000 },
  { label: "Kiểm tra toán Canvas", script: "test:labs", timeoutMs: 60_000 },
  { label: "Kiểm tra tooling", script: "test:tooling", timeoutMs: 2 * 60_000 },
  { label: "Đối chiếu ZIP với source", script: "check:packages", timeoutMs: 2 * 60_000 },
].map(({ label, script, timeoutMs }) => ({
  label,
  command: process.execPath,
  args: [npmCli, "run", script],
  timeoutMs,
}));
const renderedHtmlStage = {
  label: "Kiểm tra HTML, nội dung và source contract",
  command: process.execPath,
  args: ["--test", "tests/rendered-html.test.mjs"],
  timeoutMs: 5 * 60_000,
};
const mdxDevelopmentStage = {
  label: "Kiểm tra MDX trong development pipeline",
  command: process.execPath,
  args: ["--test", "tests/mdx-development.test.mjs"],
  timeoutMs: 3 * 60_000,
};
const browserStage = {
  label: "Kiểm tra trình duyệt production",
  command: process.execPath,
  args: [browserRunner],
  timeoutMs: 4 * 60_000,
};
const lintStage = {
  label: "ESLint toàn repository",
  command: process.execPath,
  args: [eslintCli, "."],
  timeoutMs: 3 * 60_000,
};

const suites = {
  prepare: { timeoutMs: 2 * 60_000, stages: [packageStage] },
  build: { timeoutMs: 6 * 60_000, stages: [packageStage, productionBuildStage] },
  site: {
    timeoutMs: 8 * 60_000,
    stages: [packageStage, productionBuildStage, renderedHtmlStage],
  },
  browser: {
    timeoutMs: 10 * 60_000,
    stages: [packageStage, productionBuildStage, browserStage],
  },
  fast: { timeoutMs: 6 * 60_000, stages: [packageStage, ...fastStages] },
  full: {
    timeoutMs: 15 * 60_000,
    stages: [
      packageStage,
      productionBuildStage,
      ...fastStages,
      mdxDevelopmentStage,
      renderedHtmlStage,
      browserStage,
    ],
  },
  lint: { timeoutMs: 3 * 60_000, stages: [lintStage] },
};

const suite = suites[mode];
if (!suite) {
  process.stderr.write(`Unknown bounded test suite: ${mode}\n`);
  process.exitCode = 2;
} else {
  const supervisor = new ProcessSupervisor();
  const removeShutdownHandlers = installShutdownHandlers(supervisor, `${mode} suite`);
  const startedAt = Date.now();

  try {
    for (const [index, stage] of suite.stages.entries()) {
      const elapsed = Date.now() - startedAt;
      const remaining = suite.timeoutMs - elapsed;
      if (remaining <= 0) throw new ProcessTimeoutError(`${mode} suite`, suite.timeoutMs);

      const timeoutMs = Math.min(stage.timeoutMs, remaining);
      process.stdout.write(
        `\n[${index + 1}/${suite.stages.length}] ${stage.label} ` +
          `(hard timeout ${Math.ceil(timeoutMs / 1_000)}s)\n`,
      );
      await supervisor.run({
        ...stage,
        timeoutMs,
        cwd: workspace,
        env: process.env,
      });
    }

    const seconds = ((Date.now() - startedAt) / 1_000).toFixed(1);
    process.stdout.write(`\n${mode} suite completed in ${seconds}s.\n`);
  } catch (error) {
    process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n`);
    if (error instanceof ProcessTimeoutError) process.exitCode = 124;
    else if (error instanceof ProcessExitError) process.exitCode = error.exitCode;
    else process.exitCode = 1;
  } finally {
    removeShutdownHandlers();
    await supervisor.stopAll();
  }
}
