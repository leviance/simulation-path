import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessSupervisor, ProcessTimeoutError } from "../scripts/process-supervisor.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hangingTreeFixture = path.join(workspace, "tests", "fixtures", "hanging-process-tree.mjs");
const abandonTreeFixture = path.join(workspace, "tests", "fixtures", "abandon-supervised-tree.mjs");

function readFirstLine(stream, timeoutMs = 3_000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error("Timed out waiting for fixture output")),
      timeoutMs,
    );
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      output += chunk;
      const newline = output.indexOf("\n");
      if (newline === -1) return;
      clearTimeout(timeout);
      resolve(output.slice(0, newline).trim());
    });
    stream.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    return true;
  }
}

async function waitUntilStopped(pid, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processIsAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !processIsAlive(pid);
}

async function waitForExit(child, timeoutMs = 3_000) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await Promise.race([
    new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    }),
    new Promise((_, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timed out waiting for process exit")),
        timeoutMs,
      );
      timeout.unref();
    }),
  ]);
}

async function forceKillPidTree(pid) {
  if (!processIsAlive(pid)) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForExit(killer);
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    process.kill(pid, "SIGKILL");
  }
}

test(
  "ProcessSupervisor applies a hard timeout and returns control",
  { timeout: 10_000 },
  async () => {
    const supervisor = new ProcessSupervisor();
    const startedAt = Date.now();
    try {
      await assert.rejects(
        supervisor.run({
          label: "intentional hang",
          command: process.execPath,
          args: ["-e", "setInterval(() => {}, 1000)"],
          cwd: workspace,
          timeoutMs: 200,
          stdio: "ignore",
        }),
        ProcessTimeoutError,
      );
      assert.ok(Date.now() - startedAt < 7_000, "Timeout cleanup must remain bounded");
    } finally {
      await supervisor.stopAll();
    }
    assert.equal(supervisor.activeCount, 0);
  },
);

test("ProcessSupervisor stops the complete descendant tree", { timeout: 10_000 }, async () => {
  const supervisor = new ProcessSupervisor();
  const parent = supervisor.start({
    command: process.execPath,
    args: [hangingTreeFixture],
    cwd: workspace,
    stdio: ["ignore", "pipe", "ignore"],
  });

  try {
    const descendantPid = Number(await readFirstLine(parent.stdout));
    assert.ok(Number.isInteger(descendantPid) && descendantPid > 0);
    assert.equal(processIsAlive(descendantPid), true);

    await supervisor.stop(parent, { graceMs: 2_000 });
    assert.equal(
      await waitUntilStopped(descendantPid),
      true,
      "Descendant process was left running",
    );
  } finally {
    await supervisor.stopAll();
  }
  assert.equal(supervisor.activeCount, 0);
});

test("guardian cleans descendants when its parent disappears", { timeout: 15_000 }, async () => {
  const launcher = spawn(process.execPath, [abandonTreeFixture], {
    cwd: workspace,
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
  let guardianPid = 0;
  let descendantPid = 0;

  try {
    const fixtureState = JSON.parse(await readFirstLine(launcher.stdout));
    guardianPid = fixtureState.guardianPid;
    descendantPid = fixtureState.descendantPid;
    assert.equal(processIsAlive(guardianPid), true);
    assert.equal(processIsAlive(descendantPid), true);

    launcher.kill("SIGKILL");
    await waitForExit(launcher);
    assert.equal(await waitUntilStopped(guardianPid, 8_000), true, "Guardian stayed alive");
    assert.equal(await waitUntilStopped(descendantPid, 8_000), true, "Descendant stayed alive");
  } finally {
    if (launcher.exitCode === null && launcher.signalCode === null) launcher.kill("SIGKILL");
    if (guardianPid > 0) await forceKillPidTree(guardianPid);
  }
});
