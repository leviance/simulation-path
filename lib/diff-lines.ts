type DiffLine = {
  kind: "same" | "add" | "remove";
  text: string;
  oldLine: number;
  newLine: number;
};

export function diffLines(before: string, after: string): DiffLine[] {
  const splitLines = (source: string) => {
    const normalized = source.trimEnd();
    return normalized ? normalized.split("\n") : [];
  };
  const left = splitLines(before);
  const right = splitLines(after);
  type Operation = Pick<DiffLine, "kind" | "text">;
  const frontier = new Map<number, number>([[1, 0]]);
  const trace: Array<Map<number, number>> = [];
  let finalDistance = -1;
  const maximumDistance = Math.min(left.length + right.length, 2048);

  search: for (let distance = 0; distance <= maximumDistance; distance += 1) {
    trace.push(new Map(frontier));
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const moveDown =
        diagonal === -distance ||
        (diagonal !== distance &&
          (frontier.get(diagonal - 1) ?? -1) < (frontier.get(diagonal + 1) ?? -1));
      let x = moveDown ? (frontier.get(diagonal + 1) ?? 0) : (frontier.get(diagonal - 1) ?? 0) + 1;
      let y = x - diagonal;
      while (x < left.length && y < right.length && left[x] === right[y]) {
        x += 1;
        y += 1;
      }
      frontier.set(diagonal, x);
      if (x >= left.length && y >= right.length) {
        finalDistance = distance;
        break search;
      }
    }
  }

  let operations: Operation[] = [];
  if (finalDistance === -1) {
    operations = [
      ...left.map((text) => ({ kind: "remove" as const, text })),
      ...right.map((text) => ({ kind: "add" as const, text })),
    ];
  } else {
    let x = left.length;
    let y = right.length;
    for (let distance = finalDistance; distance >= 0; distance -= 1) {
      const previousFrontier = trace[distance];
      const diagonal = x - y;
      const moveDown =
        diagonal === -distance ||
        (diagonal !== distance &&
          (previousFrontier.get(diagonal - 1) ?? -1) < (previousFrontier.get(diagonal + 1) ?? -1));
      const previousDiagonal = moveDown ? diagonal + 1 : diagonal - 1;
      const previousX = previousFrontier.get(previousDiagonal) ?? 0;
      const previousY = previousX - previousDiagonal;

      while (x > previousX && y > previousY) {
        operations.push({ kind: "same", text: left[x - 1] });
        x -= 1;
        y -= 1;
      }
      if (distance === 0) break;
      if (x === previousX) {
        y -= 1;
        operations.push({ kind: "add", text: right[y] });
      } else {
        x -= 1;
        operations.push({ kind: "remove", text: left[x] });
      }
    }
    operations.reverse();
  }

  let oldLine = 1;
  let newLine = 1;
  return operations.map((operation) => {
    const line = { ...operation, oldLine, newLine };
    if (operation.kind !== "add") oldLine += 1;
    if (operation.kind !== "remove") newLine += 1;
    return line;
  });
}
