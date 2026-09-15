import { generatedCheckpointSourceLoaders } from "@/lib/generated-checkpoint-sources";
import type { HighlightLanguage } from "@/lib/syntax-highlighter";

export type ProjectSourcePath = string;

export interface ProjectSourceFile {
  path: ProjectSourcePath;
  language: HighlightLanguage;
  source: string;
}

export interface ProjectSourceBundle {
  projectId: string;
  directory: string;
  targetPrefix: string;
  checkpoint: "starter" | number | "final";
  changedPaths: ProjectSourcePath[];
  files: ProjectSourceFile[];
}

interface SourceModule {
  files: readonly ProjectSourceFile[];
}

interface GeneratedProjectSource {
  id: string;
  directory: string;
  targetPrefix: string;
  loadCommon(): Promise<SourceModule>;
  changedPaths: Record<string, readonly ProjectSourcePath[]>;
  snapshots: Record<string, () => Promise<SourceModule>>;
}

type ProjectId = keyof typeof generatedCheckpointSourceLoaders;

function sourceFileOrder(file: ProjectSourceFile) {
  if (file.path === "CMakeLists.txt") return 0;
  if (file.path.startsWith("tests/")) return 2;
  return 1;
}

export async function getProjectSourceBundle(
  projectId: string,
  checkpoint: "starter" | number | "final" = "final",
) {
  if (!(projectId in generatedCheckpointSourceLoaders)) return undefined;
  const loadRegistry = generatedCheckpointSourceLoaders[projectId as ProjectId];
  const registryModule = await loadRegistry();
  const project = registryModule.generatedProjectSource as unknown as GeneratedProjectSource;
  const loadSnapshot = project.snapshots[String(checkpoint)];
  if (!loadSnapshot) {
    throw new Error(`Unknown checkpoint ${String(checkpoint)} for project ${project.id}`);
  }
  const [common, snapshot] = await Promise.all([project.loadCommon(), loadSnapshot()]);
  const files = [...common.files, ...snapshot.files]
    .map((file) => ({ ...file }))
    .sort((left, right) => sourceFileOrder(left) - sourceFileOrder(right));
  return {
    projectId: project.id,
    directory: project.directory,
    targetPrefix: project.targetPrefix,
    checkpoint,
    changedPaths: [...(project.changedPaths[String(checkpoint)] ?? [])],
    files,
  } satisfies ProjectSourceBundle;
}

export async function getProjectChangedPaths(
  projectId: string,
  checkpoint: "starter" | number | "final",
) {
  if (!(projectId in generatedCheckpointSourceLoaders)) return [];
  const loadRegistry = generatedCheckpointSourceLoaders[projectId as ProjectId];
  const registryModule = await loadRegistry();
  const project = registryModule.generatedProjectSource as unknown as GeneratedProjectSource;
  return [...(project.changedPaths[String(checkpoint)] ?? [])];
}
