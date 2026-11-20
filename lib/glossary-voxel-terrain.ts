export const voxelTerrainGlossaryTerms = [
  {
    id: "world-heightfield",
    term: "Độ cao theo tọa độ thế giới",
    definition:
      "Dùng cùng hàm cho mọi chunk. Trong Project 63, ground là chỉ số của ô đất trên cùng; mặt trên của ô đó ở ground + 1. Dùng local x/z làm đầu vào sẽ khiến mỗi chunk lặp lại từ đầu.",
  },
  {
    id: "terrain-value-noise",
    term: "Value noise và seed",
    definition:
      "Lấy bốn giá trị ổn định từ seed ở bốn góc của ô lưới rồi nội suy ở giữa. Mẫu kích thước lớn tạo dáng đồi, mẫu nhỏ thay đổi chi tiết; không chọn số ngẫu nhiên mới theo thứ tự tải chunk.",
  },
  {
    id: "terrain-generation",
    term: "Neo cây vượt biên",
    definition:
      "Mỗi vùng nhỏ quyết định các gốc cây của nó bằng seed. Khi sinh một cột, xét cả các gốc lân cận có tán vươn vào. Như vậy hai nửa của một tán vẫn khớp dù cột phía đông được nạp trước phía tây.",
  },
  {
    id: "voxel-river-tracer",
    term: "Vệt trôi theo dòng",
    definition:
      "Lấy khoảng ngang từ điểm đến tim sông và khoảng dọc theo dòng để trải hoa văn. Dịch tọa độ dọc theo thời gian khiến vệt nước đi qua một mốc bờ; block nước không cần đổi địa chỉ.",
  },
  {
    id: "voxel-ocean-wave",
    term: "Đỉnh và pháp tuyến của sóng biển",
    definition:
      "Tổng một vài sóng có hướng cho độ cao của đỉnh lưới nước. Đạo hàm độ cao theo hai phương cho normal. Nhờ vậy vùng sáng chạy trên đúng sườn sóng đang nhô lên, thay vì chạy trên một mặt phẳng đứng yên.",
  },
];
