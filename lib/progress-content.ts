export interface StoredProgressContent {
  completedLessonIds: string[];
  lastLessonId?: string;
  lastLesson?: { id: string; title: string; href: string };
  projectContentVersions?: unknown;
}

// Đổi sản phẩm không đồng nghĩa người học đã hoàn thành bài mới cùng lesson ID.
// Chỉ làm mới project tăng revision; giữ nguyên các project khác và không downgrade.
export function migrateProgressContent(
  state: StoredProgressContent,
  currentVersions: Readonly<Record<string, number>>,
) {
  const versions: Record<string, number> = {};
  const stored = state.projectContentVersions;
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [key, value] of Object.entries(stored)) {
      if (/^p\d{2}$/.test(key) && Number.isInteger(value) && (value as number) >= 0)
        versions[key] = value as number;
    }
  }
  let completedLessonIds = [...state.completedLessonIds];
  let lastLessonId = state.lastLessonId;
  let lastLesson = state.lastLesson;
  for (const [project, version] of Object.entries(currentVersions)) {
    if ((versions[project] ?? 0) >= version) continue;
    const prefix = project + "-l";
    completedLessonIds = completedLessonIds.filter((id) => !id.startsWith(prefix));
    if (lastLessonId?.startsWith(prefix)) lastLessonId = undefined;
    if (lastLesson?.id.startsWith(prefix)) lastLesson = undefined;
    versions[project] = version;
  }
  return { completedLessonIds, lastLessonId, lastLesson, projectContentVersions: versions };
}
