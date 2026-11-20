export const voxelGlossaryTerms = [
  {
    id: "voxel-chunk-storage",
    term: "Voxel chunk và section",
    definition:
      "Section là một khối 16×16×16 ô. Trong Project 58 một chunk mới có một section; tới Project 63 một cột chunk ghép bốn section theo chiều cao. Địa chỉ x + 16 × (z + 16 × y) đặt hai ô kế nhau trên trục x cạnh nhau trong bộ nhớ.",
  },
  {
    id: "voxel-block-id",
    term: "Block ID",
    definition:
      "Một ô lưu mã vật liệu, không lưu sẵn màu màn hình. Air bằng 0; Grass, Soil, Stone, Sand, Wood, Leaves và Water có họa tiết riêng. Tới vùng núi ta dùng thêm Snow và Needles. Air vẫn có địa chỉ nhưng không sinh mặt.",
  },
  {
    id: "voxel-naive-mesh",
    term: "Mesh voxel chưa tối ưu",
    definition:
      "Dựng đủ sáu quad cho mỗi block không phải Air, hai tam giác cho mỗi quad. Hai viên đá chạm nhau vẫn tạo 24 tam giác. Z-buffer chỉ quyết định pixel nào ở trước, không bớt được hai mặt bên trong.",
  },
  {
    id: "voxel-slice-inspector",
    term: "Bảng đọc lớp voxel",
    definition:
      "Chọn một y cố định rồi đọc các ô theo x/z. Đổi lớp trên bảng không cắt mặt của phong cảnh, không đào và cũng không dựng lại mesh. Hai hình nhìn khác nhau nhưng cùng đọc một mảng block.",
  },
];
