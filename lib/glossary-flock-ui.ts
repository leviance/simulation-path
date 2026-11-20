export const flockUiGlossaryTerms = [
  {
    id: "tiny-token",
    term: "Token và vị trí trong file",
    definition:
      "Trong radius(80), bộ tách từ đọc lần lượt tên radius, dấu mở ngoặc, số 80 và dấu đóng ngoặc. Mỗi token giữ dòng và cột để khi thiếu dấu, ứng dụng có thể chỉ đúng chỗ người học cần sửa.",
  },
  {
    id: "tiny-ast",
    term: "Cây cú pháp (AST)",
    definition:
      "Cây mô tả ý nghĩa của mã nguồn sau khi tách token. Trong 2 + 3 * 4, phép cộng ở gốc; nhánh phải là phép nhân. Đọc cây theo cấu trúc này cho 14 mà không cần xem lại khoảng trắng trong file.",
  },
  {
    id: "ui-safe-reload",
    term: "Nạp lại mà không làm mất phiên đang chạy",
    definition:
      "Dựng và kiểm tra bản mới ở một nơi riêng. Chỉ thay bảng, style hay script sau khi toàn bộ bản mới hợp lệ. Một dấu đóng thẻ viết nhầm sẽ hiện thông báo lỗi, còn bảng cũ vẫn điều khiển được đàn.",
  },
  {
    id: "ui-cascade",
    term: "Cascade và độ ưu tiên của selector",
    definition:
      "Nếu hai rule cùng đặt chiều cao nút Pause, bộ chọn theo ID thắng class, class thắng tên thẻ. Nếu độ ưu tiên bằng nhau, khai báo sau thắng. So riêng từng thuộc tính: rule thắng về chiều cao không đương nhiên thắng về màu.",
  },
  {
    id: "ui-layout-invalidation",
    term: "Khi nào cần tính lại bố cục?",
    definition:
      "Đổi màu nút chỉ cần vẽ lại. Đổi chiều cao có thể đẩy cả thanh kéo bên dưới: phải tính lại bounds trước khi vẽ và bắt chuột. Bộ đếm số lần bố trí giúp phát hiện tính lại thừa khi đàn đang bay.",
  },
  {
    id: "tiny-flex-axis",
    term: "Trục chính và trục ngang trong TinyFlex",
    definition:
      "Ở hàng nút, trục chính chạy từ trái sang phải; đổi sang cột thì nó chạy từ trên xuống. Justify căn cả nhóm dọc trục chính; align đặt từng phần tử theo trục còn lại.",
  },
  {
    id: "tiny-flex-grow",
    term: "Flex basis và grow",
    definition:
      "Basis là chỗ một control xin ban đầu. Sau khi trừ phần cố định và gap, chia chỗ dư theo trọng số grow. Nếu còn 60 px, hai nút có grow 1 và 2 nhận thêm 20 và 40 px, không phải có chiều rộng cuối cùng 20 và 40 px.",
  },
  {
    id: "widget-bubble",
    term: "Target, currentTarget và bubbling",
    definition:
      "Bấm Pause: target luôn là Pause, còn currentTarget lần lượt là nút, nhóm Tools và bảng. Nhóm có thể ghi nhận một click đã xử lý. Chỉ stop mới chặn đường truyền; không gửi lệnh Pause thêm lần nữa ở widget cha.",
  },
  {
    id: "widget-gesture-owner",
    term: "Quyền giữ một cử chỉ kéo",
    definition:
      "Khi thanh Radius nhận lần nhấn đầu tiên, nó giữ các mẫu của chính con trỏ ấy tới lúc thả hoặc hủy. Rê sang khung đàn không được chọn chim. Một lần thả không có lần nhấn tương ứng cũng không sinh lệnh.",
  },
  {
    id: "tiny-lexical-scope",
    term: "Phạm vi của biến trong TinyScript",
    definition:
      "Tên biến được tìm theo nơi khai báo. Một hàm đọc tham số, biến trong các khối của nó và biến toàn cục; không thể nhìn trộm biến cục bộ của hàm vừa gọi nó.",
  },
  {
    id: "tiny-host",
    term: "Cầu nối từ script tới C++ (host)",
    definition:
      "Script không giữ con trỏ vào đàn. Nó nhận một con số từ slider rồi gọi một trong vài lệnh cho phép, chẳng hạn radius(50). C++ kiểm kiểu và khoảng giá trị trước khi đổi bán kính thật.",
  },
  {
    id: "tiny-budget",
    term: "Ngân sách thực thi của handler",
    definition:
      "Mỗi lần bấm có số bước hữu hạn để cửa sổ còn nhận được lượt input tiếp theo. Vượt ngân sách hoặc gọi lồng quá sâu đều báo lỗi. Các biến và lệnh của handler chỉ có hiệu lực khi nó chạy xong thành công.",
  },
];
