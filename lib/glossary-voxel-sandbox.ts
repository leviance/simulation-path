export const voxelSandboxGlossaryTerms = [
  {
    id: "voxel-session-delta",
    term: "Base terrain và session delta",
    definition:
      "Terrain procedural là dữ liệu nền; delta lưu các cell world đã làm khác nền, gồm cả Air tombstone khi phá block. Entry resident/mesh là cache có thể gỡ và tạo lại. Khôi phục đúng base thì xóa delta. Project 64 giới hạn 512 delta và chưa tự giữ qua đóng chương trình; cần xuất bản lưu.",
  },
  {
    id: "voxel-unknown-picking",
    term: "Unknown trong world picking",
    definition:
      "Chunk chưa resident không cung cấp Block ID nên picker dừng thay vì coi là Air rồi chọn xuyên tới phía sau. Mesher vẫn coi neighbor chưa tải là Air để đóng frontier. Hai quy tắc phục vụ hai mục đích: tạo mặt ngoài nhìn thấy được và bảo vệ thao tác sửa trên dữ liệu chưa biết.",
  },
  {
    id: "voxel-snapshot",
    term: "VXL1 snapshot",
    definition:
      "Bản lưu text có version, seed/scale/octaves và delta canonical theo x/y/z, không chứa mesh/cache/history. Project 64 kiểm ASCII 32768 byte, 512 record, số nguyên, miền, duplicate và redundant trước khi thay phiên. Output C++/Canvas có cùng fixture byte; người dùng tự giữ text ra file, không có autosave ngầm.",
  },
];
