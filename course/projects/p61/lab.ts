import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "GREEDY MESHING",
    title: "Từ hàng nghìn mặt nhỏ đến những quad lớn",
    description:
      "So sánh hai mesh, đọc mask từng hướng và xem thuật toán chọn rectangle mà vẫn giữ đúng bề mặt.",
  },
  modes: {
    "greedy61-1": {
      title: "Đếm số mặt trước khi gộp",
      description: "Chạy khối đất đã loại mặt tiếp giáp, phân biệt mặt đơn vị, quad và triangle.",
    },
    "greedy61-2": {
      title: "Trải một hướng mặt thành bảng 2D",
      description: "Chọn hướng, mặt phẳng và đọc source/neighbor để tạo mask 16×16.",
    },
    "greedy61-3": {
      title: "Khi nào hai mặt được gộp?",
      description: "Tách quy tắc che mặt opaque khỏi khóa gộp mặt có vật liệu.",
    },
    "greedy61-4": {
      title: "Mở rộng hình chữ nhật rồi xóa phần đã dùng",
      description: "Duyệt v/u, mở rộng width trước height và không bắc cầu qua lỗ.",
    },
    "greedy61-5": {
      title: "Đưa rectangle trở lại không gian 3D",
      description: "Dựng bốn đỉnh, hai triangle và thử gộp riêng hướng +Y trước.",
    },
    "greedy61-6": {
      title: "Quét đủ sáu hướng, kiểm biên và lớp cắt",
      description: "Áp dụng cùng một quy tắc cho sáu hướng và 17 mặt phẳng mỗi hướng.",
    },
    "greedy61-7": {
      title: "Xem từng rectangle mà thuật toán đã chọn",
      description:
        "Lưu danh sách kết quả, chạy/dừng từng bước và không chạy lại mesher theo timer.",
    },
    "greedy61-8": {
      title: "Chỉ dựng lại mesh khi dữ liệu thay đổi",
      description: "Tách mesh/frame dirty; đọc số công việc mà không suy ra FPS từ số triangle.",
    },
    "greedy61-9": {
      title: "Kiểm chứng bề mặt và hoàn thiện chương trình",
      description:
        "Đối chiếu các mặt đơn vị có hướng/vật liệu, kiểm winding, raster và source cuối.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
