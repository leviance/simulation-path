import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p19-l01": {
      focus:
        "Kế thừa Z-buffer và near clip để có cube tám đỉnh, mười hai tam giác chạy được ngay từ checkpoint đầu.",
      expected:
        "Checkpoint đầu đã vẽ cube đặc bằng CPU với perspective, depth và palette. Kéo/WASD xoay cube, grid đứng yên; resize giữ đúng tỉ lệ.",
      files: ["include/geometry.hpp", "include/render.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Khôi phục bề mặt trước khi nói đến ánh sáng",
          explanation:
            "Dựng cube từ tám vertex và mười hai index triples. Một face ở đây là triangle; mỗi mặt vuông có hai triangle.",
        },
        {
          title: "Đi hết đường tới pixel",
          explanation:
            "Giữ near clipping, perspective, top-left rasterizer và Z-buffer từ Project 17–18. Không chờ bài cuối mới tô kín cube.",
        },
        {
          title: "Chạy bộ khung SDL độc lập",
          explanation:
            "Window, renderer, streaming texture và event loop nằm trong source của checkpoint; bạn không cần chép một project cũ vào thư mục mới.",
        },
      ],
    },
    "p19-l02": {
      focus: "Tính normal từ world-space vertex; kiểm winding và hai tam giác trên cùng một mặt.",
      expected:
        "Bật N để thấy normal trắng bám vào triangle. Cả 12 normal dài 1, hướng ra ngoài; cặp triangle cùng mặt có normal trùng hướng.",
      files: ["include/geometry.hpp", "include/view.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Lấy hai cạnh cùng gốc",
          explanation:
            "Tính B−A và C−A từ vertex đã xoay trong world space, rồi lấy cross product.",
        },
        {
          title: "Chuẩn hóa và kiểm winding",
          explanation:
            "Normal chỉ mang hướng, không mang diện tích. Dùng tâm cube để xác nhận chiều ra ngoài.",
        },
        {
          title: "Gắn mũi tên vào face",
          explanation:
            "Vẽ từ centroid đến centroid + 0.85N; chọn hai triangle trên cùng mặt để kiểm chúng đồng hướng.",
        },
      ],
    },
    "p19-l03": {
      focus:
        "Thống nhất surfaceToLight, đặt hướng bằng hai góc và cập nhật quỹ đạo theo thời gian.",
      expected:
        "Preset và hai góc điều khiển hướng đèn độc lập với cube. Space chạy/dừng orbit; dấu chấm tiến 1/60 giây. Màu chưa đổi vì checkpoint này chưa thêm diffuse.",
      files: ["include/lighting.hpp", "include/scene.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Đặt đúng tên hướng đèn",
          explanation: "surfaceToLight chỉ từ mặt tới đèn. Hướng truyền tia sáng có dấu ngược lại.",
        },
        {
          title: "Biến hai góc thành một hướng",
          explanation:
            "Azimuth quay quanh Y, elevation nâng hướng đèn. Chuẩn hóa hướng trước khi dùng chung cho mọi face.",
        },
        {
          title: "Điều khiển được trước khi tự chạy",
          explanation:
            "Preset giúp đối chiếu dấu, Q/E chỉnh azimuth, [/] chỉnh elevation; Space chạy/dừng và dấu chấm tiến 1/60 giây.",
        },
      ],
    },
    "p19-l04": {
      focus:
        "Dùng dot product của hai vector đơn vị, thử ba góc 0°, 90°, 180° rồi tô từng mặt trên CPU.",
      expected:
        "Cube nhận sắc xám theo diffuse; mặt cùng hướng đèn sáng, mặt quay lưng có diffuse bằng 0. Đổi đèn chỉ đổi màu, không đổi geometry.",
      files: ["include/lighting.hpp", "include/render.hpp"],
      steps: [
        {
          title: "Đọc dot như cosine",
          explanation:
            "Khi N và L đã dài 1, N·L bằng cosine của góc giữa chúng. Các vị trí 0°, 90°, 180° là ba điểm kiểm tra dễ tính tay.",
        },
        {
          title: "Bỏ phần âm",
          explanation:
            "Mặt quay lưng đèn nhận diffuse bằng 0, không bị trừ màu và cũng không sáng lại bằng abs(dot).",
        },
        {
          title: "Tô màu trên bề mặt thật",
          explanation:
            "Tính diffuse một lần cho triangle, nhân với xám 220 rồi đưa đúng màu đó qua clip và raster.",
        },
      ],
    },
    "p19-l05": {
      focus:
        "Tách baseColor khỏi cường độ sáng; thêm ambient, strength và thí nghiệm một màu/sáu màu.",
      expected:
        "Material một màu/sáu màu tách khỏi độ sáng. Ambient giữ mặt tối còn nhìn thấy, strength chỉnh phần diffuse; intensity không vượt 1.",
      files: ["include/lighting.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Tách material khỏi light",
          explanation:
            "baseColor mô tả vật liệu, intensity mô tả lượng ánh sáng. Dùng một màu chung trước khi bật palette sáu màu.",
        },
        {
          title: "Thêm ambient có giới hạn",
          explanation:
            "Ambient giúp mặt tối còn nhìn rõ; nó không phải bóng đổ hoặc ánh sáng phản xạ được mô phỏng.",
        },
        {
          title: "Chỉ làm tròn ở framebuffer",
          explanation: "Giữ RGB double khi tính toán; clamp rồi đổi sang byte tại packColor.",
        },
      ],
    },
    "p19-l06": {
      focus:
        "Tách model rotation khỏi camera orbit; giữ đèn trong world space và culling độc lập với lighting.",
      expected:
        "Hai mode kéo sửa riêng model/camera. Orbit camera giữ nguyên diffuse của cùng face; tắt culling vẫn giữ ảnh vì depth test đang bật.",
      files: ["include/geometry.hpp", "include/scene.hpp", "include/render.hpp"],
      steps: [
        {
          title: "Tách hai thao tác kéo",
          explanation:
            "Xoay mô hình đổi geometry world; đổi góc nhìn chỉ đổi Camera. Nền grid giúp nhận ra thao tác nào đang diễn ra.",
        },
        {
          title: "Không trộn không gian",
          explanation:
            "Lighting giữ trong world space, còn view transformation chỉ phục vụ projection và culling.",
        },
        {
          title: "Tách culling khỏi diffuse",
          explanation:
            "Mặt có thể hướng camera nhưng quay lưng đèn. Kiểm hai điều kiện riêng, Z-buffer vẫn giữ nhiệm vụ visibility.",
        },
      ],
    },
    "p19-l07": {
      focus:
        "Giữ một màu cho cả face sau clipping; đối chiếu renderer với ray/AABB và bàn giao source hoàn chỉnh.",
      expected:
        "Ứng dụng hoàn chỉnh có chế độ trình diễn/debug; reference ray/AABB khớp coverage, depth và RGB. Source đầy đủ và CTest chạy ở Debug/Release.",
      files: ["include/render.hpp", "include/presentation.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Chốt màu trước khi chia face",
          explanation:
            "Normal và màu thuộc face gốc. Mọi triangle phát sinh sau near clipping dùng chung shadedColor.",
        },
        {
          title: "Kiểm bằng thuật toán khác",
          explanation:
            "Ray/AABB tìm mặt đầu tiên trên cube local; normal trục của mặt đó cho màu dự đoán độc lập với rasterizer.",
        },
        {
          title: "Bàn giao ứng dụng đầy đủ",
          explanation:
            "Build mọi target, chạy CTest ở Debug/Release và thử các controls. Phần source hoàn chỉnh dưới bài chứa tất cả header, main, CMake và tests.",
        },
      ],
    },
  },
  references: {
    "p19-l01": [
      {
        label: "Mesh topology",
        href: "/glossary#mesh-topology",
        kind: "Thuật ngữ",
      },
      {
        label: "Vertex index",
        href: "/glossary#vertex-index",
        kind: "Thuật ngữ",
      },
    ],
    "p19-l02": [
      {
        label: "Face normal",
        href: "/glossary#face-normal",
        kind: "Thuật ngữ",
      },
      {
        label: "Cross product",
        href: "/glossary#cross-product",
        kind: "Thuật ngữ",
      },
      {
        label: "Winding order",
        href: "/glossary#winding-order",
        kind: "Thuật ngữ",
      },
    ],
    "p19-l03": [
      {
        label: "Directional light",
        href: "/glossary#directional-light",
        kind: "Thuật ngữ",
      },
      {
        label: "Normalization",
        href: "/glossary#normalization",
        kind: "Thuật ngữ",
      },
    ],
    "p19-l04": [
      {
        label: "Lambert diffuse",
        href: "/glossary#lambert-diffuse",
        kind: "Thuật ngữ",
      },
      {
        label: "Dot product",
        href: "/glossary#dot-product",
        kind: "Thuật ngữ",
      },
    ],
    "p19-l05": [
      {
        label: "Ambient light",
        href: "/glossary#ambient-light",
        kind: "Thuật ngữ",
      },
      {
        label: "Flat shading",
        href: "/glossary#flat-shading",
        kind: "Thuật ngữ",
      },
    ],
    "p19-l06": [
      {
        label: "Back-face culling",
        href: "/glossary#back-face-culling",
        kind: "Thuật ngữ",
      },
      {
        label: "Camera space",
        href: "/glossary#camera-space",
        kind: "Thuật ngữ",
      },
    ],
    "p19-l07": [
      {
        label: "Depth buffer",
        href: "/glossary#depth-buffer",
        kind: "Thuật ngữ",
      },
      {
        label: "Near-plane clipping",
        href: "/glossary#clipping",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
