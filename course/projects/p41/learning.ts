import type { LessonReference, ProjectLearningAssets } from "../../learning/types";

function term(id: string, label: string): LessonReference {
  return { label, href: "/glossary#" + id, kind: "Thuật ngữ" };
}

const learning = {
  guides: {
    "p41-l01": {
      focus: "Thêm đúng một mảnh mặt vào cửa sổ đã có camera.",
      expected: "Mảnh 8×6 ô; đổi độ cao làm normal nghiêng. Bản starter chưa có mesh.",
      files: [
        "include/parametric_surfaces.hpp",
        "include/parametric_mesh.hpp",
        "include/workshop_parameters.hpp",
      ],
      steps: [
        {
          title: "Tính mẫu tại u/v",
          explanation: "Trả cùng lúc vị trí, tangent theo u và tangent theo v.",
        },
        {
          title: "Tạo hàng đỉnh",
          explanation: "Lấy cross theo đúng chiều để normal và tam giác cùng hướng.",
        },
      ],
    },
    "p41-l02": {
      focus: "Sửa phần nối ô trước khi tăng độ phân giải.",
      expected:
        "16×16 ô có 289 đỉnh, 512 tam giác. Đảo một winding làm mất một nửa ô khi bật culling.",
      files: [
        "include/parametric_mesh.hpp",
        "include/workshop_parameters.hpp",
        "include/workshop_app.hpp",
      ],
      steps: [
        {
          title: "Lần ID ở hai hàng",
          explanation: "Chỉ thêm ô sau khi hàng dưới và hàng trên đều có đỉnh.",
        },
        {
          title: "Nối và kiểm",
          explanation: "Hai tam giác cùng chiều; đổi resolution vẫn không vượt index.",
        },
      ],
    },
    "p41-l03": {
      focus: "Dùng lại lưới, thay hàm đặt điểm và chính sách ở mép.",
      expected: "Torus khép cả hai chiều. Vị trí và normal trùng ở mép, UV vẫn có giá trị 0 và 1.",
      files: [
        "include/parametric_surfaces.hpp",
        "include/parametric_mesh.hpp",
        "include/surface_settings.hpp",
      ],
      steps: [
        {
          title: "Tính hai góc",
          explanation: "Một góc quanh trục, góc còn lại chạy quanh tiết diện tròn.",
        },
        {
          title: "Lấy mẫu lại ở góc 0",
          explanation: "Hàng/cột cuối dùng cùng vị trí với đầu nhưng không dùng lại ID.",
        },
      ],
    },
    "p41-l04": {
      focus: "Nối hàng cuối với hàng đầu theo thứ tự cột ngược.",
      expected: "Dải không gãy ở seam và nhìn được cả hai phía; tangent ngang đổi dấu.",
      files: [
        "include/parametric_surfaces.hpp",
        "include/parametric_mesh.hpp",
        "include/geometry_renderer.hpp",
        "shaders/surface.frag",
      ],
      steps: [
        {
          title: "Đảo cột và tangent",
          explanation: "Dùng vSegments − j để lấy mẫu; không sửa UV gốc.",
        },
        {
          title: "Tô sáng mặt nhìn thấy",
          explanation: "Tắt culling và lật normal theo gl_FrontFacing trong shader.",
        },
      ],
    },
    "p41-l05": {
      focus: "Đặt một tiết diện elip tại mỗi mẫu của đường xoắn mở.",
      expected:
        "Growth thu đầu nhỏ mà không làm to miệng; frame đi theo đường cong, không đổi hướng giật cục.",
      files: [
        "include/sweep_frames.hpp",
        "include/parametric_mesh.hpp",
        "include/surface_settings.hpp",
      ],
      steps: [
        {
          title: "Tính tâm và tangent đường",
          explanation: "Đạo hàm có cả phần bán kính tăng và phần góc quay.",
        },
        {
          title: "Mang frame từ vòng trước",
          explanation: "Xoay vừa đủ, rồi đặt các điểm của elip theo hai trục tiết diện.",
        },
      ],
    },
    "p41-l06": {
      focus: "Khép frame dọc đường tâm knot thay vì chỉ ghép vị trí.",
      expected: "Torus knot ba/năm múi khép ống không vặn gấp ở hàng cuối. UV còn hai bản riêng.",
      files: [
        "include/sweep_frames.hpp",
        "include/surface_settings.hpp",
        "include/workshop_layout.hpp",
      ],
      steps: [
        {
          title: "Đổi đường tâm",
          explanation: "Hai góc với tỉ lệ 2:3 hoặc 2:5 đưa đường cong về đúng điểm đầu.",
        },
        {
          title: "Bù góc trên cả vòng",
          explanation: "Phân bổ theo độ dài cung, rồi chép frame đầu để bỏ sai số làm tròn.",
        },
      ],
    },
    "p41-l07": {
      focus: "Tách yêu cầu mới, preview và bản đầy đủ đã upload.",
      expected: "Kéo thấy preview; buông làm mịn theo nhóm tối đa tám hàng. Hủy giữ last-good.",
      files: ["include/mesh_session.hpp", "include/workshop_app.hpp", "include/workshop_panel.hpp"],
      steps: [
        {
          title: "Giới hạn lưới khi kéo",
          explanation: "Không hạ số hàng sweep dưới 64; chỉ giữ yêu cầu mới nhất.",
        },
        {
          title: "Chuyển mesh đúng lúc",
          explanation: "Sau khi buông, chờ ứng viên đủ hàng và upload xong mới cập nhật last-good.",
        },
      ],
    },
    "p41-l08": {
      focus: "Xuất đúng mesh đầy đủ và kiểm dữ liệu vừa ghi.",
      expected: "OBJ đọc lại khớp position, UV, normal và index; file cũ không bị ghi đè.",
      files: [
        "include/obj_mesh.hpp",
        "include/obj_file.hpp",
        "include/workshop_app.hpp",
        "tests/obj_tests.cpp",
      ],
      steps: [
        {
          title: "Ghi ba mảng và mặt",
          explanation: "Dùng index + 1 cho từng góc f, giữ thứ tự winding.",
        },
        {
          title: "Đọc file tạm rồi so",
          explanation: "Kiểm bộ thuộc tính và chỉ số; chỉ đổi tên khi khớp toàn bộ.",
        },
      ],
    },
    "p41-l09": {
      focus: "Nghiệm thu theo số bản ghi, buffer và thao tác thật.",
      expected:
        "Knot 256×256 ô: 66.049 đỉnh, 131.072 tam giác, 4.479.020 byte payload trên build Windows.",
      files: [
        "include/surface_settings.hpp",
        "include/workshop_checks.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Đo từ mesh và GL",
          explanation:
            "Đếm phần tử thật; không lấy resolution của yêu cầu đang chờ để báo kết quả.",
        },
        {
          title: "Chạy kiểm rồi thử bằng chuột",
          explanation:
            "Tách kết quả CTest/hidden GPU khỏi capture, mất focus và hình ảnh trực tiếp.",
        },
      ],
    },
  },
  references: {
    "p41-l01": [
      term("parametric-surface", "Bề mặt tham số"),
      term("surface-tangents", "Tangent theo u/v"),
    ],
    "p41-l02": [
      term("face-normal", "Face normal"),
      term("element-buffer-object", "Element Buffer Object"),
    ],
    "p41-l03": [
      term("surface-seam", "Đường nối của bề mặt"),
      term("uv-coordinates", "UV coordinates"),
    ],
    "p41-l04": [
      term("mobius-reversed-seam", "Mép đảo của Möbius"),
      term("back-face-culling", "Back-face culling"),
    ],
    "p41-l05": [
      term("sweep-frame", "Sweep frame"),
      term("parallel-transport-frame", "Mang frame dọc đường cong"),
    ],
    "p41-l06": [term("sweep-seam-correction", "Bù góc để khép frame")],
    "p41-l07": [term("mesh-last-good", "Preview và last-good")],
    "p41-l08": [
      term("obj-face-token", "OBJ face token"),
      term("obj-round-trip", "Đọc lại file OBJ"),
    ],
    "p41-l09": [
      term("vertex-buffer-object", "Vertex Buffer Object"),
      term("obj-round-trip", "Đọc lại file OBJ"),
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
