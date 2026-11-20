import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    title: "Một bảng điều khiển, hai cách nhìn",
    label: "CÂY WIDGET CỦA ĐÀN CHIM",
    description:
      "Di chuyển, ẩn hoặc xóa cả nhóm điều khiển đàn Boids. Tự viết cây widget sống qua nhiều frame, dùng cùng hình học cho việc vẽ, clipping và chọn nút.",
  },
  modes: {
    "tree66-1": {
      title: "Cho mỗi control một địa chỉ không đổi",
      description: "Chia việc sở hữu: cây giữ widget, đàn chim giữ trạng thái mô phỏng.",
    },
    "tree66-2": {
      title: "Di chuyển cả nhóm bằng tọa độ của Panel cha",
      description: "Từ tọa độ local của child tới khung world dùng để vẽ.",
    },
    "tree66-3": {
      title: "Phần nút bị cắt vẫn tồn tại trong cây",
      description:
        "Clipping là giao của các khung tổ tiên, không phải sửa kích thước gốc của child.",
    },
    "tree66-4": {
      title: "Hai nút chồng nhau: nút nào nhận chuột?",
      description: "Đọc cây theo thứ tự ngược với thứ tự vẽ; label không chặn input.",
    },
    "tree66-5": {
      title: "Kéo một slider trong cây để thay đổi đàn chim",
      description: "Đưa tọa độ về bounds đầy đủ và phát lệnh lên đúng model của Project 65.",
    },
    "tree66-6": {
      title: "Tab đi qua những control đang dùng được",
      description:
        "Dựng thứ tự focus từ cây đã clip thay vì duy trì thêm một danh sách ID bằng tay.",
    },
    "tree66-7": {
      title: "Xóa một nhóm ngay khi tay còn giữ slider",
      description: "Phân biệt ẩn, disable và hủy node; không để sót ID đang giữ chuột.",
    },
    "tree66-8": {
      title: "Kiểm cây vẫn còn nguyên sau một nghìn frame",
      description: "Chứng minh ID, quyền sở hữu và geometry độc lập với chuyển động của đàn.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      root: {
        title: "Root và nút Pause",
        source: "Project 66 · Bài 01",
        poster: "p66-root.png",
        alt: "Panel gốc của bàn quan sát và thông tin ID của nút Pause.",
        caption:
          "So ID của widget với ID của con chim: chúng thuộc hai đối tượng có vòng đời khác nhau.",
      },
      nested: {
        title: "Panel chứa nhóm control",
        source: "Project 66 · Bài 02",
        poster: "p66-nested.png",
        alt: "Hai nút nằm trong khung Panel con của bảng điều khiển đàn.",
        caption: "Dùng Shift+mũi tên trong C++ để dịch cả nhóm; xem hai tọa độ local và world.",
      },
      clip: {
        title: "Reset bị cắt ở đáy",
        source: "Project 66 · Bài 03",
        poster: "p66-clip.png",
        alt: "Panel con thấp, chỉ còn thấy một phần nút Reset.",
        caption:
          "Phần còn nhìn thấy của Reset bị giới hạn bởi Panel cha chứ không phải bởi chiều cao của nút.",
      },
      order: {
        title: "Reset nằm trên Pause",
        source: "Project 66 · Bài 04",
        poster: "p66-order.png",
        alt: "Nút Reset on top chiếm vùng trước đây vẽ Pause trong nhóm.",
        caption:
          "Rê chuột vào vùng chồng trong bản C++. Kết quả hit-test phải là ID của nút nhìn thấy ở trên.",
      },
      desk: {
        title: "Bảng điều khiển hoàn chỉnh",
        source: "Project 66 · Bản hoàn chỉnh",
        poster: "p66-desk.png",
        alt: "Đàn chim ở bên trái và cây giao diện với hai slider ở bên phải.",
        caption:
          "Dùng bảng như một ứng dụng bình thường. Khi đang Pause, tăng Radius để đếm lại hàng xóm; dùng F2 khi cần xem cấu trúc.",
      },
      inspect: {
        title: "Bật inspector",
        source: "Project 66 · Bản hoàn chỉnh",
        poster: "p66-inspect.png",
        alt: "Inspector hiển thị ID, bounds local, bounds world và clip trên khung bay.",
        caption:
          "Ba dòng local, world và clip trả lời ba câu hỏi khác nhau. Viền vàng định vị vùng còn nhìn thấy của node.",
      },
    },
    overview: ["desk", "inspect", "clip", "order"],
    lessons: {
      "tree66-1": ["root"],
      "tree66-2": ["nested"],
      "tree66-3": ["clip", "nested"],
      "tree66-4": ["order", "nested"],
      "tree66-5": ["desk"],
      "tree66-6": ["inspect"],
      "tree66-7": ["desk", "inspect"],
      "tree66-8": ["desk", "inspect", "clip", "order"],
    },
  },
} satisfies ProjectLabMeta;
export default data;
