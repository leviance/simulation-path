import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "HIDDEN FACES LAB",
    title: "Giữ đúng bề mặt, bỏ geometry dư thừa",
    description:
      "So baseline với neighbor-face elimination trên cùng dữ liệu/camera; đọc lý do và kiểm kết quả.",
  },
  modes: {
    "faces59-1": {
      title: "Đo bản chunk còn đủ sáu mặt",
      description: "Chạy khung SDL3, dựng baseline từ dữ liệu và đọc bộ đếm trước khi tối ưu.",
    },
    "faces59-2": {
      title: "Tách một mặt khỏi hàm dựng cube",
      description: "Đưa hai tam giác của một quad vào appendFace mà chưa đổi kết quả.",
    },
    "faces59-3": {
      title: "Chỉ dựng mặt có ô trống ở bên kia",
      description: "Sáu offset, kiểm biên trước get và chuyển baseline/culled trên cùng dữ liệu.",
    },
    "faces59-4": {
      title: "Phân biệt biên chunk, vật liệu và khoang Air",
      description:
        "Hai vật liệu opaque, khoang kín, checker và các fixture không phụ thuộc camera.",
    },
    "faces59-5": {
      title: "Giữ đúng mặt trên khi cắt lớp",
      description: "Dùng cùng miền hiển thị cho block nguồn và neighbor; không xóa dữ liệu.",
    },
    "faces59-6": {
      title: "Đọc lý do giữ hoặc bỏ từng mặt",
      description: "Chọn ô/hướng, xem neighbor và đối chiếu sáu mặt với mesh thật.",
    },
    "faces59-7": {
      title: "Không dựng lại mesh khi chỉ xoay camera",
      description: "meshDirty/frameDirty, counters và giới hạn của tỷ lệ giảm geometry.",
    },
    "faces59-8": {
      title: "Kiểm chứng mesher và hoàn thiện ứng dụng",
      description: "Oracle 6N−2E, face keys, ảnh/depth tương đương và source độc lập.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
