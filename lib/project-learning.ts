import { projectLearningLoaders } from "@/course/generated/project-loaders";
import type { ProjectLearningAssets } from "@/course/learning/types";

const learningPromiseCache = new Map<string, Promise<ProjectLearningAssets | undefined>>();

export function getProjectLearning(projectId: string): Promise<ProjectLearningAssets | undefined> {
  const cached = learningPromiseCache.get(projectId);
  if (cached) return cached;
  const load = projectLearningLoaders[projectId];
  if (!load) return Promise.resolve(undefined);
  const promise = load().then((module) => module.default);
  learningPromiseCache.set(projectId, promise);
  return promise;
}
