import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "MANDELBULB EXPLORER",
    title: "Một phép lặp, nhiều cách nhìn hình học",
    description:
      "Canvas 2D dùng CPU để hỏi field/ray ở 32×18→96×54. Ảnh native 960×540, SSBO và GPU timings được kiểm riêng trong ứng dụng C++/SDL3/OpenGL.",
  },
  modes: {
    power: {
      title: "Lát cắt của một field 3D",
      description:
        "Chọn c, đổi power rồi đọc z qua từng vòng; bounded chỉ nghĩa chưa thoát trong iteration cap.",
    },
    rays: {
      title: "Một pixel nhìn qua những điểm nào?",
      description:
        "Bước đều làm lộ vùng ray bỏ sót; các vạch biểu diễn t chứ không phải tốc độ chuyển động.",
    },
    distance: {
      title: "DE đổi bước, không tạo lời bảo đảm SDF",
      description:
        "So độ dài bước gần mặt, đổi epsilon/safety và đọc budget thay vì đoán từ màu ảnh.",
    },
    normals: {
      title: "Sáu câu hỏi quanh điểm hit",
      description:
        "Đổi normal H và so ánh sáng với normals; bước quá nhỏ có thể làm sai phân nhạy precision.",
    },
    camera: {
      title: "Đổi ray, không xoay phép lặp theo camera",
      description: "Orbit, pan, dolly và thử inside; preview vẫn dùng được khi refinement Pause.",
    },
    work: {
      title: "Ray steps khác tổng fractal work",
      description:
        "Đổi hai heatmap và chọn một ray; work tính mọi evaluator call, không phải timing GPU.",
    },
    refine: {
      title: "Giữ đúng ảnh của từng generation",
      description:
        "Đổi nhanh cấu hình, Pause, tiến một batch hoặc Cancel; ACTIVE cũ giữ đúng nhãn tới lúc preview mới đủ.",
    },
    quality: {
      title: "Bốn sample có thực sự khác nhau?",
      description:
        "So một/bốn ray subpixel và AO bốn probe trên cùng camera; đợi ảnh đủ mẫu rồi so mép.",
    },
    explorer: {
      title: "Một lượt khám phá và tự nghiệm thu",
      description:
        "Chọn preset, tiến camera, đọc state/work và thử hủy. Canvas không nhận là phép nghiệm thu quy mô GPU.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
