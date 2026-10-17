export const voxelTerrainGlossaryTerms = [
  {
    id: "world-heightfield",
    term: "World-space heightfield",
    definition:
      "Một hàm H(x,z) chung cho cả world quyết định số block của mỗi cột, lấp y=0..H−1. Chunk chỉ chia storage, không reset tọa độ/seed. Cùng world point qua hai chunk halo phải như nhau; hai cột khác vị trí sát biên không cần cao bằng nhau. Không biểu diễn hang hoặc overhang.",
  },
  {
    id: "terrain-value-noise",
    term: "Value noise và octave",
    definition:
      "Value noise nội suy giá trị vô hướng tại bốn nút lattice; Project 63 dùng smoothstep t²(3−2t), không gradient Perlin noise. Tổng kiểu fBm hữu hạn ghép 1–4 octave, tần số nhân 2, biên độ nhân 0.5 và chia tổng trọng số. Tín hiệu trơn trước floor, height voxel vẫn bậc thang.",
  },
  {
    id: "terrain-generation",
    term: "Terrain generation snapshot",
    definition:
      "Seed, scale và octave là cấu hình của một thế hệ dữ liệu. Đổi cấu hình phải vô hiệu cả blocks, mesh và job cũ. Project 63 bỏ cache, bootstrap một chunk dưới player rồi streaming lại theo budget; không giữ edit hay crossfade hai world.",
  },
];
