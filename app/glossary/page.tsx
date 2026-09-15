import type { Metadata } from "next";
import { glossaryTerms } from "@/lib/glossary";
import { depthGlossaryTerms } from "@/lib/glossary-depth";
import { gpuGlossaryTerms } from "@/lib/glossary-gpu";
import { lightingGlossaryTerms } from "@/lib/glossary-lighting";
import { meshGlossaryTerms } from "@/lib/glossary-mesh";
import { physicsGlossaryTerms } from "@/lib/glossary-physics";
import { performanceGlossaryTerms } from "@/lib/glossary-performance";
import { texturingGlossaryTerms } from "@/lib/glossary-texturing";

export const metadata: Metadata = {
  title: "Thuật ngữ",
  description: "Từ điển C++, SDL3, đồ họa 2D và mô phỏng dùng trong khóa học.",
};

const allGlossaryTerms = [
  ...glossaryTerms,
  ...depthGlossaryTerms,
  ...lightingGlossaryTerms,
  ...texturingGlossaryTerms,
  ...meshGlossaryTerms,
  ...physicsGlossaryTerms,
  ...performanceGlossaryTerms,
  ...gpuGlossaryTerms,
];

export default function GlossaryPage() {
  return (
    <main className="shell page-wrap">
      <header className="page-hero compact">
        <span className="eyebrow">
          <i /> THUẬT NGỮ
        </span>
        <h1>
          Gặp từ lạ trong bài?
          <br />
          Tra nhanh ngay tại đây.
        </h1>
        <p>
          Mỗi định nghĩa bám vào đúng chương trình đang được xây trong khóa học. Thuật ngữ kỹ thuật
          được giữ bằng tiếng Anh để bạn có thể tra tiếp trong tài liệu SDL, CMake và C++.
        </p>
      </header>

      <div className="glossary-list">
        {allGlossaryTerms.map(({ id, term, definition }, index) => (
          <article id={id} key={id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{term}</h2>
            <p>{definition}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
