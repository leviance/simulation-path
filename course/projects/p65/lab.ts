import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "SIMULATOR CONTROLS LAB",
    title: "Tự xây bảng điều khiển cho mô phỏng",
    description:
      "Thử Pause/Reset, kéo slider rồi quan sát hot/active/focus và kiểm click có lọt xuống cảnh hay không.",
  },
  modes: {
    "controls65-1": {
      title: "Chạy cảnh mô phỏng trước khi thêm UI",
      description: "Mở cửa sổ SDL3, vẽ bóng và sàn, rồi theo dõi vị trí qua từng bước 1/120 giây.",
    },
    "controls65-2": {
      title: "Vẽ panel và tìm control dưới con trỏ",
      description:
        "Dùng cùng một Rect để vẽ và hit-test; chừa vùng cảnh riêng, đọc tọa độ và tô trạng thái hover.",
    },
    "controls65-3": {
      title: "Làm nút Pause và Reset hoạt động đúng",
      description:
        "Phân biệt nhấn với click hoàn tất, giữ active khi kéo ra ngoài và nối action với đồng hồ mô phỏng.",
    },
    "controls65-4": {
      title: "Kéo slider để thay đổi trọng lực",
      description:
        "Đổi vị trí chuột thành giá trị, clamp hai đầu và điều chỉnh gravity ngay cả khi đang Pause.",
    },
    "controls65-5": {
      title: "Điều khiển toàn bộ panel bằng bàn phím",
      description:
        "Thêm focus, Tab/Shift+Tab, kích hoạt nút không repeat và chỉnh slider bằng arrow/Home/End.",
    },
    "controls65-6": {
      title: "Giữ input đúng khi resize và mất focus",
      description:
        "Đưa sự kiện về hệ tọa độ logic, cho UI nhận trước cảnh và hủy thao tác khi vòng đời cửa sổ thay đổi.",
    },
    "controls65-7": {
      title: "Kiểm chứng bảng điều khiển và chạy bản hoàn chỉnh",
      description:
        "Kiểm chuỗi thao tác thay vì chỉ nhìn ảnh, đối chiếu vật lý bằng công thức và nghiệm thu Debug/Release có timeout.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
