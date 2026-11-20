import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/optics",
    withDemo: true,
    overview: ["anvil"],
    lessons: { "fog54-10": ["anvil"] },
    takes: {
      anvil: {
        title: "Hai tháp mây và một khe trời",
        source: "Project 54 · C++/SDL3 · Release",
        poster: "anvil.png",
        alt: "Mây hình đe trên trời xanh, ba ảnh nhỏ cùng cảnh so cực đại, trung bình và độ che phủ.",
        caption:
          "Hai tháp và khoảng trống thuộc cùng mảng mật độ. Ba hình nhỏ không phải ba dataset khác nhau.",
      },
    },
  },
  base: {
    label: "VOLUME / LIGHTBOX",
    title: "Một khối dữ liệu, ba cách nhìn",
    description:
      "Canvas 2D dùng mảng Float32 thật để đọc ray và so MIP/average/alpha. C++ trong ZIP chạy fragment shader trên viewport lớn, không phải bản Canvas phóng to.",
  },
  modes: {
    "fog54-1": {
      title: "Ảnh đầu tiên của shader",
      description: "UV và fullscreen triangle; chưa cấp phát volume.",
    },
    "fog54-2": {
      title: "Tia perspective từ camera",
      description: "Xoay camera và đọc origin/direction; chưa tích lũy density.",
    },
    "fog54-3": {
      title: "Đoạn tia trong box",
      description: "Quan sát entry/exit, camera inside và miss trước khi lấy mẫu.",
    },
    "fog54-4": {
      title: "Texture 3D thật",
      description: "64³/128³ Float32, một midpoint trong mỗi ray và quy ước tâm voxel.",
    },
    "fog54-5": {
      title: "MIP và average",
      description: "Hai cách gộp cùng các mẫu; average phải dùng ds của đoạn cuối.",
    },
    "fog54-6": {
      title: "Front-to-back alpha",
      description: "Tách màu tích lũy khỏi transmittance; opacity gắn với độ dài đoạn.",
    },
    "fog54-7": {
      title: "Transfer và gradient lighting",
      description:
        "Cutoff tạo cùng scalar đã phân loại; ánh sáng cục bộ chỉ là lựa chọn trình bày alpha.",
    },
    "fog54-8": {
      title: "Đọc một tia đã chọn",
      description: "Chọn u/v, tiến/dừng từng mẫu và đối chiếu bảng số với ảnh 3D.",
    },
    "fog54-9": {
      title: "Chất lượng và chi phí",
      description: "So step trên CPU trong Canvas; phép đo GPU thật và IQR nằm ở chương trình C++.",
    },
    "fog54-10": {
      title: "Volume Lightbox hoàn chỉnh",
      description:
        "Dữ liệu 128³ thật, ba mode, inspector, kiểm hằng/slab và giới hạn không phải CT y tế.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
