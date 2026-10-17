export const widgetTreeGlossaryTerms = [
  {
    id: "retained-widget-tree",
    term: "Retained widget tree",
    definition:
      "Cây UI được giữ lại giữa các frame. Parent sở hữu child; render và input đọc cùng dữ liệu thay vì dựng lại các đối tượng mỗi frame. Retained không có nghĩa ảnh được cache hoặc không cần vẽ lại. Project 66 dùng unique_ptr cho ownership C++ và ID cho trạng thái tương tác; Reset vật lý không dựng lại cây.",
  },
  {
    id: "widget-local-world-clip",
    term: "Local bounds, world bounds và ancestor clip",
    definition:
      "Local Rect đo từ góc parent; world Rect cộng các offset tổ tiên. Clip hiệu lực là giao với khung của mọi ancestor, không phải việc sửa local Rect. Một node có thể còn tồn tại trong cây nhưng không được vẽ, hit-test hoặc focus vì bị ẩn hay nằm ngoài clip. Project 66 chỉ có translation, chưa layout tự động hoặc transform affine.",
  },
  {
    id: "widget-paint-pick-order",
    term: "Paint order và reverse hit-test",
    definition:
      "Parent được vẽ trước, children theo thứ tự lưu; child sau cùng nằm trên nếu chồng nhau. Hit-test tìm children theo thứ tự ngược và dừng ở hit đầu, dùng cùng bounds/clip. Label không nhận input; Panel và control disabled vẫn chặn click nhưng control disabled không tạo action. Đây là chính sách của UI tối giản, không phải event bubbling.",
  },
  {
    id: "widget-id-lifetime",
    term: "WidgetId và vòng đời của nhánh UI",
    definition:
      "ID là địa chỉ logic, không bảo đảm node còn tồn tại. Sau ẩn/xóa/disable phải đối chiếu active/focus với cây hiện tại, không giữ raw pointer hoặc iterator qua erase. ID không được dùng lại trong cùng phiên cây. Dựng lại cả cây mở phiên ID mới và phải xóa trạng thái input cùng capture cũ trước khi nhận sự kiện tiếp theo.",
  },
];
