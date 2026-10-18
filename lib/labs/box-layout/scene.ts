import { createTree, add, find, type Widget } from "../widget-tree/tree.ts";
import { defaultStyle, edges, type BoxStyle } from "./style.ts";
export function buildScene(stage = 9) {
  const tree = createTree();
  tree.root.local = { x: 616, y: 24, width: 320, height: 492 };
  const title = add(tree, 1, "Label", { x: 18, y: 18, width: 284, height: 24 }, "SIMULATOR");
  let parent = 1,
    group = 0;
  if (stage >= 5) {
    group = add(tree, 1, "Panel", { x: 22, y: 54, width: 276, height: 252 }, "Controls");
    parent = group;
  }
  const pause = add(
    tree,
    parent,
    "Button",
    { x: 22, y: 58, width: 276, height: 36 },
    "Pause",
    "Pause",
  );
  const reset = add(
    tree,
    parent,
    "Button",
    { x: 22, y: 108, width: 276, height: 36 },
    "Reset",
    "Reset",
  );
  add(tree, parent, "Label", { x: 22, y: 158, width: 276, height: 24 }, "Gravity");
  const slider = add(tree, parent, "Slider", { x: 22, y: 198, width: 276, height: 32 }, "Gravity");
  add(tree, parent, "Label", { x: 22, y: 244, width: 276, height: 24 }, "", "None", "Gravity");
  const footer = add(
    tree,
    1,
    "Label",
    { x: 18, y: 292, width: 284, height: 24 },
    "",
    "None",
    "Time",
  );
  const styles = new Map<number, BoxStyle>();
  const visit = (node: Widget) => {
    styles.set(node.id, defaultStyle(node));
    node.children.forEach(visit);
  };
  visit(tree.root);
  Object.assign(styles.get(1)!, {
    height: "Fixed",
    fixedHeight: 492,
    margin: edges(0),
    padding: edges(16),
  });
  styles.get(title)!.margin = edges(0);
  styles.get(footer)!.margin = edges(0);
  return { tree, styles, title, group, pause, reset, slider, footer };
}
export type Scene = ReturnType<typeof buildScene>;
export { find };
