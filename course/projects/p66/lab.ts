import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "WIDGET TREE LAB",
    title: "Một cây UI, nhiều frame",
    description:
      "Theo dõi ID, local/world/clip và hot/active/focus; dịch Panel hoặc ẩn/xóa Group để thử quyền sở hữu.",
  },
  modes: {
    "tree66-1": {
      title: "Biến các hình vẽ thành widget có dữ liệu riêng",
      description:
        "Chạy cảnh bóng rơi trước, rồi tạo Panel, Label và Button bằng dữ liệu; parent sở hữu child và cây được dựng ngoài vòng lặp.",
    },
    "tree66-2": {
      title: "Vẽ Panel lồng nhau mà không cộng tọa độ bằng tay",
      description:
        "Đưa hai button vào Panel con; dùng một phép duyệt để tính tọa độ world và vẽ từ parent tới child.",
    },
    "tree66-3": {
      title: "Không cho widget vẽ tràn khỏi Panel cha",
      description:
        "Tính giao của các Rect tổ tiên và áp clip cho từng node; cùng một phép giao sẽ được dùng lại khi hit-test.",
    },
    "tree66-4": {
      title: "Tìm đúng widget đang nằm trên cùng",
      description:
        "Dùng cùng bounds/clip với phép vẽ, nhưng duyệt child theo thứ tự ngược để trả về một WidgetId.",
    },
    "tree66-5": {
      title: "Điều khiển mô phỏng qua ID thay vì qua tên từng nút",
      description:
        "Giữ hot/active/focus bằng ID, nối action với Model và ánh xạ slider bằng tọa độ world của chính node đó.",
    },
    "tree66-6": {
      title: "Cho bàn phím đi qua các control trong cây",
      description:
        "Sinh focus order từ các node đang hiển thị, giữ hover độc lập và chặn key repeat cho action của Button.",
    },
    "tree66-7": {
      title: "Ẩn hoặc xóa một nhánh mà không để lại ID treo",
      description:
        "Phân biệt ownership với visibility, dọn active/focus khi nhánh đổi và không dùng lại ID trong cùng phiên cây.",
    },
    "tree66-8": {
      title: "Kiểm chứng cây UI và chạy toàn bộ dự án",
      description:
        "Kiểm tọa độ, thứ tự vẽ/chọn, clipping, lifetime và giới hạn công việc bằng fixture độc lập ở Debug lẫn Release.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
