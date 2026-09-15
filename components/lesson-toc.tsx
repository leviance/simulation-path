import { lessonSections } from "@/lib/lesson-sections.mjs";

const sections = [
  ...lessonSections.map(({ title, id }) => [title, `#${id}`] as const),
  ["Mã chạy được sau bài", "#ma-chay-duoc-sau-bai"],
] as const;

export function LessonTableOfContents({
  showCompleteSource = false,
}: {
  showCompleteSource?: boolean;
}) {
  const visibleSections = showCompleteSource
    ? [...sections, ["Mã nguồn hoàn chỉnh", "#ma-hoan-chinh-cua-project"] as const]
    : sections;

  return (
    <nav className="lesson-toc" aria-label="Mục lục bài học">
      <b>TRONG BÀI NÀY</b>
      <ol>
        {visibleSections.map(([label, href]) => (
          <li key={href}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
