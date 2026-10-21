import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p16-l01": {
      focus: "Chạy được outline/handle trước coverage; giữ một owner, grab offset và mẫu thả cuối.",
      expected:
        "Starter hiện outline và handle; drag, Tab/mũi tên và reset sửa đúng đỉnh, chưa fill.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/controls.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation:
            "Chạy được outline/handle trước coverage; giữ một owner, grab offset và mẫu thả cuối.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "Starter hiện outline và handle; drag, Tab/mũi tên và reset sửa đúng đỉnh, chưa fill.",
        },
      ],
    },
    "p16-l02": {
      focus:
        "Giảm candidate bằng bounds bảo thủ, trả rỗng khi triangle ngoài hoàn toàn và kiểm trước int.",
      expected:
        "Bounds rỗng cho triangle ngoài; [2,3]..[5,7] có 20 candidate và không cast dữ liệu invalid.",
      files: ["include/lab.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation:
            "Giảm candidate bằng bounds bảo thủ, trả rỗng khi triangle ngoài hoàn toàn và kiểm trước int.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "Bounds rỗng cho triangle ngoài; [2,3]..[5,7] có 20 candidate và không cast dữ liệu invalid.",
        },
      ],
    },
    "p16-l03": {
      focus: "Đo area/edge thật trong HUD, nhận biết winding và chuẩn hóa bản sao.",
      expected: "Area oracle bằng +16; đổi B/C cho −16; click sample làm edge HUD thay đổi thật.",
      files: ["include/lab.hpp", "include/view.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation: "Đo area/edge thật trong HUD, nhận biết winding và chuẩn hóa bản sao.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "Area oracle bằng +16; đổi B/C cho −16; click sample làm edge HUD thay đổi thật.",
        },
      ],
    },
    "p16-l04": {
      focus: "Lấy mẫu tại tâm pixel, guard suy biến rồi ghép ba half-plane.",
      expected:
        "Pixel (1,1) được thử tại (1.5,1.5); ba edge cùng quyết định inside, degenerate không chia.",
      files: ["include/lab.hpp", "include/view.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation: "Lấy mẫu tại tâm pixel, guard suy biến rồi ghép ba half-plane.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "Pixel (1,1) được thử tại (1.5,1.5); ba edge cùng quyết định inside, degenerate không chia.",
        },
      ],
    },
    "p16-l05": {
      focus: "Tô bằng callback sau coverage; dùng một candidate budget để pause/step.",
      expected:
        "covered bằng số callback, tested không vượt limit; Space/N dùng đúng vòng raster hiện tại.",
      files: ["include/lab.hpp", "include/view.hpp", "include/controls.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation: "Tô bằng callback sau coverage; dùng một candidate budget để pause/step.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "covered bằng số callback, tested không vượt limit; Space/N dùng đúng vòng raster hiện tại.",
        },
      ],
    },
    "p16-l06": {
      focus: "Giao cạnh chung cho một owner và so coverage của cả quad.",
      expected: "Quad kín và overlap=0 với top-left, cả khi đổi đường chéo hoặc dịch subpixel.",
      files: ["include/lab.hpp", "include/view.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation: "Giao cạnh chung cho một owner và so coverage của cả quad.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "Quad kín và overlap=0 với top-left, cả khi đổi đường chéo hoặc dịch subpixel.",
        },
      ],
    },
    "p16-l07": {
      focus: "Nội suy RGB bằng weights thuộc đúng A/B/C gốc, kể cả input negative.",
      expected:
        "Color (0.25,0.25,0.5) cho RGB(64,64,128); đảo geometry cùng màu không đổi gradient.",
      files: ["include/lab.hpp", "include/view.hpp", "include/controls.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation: "Nội suy RGB bằng weights thuộc đúng A/B/C gốc, kể cả input negative.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "Color (0.25,0.25,0.5) cho RGB(64,64,128); đảo geometry cùng màu không đổi gradient.",
        },
      ],
    },
    "p16-l08": {
      focus: "Nối projector P11 với rasterizer tự viết và giữ scene 3D khi bỏ debug.",
      expected:
        "Camera/FOV không sửa world; clean mode giữ fill/grid 3D; CTest kiểm được Starter ở Debug/Release.",
      files: [
        "include/space.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/controls.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Xác định dữ liệu đầu vào",
          explanation: "Nối projector P11 với rasterizer tự viết và giữ scene 3D khi bỏ debug.",
        },
        {
          title: "Nối mã vào bản Starter đang học",
          explanation:
            "Đọc rõ phần đã có, phần thêm mới và hàm cần thay trong bài; build project_16_starter thay vì chạy nhầm checkpoint tham khảo.",
        },
        {
          title: "Kiểm bằng số và hành vi cụ thể",
          explanation:
            "Camera/FOV không sửa world; clean mode giữ fill/grid 3D; CTest kiểm được Starter ở Debug/Release.",
        },
      ],
    },
  },
  references: {
    "p16-l01": [
      { label: "Screen space", href: "/glossary#screen-space", kind: "Thuật ngữ" },
      { label: "Framebuffer", href: "/glossary#framebuffer", kind: "Thuật ngữ" },
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
    ],
    "p16-l02": [
      { label: "Bounding box", href: "/glossary#bounding-box", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
    ],
    "p16-l03": [
      { label: "Edge function", href: "/glossary#edge-function", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
      { label: "Degenerate triangle", href: "/glossary#degenerate-triangle", kind: "Thuật ngữ" },
    ],
    "p16-l04": [
      { label: "Pixel center", href: "/glossary#pixel-center", kind: "Thuật ngữ" },
      { label: "Coverage test", href: "/glossary#coverage-test", kind: "Thuật ngữ" },
      { label: "Half-plane", href: "/glossary#half-plane", kind: "Thuật ngữ" },
    ],
    "p16-l05": [
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Bounding box", href: "/glossary#bounding-box", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
    ],
    "p16-l06": [
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
      { label: "Coverage test", href: "/glossary#coverage-test", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
    ],
    "p16-l07": [
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],

    "p16-l08": [
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
