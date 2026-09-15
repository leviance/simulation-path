import type { GlossaryTerm } from "./glossary";

// OBJ/mesh terms live in a separate shard so later asset-pipeline projects can extend it safely.
export const meshGlossaryTerms: GlossaryTerm[] = [
  {
    id: "wavefront-obj",
    term: "Wavefront OBJ",
    definition:
      "Định dạng text mô tả geometry 3D bằng các record như v, vt, vn và f. Project 21 tự đọc position và face, còn material cùng smoothing group được để dành cho project sau.",
  },
  {
    id: "input-stream",
    term: "Input stream",
    definition:
      "Luồng dữ liệu được đọc tuần tự. OBJ parser dùng std::istream và getline để vừa đọc được file thật, vừa nhận std::istringstream trong CTest mà không cần tạo file tạm.",
  },
  {
    id: "point-cloud",
    term: "Point cloud",
    definition:
      "Tập các điểm trong không gian chưa có cạnh hoặc mặt nối giữa chúng. Checkpoint đầu Project 21 vẽ position record của OBJ dưới dạng point cloud để xác nhận file đã được đọc đúng.",
  },
  {
    id: "obj-face-index",
    term: "OBJ face index",
    definition:
      "Chỉ số position trong record f. Index dương của OBJ bắt đầu từ 1; index âm tính lùi từ position mới nhất; giá trị 0 không hợp lệ.",
  },
  {
    id: "obj-face-token",
    term: "OBJ face token",
    definition:
      "Một corner trong record f, có thể mang dạng v, v/vt, v//vn hoặc v/vt/vn. Mỗi phần là một index thuộc mảng position, UV hoặc normal riêng.",
  },
  {
    id: "polygon",
    term: "Polygon",
    definition:
      "Mặt phẳng có từ ba corner trở lên. CPU rasterizer của khóa học chỉ nhận triangle, nên OBJ polygon phải được triangulate trước khi project và rasterize.",
  },
  {
    id: "mesh-normalization",
    term: "Mesh normalization",
    definition:
      "Phép đưa mesh về tâm và một kích thước chuẩn trước khi render. Project 21 trừ tâm AABB rồi dùng cùng một scale cho cả ba trục để không làm méo model.",
  },
  {
    id: "uniform-scale",
    term: "Uniform scale",
    definition:
      "Phép scale dùng cùng một hệ số cho X, Y và Z. Chiều dài thay đổi nhưng góc và tỷ lệ hình học của model được giữ nguyên.",
  },
  {
    id: "diagnostic",
    term: "Diagnostic",
    definition:
      "Thông tin giúp tìm và sửa input lỗi, thường gồm file, line và nguyên nhân. Parser Project 21 lưu diagnostic thay vì crash hoặc âm thầm sinh triangle sai.",
  },
];
