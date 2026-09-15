import type { Metadata } from "next";
import Link from "@/components/app-link";
import { courseParts, publishedProjects } from "@/lib/course";

export const metadata: Metadata = {
  title: "Lộ trình 78 dự án",
  description: "Toàn bộ lộ trình từ pixel đến mô phỏng khoa học.",
};

const partDescriptions: Record<string, string> = {
  "SDL3, PIXEL VÀ TƯƠNG TÁC CƠ BẢN":
    "Dựng vòng lặp ứng dụng, tự quản lý framebuffer, xử lý input và làm chủ phép đổi tọa độ 2D.",
  "HỌC TOÁN BẰNG CÁC CHƯƠNG TRÌNH TƯƠNG TÁC":
    "Dùng hình ảnh và thao tác kéo-thả để hiểu vector, lượng giác, projection và phép biến đổi trước khi đi vào 3D.",
  "TỰ DỰNG ĐỒ HỌA 3D TRÊN CPU, CHƯA DÙNG OPENGL":
    "Tự đưa vertex qua camera, projection, clipping, rasterization, Z-buffer, ánh sáng và texture để thấy một renderer 3D được ghép từ đâu.",
  "VẬT LÝ VÀ NUMERICAL METHODS BẰNG MINI PROJECT":
    "Biến phương trình chuyển động thành chương trình, rồi so các integrator qua quỹ đạo, va chạm, lò xo và hệ hỗn loạn.",
  "CẤU TRÚC KHÔNG GIAN VÀ TƯ DUY HIỆU NĂNG":
    "Đo giới hạn của brute force trước khi dùng grid, quadtree, octree, Barnes–Hut và cách bố trí dữ liệu thân thiện với cache.",
  "CHUYỂN TỪ RENDERER CPU SANG OPENGL/GLSL":
    "Đưa những bước từng tự viết trên CPU sang pipeline GPU để hiểu vertex shader, fragment shader và ray marching bằng cách đối chiếu trực tiếp.",
  "GPU COMPUTE VÀ HÀNG TRIỆU PHẦN TỬ":
    "Học cách chia dữ liệu thành công việc song song, từ phép toán vector đến particle, reduction, prefix sum và tìm hàng xóm.",
  "MÔ PHỎNG PHÂN TỬ TỪ 2 HẠT TỚI HÀNG TRIỆU HẠT":
    "Bắt đầu từ lực giữa hai hạt, rồi thêm điều kiện biên tuần hoàn, neighbor list và phiên bản chạy song song trên GPU.",
  "TỪ Ô LƯỚI ĐẾN CHẤT LỎNG":
    "Đi từ cellular automata và phương trình nhiệt đến vector field, Stable Fluids và SPH trên cả CPU lẫn GPU.",
  "RAY, VOLUME VÀ GIẢ LẬP X-RAY":
    "Theo dõi một tia qua hình học và dữ liệu thể tích, sau đó dùng cùng ý tưởng để dựng ảnh X-ray, sinogram và mô phỏng Monte Carlo.",
  "VOXEL WORLD KIỂU MINECRAFT":
    "Xây thế giới theo chunk, loại mặt bị che, chọn block bằng ray, gộp mesh và tải terrain quanh người chơi.",
  "TỰ XÂY UI CHO CÁC SIMULATOR":
    "Tạo bộ điều khiển cho mô phỏng, rồi từng bước phát triển cây UI, layout, style, event binding và ngôn ngữ script nhỏ.",
  "CÁC PROJECT CẦU NỐI TÙY CHỌN":
    "Những nhánh bổ sung để đào sâu quaternion, BVH, đa luồng, Fourier, Monte Carlo và sai số số thực.",
};

export default function RoadmapPage() {
  const publishedIds = new Set(publishedProjects.map((project) => project.id));
  const unpublishedIds = Array.from({ length: 78 }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  ).filter((id) => !publishedIds.has(id));
  const releaseSummary = `${publishedProjects.length} project đã có đủ bài học, Canvas và mã nguồn. Các project chưa phát hành (bắt đầu từ Project ${unpublishedIds[0] ?? "—"}) mới chỉ là mốc lộ trình; mỗi project sẽ giữ trạng thái riêng, kể cả khi thứ tự phát hành không liên tiếp.`;
  return (
    <main className="shell page-wrap">
      <header className="page-hero">
        <span className="eyebrow">
          <i /> BẢN ĐỒ HỌC TẬP
        </span>
        <h1>
          78 dự án nối thành
          <br />
          một con đường.
        </h1>
        <p>{releaseSummary}</p>
        <div className="legend">
          <span>
            <i className="live-dot" /> Đã có hướng dẫn
          </span>
          <span>
            <i /> Chưa phát hành
          </span>
        </div>
      </header>
      <div className="roadmap-layout">
        <aside className="roadmap-jump">
          <b>13 CHẶNG</b>
          {courseParts.map((part, index) => (
            <a key={part.title} href={`#part-${index + 1}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {part.title}
            </a>
          ))}
        </aside>
        <div className="roadmap-parts">
          {courseParts.map((part, partIndex) => (
            <section className="roadmap-part" id={`part-${partIndex + 1}`} key={part.title}>
              <header>
                <span>PHẦN {String(partIndex + 1).padStart(2, "0")}</span>
                <h2>{part.title}</h2>
                <b>{part.projects.length} dự án</b>
              </header>
              <p className="roadmap-part-description">{partDescriptions[part.title]}</p>
              <div>
                {part.projects.map((project) =>
                  project.status === "published" ? (
                    <Link
                      className="roadmap-item is-live"
                      id={`project-${project.id}`}
                      key={project.id}
                      href={`/projects/${project.slug}`}
                    >
                      <span>P{project.id}</span>
                      <div>
                        <h3>{project.title}</h3>
                        <p>{project.summary}</p>
                      </div>
                      <b>
                        {project.lessonCount} bài <i>→</i>
                      </b>
                    </Link>
                  ) : (
                    <article className="roadmap-item" id={`project-${project.id}`} key={project.id}>
                      <span>P{project.id}</span>
                      <div>
                        <h3>{project.title}</h3>
                        <p>Chưa có bài học, Canvas hoặc gói mã nguồn hoàn chỉnh.</p>
                      </div>
                      <b>
                        SẮP RA MẮT <i>·</i>
                      </b>
                    </article>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
