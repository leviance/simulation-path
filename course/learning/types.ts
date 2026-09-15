export interface CodeGuideStep {
  title: string;
  explanation: string;
}

export interface LessonCodeGuide {
  focus: string;
  expected: string;
  files: string[];
  steps: CodeGuideStep[];
}

export interface LessonReference {
  label: string;
  href: string;
  kind: "SDL API" | "OpenGL API" | "Thuật ngữ" | "CMake";
}

export interface ProjectLearningAssets {
  guides: Record<string, LessonCodeGuide>;
  references: Record<string, LessonReference[]>;
}
