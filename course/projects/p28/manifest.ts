import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 05 — world/screen transform và pointer interaction",
    "Project 24 — deterministic scene, pair count và bounded benchmark",
    "Project 27 — circle query, brute-force oracle và checksum benchmark",
  ],
  summary:
    "Giữ nguyên 100.000 hạt của Project 27 nhưng chia world thành một lưới đều. Mỗi hạt được đưa vào đúng một bucket; truy vấn hình tròn chỉ mở những ô mà hình chữ nhật bao của nó chạm tới rồi mới kiểm khoảng cách. Bạn sẽ đối chiếu mọi kết quả với brute force, đo riêng thời gian dựng lưới và truy vấn, sau đó chọn `cellSize` bằng dữ liệu.",
  challenge: {
    timebox: "540–720 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó 100.000 particles được phân vào Spatial Grid. Khi người dùng kéo một vùng tìm kiếm hình tròn, chương trình chỉ được kiểm tra particles thuộc những cell có khả năng giao với circle, nhưng phải trả đúng cùng tập hàng xóm như brute force.",
    outcome:
      "Một cửa sổ SDL3 hiển thị lưới, mức lấp đầy, các ô có khả năng chứa hit, những hạt đã kiểm và hạt gần nhất. Người dùng có thể đổi `cellSize`, bán kính, `seed`, so benchmark với brute force và chạy bảng khảo sát kích thước ô.",
    requirements: [
      "Dùng world bounds và particle cloud deterministic giống Project 27 để có baseline so sánh công bằng.",
      "Tính `columns = ceil(width / cellSize)` và `rows = ceil(height / cellSize)`; cell cuối được phép nhỏ hơn cellSize.",
      "Ánh xạ world position sang `(column,row)` bằng floor, clamp điểm nằm đúng maximum bound vào cell cuối và dùng index row-major `row * columns + column`.",
      "Rebuild grid bằng cách đưa mỗi particle hợp lệ vào đúng một bucket; báo inserted count, non-empty cells và maximum bucket size.",
      "Từ circle AABB, tính một `GridCellRange` conservative, clamp ở bốn mép world và không thăm một cell hai lần.",
      "Mọi particle trong candidate cells vẫn phải qua `distanceSquared <= radiusSquared`; candidate không đồng nghĩa với hit.",
      "Trả toàn bộ hit indices và nearest hit; khi distance bằng nhau, index nhỏ hơn phải thắng để kết quả ổn định.",
      "Canonicalize hit order chỉ khi validation; không sort bên trong hot query path.",
      "So ít nhất 32 query deterministic với brute-force oracle, gồm query ở góc, trên boundary và trường hợp không có hit.",
      "Benchmark grid và brute force trên cùng particle/query set, cùng repetitions, warm-up riêng và checksum có thể quan sát.",
      "Đo riêng grid rebuild; không cộng rebuild vào query timing khi particles đứng yên.",
      "Chạy study với cellSize 0.025, 0.05, 0.1 và 0.2; ghi cells visited, candidates/query, maximum bucket và time/query.",
      "Kèm starter, tám checkpoint độc lập, final, README và CTest không cần mở SDL window.",
    ],
    constraints: [
      "Không dùng Quadtree, k-d tree, BVH, hashing hoặc thư viện spatial index; Project 29 mới thay fixed grid bằng cấu trúc tự chia.",
      "Không bỏ exact circle test chỉ vì particle đã nằm trong candidate cell.",
      "Không thay particle/query set giữa grid và brute-force benchmark.",
      "Không sort hits trong vùng timing; grid traversal không hứa trả index theo thứ tự tăng dần.",
      "Không rebuild grid mỗi frame khi particles không đổi; rebuild chỉ cần khi data hoặc cellSize đổi.",
      "Không kết luận cellSize tốt nhất chỉ từ FPS renderer hoặc một lần đo duy nhất.",
      "Không báo số điểm Canvas đã vẽ như số particles được index hoặc query.",
    ],
    definitionOfDone: [
      "Điểm ở minimum/maximum bounds ánh xạ vào cell đầu/cuối đúng; điểm ngoài bounds bị từ chối.",
      "Tổng số phần tử trong mọi bucket bằng particle count và mỗi index xuất hiện đúng một lần.",
      "Candidate range ở bốn góc được clamp đúng, số visited cells khớp hình chữ nhật row/column và không có cell trùng.",
      "Một candidate nằm trong AABB nhưng ngoài circle bị loại; particle đúng trên radius được nhận.",
      "Grid và brute force trả cùng canonical hit set cùng nearest hit trên query set deterministic.",
      "Grid checksum bằng brute checksum; brute báo N×Q scans còn grid báo candidates nhỏ hơn baseline ở preset mặc định.",
      "Rebuild time, query time, visited cells và candidate count được báo thành các đại lượng riêng.",
      "Cell-size study cho thấy fine grid thăm nhiều cells hơn nhưng coarse grid kiểm nhiều candidates hơn.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/reset và có mô tả văn bản thay thế.",
      "Starter, tám checkpoint và final build sạch warning ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "16–21 giờ",
  objectives: [
    "Ánh xạ dữ liệu 2D vào Spatial Grid theo row-major và dựng bucket mà không mất hoặc lặp hạt",
    "Thu hẹp danh sách hạt có khả năng trúng rồi vẫn kiểm khoảng cách chính xác",
    "Dùng brute force, số lần kiểm và benchmark tách riêng dựng lưới/truy vấn để đánh giá `cellSize`",
  ],
  lessons: [
    {
      id: "p28-l01",
      slug: "01-tu-world-position-den-dia-chi-cell",
      title: "Từ world position đến địa chỉ cell",
      summary:
        "Bắt đầu từ baseline Project 27, chọn cellSize, tính số hàng/cột và biến một world position thành địa chỉ row-major có xử lý maximum boundary.",
      order: 1,
      estimatedMinutes: 90,
      demoId: "spatial-grid-neighbor-query",
    },
    {
      id: "p28-l02",
      slug: "02-xay-buckets-cho-100000-particles",
      title: "Xây buckets cho 100.000 particles",
      summary:
        "Tạo một bucket cho mỗi cell, chèn mỗi particle đúng một lần và đọc occupancy thay vì chỉ nhìn các đường grid.",
      order: 2,
      estimatedMinutes: 105,
      demoId: "spatial-grid-neighbor-query",
    },
    {
      id: "p28-l03",
      slug: "03-chon-candidate-cells-quanh-circle",
      title: "Chọn candidate cells quanh circle",
      summary:
        "Dùng AABB của circle để tìm dải row/column conservative, clamp ở mép world và quan sát vì sao query không cần mở mọi bucket.",
      order: 3,
      estimatedMinutes: 105,
      demoId: "spatial-grid-neighbor-query",
    },
    {
      id: "p28-l04",
      slug: "04-loc-candidates-thanh-neighbors-chinh-xac",
      title: "Lọc candidates thành hàng xóm chính xác",
      summary:
        "Duyệt bucket trong cell range, đếm candidates độc lập với hits và áp dụng squared-distance narrow test cùng nearest tie-break ổn định.",
      order: 4,
      estimatedMinutes: 110,
      demoId: "spatial-grid-neighbor-query",
    },
    {
      id: "p28-l05",
      slug: "05-doi-chieu-voi-brute-force-oracle",
      title: "Đối chiếu với brute-force oracle",
      summary:
        "Canonicalize hai hit set ngoài hot loop, so nearest hit và dùng các query ở cạnh/góc để tìm lỗi clamp hoặc bỏ sót boundary.",
      order: 5,
      estimatedMinutes: 105,
      demoId: "spatial-grid-neighbor-query",
    },
    {
      id: "p28-l06",
      slug: "06-benchmark-grid-va-baseline-cong-bang",
      title: "Benchmark grid và baseline công bằng",
      summary:
        "Giữ chung workload, warm-up, repetitions và checksum; đo query riêng khỏi rebuild để biết tốc độ đến từ ít distance test hơn.",
      order: 6,
      estimatedMinutes: 115,
      demoId: "spatial-grid-neighbor-query",
    },
    {
      id: "p28-l07",
      slug: "07-chon-cell-size-bang-du-lieu",
      title: "Chọn cellSize bằng dữ liệu",
      summary:
        "So bốn kích thước cell, đọc đồng thời số bucket, cells visited, candidates và maximum occupancy thay vì tìm một con số thần kỳ.",
      order: 7,
      estimatedMinutes: 110,
      demoId: "spatial-grid-neighbor-query",
    },
    {
      id: "p28-l08",
      slug: "08-hoan-thien-spatial-grid-va-nghiem-thu",
      title: "Hoàn thiện Spatial Grid và nghiệm thu",
      summary:
        "Ghép preset, pointer capture, auto probe, compare/benchmark/study controls và CTest cho address, insertion, exact hits, checksum cùng bounded work.",
      order: 8,
      estimatedMinutes: 125,
      demoId: "spatial-grid-neighbor-query",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
