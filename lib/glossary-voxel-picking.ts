export const voxelPickingGlossaryTerms = [
  {
    id: "voxel-camera-ray",
    term: "Tia từ mắt qua một pixel",
    definition:
      "Trong phép chiếu phối cảnh, các tia xuất phát từ cùng một mắt và có hướng khác nhau. Tia qua tâm ảnh trùng hướng nhìn; ở mép ảnh phải cộng thêm thành phần ngang và dọc theo tiêu cự.",
  },
  {
    id: "voxel-dda-traversal",
    term: "3D DDA: đi qua các ô theo tia",
    definition:
      "Trên mỗi trục, giữ khoảng cách đến vách kế và khoảng cách giữa hai vách liên tiếp. Đi tới vách gần nhất; nếu tia cắt đúng cạnh hoặc góc thì đổi ô trên các trục cùng lúc. Trục song song tia không có lần cắt kế.",
  },
  {
    id: "voxel-entry-normal",
    term: "Normal của mặt vừa đi vào",
    definition:
      "Đây là hướng đơn vị ra khỏi mặt mà tia vừa xuyên qua. Khi tia qua đúng cạnh, chọn một trục theo thứ tự X, Y, Z để bảng đọc ổn định. Mắt nằm hẳn trong vật liệu cho khoảng cách 0 và không có mặt đi vào.",
  },
  {
    id: "voxel-read-only-probe",
    term: "Ống ngắm chỉ đọc",
    definition:
      "Tọa độ ô, vật liệu, khoảng cách và normal được ghi trong một kết quả đo riêng. Giữ phép đo rồi đi vòng quanh không làm ô đổi loại hay mesh bị dựng lại.",
  },
];
