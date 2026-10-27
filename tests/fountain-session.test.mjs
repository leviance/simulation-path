import assert from "node:assert/strict";
import test from "node:test";
import { createBenchmarkSession } from "../components/labs/fountain/benchmark-session.ts";

function fixture(failStart = false) {
  const commands = [],
    progress = [];
  let terminations = 0;
  const worker = {
    onmessage: null,
    onerror: null,
    postMessage(command) {
      if (failStart) throw new Error("clone failed");
      commands.push(command);
    },
    terminate() {
      terminations++;
    },
  };
  const initial = {
    requestId: 7,
    active: true,
    paused: false,
    timedOut: false,
    rows: [],
    caseIndex: 0,
    caseCount: 1,
    sample: -1,
    phase: "loading",
    notice: "starting",
  };
  const start = {
    kind: "start",
    requestId: 7,
    config: {},
    sizes: [256],
    workloads: ["gravity-only"],
    paired: true,
  };
  return {
    worker,
    initial,
    start,
    commands,
    progress,
    terminations: () => terminations,
    session: () => createBenchmarkSession(worker, start, initial, (value) => progress.push(value)),
  };
}

test("P32 worker session starts once, publishes matching progress and terminates on completion", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const state = fixture(),
    session = state.session();
  assert.deepEqual(state.commands, [state.start]);
  const receive = state.worker.onmessage;
  receive({ data: { ...state.initial, requestId: 6 } });
  assert.equal(state.progress.length, 0);
  session.pause(true);
  assert.deepEqual(state.commands[1], { kind: "pause", requestId: 7, paused: true });
  assert.equal(state.progress.at(-1).paused, true);
  receive({ data: { ...state.initial, active: false, notice: "complete" } });
  assert.equal(state.progress.at(-1).notice, "complete");
  assert.equal(state.terminations(), 1);
  assert.equal(state.worker.onmessage, null);
  const count = state.progress.length;
  receive({ data: state.initial });
  session.dispose();
  session.pause(false);
  context.mock.timers.tick(35000);
  assert.equal(state.progress.length, count);
  assert.equal(state.terminations(), 1);
});

test("P32 session wall watchdog also expires while paused, preserving completed rows", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const state = fixture(),
    session = state.session();
  const rows = [{ count: 256 }];
  state.worker.onmessage({ data: { ...state.initial, rows } });
  session.pause(true);
  context.mock.timers.tick(34999);
  assert.equal(state.terminations(), 0);
  context.mock.timers.tick(1);
  assert.equal(state.terminations(), 1);
  assert.equal(state.progress.at(-1).timedOut, true);
  assert.equal(state.progress.at(-1).active, false);
  assert.equal(state.progress.at(-1).rows, rows);
});

test("P32 cancellation has a finite fallback and does not erase completed rows", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const state = fixture(),
    session = state.session();
  const rows = [{ count: 256 }];
  state.worker.onmessage({ data: { ...state.initial, rows } });
  session.cancel();
  assert.deepEqual(state.commands.at(-1), { kind: "cancel", requestId: 7 });
  context.mock.timers.tick(499);
  assert.equal(state.terminations(), 0);
  context.mock.timers.tick(1);
  assert.equal(state.terminations(), 1);
  assert.equal(state.progress.at(-1).rows, rows);
  assert.match(state.progress.at(-1).notice, /hủy/);
  context.mock.timers.tick(35000);
  assert.equal(state.terminations(), 1);
});

test("P32 acknowledged cancellation removes the fallback timer", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const state = fixture(),
    session = state.session();
  session.cancel();
  state.worker.onmessage({ data: { ...state.initial, active: false, notice: "cancelled" } });
  context.mock.timers.tick(35000);
  assert.equal(state.progress.length, 1);
  assert.equal(state.terminations(), 1);
  assert.equal(state.progress[0].notice, "cancelled");
});

test("P32 session error, unmount and failed first postMessage all release their resources", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const state = fixture(),
    session = state.session();
  const receive = state.worker.onmessage;
  state.worker.onerror();
  assert.equal(state.terminations(), 1);
  assert.match(state.progress.at(-1).notice, /không thể/);
  session.dispose();
  receive({ data: state.initial });
  context.mock.timers.tick(35000);
  assert.equal(state.progress.length, 1);
  const abandoned = fixture(),
    owner = abandoned.session();
  owner.cancel();
  owner.dispose();
  context.mock.timers.tick(35000);
  assert.equal(abandoned.terminations(), 1);
  assert.equal(abandoned.progress.length, 0);
  const failed = fixture(true);
  assert.throws(() => failed.session(), /clone failed/);
  context.mock.timers.tick(35000);
  assert.equal(failed.terminations(), 1);
  assert.equal(failed.progress.length, 0);
});
