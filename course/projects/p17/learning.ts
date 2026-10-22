import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p17-l01": {
      focus: "Dựng đủ mesh và vòng fill trước khi viết Z-buffer.",
      expected: "Khối đủ 12 triangle, kéo và phím xoay hoạt động dù chưa có depth test.",
      files: [
        "include/geometry.hpp",
        "include/raster.hpp",
        "include/render.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/controls.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Dựng đủ mesh và vòng fill trước khi viết Z-buffer.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l02": {
      focus: "Cô lập draw order mà không đổi winding/góc quay.",
      expected: "Đảo order thấy lỗi rõ, mesh và pose giữ nguyên.",
      files: ["include/render.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Cô lập draw order mà không đổi winding/góc quay.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l03": {
      focus: "Cùng row stride, kiểm kích thước trước cấp phát và clear theo frame.",
      expected: "Buffer (4,3) có 12 số, index(2,1)=6, invalid resize không đổi dữ liệu.",
      files: ["include/depth.hpp", "include/render.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Cùng row stride, kiểm kích thước trước cấp phát và clear theo frame.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l04": {
      focus: "Depth sau perspective divide, weights đi cùng normalized triangle.",
      expected: "near=1 cho 0; far=10 cho 1; view Z=4 cho NDC 5/6.",
      files: [
        "include/geometry.hpp",
        "include/depth.hpp",
        "include/render.hpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Depth sau perspective divide, weights đi cùng normalized triangle.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l05": {
      focus: "Compare rồi write đúng pixel; từ chối dữ liệu không hợp lệ.",
      expected: "Depth 0.25 thắng 0.75; fail không sửa color/depth, depth tắt không ghi depth.",
      files: [
        "include/depth.hpp",
        "include/render.hpp",
        "include/scene.hpp",
        "include/controls.hpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Compare rồi write đúng pixel; từ chối dữ liệu không hợp lệ.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l06": {
      focus: "Dùng dt và một render path cho cả animation lẫn thao tác tay.",
      expected: "Các chuỗi dt nhỏ cùng tổng thời gian cho cùng góc, pause/step không nhảy pose.",
      files: ["include/scene.hpp", "include/controls.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Dùng dt và một render path cho cả animation lẫn thao tác tay.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l07": {
      focus: "So từng pixel thay vì chỉ so checksum hoặc bộ đếm.",
      expected: "Color/depth cuối khớp khi đổi order; NaN không qua so sánh.",
      files: ["include/render.hpp", "include/view.hpp", "include/controls.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "So từng pixel thay vì chỉ so checksum hoặc bộ đếm.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l08": {
      focus: "Loại mặt quay lưng trước normalize, không dùng thay depth test.",
      expected: "Culling giảm số triangle mà giữ cùng ảnh với Z-buffer bật.",
      files: [
        "include/geometry.hpp",
        "include/raster.hpp",
        "include/render.hpp",
        "include/controls.hpp",
      ],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Loại mặt quay lưng trước normalize, không dùng thay depth test.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
    "p17-l09": {
      focus: "Giữ lưới world/camera độc lập và kiểm Starter hoàn chỉnh.",
      expected: "Clean có cube/grid 3D; chạy tests trỏ đúng Starter ở Debug và Release.",
      files: [
        "include/view.hpp",
        "include/scene.hpp",
        "include/controls.hpp",
        "include/presentation.hpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Xác định phần đang thay",
          explanation: "Giữ lưới world/camera độc lập và kiểm Starter hoàn chỉnh.",
        },
        {
          title: "Viết và chạy mã trong Starter",
          explanation:
            "Theo các vị trí chèn/thay trong bài; build project_17_starter. Checkpoint chỉ là bản tham khảo độc lập.",
        },
        {
          title: "Đối chiếu kết quả",
          explanation:
            "Thử cả trường hợp đúng và lỗi có chủ ý; đọc số liệu thật thay vì chỉ nhìn ảnh.",
        },
      ],
    },
  },
  references: {
    "p17-l08": [
      { label: "Back-face culling", href: "/glossary#back-face-culling", kind: "Thuật ngữ" },
    ],
    "p17-l09": [{ label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" }],
    "p17-l01": [
      { label: "Indexed mesh", href: "/glossary#indexed-mesh", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Screen space", href: "/glossary#screen-space", kind: "Thuật ngữ" },
    ],
    "p17-l02": [
      { label: "Painter's algorithm", href: "/glossary#painters-algorithm", kind: "Thuật ngữ" },
      { label: "Draw order", href: "/glossary#draw-order", kind: "Thuật ngữ" },
      { label: "Fragment", href: "/glossary#fragment", kind: "Thuật ngữ" },
    ],
    "p17-l03": [
      { label: "Depth buffer", href: "/glossary#depth-buffer", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
      { label: "Framebuffer", href: "/glossary#framebuffer", kind: "Thuật ngữ" },
    ],
    "p17-l04": [
      { label: "NDC", href: "/glossary#ndc", kind: "Thuật ngữ" },
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Depth interpolation", href: "/glossary#depth-interpolation", kind: "Thuật ngữ" },
    ],
    "p17-l05": [
      { label: "Depth test", href: "/glossary#depth-test", kind: "Thuật ngữ" },
      { label: "Depth write", href: "/glossary#depth-write", kind: "Thuật ngữ" },
      { label: "Fragment", href: "/glossary#fragment", kind: "Thuật ngữ" },
    ],
    "p17-l06": [
      { label: "Delta time", href: "/glossary#delta-time", kind: "Thuật ngữ" },
      { label: "Render pipeline", href: "/glossary#render-pipeline", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p17-l07": [
      { label: "Depth buffer", href: "/glossary#depth-buffer", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
