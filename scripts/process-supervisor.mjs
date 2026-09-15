import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultStopGraceMs = 3_000;
const exitPromises = new WeakMap();
const guardedProcess = fileURLToPath(new URL("./guarded-process.mjs", import.meta.url));

function hasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, milliseconds);
    timeout.unref();
  });
}

function waitForExit(child) {
  const existing = exitPromises.get(child);
  if (existing) return existing;

  const exit = hasExited(child)
    ? Promise.resolve({ code: child.exitCode, signal: child.signalCode })
    : new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => resolve({ code, signal }));
      });
  exitPromises.set(child, exit);
  return exit;
}

async function waitForExitWithin(child, timeoutMs) {
  if (hasExited(child)) return true;
  return Promise.race([
    waitForExit(child)
      .then(() => true)
      .catch(() => true),
    delay(timeoutMs).then(() => false),
  ]);
}

async function runTaskkill(pid, timeoutMs) {
  const windowsDirectory = process.env.SystemRoot ?? "C:\\Windows";
  const taskkill = path.join(windowsDirectory, "System32", "taskkill.exe");
  const killer = spawn(taskkill, ["/PID", String(pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
  const finished = await waitForExitWithin(killer, timeoutMs);
  if (!finished) killer.kill("SIGKILL");
}

export class ProcessTimeoutError extends Error {
  constructor(label, timeoutMs) {
    super(`${label} exceeded its hard timeout of ${Math.ceil(timeoutMs / 1_000)} seconds`);
    this.name = "ProcessTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class ProcessExitError extends Error {
  constructor(label, code, signal) {
    const detail = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
    super(`${label} failed with ${detail}`);
    this.name = "ProcessExitError";
    this.exitCode = code ?? 1;
    this.signal = signal;
  }
}

export async function terminateProcessTree(child, { graceMs = defaultStopGraceMs } = {}) {
  if (!child || hasExited(child)) return;

  if (process.platform === "win32" && child.pid) {
    await runTaskkill(child.pid, graceMs);
  } else {
    try {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }

  if (await waitForExitWithin(child, graceMs)) return;

  try {
    if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    // The process may have exited between the check and the force-kill request.
  }
  await waitForExitWithin(child, graceMs);
}

export class ProcessSupervisor {
  #children = new Set();

  get activeCount() {
    return this.#children.size;
  }

  start({ command, args = [], cwd, env, stdio = "inherit", timeoutMs, maxRuntimeMs }) {
    const guardedRuntimeMs = maxRuntimeMs ?? (timeoutMs ? timeoutMs + 2 * defaultStopGraceMs : 0);
    const child = spawn(
      process.execPath,
      [
        guardedProcess,
        String(process.pid),
        String(guardedRuntimeMs),
        command,
        JSON.stringify(args),
      ],
      {
        cwd,
        env,
        stdio,
        windowsHide: true,
        detached: process.platform !== "win32",
      },
    );
    this.#children.add(child);
    waitForExit(child).then(
      () => this.#children.delete(child),
      () => this.#children.delete(child),
    );
    return child;
  }

  async wait(child, { label, timeoutMs, allowedExitCodes = [0] }) {
    let timeout;
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new ProcessTimeoutError(label, timeoutMs)), timeoutMs);
    });

    try {
      const result = await Promise.race([waitForExit(child), deadline]);
      if (!allowedExitCodes.includes(result.code)) {
        throw new ProcessExitError(label, result.code, result.signal);
      }
      return result;
    } catch (error) {
      if (error instanceof ProcessTimeoutError) await this.stop(child);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async run(options) {
    const child = this.start(options);
    return this.wait(child, options);
  }

  async stop(child, { graceMs = defaultStopGraceMs } = {}) {
    await terminateProcessTree(child, { graceMs });
  }

  async stopAll() {
    const children = [...this.#children].reverse();
    await Promise.allSettled(children.map((child) => this.stop(child)));
  }
}

export function installShutdownHandlers(supervisor, label = "test runner") {
  let stopping = false;

  const handleSignal = (signal) => {
    if (stopping) return;
    stopping = true;
    const exitCode = signal === "SIGINT" ? 130 : 143;
    process.stderr.write(`\n${label} received ${signal}; stopping every child process...\n`);

    const emergencyExit = setTimeout(() => process.exit(exitCode), 2 * defaultStopGraceMs);
    emergencyExit.unref();
    void supervisor.stopAll().finally(() => {
      clearTimeout(emergencyExit);
      process.exit(exitCode);
    });
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  return () => {
    process.removeListener("SIGINT", handleSignal);
    process.removeListener("SIGTERM", handleSignal);
  };
}
