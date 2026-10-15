export const voxelGlossaryTerms = [
  {
    id: "voxel-chunk-storage",
    term: "Voxel chunk",
    definition:
      "Một nhóm block có kích thước hữu hạn. Project 58 dùng 16×16×16 Block ID, tọa độ local 0..15, y hướng lên. Layout x+16*(z+16*y) đặt x liền nhau, sau đó đến z rồi y. Chunk là dữ liệu gốc, không phải danh sách tam giác hoặc framebuffer.",
  },
  {
    id: "voxel-block-id",
    term: "Block ID",
    definition:
      "Mã vật liệu của một ô voxel: Air=0, Grass=1, Dirt=2, Stone=3 trong Project 58. ID không phải màu RGB, chỉ số vertex hoặc độ cao. Air chiếm chỗ trong mảng dữ liệu nhưng không sinh mặt khi dựng mesh.",
  },
  {
    id: "voxel-naive-mesh",
    term: "Mesh voxel chưa tối ưu",
    definition:
      "Dựng đủ sáu quad cho mỗi block đặc, mỗi quad hai tam giác. N block tạo 12N tam giác, kể cả mặt chung giữa hai block. Z-buffer quyết định pixel nào được thấy chứ không giảm số tam giác. Loại mặt giáp block đặc là một bước tối ưu riêng ở Project 59.",
  },
  {
    id: "voxel-slice-inspector",
    term: "Bảng lớp cắt voxel",
    definition:
      "Bảng 2D đọc các ô x/z tại một y cố định. Cắt mesh ở y<=slice chỉ đổi hình hiển thị, không xóa block khỏi dữ liệu. Chọn ô trong bảng không phải ray picking từ camera và không phải thao tác phá/đặt block.",
  },
];
