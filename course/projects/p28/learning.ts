import type { ProjectLearningAssets } from "../../learning/types";

const files = ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"];

const learning = {
  guides: {
    "p28-l01": {
      focus:
        "Giữ nguyên đám hạt và vòng tròn truy vấn của Project 27, rồi học cách xác định một điểm thuộc ô nào trong lưới.",
      expected:
        "Với `cellSize = 0.05`, vùng `[0,1]²` tạo thành lưới 20×20; hai mép biên được đưa vào ô đầu và ô cuối đúng quy ước.",
      files,
      steps: [
        {
          title: "Tính kích thước grid từ bounds",
          explanation:
            "Dùng `ceil` để ô cuối cùng vẫn phủ phần còn dư khi chiều rộng thế giới không chia hết cho `cellSize`.",
        },
        {
          title: "Floor world coordinate về cell coordinate",
          explanation:
            "Dùng `floor` để chọn ô nằm bên dưới và bên trái điểm. Ta đang chia không gian thành vùng, không tìm ô có tâm gần nhất.",
        },
        {
          title: "Clamp maximum boundary",
          explanation:
            "Một điểm đúng tại `xMax` có thể cho chỉ số thô bằng `columns`. Sau khi xác nhận điểm vẫn nằm trong world bounds, đưa nó về `columns - 1`.",
        },
      ],
    },
    "p28-l02": {
      focus:
        "Tạo một bucket cho mỗi ô và đưa index của từng hạt vào đúng bucket, thay vì sao chép toàn bộ `Particle`.",
      expected:
        "Tổng số phần tử trong các bucket bằng N, mỗi index xuất hiện đúng một lần và số liệu lấp đầy thay đổi hợp lý theo `seed` cùng `cellSize`.",
      files,
      steps: [
        {
          title: "Bucket chỉ giữ index",
          explanation:
            "Vector hạt vẫn là nguồn dữ liệu duy nhất. Lưới chỉ giữ các chỉ mục để thu hẹp những hạt cần kiểm.",
        },
        {
          title: "Rebuild theo một vòng lặp",
          explanation:
            "Mỗi hạt được đổi sang địa chỉ ô đúng một lần rồi thêm index vào bucket tương ứng.",
        },
        {
          title: "Đếm occupancy để kiểm cấu trúc",
          explanation:
            "Số hạt đã chèn, số ô không rỗng và bucket lớn nhất giúp phát hiện hạt bị bỏ sót hoặc lưới đang quá thô.",
        },
      ],
    },
    "p28-l03": {
      focus:
        "Từ hình chữ nhật bao quanh vòng tròn, xác định dải hàng và cột có khả năng chứa hit rồi xử lý đúng bốn mép của world.",
      expected:
        "Mọi cell có thể chứa hit đều được thăm; query ở góc không tạo index âm hoặc mở một cell hai lần.",
      files,
      steps: [
        {
          title: "Lấy AABB của circle",
          explanation:
            "`center ± radius` cho bốn cạnh của hình chữ nhật bao. Hình này tính rất rẻ và chắc chắn phủ trọn vòng tròn.",
        },
        {
          title: "Đổi hai góc AABB thành cell range",
          explanation:
            "Đổi góc nhỏ nhất và lớn nhất thành chỉ số hàng, cột. Hai vòng lặp lồng nhau sau đó thăm mỗi ô đúng một lần.",
        },
        {
          title: "Clamp sau overlap test",
          explanation:
            "Nếu hình chữ nhật không chạm world, trả về dải rỗng. Chỉ sau khi biết hai vùng có giao nhau mới giới hạn chỉ số về phạm vi lưới.",
        },
      ],
    },
    "p28-l04": {
      focus:
        "Duyệt các bucket vừa chọn, sau đó kiểm khoảng cách bình phương của từng hạt để loại những điểm chỉ nằm trong hình chữ nhật bao.",
      expected:
        "`visitedCells` bằng số ô trong dải, `candidatesChecked` bằng tổng kích thước các bucket đã thăm và kết quả không chứa điểm giả ở bốn góc hình chữ nhật bao.",
      files,
      steps: [
        {
          title: "Đếm cell trước khi đọc bucket",
          explanation:
            "`visitedCells` cho biết chi phí duyệt lưới; `candidatesChecked` cho biết có bao nhiêu phép kiểm khoảng cách thật sự được thực hiện.",
        },
        {
          title: "Không tin candidate cell tuyệt đối",
          explanation:
            "Một ô chạm hình chữ nhật bao vẫn có thể nằm ngoài vòng tròn. Mỗi hạt lấy từ bucket vẫn phải qua phép kiểm `distance² <= radius²`.",
        },
        {
          title: "Chốt nearest tie theo index",
          explanation:
            "Thứ tự duyệt bucket không còn trùng thứ tự toàn cục của vector hạt. Khi hai khoảng cách bằng nhau, hãy chủ động chọn index nhỏ hơn.",
        },
      ],
    },
    "p28-l05": {
      focus:
        "Chạy cùng truy vấn bằng brute force để kiểm lưới, rồi so hai tập hit mà không phụ thuộc vào thứ tự duyệt bucket.",
      expected:
        "Cả 32 truy vấn có seed cố định lẫn các ca ở góc và trên biên đều cho cùng tập hit và cùng hạt gần nhất.",
      files,
      steps: [
        {
          title: "So set thay vì thứ tự traversal",
          explanation:
            "Sao chép rồi sắp xếp hai danh sách chỉ trong bước kiểm tra. Hàm truy vấn thật không phải trả thêm chi phí chỉ để có cùng thứ tự với brute force.",
        },
        {
          title: "So nearest hit riêng",
          explanation:
            "Hai tập hit bằng nhau chưa đảm bảo quy tắc xử lý khoảng cách bằng nhau giống nhau, vì vậy cần so riêng `nearestIndex`.",
        },
        {
          title: "Đưa edge cases vào query set",
          explanation:
            "Tâm ở góc và circle chạm boundary thường làm lộ lỗi clamp mà query giữa world không thấy.",
        },
      ],
    },
    "p28-l06": {
      focus:
        "Đo Spatial Grid và brute force bằng đúng cùng dữ liệu, có warm-up và checksum; thời gian dựng lưới được báo riêng.",
      expected:
        "Checksum bằng nhau, brute scans=N×Q×R, grid candidates nhỏ hơn baseline và timing của hai path đều finite.",
      files,
      steps: [
        {
          title: "Giữ workload chung",
          explanation:
            "Cả hai thuật toán nhận cùng vector hạt và cùng các vòng tròn truy vấn. Chỉ cách tìm những hạt cần kiểm là khác nhau.",
        },
        {
          title: "Tách build khỏi query",
          explanation:
            "Scene đứng yên chỉ build một lần; nếu particles chuyển động, rebuild phải được báo thành một chi phí khác.",
        },
        {
          title: "Đọc exact work trước timing",
          explanation:
            "Đọc số hạt đã kiểm và số lần quét trước khi nhìn thời gian. Checksum xác nhận cả hai phía vẫn giải đúng cùng một bài toán.",
        },
      ],
    },
    "p28-l07": {
      focus:
        "Thử bốn giá trị `cellSize` trên cùng dữ liệu để xem kích thước ô ảnh hưởng đến số bucket, số ô phải thăm và số hạt phải kiểm ra sao.",
      expected:
        "Ô nhỏ thường làm truy vấn thăm nhiều ô hơn nhưng kiểm ít hạt hơn; ô lớn tạo ít bucket hơn nhưng mỗi bucket đông hơn.",
      files,
      steps: [
        {
          title: "Rebuild riêng cho từng cellSize",
          explanation:
            "Mỗi `cellSize` tạo một cách chia lưới khác, vì vậy phải dựng lại đúng hệ bucket trước khi đo dòng kết quả tương ứng.",
        },
        {
          title: "Ghi nhiều đại lượng cùng lúc",
          explanation:
            "Chỉ nhìn thời gian sẽ không biết chi phí đến từ việc thăm quá nhiều ô, kiểm quá nhiều hạt hay các bucket phân bố không đều.",
        },
        {
          title: "Chọn preset theo workload",
          explanation:
            "Radius và mật độ khác nhau có điểm cân bằng khác nhau; 0.05 chỉ là preset hợp lý cho scene này.",
        },
      ],
    },
    "p28-l08": {
      focus:
        "Ghép toàn bộ ứng dụng từ phép đổi tọa độ ô, dựng bucket, truy vấn, đối chiếu đến phép đo và thao tác chuột.",
      expected:
        "Reset luôn đưa ứng dụng về cùng dữ liệu, chuột luôn được nhả đúng lúc, mọi phép đo đều kết thúc và CTest đạt ở Debug lẫn Release.",
      files,
      steps: [
        {
          title: "Giữ một query path dùng chung",
          explanation:
            "Interactive frame, benchmark và tests gọi cùng build/query functions thay vì ba phiên bản gần giống nhau.",
        },
        {
          title: "Không trộn draw sample với indexed workload",
          explanation:
            "Canvas có thể chỉ vẽ 30k điểm, nhưng grid vẫn chứa đúng N indices và readout nói rõ hai con số.",
        },
        {
          title: "Giữ fixed grid làm baseline tiếp theo",
          explanation:
            "Project 29 có thể dùng cùng oracle/query set để xem Quadtree đổi topology và candidate work ra sao.",
        },
      ],
    },
  },
  references: {
    "p28-l01": [
      { label: "Spatial Grid", href: "/glossary#spatial-grid", kind: "Thuật ngữ" },
      { label: "Cell coordinate", href: "/glossary#cell-coordinate", kind: "Thuật ngữ" },
    ],
    "p28-l02": [
      { label: "Bucket", href: "/glossary#spatial-bucket", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
    ],
    "p28-l03": [
      {
        label: "Conservative candidate set",
        href: "/glossary#conservative-candidate-set",
        kind: "Thuật ngữ",
      },
      { label: "Circle query", href: "/glossary#circle-query", kind: "Thuật ngữ" },
    ],
    "p28-l04": [
      { label: "Squared distance", href: "/glossary#squared-distance", kind: "Thuật ngữ" },
      { label: "Hot loop", href: "/glossary#hot-loop", kind: "Thuật ngữ" },
    ],
    "p28-l05": [
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l06": [
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p28-l07": [
      { label: "Grid cell size", href: "/glossary#grid-cell-size", kind: "Thuật ngữ" },
      { label: "Spatial Grid", href: "/glossary#spatial-grid", kind: "Thuật ngữ" },
    ],
    "p28-l08": [
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
