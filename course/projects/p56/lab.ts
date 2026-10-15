import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "CT SINOGRAM LAB",
    title: "Nhìn sinogram hình thành qua từng góc đo",
    description: "Lát cắt XY tổng hợp, nguồn điểm và detector phẳng; chưa tái dựng ảnh CT.",
  },
  modes: {
    "ct56-1": {
      title: "Vẽ vật thể trước khi xây máy quét",
      description: "Phantom là dữ liệu hình học, không phải ảnh CT đã đo.",
    },
    "ct56-2": {
      title: "Quay nguồn và detector quanh vật thể",
      description: "Giữ đúng khoảng cách và hướng dãy detector bằng radial/tangent.",
    },
    "ct56-3": {
      title: "Đo chiều dài tia đi trong một đĩa",
      description: "Đọc từng chord của đoạn tia hữu hạn.",
    },
    "ct56-4": {
      title: "Từ chiều dài đến một hàng detector",
      description: "So p và T khi đổi phantom hoặc strength.",
    },
    "ct56-5": {
      title: "Ghép các góc đo thành sinogram",
      description: "Đo từng hàng, phân biệt ô chưa đo và p=0; chọn ô để xem tia.",
    },
    "ct56-6": {
      title: "Quét từng phần và giữ dữ liệu nhất quán",
      description: "Dừng/tiếp tục, đổi display không xóa dữ liệu, đổi vật lý tạo lượt mới.",
    },
    "ct56-7": {
      title: "Theo dõi vệt của một điểm lệch tâm",
      description: "Vệt dự đoán fan-beam và phép đo của đĩa nhỏ là hai đại lượng khác nhau.",
    },
    "ct56-8": {
      title: "Đổi số góc mà không nhầm với độ nét ảnh",
      description: "So 30/60/120 góc, giữ nguyên 128 pixel detector.",
    },
    "ct56-9": {
      title: "Kiểm máy CT đồ chơi và chạy bản hoàn chỉnh",
      description: "Audit độc lập theo khoảng cách từ tâm đến đường tia.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
