import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ProcessExitError,
  ProcessSupervisor,
  ProcessTimeoutError,
  installShutdownHandlers,
} from "./process-supervisor.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browserSuiteTimeoutMs = 3 * 60_000;
const serverStartupTimeoutMs = 30_000;
const port = await new Promise((resolve, reject) => {
  const reservation = createServer();
  reservation.once("error", reject);
  reservation.listen(0, "127.0.0.1", () => {
    const address = reservation.address();
    if (!address || typeof address === "string") {
      reservation.close();
      reject(new Error("Cannot reserve a browser-test port"));
      return;
    }
    reservation.close((error) => (error ? reject(error) : resolve(address.port)));
  });
});
const baseURL = `http://127.0.0.1:${port}`;
const vinextCli = path.join(workspace, "node_modules", "vinext", "dist", "cli.js");
const playwrightCli = path.join(workspace, "node_modules", "@playwright", "test", "cli.js");
const supervisor = new ProcessSupervisor();
const removeShutdownHandlers = installShutdownHandlers(supervisor, "browser test runner");

async function waitForServer(server) {
  const deadline = Date.now() + serverStartupTimeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new ProcessExitError("Vinext browser-test server", server.exitCode, server.signalCode);
    }
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new ProcessTimeoutError("Vinext browser-test server startup", serverStartupTimeoutMs);
}

try {
  const server = supervisor.start({
    command: process.execPath,
    args: [vinextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    cwd: workspace,
    env: process.env,
    maxRuntimeMs: serverStartupTimeoutMs + browserSuiteTimeoutMs + 30_000,
  });
  await waitForServer(server);

  const runner = supervisor.start({
    command: process.execPath,
    args: [playwrightCli, "test", ...process.argv.slice(2)],
    cwd: workspace,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
    maxRuntimeMs: browserSuiteTimeoutMs + 6_000,
  });
  await supervisor.wait(runner, {
    label: "Playwright browser suite",
    timeoutMs: browserSuiteTimeoutMs,
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
