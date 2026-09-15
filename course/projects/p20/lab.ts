import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "PERSPECTIVE TEXTURE LAB",
    title: "Cùng một pixel, affine UV và corrected UV lệch nhau bao nhiêu?",
    description:
      "Nghiêng quad, chọn pixel và theo dõi barycentric weights, 1/z, UV cùng texel bằng đúng công thức của source C++.",
  },
  modes: {
    "texture-quad": {
      title: "Bốn corner chia sẻ geometry và UV ra sao?",
      description:
        "Xem projected quad, đường chéo hai triangle và nhãn UV tại từng corner trước khi texture tham gia.",
    },
    "texture-sampling": {
      title: "Một cặp UV chọn texel nào?",
      description:
        "Di chuyển UV trên bàn cờ procedural và so clamp với repeat, đặc biệt ở biên 1.0 và UV âm.",
    },
    "texture-affine": {
      title: "Barycentric affine làm bàn cờ méo thế nào?",
      description:
        "Render raw UV bằng λ trong screen space và tăng độ nghiêng để nhìn các ô gần camera bị phân bố sai.",
    },
    "texture-error": {
      title: "Sai số affine nằm ở pixel nào?",
      description:
        "Chọn một pixel trong quad và đọc riêng affine UV, reference UV cùng độ lệch Euclidean.",
    },
    "texture-reciprocal": {
      title: "Vì sao phải mang 1/z, u/z và v/z?",
      description:
        "Theo dõi ba reciprocal attributes tại vertex và tổ hợp barycentric của chúng ở sample được chọn.",
    },
    "texture-correct": {
      title: "Phép chia cuối khôi phục UV ra sao?",
      description:
        "So affine và perspective-correct trên cùng quad; inspector hiển thị denominator cùng UV sau khi chia.",
    },
    "texture-clip": {
      title: "Vertex mới trên near plane nhận UV nào?",
      description:
        "Đưa cạnh gần camera xuyên near plane và kiểm position cùng UV của intersection dùng chung tham số t.",
    },
    "texture-validation": {
      title: "Texture mapper có giữ mọi invariant?",
      description:
        "Thử bốn preset, compare mode, drag và single-step; theo dõi coverage, barycentric sum, UV error và texel index.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
