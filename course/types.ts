import type { DemoId } from "./generated/catalog";

export type { DemoId } from "./generated/catalog";

export interface ProjectChallenge {
  timebox: string;
  mission: string;
  outcome: string;
  requirements: string[];
  constraints: string[];
  definitionOfDone: string[];
}

export interface LessonMeta {
  id: string;
  slug: string;
  title: string;
  summary: string;
  order: number;
  estimatedMinutes: number;
  demoId?: DemoId;
}

interface ProjectSummaryBase {
  id: string;
  slug: string;
  part: string;
  title: string;
  summary: string;
}

export interface PublishedProjectSummary extends ProjectSummaryBase {
  status: "published";
  duration: string;
  lessonCount: number;
  download: string;
  demoId: DemoId;
}

export interface ComingSoonProjectSummary extends ProjectSummaryBase {
  status: "coming-soon";
}

export type ProjectSummary = PublishedProjectSummary | ComingSoonProjectSummary;

export interface PublishedProjectMeta extends PublishedProjectSummary {
  prerequisites: string[];
  objectives: string[];
  lessons: LessonMeta[];
  challenge: ProjectChallenge;
  sourceDirectory: string;
  checkpointCount: number;
}

export type ProjectMeta = PublishedProjectMeta;

export interface CoursePart {
  title: string;
  projects: ProjectSummary[];
}

export interface PublishedProjectEditorial {
  summary: string;
  duration: string;
  prerequisites: string[];
  objectives: string[];
  lessons: LessonMeta[];
  challenge: ProjectChallenge;
}
