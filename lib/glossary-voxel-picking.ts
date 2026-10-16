export const voxelPickingGlossaryTerms = [
  {
    id: "voxel-camera-ray",
    term: "Ray từ camera trực giao",
    definition:
      "Mỗi pixel tạo một origin khác nhau trên mặt phẳng camera, nhưng cùng direction normalized. Project 60 đảo basis yaw/pitch của renderer, phát ở depth=32 và đi vào scene. t là khoảng cách từ origin plane, không phải khoảng cách từ mắt FPS. Pixel CPU, SDL logical và CSS/DPR phải được đổi đúng trước khi tạo ray.",
  },
  {
    id: "voxel-dda-traversal",
    term: "3D DDA voxel traversal",
    definition:
      "Đi qua ô theo thứ tự front-to-back bằng step, tMax tới mặt phẳng lưới kế và tDelta giữa hai lần cắt cùng trục. Không dò theo một bước dt cố định. Project 60 clip trước vào chunk, bỏ contact-only trong tolerance 1e-9 theo t, đi cùng các trục tie và giới hạn 64 vòng.",
  },
  {
    id: "voxel-entry-normal",
    term: "Entry normal của voxel hit",
    definition:
      "Normal đơn trục hướng ra block ở mặt ray vừa đi vào. Đặt block tại hit.cell+normal, không phải hit.cell−normal hoặc luôn dùng ô Air cuối. Tie ưu tiên X/Y/Z. Origin hẳn trong block không có entry face; origin trên mặt voxel có thể cho t=0 và normal khác zero, kể cả mặt bên trong chunk.",
  },
  {
    id: "voxel-edit-transaction",
    term: "Action sửa voxel",
    definition:
      "Một thao tác phá/đặt truy vấn ray lại trên state hiện tại, kiểm điều kiện rồi chỉ đổi một Block ID. Miss, ô đặt ngoài chunk, thiếu normal hoặc target không Air đều không ghi. Edit thành công làm mesh/frame/pick dirty; preview và aim chỉ đọc, không được dùng Hit cũ để sửa một block khác.",
  },
];
