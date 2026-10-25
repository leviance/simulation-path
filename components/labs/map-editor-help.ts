export function mapEditorHelp(stage: number): string {
  if (stage === 1) {
    return "Bài này chỉ sinh và vẽ bản đồ. Hãy thử đổi quy mô, seed và phân bố để nhận ra nhà, cây và công viên. Pan và zoom sẽ được thêm từ bài 02.";
  }
  const instructions = [
    "Chọn công cụ Pan để kéo bản đồ; wheel zoom quanh con trỏ. Trên Canvas, mũi tên pan, Home về camera ban đầu và Escape hủy thao tác.",
  ];
  if (stage >= 3) {
    instructions.push(
      "Công cụ Chọn: click chọn lớp trên cùng (ID lớn nhất), kéo vùng để chọn các AABB giao nhau. Shift-click bật/tắt một đối tượng; Shift-kéo thêm vào nhóm đã chọn.",
    );
  }
  if (stage >= 7) {
    instructions.push(
      "Công cụ Thêm đặt đối tượng ở vị trí thả. Shift+mũi tên dời nhóm 8 world unit; Delete xóa nhóm đã chọn.",
    );
  }
  if (stage >= 8) {
    instructions.push(
      "Chọn công cụ Di chuyển nhóm trước khi kéo các đối tượng đã chọn; thả chuột mới cập nhật dữ liệu.",
    );
  }
  return instructions.join(" ");
}
