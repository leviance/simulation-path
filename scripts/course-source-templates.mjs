import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// Share authored inputs, not sibling ZIPs or generated files. A pin imports
// a completed prerequisite; chapter milestones still advance independently.
export function courseSourceTemplates(workspace, project) {
  const result = new Map();
  function add(relative, sourcePath, checkpointBase, fixedCheckpoint) {
    if (result.has(relative)) throw new Error(`Duplicate course template: ${relative}`);
    result.set(relative, { sourcePath, checkpointBase, fixedCheckpoint });
  }
  function collect(directory, prefix, checkpointBase) {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      const relative = path.join(prefix, file.name);
      const full = path.join(directory, file.name);
      if (file.isDirectory()) collect(full, relative, checkpointBase);
      else if (file.isFile()) {
        add(relative, full, checkpointBase);
      }
    }
  }
  collect(path.join(workspace, "examples", project.sourceDirectory, "source-template"), "", 0);
  // The learner already linked a GLSL program in P54. Ship those authored helpers
  // inside the P55 ZIP without maintaining a second copy or requiring a sibling ZIP.
  if (project.id === "55") {
    const gl = path.join(workspace, "examples/project-54-volume-ray-marching/source-template");
    for (const header of ["gl_api.hpp", "program.hpp"])
      add(path.join("include", "gl-support", header), path.join(gl, "include", header), 0, 10);
    add(path.join("shaders", "fullscreen.vert"), path.join(gl, "shaders/fullscreen.vert"), 0, 10);
  }
  if (project.sourceSeries === "flock-workbench") {
    const prerequisite = path.join(
      workspace,
      "examples/project-28-boids-spatial-grid/source-template/include",
    );
    for (const header of [
      "boids/lab",
      "boids/flock",
      "boids/neighbors",
      "boids/steering",
      "grid/coordinates",
      "grid/storage",
      "grid/query",
    ]) {
      add(path.join("include", header + ".hpp"), path.join(prerequisite, header + ".hpp"), 0, 10);
    }
    if (Number(project.id) > 65) {
      add(
        path.join("include", "workbench", "session.hpp"),
        path.join(
          workspace,
          "examples/project-65-simulator-controls/source-template/include/simulation.hpp",
        ),
        0,
        7,
      );
    }
    if (Number(project.id) >= 67) {
      const retained = path.join(
        workspace,
        "examples/project-66-widget-tree/source-template/include",
      );
      for (const [name, target] of [
        ["simulation", "retained-binding"],
        ["input", "retained-input"],
        ["keyboard", "retained-keys"],
      ])
        add(
          path.join("include", "workbench", target + ".hpp"),
          path.join(retained, name + ".hpp"),
          0,
          8,
        );
    }
    if (Number(project.id) >= 68) {
      const box = path.join(workspace, "examples/project-67-box-layout/source-template/include");
      for (const name of [
        "geometry",
        "tree",
        "traversal",
        "style",
        "layout",
        "scene",
        "runtime",
        "simulation",
        "input",
        "keyboard",
        "view",
        "audit",
      ])
        add(path.join("include", name + ".hpp"), path.join(box, name + ".hpp"), 0, 9);
    }
  }
  if (project.sourceSeries) {
    const series = path.join(workspace, "examples", project.sourceSeries);
    const id = Number(project.id);
    collect(path.join(series, "include"), "include", id * 100);
    const first = project.sourceSeries === "voxel-expedition" ? 58 : 65;
    for (let chapter = first + 1; chapter <= id; chapter++) {
      const extra = path.join(series, `from-${chapter}`, "include");
      if (existsSync(extra)) collect(extra, "include", id * 100);
    }
  }
  return result;
}
