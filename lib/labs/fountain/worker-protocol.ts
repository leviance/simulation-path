import type { BenchmarkRow } from "./benchmark.ts";
import type { FountainConfig, MemoryWorkload } from "./state.ts";

export type BenchmarkCommand =
  | {
      kind: "start";
      requestId: number;
      config: FountainConfig;
      sizes: number[];
      workloads: MemoryWorkload[];
      paired: boolean;
    }
  | { kind: "pause"; requestId: number; paused: boolean }
  | { kind: "cancel"; requestId: number };

export interface BenchmarkProgress {
  requestId: number;
  active: boolean;
  paused: boolean;
  timedOut: boolean;
  notice: string;
  rows: BenchmarkRow[];
  caseIndex: number;
  caseCount: number;
  sample: number;
  phase: string;
}
