import { containsBox, mapRoot, type MapBox } from "./map-geometry.ts";
import { MapQuadtree, queryMapBrute } from "./map-quadtree.ts";

export function inspectMapTopology(tree: MapQuadtree) {
  const counts = new Map<number, number>();
  let failures = 0;
  for (const [index, node] of tree.nodes.entries()) {
    if (node.depth > tree.config.maximumDepth) failures++;
    if (
      node.children &&
      (node.children.length !== 4 ||
        node.children.some(
          (child) =>
            child <= index ||
            child >= tree.nodes.length ||
            tree.nodes[child].depth !== node.depth + 1,
        ))
    )
      failures++;
    const splitAllowed =
      node.depth < tree.config.maximumDepth &&
      node.box.width / 2 >= tree.config.minimumSize &&
      node.box.height / 2 >= tree.config.minimumSize &&
      tree.nodes.length + 4 <= tree.config.maximumNodes;
    if (!node.children && node.ids.size > tree.config.capacity && splitAllowed) failures++;
    for (const id of node.ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      const object = tree.objects.get(id);
      if (
        !object ||
        !containsBox(node.box, object.box) ||
        tree.location.get(id) !== index ||
        (node.children && tree.childSlot(object.box, node) !== -1)
      )
        failures++;
    }
  }
  if (
    tree.nodes.length > tree.config.maximumNodes ||
    counts.size !== tree.objects.size ||
    tree.location.size !== tree.objects.size
  )
    failures++;
  for (const id of tree.objects.keys()) if (counts.get(id) !== 1) failures++;
  return { failures, nodes: tree.nodes.length, objects: tree.objects.size };
}

export function mapQueryFixtures(root: MapBox = mapRoot): MapBox[] {
  const result: MapBox[] = [
    { ...root },
    { x: root.x, y: root.y, width: 0, height: 0 },
    { x: root.x + root.width, y: root.y + root.height, width: 0, height: 0 },
    { x: root.x - 2, y: root.y - 2, width: 1, height: 1 },
  ];
  for (let index = 0; index < 32; index++) {
    const x = ((index * 977 + 13) % 8192) / 8192;
    const y = ((index * 2039 + 29) % 8192) / 8192;
    result.push({
      x: root.x + x * root.width,
      y: root.y + y * root.height,
      width: 32 + ((index % 7) * root.width) / 64,
      height: 32 + ((index % 5) * root.height) / 64,
    });
  }
  return result;
}

export interface MapValidation {
  tree: MapQuadtree;
  revision: number;
  boxes: MapBox[];
  checked: number;
  failures: number;
  active: boolean;
  stale: boolean;
  topology: ReturnType<typeof inspectMapTopology>;
}
export function createMapValidation(tree: MapQuadtree, extra: MapBox[] = []): MapValidation {
  const topology = inspectMapTopology(tree);
  return {
    tree,
    revision: tree.revision,
    boxes: [...mapQueryFixtures(tree.config.root), ...extra.map((box) => ({ ...box }))],
    checked: 0,
    failures: topology.failures,
    active: topology.failures === 0,
    stale: false,
    topology,
  };
}
export function tickMapValidation(job: MapValidation, now = () => performance.now()) {
  if (!job.active) return;
  if (job.tree.revision !== job.revision) {
    job.active = false;
    job.stale = true;
    return;
  }
  const start = now();
  do {
    const box = job.boxes[job.checked];
    const actual = job.tree.query(box).ids.sort((a, b) => a - b);
    const expected = queryMapBrute(job.tree.objects.values(), box).ids.sort((a, b) => a - b);
    if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
      job.failures++;
    job.checked++;
  } while (job.checked < job.boxes.length && now() - start < 6);
  if (job.checked === job.boxes.length) job.active = false;
}
