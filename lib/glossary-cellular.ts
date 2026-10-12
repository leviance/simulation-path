export const cellularGlossaryTerms = [
  {
    id: "cellular-automaton",
    term: "Cellular automaton",
    definition:
      "Mô hình gồm các ô trên lưới, mỗi ô có trạng thái và thay đổi theo luật dựa trên lân cận. Project 46 dùng một biến thể cập nhật tại chỗ theo thứ tự; khác với CA đồng bộ, nơi mọi ô cùng đọc trạng thái của bước trước.",
  },
  {
    id: "in-place-cell-update",
    term: "In-place cell update",
    definition:
      "Cập nhật trực tiếp mảng đang đọc. Ô được xét sau nhìn thấy thay đổi của ô trước, vì vậy thứ tự duyệt ảnh hưởng kết quả. Đảo chiều quét theo tick giúp giảm một số thiên lệch, không bảo đảm đối xứng hoặc độc lập thứ tự.",
  },
  {
    id: "moved-mask",
    term: "Moved mask",
    definition:
      "Mảng đánh dấu các ô đã tham gia một lần di chuyển trong tick hiện tại. Hộp cát đánh dấu cả hai đầu của phép swap và xóa toàn bộ dấu ở đầu tick kế tiếp, để nước đi ngang hoặc bị đẩy lên không được di chuyển nhiều lần.",
  },
  {
    id: "cell-material-conservation",
    term: "Bảo toàn số ô vật liệu",
    definition:
      "Khi chỉ chạy luật đổi chỗ, số ô của từng vật liệu phải giữ nguyên. Vẽ, tẩy và reset cố ý thay số lượng nên không nằm trong phép kiểm này. Tổng số ô lưới luôn cố định; chỉ kiểm tổng chưa phát hiện được việc cát bị đổi thành nước.",
  },
] as const;
