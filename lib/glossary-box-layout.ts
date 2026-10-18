export const boxLayoutGlossaryTerms = [
  {
    id: "vertical-box-model",
    term: "Box model trong layout một cột",
    definition:
      "Margin chiếm khoảng bên ngoài border box; border và padding nằm trong border box, phần còn lại là content. Project 67 dùng width/height của leaf theo border box, margin không âm và cộng thẳng, không CSS margin collapsing. Style đầu vào không chứa x/y; local Rect là output của layout.",
  },
  {
    id: "measure-arrange",
    term: "Measure và arrange",
    definition:
      "Measure nhận chiều rộng có sẵn, xác định width trước rồi đo chiều cao Panel từ các child đang hiển thị. Arrange dùng các số đo đó để ghi local Rect từ parent xuống child. Không gọi measure lại ở mỗi arrange, không cộng world ở bước này. Project 67 chỉ có Auto height cho Panel, chưa wrap chữ, percent hoặc Flexbox.",
  },
  {
    id: "vertical-flow-gap",
    term: "Vertical flow, margin và gap",
    definition:
      "Các child visible được xếp theo thứ tự cây. cursorY cộng margin.top, border-box height và margin.bottom; gap của parent chỉ nằm giữa hai child tham gia flow. N child có max(0,N−1) gap. Hidden không chiếm chỗ; disabled vẫn chiếm chỗ. Hai margin liền nhau không collapse trong Project 67.",
  },
  {
    id: "dirty-layout",
    term: "Dirty layout và input trên Rect mới",
    definition:
      "Đánh dấu layout cần tính lại khi constraint, Style hoặc visibility thay đổi. Ensure layout trước input và render; nếu chờ tới draw, sự kiện sau resize có thể hit Rect cũ. Layout đổi hủy gesture/capture cũ và reconcile focus. Gravity, ticks và hover không làm dirty; audit state không thay test transition hoặc desktop QA.",
  },
];
