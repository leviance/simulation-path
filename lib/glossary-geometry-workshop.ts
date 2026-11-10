import type { GlossaryTerm } from "./glossary";

export const geometryWorkshopGlossaryTerms: GlossaryTerm[] = [
  {
    id: "parametric-surface",
    term: "Bề mặt tham số — Parametric surface",
    definition:
      "Hàm P(u,v) trả về một vị trí 3D. Lấy mẫu cùng một lưới u/v qua những hàm khác nhau sẽ cho mảnh cong, torus hoặc dải Möbius. Tam giác vẫn nối các ô theo quy tắc đã chọn.",
    keywords: "bề mặt tham số parametric surface uv torus tessellation",
  },
  {
    id: "surface-tangents",
    term: "Tangent theo u và v",
    definition:
      "Hai hướng thay đổi của vị trí khi chỉ tăng u hoặc chỉ tăng v. Lấy cross theo chiều winding để tính normal của mặt. Project 41 dùng đạo hàm giải tích cho patch/torus/Möbius và sai phân theo hàng cho phần sweep.",
    keywords: "tangent tiếp tuyến đạo hàm riêng partial derivative normal sai phân",
  },
  {
    id: "surface-seam",
    term: "Đường nối của bề mặt — Seam",
    definition:
      "Nơi hai mép của miền tham số gặp nhau trong không gian 3D. Torus có thể cần hai bản ghi trùng vị trí để giữ UV 0 và 1. Hai mép trông kín không có nghĩa các tam giác chia sẻ cùng index.",
    keywords: "seam đường nối uv wrap duplicate vertex hàn đỉnh",
  },
  {
    id: "mobius-reversed-seam",
    term: "Mép đảo của dải Möbius",
    definition:
      "Đi hết một vòng theo u, v đổi dấu: điểm ở mép này gặp điểm phía đối diện ở đầu kia. Đổi dấu tangent theo v cũng đổi dấu normal. Dải cần quy tắc tô sáng hai mặt, không có một hướng normal toàn cục liên tục.",
    keywords: "Möbius Mobius dải mép đảo nonorientable hai mặt",
  },
  {
    id: "sweep-frame",
    term: "Sweep frame — Khung tiết diện",
    definition:
      "Tâm, tangent đường cong và hai trục ngang xác định một tiết diện. Khi mang khung đi dọc đường, mỗi vị trí của elip tạo một đỉnh trên mặt ống. Normal của frame là một trục của elip, không phải normal chiếu sáng ở mọi đỉnh.",
    keywords: "sweep frame khung tiết diện vỏ ốc torus knot binormal",
  },
  {
    id: "parallel-transport-frame",
    term: "Mang frame dọc đường cong — Parallel transport",
    definition:
      "Ở mỗi hàng, quay frame cũ bằng góc nhỏ nhất để tangent cũ khớp tangent mới rồi chiếu trục ngang lại vào tiết diện. Cách này tránh việc chọn lại world up ở từng hàng và lật bất ngờ khi qua ngưỡng.",
    keywords: "parallel transport frame Rodrigues tangent world up",
  },
  {
    id: "sweep-seam-correction",
    term: "Bù góc để khép frame",
    definition:
      "Quanh đường dẫn kín, tâm và tangent có thể trở về đúng chỗ trong khi tiết diện còn lệch một góc. Đo góc có dấu quanh tangent và phân bổ theo độ dài đã đi. Không dồn cả góc lệch vào vòng cuối.",
    keywords: "holonomy correction frame seam arc length nút thắt",
  },
  {
    id: "mesh-last-good",
    term: "Preview và last-good",
    definition:
      "Preview dùng ít ô để nhìn được thay đổi khi kéo. Last-good là bản đầy đủ đã qua kiểm và upload. Khi yêu cầu mới bị hủy hoặc lỗi, nhãn đang vẽ và hình đều quay về đúng last-good.",
    keywords: "preview last-good dirty mesh batch regeneration giữ bản tốt",
  },
  {
    id: "obj-round-trip",
    term: "Đọc lại file OBJ — Round-trip",
    definition:
      "Ghi file rồi dùng bộ đọc kiểm lại thuộc tính và thứ tự tam giác. Project 41 kiểm đúng tập con v/vt/vn và mặt tam giác chỉ số dương do xưởng xuất, không tuyên bố đọc mọi biến thể OBJ.",
    keywords: "OBJ export round-trip reimport đọc lại mesh validation",
  },
];
