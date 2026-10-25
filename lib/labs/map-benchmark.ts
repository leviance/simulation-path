import type { MapBox } from "./map-geometry.ts";
import { MapQuadtree, queryMapBrute } from "./map-quadtree.ts";
import { mapQueryFixtures } from "./map-validation.ts";

export interface MapBenchmarkRow {
  method: "tree" | "brute";
  objects: number;
  queries: number;
  samples: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  candidates: number;
  checksum: number;
}
export interface MapBenchmark {
  tree: MapQuadtree;
  revision: number;
  boxes: MapBox[];
  active: boolean;
  stale: boolean;
  method: "tree" | "brute";
  iteration: number;
  queryIndex: number;
  elapsed: number;
  candidates: number;
  checksum: number;
  samples: number[];
  rows: MapBenchmarkRow[];
}
export function createMapBenchmark(tree: MapQuadtree, view: MapBox): MapBenchmark {
  return {
    tree,
    revision: tree.revision,
    boxes: [{ ...view }, ...mapQueryFixtures(tree.config.root).slice(4, 19)],
    active: true,
    stale: false,
    method: "tree",
    iteration: 0,
    queryIndex: 0,
    elapsed: 0,
    candidates: 0,
    checksum: 0,
    samples: [],
    rows: [],
  };
}
export function tickMapBenchmark(job: MapBenchmark, now = () => performance.now()) {
  if (!job.active) return;
  if (job.revision !== job.tree.revision) {
    job.active = false;
    job.stale = true;
    return;
  }
  const start = now();
  do {
    const box = job.boxes[job.queryIndex];
    const result =
      job.method === "tree" ? job.tree.query(box) : queryMapBrute(job.tree.objects.values(), box);
    job.elapsed += result.milliseconds;
    job.candidates += result.candidates;
    // Tiêu thụ IDs ngoài timing query, không dùng checksum làm oracle duy nhất.
    for (const id of result.ids) job.checksum = (job.checksum + id + 1) >>> 0;
    job.queryIndex++;
    if (job.queryIndex === job.boxes.length) {
      if (job.iteration >= 2) job.samples.push(job.elapsed);
      job.iteration++;
      job.queryIndex = 0;
      job.elapsed = 0;
      if (job.iteration === 7) {
        const values = [...job.samples].sort((a, b) => a - b);
        job.rows.push({
          method: job.method,
          objects: job.tree.objects.size,
          queries: job.boxes.length,
          samples: values.length,
          medianMs: values[2],
          minMs: values[0],
          maxMs: values[4],
          candidates: job.candidates / 7,
          checksum: job.checksum,
        });
        if (job.method === "brute") job.active = false;
        else {
          job.method = "brute";
          job.iteration = 0;
          job.samples = [];
          job.candidates = 0;
          job.checksum = 0;
        }
      }
    }
  } while (job.active && now() - start < 6);
}
