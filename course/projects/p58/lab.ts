import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "VOXEL CHUNK LAB",
    title: "Từ một cube đến 4096 block",
    description: "Đối chiếu dữ liệu x/z/y, mesh sáu mặt và Z-buffer bằng một chunk hữu hạn.",
  },
  modes: {
    "voxel58-1": {
      title: "Một cube chạy được",
      description: "Sáu quad, hai triangles mỗi quad, camera cố định và CPU framebuffer.",
    },
    "voxel58-2": {
      title: "Bộ nhớ của chunk",
      description: "Một block tại (7,7,7); đọc lớp y=7 theo x/z, chưa dựng toàn chunk.",
    },
    "voxel58-3": {
      title: "Mesh chưa tối ưu",
      description: "4096 block đặc, 49152 triangles; không bỏ mặt bên trong.",
    },
    "voxel58-4": {
      title: "Đất bậc thang",
      description: "Grass/Dirt/Stone, preset single/full/steps/empty và camera cố định.",
    },
    "voxel58-5": {
      title: "Camera và Z-buffer",
      description: "Xoay/zoom có giới hạn, tắt depth để thấy draw order không đủ.",
    },
    "voxel58-6": {
      title: "Đọc từng lớp",
      description: "Cắt hiển thị ở y=slice; chọn ô bảng x/z, không ray picking hoặc sửa block.",
    },
    "voxel58-7": {
      title: "Kiểm chứng bản hoàn chỉnh",
      description:
        "Kiểm số block/tam giác và lớp đáy; dùng CTest để kiểm depth, winding và bounds.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
