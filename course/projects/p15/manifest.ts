import type { PublishedProjectEditorial } from "../../types";
const project = {
  prerequisites: [
    "Project 09 — column vector và thứ tự nhân ma trận",
    "Project 11 — perspective, NDC và viewport",
    "Project 13 — vertex/edge list, clipping và Bresenham",
    "Project 14 — camera position, inverse yaw và pitch",
  ],
  summary:
    "Tự viết Mat4 và máy soi pipeline 3D: chọn một vertex trên mô hình, thay transform hoặc lens và theo dõi đủ sáu hệ tọa độ trên bảng cập nhật realtime.",
  challenge: {
    timebox: "4–6 giờ thử tự làm trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3 có viewport 3D và bảng LOCAL/WORLD/VIEW/CLIP/NDC/SCREEN cho cùng một vertex. Mục tiêu là nhìn thấy dữ liệu đổi ở bước nào khi bạn sửa model, camera hoặc lens.",
    outcome:
      "Một mô hình wireframe nằm trên lưới sàn có chiều sâu, tám vertex chọn được và một bảng sáu dòng hiện ngay trong cửa sổ. Phím/slider đổi transform, FOV, near/far; ẩn debug vẫn giữ cảnh 3D.",
    requirements: [
      "Tự viết Mat4 row-major storage, nhân column vector, identity và phép nhân hai ma trận.",
      "Dựng M=T×Ry×S, V=Rx(pitch)×Ry(-yaw)×T(-camera.position), P cho view nhìn +Z và NDC z trong [0,1].",
      "Giữ riêng local/model-space, world, view, clip, NDC, screen; không ghi đè input hoặc chỉ hiện một giá trị trên title bar.",
      "Cho phép chọn vertex; thay local XYZ, model X/Z/yaw/scaleX, camera Z/yaw/pitch và lens FOV/near/far khi đang chạy.",
      "Giải thích point w=1, direction w=0 và vì sao projection tạo clip.w=view.z; phép chia cho w là bước riêng, không phải phép nhân ma trận.",
      "Không chia khi w≤epsilon; giữ NDC/screen hữu hạn của điểm bị clip để soi lỗi, nhưng chỉ vẽ vertex nằm trong vùng nhìn.",
      "Viewport chính có perspective, lưới sàn, trục và wireframe; clip đoạn trước divide và screen trước Bresenham.",
      "Có preset tính tay, visible/near/behind/far/outside/w=0, pause/step/reset, debug/clean và source độc lập tải được.",
    ],
    constraints: [
      "Không dùng OpenGL, GLM, Eigen, DirectXMath, SDL_RenderGeometry hoặc engine để thay phần toán/rendering cần tự viết.",
      "Column vector và quy ước +Z phải được giữ xuyên suốt; storage row-major không đổi thứ tự tác động.",
      "Stage chưa tính được phải hiện — cùng lý do; không dùng tọa độ (0,0) giả hoặc clamp điểm lỗi vào màn hình.",
      "Ảnh tham chiếu P11 chỉ hỗ trợ các bài đầu; final phải dùng Mat4 và perspective divide mới cho renderer.",
      "Chưa tô triangle hoặc Z-buffer. Cạnh wireframe được clip để cảnh đúng, không biến point inspector thành bài clipping tam giác.",
      "Canvas hỗ trợ học, không thay executable SDL; browser không biên dịch hoặc chạy C++.",
    ],
    definitionOfDone: [
      "Preset tính tay: local(1,1,0) → world(1,1,4) → view(0,1,4) → clip(0,1,27/8,4) → NDC(0,1/4,27/32) → screen(550,210) trên viewport 1100×560.",
      "T×S và S×T có đáp án độc lập khác nhau; translation tác động point nhưng không tác động direction.",
      "Model và view khớp các đường tính vô hướng; MVP khớp pipeline rời trong sai số 10⁻⁹, không dùng phép so này thay oracle tính tay.",
      "FOV/near/far không sửa local/world/view; các biên near/far vẫn visible trong tolerance, w=0/âm không sinh NDC/screen giả.",
      "Tám vertex chọn được, đủ sáu dòng cập nhật trong window; phím near/far hoạt động, ẩn debug giữ mô hình và chiều sâu.",
      "Starter, bảy checkpoint, final và CTest build/chạy Debug lẫn Release; renderer, finite guards và vòng đời Canvas có regression tests.",
    ],
  },
  duration: "10–12 giờ",
  objectives: [
    "Theo dõi một vertex qua từng hệ tọa độ mà không phải đoán từ hình ảnh cuối",
    "Tự dựng và ghép Mat4, phân biệt homogeneous w với tọa độ screen",
    "Viết code renderer và inspector cùng dùng một pipeline, kiểm chứng bằng số tính tay",
  ],
  lessons: [
    {
      id: "p15-l01",
      slug: "01-dung-may-soi-vertex",
      title: "Dựng cảnh 3D và bảng theo dõi vertex",
      summary:
        "Từ bộ khung CPU của P13/P14, chọn vertex và hiện Local thật; các stage chưa viết để trống có giải thích.",
      order: 1,
      estimatedMinutes: 60,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l02",
      slug: "02-vec4-va-mat4",
      title: "Thêm w để tịnh tiến bằng ma trận",
      summary:
        "Tự viết Mat4 và phép nhân; dùng cùng xyz để kiểm sự khác nhau giữa point w=1 và direction w=0.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l03",
      slug: "03-model-matrix-local-to-world",
      title: "Đưa mô hình từ local ra world",
      summary:
        "Scale, xoay rồi tịnh tiến bằng M=T×Ry×S; nối cả bảng số lẫn renderer sang model matrix.",
      order: 3,
      estimatedMinutes: 75,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l04",
      slug: "04-view-matrix-world-to-camera",
      title: "Viết lại camera bằng view matrix",
      summary:
        "Đổi công thức camera của P14 thành V, giữ world đứng yên và kiểm bằng inverse yaw/pitch tường minh.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l05",
      slug: "05-projection-matrix-va-clip-space",
      title: "Giữ mẫu số trong clip.w",
      summary:
        "Suy từng hàng của perspective matrix từ FOV, aspect và hai điều kiện near/far; matrix chưa chia cho w.",
      order: 5,
      estimatedMinutes: 85,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l06",
      slug: "06-perspective-divide-ndc-va-viewport",
      title: "Chia cho w và tìm pixel trên màn hình",
      summary:
        "Giữ stage không tồn tại dưới dạng optional, phân loại clip và thay đường tham chiếu bằng renderer dùng P.",
      order: 6,
      estimatedMinutes: 75,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l07",
      slug: "07-ghep-mvp-va-validation",
      title: "Ghép MVP và kiểm chứng bản hoàn chỉnh",
      summary:
        "Theo ví dụ tính tay qua đủ sáu stage, thêm pause/step/clean và chạy source độc lập cùng CTest.",
      order: 7,
      estimatedMinutes: 90,
      demoId: "pipeline3d",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
