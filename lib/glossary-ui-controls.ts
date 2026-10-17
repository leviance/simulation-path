export const uiControlGlossaryTerms = [
  {
    id: "ui-hot-active-focus",
    term: "Hot, active và keyboard focus",
    definition:
      "Hot là control ngay dưới con trỏ; active giữ quyền xử lý gesture từ lúc nhấn đến khi thả hoặc hủy; focus nhận bàn phím. Kéo từ Pause qua Reset có thể làm hot=Reset trong khi active và focus vẫn là Pause. Hover không được tự giành focus. Một button chỉ kích hoạt khi press/release cùng control, không phải mỗi frame còn giữ chuột.",
  },
  {
    id: "ui-input-consumption",
    term: "Input consumption của UI",
    definition:
      "UI nhận sự kiện trước cảnh và trả về đã dùng hay chưa. Panel có thể dùng cả click trên vùng trống để ngăn thao tác đi xuyên xuống simulator. Cảnh chỉ xử lý khi chưa bị UI dùng, đồng thời kiểm vùng cảnh của chính nó. Capture giữ sự kiện cho gesture đang có owner, không có nghĩa mọi sự kiện đều được gửi cho mọi control.",
  },
  {
    id: "ui-logical-space",
    term: "Logical space và letterbox trong UI",
    definition:
      "Thiết kế UI trên một mặt phẳng cố định, rồi scale đồng nhất vào viewport và chừa dải letterbox. Hit-test phải dùng tọa độ đã trừ offset và chia scale; điểm ở letterbox giữ ngoài miền, không clamp vào control. SDL_ConvertEventToRenderCoordinates đổi event theo logical presentation; không tự đổi thêm lần nữa. Canvas dùng tọa độ CSS, DPR chỉ áp dụng cho bitmap.",
  },
  {
    id: "ui-slider-mapping",
    term: "Slider mapping",
    definition:
      "Đổi vị trí chuột thành t=(x-left)/width rồi ánh xạ vào miền giá trị và clamp. Khi slider đã active, kéo ngoài vùng hit vẫn cập nhật giá trị ở hai đầu. Đổi tham số khác Reset mô phỏng; cancel kết thúc gesture chứ không tự hoàn tác các giá trị đã áp dụng.",
  },
];
