import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p59-l01": {
      focus: "Chạy khung SDL3, dựng baseline từ dữ liệu và đọc bộ đếm trước khi tối ưu.",
      expected: "Đo bản chunk còn đủ sáu mặt",
      files: [
        "include/model.hpp",
        "include/geometry.hpp",
        "include/mesh.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy khung có sẵn",
          explanation:
            "Window/renderer/streaming texture/rasterizer và camera từ Project 58 nằm đầy đủ trong ZIP.",
        },
        {
          title: "Dựng baseline",
          explanation: "Duyệt block đặc và gọi appendCube; chưa xét neighbor.",
        },
        {
          title: "Ghi số đầu vào",
          explanation: "Đếm quad/triangles được gửi rasterizer, không đếm các pixel nhìn thấy.",
        },
      ],
    },
    "p59-l02": {
      focus: "Đưa hai tam giác của một quad vào appendFace mà chưa đổi kết quả.",
      expected: "Tách một mặt khỏi hàm dựng cube",
      files: ["include/geometry.hpp", "include/mesh.hpp"],
      steps: [
        {
          title: "Chọn một quad",
          explanation: "Sáu face giữ cùng thứ tự và winding, không đảo x/z khi tách hàm.",
        },
        {
          title: "Sinh hai triangles",
          explanation: "corners 0,1,2 và 0,2,3 dùng chung màu/hướng.",
        },
        {
          title: "Giữ baseline",
          explanation: "appendCube vẫn gọi đủ sáu appendFace; ảnh và counts chưa đổi.",
        },
      ],
    },
    "p59-l03": {
      focus: "Sáu offset, kiểm biên trước get và chuyển baseline/culled trên cùng dữ liệu.",
      expected: "Chỉ dựng mặt có ô trống ở bên kia",
      files: ["include/mesh.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Tìm neighbor",
          explanation: "Cộng đúng offset của mặt đang xét, không lấy offset đối diện.",
        },
        {
          title: "Đọc an toàn",
          explanation: "Kiểm inside trước get; ngoài chunk là Air của chunk đơn lẻ.",
        },
        {
          title: "Giữ/bỏ mặt",
          explanation:
            "Chỉ neighbor opaque mới làm continue trước khi appendFace, Z-buffer không đổi.",
        },
      ],
    },
    "p59-l04": {
      focus: "Hai vật liệu opaque, khoang kín, checker và các fixture không phụ thuộc camera.",
      expected: "Phân biệt biên chunk, vật liệu và khoang Air",
      files: ["include/model.hpp"],
      steps: [
        {
          title: "Đặt hai loại block",
          explanation: "Stone và Grass đều opaque nên mặt tiếp giáp phải bỏ ở cả hai phía.",
        },
        {
          title: "Khoét khoang Air",
          explanation: "Chỉ preset tạo một ô rỗng; mặt bao quanh khoang vẫn được giữ.",
        },
        {
          title: "Thử trường hợp đối lập",
          explanation:
            "Checker không có cặp kề mặt nên không giảm geometry; empty không chia tỷ lệ cho 0.",
        },
      ],
    },
    "p59-l05": {
      focus: "Dùng cùng miền hiển thị cho block nguồn và neighbor; không xóa dữ liệu.",
      expected: "Giữ đúng mặt trên khi cắt lớp",
      files: ["include/model.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Chọn miền hoạt động",
          explanation: "effectiveSlice mở y<=slice từ bài này.",
        },
        {
          title: "Đổi cách đọc neighbor",
          explanation: "Neighbor phía trên cut là Air hiển thị, giữ cap ở lớp trên cùng.",
        },
        {
          title: "Bảo toàn dữ liệu",
          explanation: "Mesh nhận const Chunk; slice đổi chỉ invalidate geometry, không sửa ID.",
        },
      ],
    },
    "p59-l06": {
      focus: "Chọn ô/hướng, xem neighbor và đối chiếu sáu mặt với mesh thật.",
      expected: "Đọc lý do giữ hoặc bỏ từng mặt",
      files: ["include/inspection.hpp", "include/controls.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Đọc nguồn",
          explanation: "Nếu ô nguồn Air hoặc trên cut thì không có mặt để xét.",
        },
        {
          title: "Giải thích neighbor",
          explanation: "Phân biệt Air, ngoài chunk, trên cut và opaque.",
        },
        {
          title: "Nối UI đọc dữ liệu",
          explanation:
            "Grid logical/pointer capture, input x/y/z và hướng mặt không sửa chunk hoặc gọi ray.",
        },
      ],
    },
    "p59-l07": {
      focus: "meshDirty/frameDirty, counters và giới hạn của tỷ lệ giảm geometry.",
      expected: "Không dựng lại mesh khi chỉ xoay camera",
      files: ["include/cache.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Phân loại invalidation",
          explanation: "Geometry state khác camera state, selection chỉ là overlay.",
        },
        {
          title: "Chia hai dirty flags",
          explanation:
            "Rebuild tạo frameDirty; raster hoàn tất clear frameDirty, không clear meshDirty nhầm.",
        },
        {
          title: "Đọc counters",
          explanation:
            "Xoay tăng rasterizations nhưng rebuilds giữ nguyên; counts không phải phép đo FPS.",
        },
      ],
    },
    "p59-l08": {
      focus: "Oracle 6N−2E, face keys, ảnh/depth tương đương và source độc lập.",
      expected: "Kiểm chứng mesher và hoàn thiện ứng dụng",
      files: ["include/audit.hpp", "tests/tests.cpp", "include/controls.hpp"],
      steps: [
        {
          title: "Dùng oracle khác đường code",
          explanation: "Đếm N và cặp kề E theo ba trục dương, không gọi keepFace.",
        },
        {
          title: "Kiểm tập mặt và depth",
          explanation: "FaceKey duy nhất, winding đúng, depth gần nhất khớp baseline từ nhiều góc.",
        },
        {
          title: "Build an toàn",
          explanation:
            "Debug/Release parallel 2, CTest timeout, smoke một frame và tách desktop QA.",
        },
      ],
    },
  },
  references: {
    "p59-l01": [
      {
        label: "Thuật ngữ loại mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l02": [
      {
        label: "Thuật ngữ loại mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l03": [
      {
        label: "Thuật ngữ loại mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l04": [
      {
        label: "Thuật ngữ loại mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l05": [
      {
        label: "Thuật ngữ loại mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l06": [
      {
        label: "Thuật ngữ loại mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l07": [
      {
        label: "Thuật ngữ loại mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l08": [
      {
        label: "CMake của SDL3",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
