export const voxelStreamingGlossaryTerms = [
  {
    id: "chunk-streaming",
    term: "Chunk streaming",
    definition:
      "Chỉ giữ và cập nhật một vùng chunk quanh nhân vật thay vì nạp toàn world. Project 62 tạo dữ liệu CPU đồng bộ theo Key và gỡ Entry khỏi RAM qua queue hữu hạn; chưa đọc disk/network, chạy thread hoặc lưu edit.",
  },
  {
    id: "chunk-retention",
    term: "Wanted và retention ring",
    definition:
      "Wanted là các chunk cần có quanh center, khoảng cách Chebyshev≤r. Retention giữ lại các chunk đã resident tới r+1 để tránh tải/gỡ liên tục khi đảo chiều sát biên. Không tự tải toàn vòng keep. Chunk ngoài keep được xếp hàng gỡ, có thể còn resident tạm thời.",
  },
  {
    id: "chunk-signed-address",
    term: "World, chunk và local address",
    definition:
      "Với cạnh 16, chunk=floor(world/16), local=world−16*chunk. Ví dụ −0.5 thuộc chunk −1, local 15.5; voxel index=floor(local). Chia int C++ về zero không thay được floor ở miền âm. Key chunk và local vertex không phải cùng loại tọa độ.",
  },
  {
    id: "chunk-job-budget",
    term: "Streaming job budget",
    definition:
      "Số load/unload tối đa trong một tick. Project 62 giới hạn 1–2 job; mỗi job ảnh hưởng tối đa chunk đó cùng bốn neighbor ngang, gộp dirty Key rồi dựng mesh xong trước frame. Giới hạn số công việc không bảo đảm thời gian ms; lastBudget ghi lại setting của batch đã chạy.",
  },
];
