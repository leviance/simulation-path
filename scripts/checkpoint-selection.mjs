// Keep scoped regeneration explicit: a typo must never turn a one-project
// operation into a full-course rewrite or prune another project's payloads.
export function checkpointSelection(projects, args) {
  let projectId;
  let checkOnly = false;
  for (const argument of args) {
    if (argument === "--check") {
      checkOnly = true;
      continue;
    }
    if (argument.startsWith("--project=")) {
      if (projectId !== undefined) throw new Error("Use --project=ID at most once.");
      projectId = argument.slice("--project=".length);
      if (!/^\d{2}$/.test(projectId))
        throw new Error("--project requires a published two-digit ID.");
      continue;
    }
    throw new Error(`Unknown checkpoint option: ${argument}`);
  }
  if (projectId !== undefined && !projects.some((project) => project.id === projectId))
    throw new Error(`Project ${projectId} is not in the published catalog.`);
  return {
    projects:
      projectId === undefined ? projects : projects.filter((project) => project.id === projectId),
    scoped: projectId !== undefined,
    checkOnly,
  };
}
