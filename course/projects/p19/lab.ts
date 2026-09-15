import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "FLAT LAMBERT LIGHTING LAB",
    title: "Một mặt sáng lên vì normal hay vì màu material?",
    description:
      "Xoay tetrahedron và đổi hướng đèn để theo dõi face normal, surfaceToLight, dot, diffuse và intensity bằng cùng quy ước như source C++.",
  },
  modes: {
    "lambert-mesh": {
      title: "Bốn face dùng chung vertex như thế nào?",
      description:
        "Tắt lighting để nhìn baseColor, chọn từng face và đối chiếu ba index với bốn vertex của indexed mesh.",
    },
    "lambert-normal": {
      title: "Normal có thật sự hướng ra ngoài?",
      description:
        "Hiện normal của face được chọn, đổi winding thử nghiệm và đọc outward test từ dot(normal, faceCentroid).",
    },
    "lambert-light": {
      title: "surfaceToLight đang chỉ về đâu?",
      description:
        "Thử bốn preset và theo dõi mũi tên hướng từ bề mặt về nguồn sáng, không phải hướng tia sáng truyền xuống vật thể.",
    },
    "lambert-dot": {
      title: "Dot product biến góc thành độ sáng ra sao?",
      description:
        "Đọc dot thô và diffuse đã clamp khi face cùng hướng, vuông góc hoặc quay lưng với đèn.",
    },
    "lambert-material": {
      title: "Ambient và baseColor đóng vai trò gì?",
      description:
        "Thay ambient, diffuseStrength và material để thấy intensity là hệ số ánh sáng còn baseColor là màu của bề mặt.",
    },
    "lambert-culling": {
      title: "Face sáng nhưng quay lưng camera có cần vẽ?",
      description:
        "Xoay mô hình, hiện normal và theo dõi visible/culled count để tách lighting khỏi back-face culling.",
    },
    "lambert-validation": {
      title: "Toàn pipeline có giữ đúng các invariant?",
      description:
        "Chạy, dừng hoặc tiến từng bước; kiểm normal length, intensity range, face count, near-plane safety và pixel coverage.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
