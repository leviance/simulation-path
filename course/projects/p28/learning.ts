import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p28-l01": {
      focus: "Ánh xạ position vào grid, xử lý tọa độ âm và cell cuối không đủ rộng.",
      expected:
        "Đàn Boids vẫn chạy bằng brute force; chọn hoặc kéo một cá thể thấy địa chỉ cell đổi đúng. Fixture (959,599), S=100 cho index=59; (960,600) wrap về index=0.",
      files: ["include/grid/coordinates.hpp", "include/app/scene.hpp", "include/app/presentation.hpp"],
      steps: [
        {
          title: "Giữ nguyên đàn của Project 27",
          explanation:
            "Starter đã có đầy đủ steering và tích phân. Các header trong include/boids là nền có sẵn; phần mới nằm trong include/grid và include/app.",
        },
        {
          title: "Tạo geometry trước khi cấp phát",
          explanation:
            "ceil giữ cả cell cuối ngắn. Budget 4.096 cell được kiểm trước khi tạo buckets, không để cell size cực nhỏ làm cấp phát vô hạn.",
        },
        {
          title: "Đọc địa chỉ của một position",
          explanation:
            "Wrap đưa tọa độ âm vào miền tuần hoàn; floor chọn cell chứa điểm. Index row-major dùng columns, không dùng chiều rộng world.",
        },
      ],
    },
    "p28-l02": {
      focus: "Đưa mỗi cá thể vào đúng một bucket và biết khi nào grid đã cũ.",
      expected:
        "Debug có buckets đúng với state đang xem. Sau single-step hoặc drag, cá thể đã vượt cạnh cell phải xuất hiện trong bucket mới; mỗi index được chèn đúng một lần.",
      files: ["include/grid/storage.hpp", "include/app/scene.hpp"],
      steps: [
        {
          title: "Mỗi snapshot có grid riêng",
          explanation:
            "Không dùng grid dựng khi reset cho các bước sau. Cá thể có thể vượt cạnh cell dù chỉ di chuyển một khoảng nhỏ.",
        },
        {
          title: "Đưa từng chỉ số vào bucket",
          explanation:
            "Bucket giữ index vào snapshot, không copy Boid và không đổi ID. Một vòng N lượt là đủ để chèn toàn đàn.",
        },
        {
          title: "Nối grid vào lớp debug",
          explanation:
            "refreshInspection chỉ dựng lại khi state hoặc tham số thay đổi. Đây là cache cho hình đang xem, không thay grid riêng của simulation step.",
        },
      ],
    },
    "p28-l03": {
      focus: "Chia khoảng tuần hoàn, xử lý cell cuối ngắn và tránh duyệt trùng.",
      expected:
        "Vùng query nối qua hai mép và không lặp cell. Fixture width=960, S=100, tâm x=0, R=64 nhận các cột 0,8,9; toàn đàn vẫn chạy bằng brute force.",
      files: ["include/grid/query.hpp", "include/app/scene.hpp"],
      steps: [
        {
          title: "Tách khoảng bị cắt bởi mép",
          explanation:
            "Khoảng [x−R,x+R] có thể đi qua 0 hoặc width. Chia thành hai đoạn trong miền giúp dùng cùng phép floor như bước chèn.",
        },
        {
          title: "Giữ cell cuối ngắn trong phép tính",
          explanation:
            "Với width=960, S=100, cell cuối chỉ rộng 60. Tâm 0, R=64 phải xét cột 8,9,0; ±ceil(R/S) quanh cột 0 sẽ bỏ cột 8.",
        },
        {
          title: "Loại cell trùng trước khi query",
          explanation:
            "Tập cột và tập hàng đều không trùng; tích Descartes vì thế không lặp bucket. Không sửa bằng cách cắt bớt hàng xóm ở cuối.",
        },
      ],
    },
    "p28-l04": {
      focus: "Lọc theo khoảng cách của Project 27; bỏ self nhưng giữ cá thể trùng vị trí.",
      expected:
        "Selected query phân biệt cells/candidates/neighbors. Điểm ngoài hình tròn không trở thành hàng xóm; khác ID trùng vị trí vẫn được nhận ở R=0.",
      files: ["include/grid/query.hpp", "include/app/scene.hpp"],
      steps: [
        {
          title: "Tách candidate khỏi neighbor",
          explanation:
            "Candidate chỉ cần thuộc bucket đã chọn. Nó có thể nằm ngoài hình tròn và phải qua bước lọc.",
        },
        {
          title: "Dùng lại displacement của Project 27",
          explanation:
            "Minimum image phải giống ở query, separation và cohesion. Điều kiện <= nhận đúng biên radius; self được nhận diện bằng ID.",
        },
        {
          title: "Kiểm trên cá thể đang chọn",
          explanation:
            "Debug lấy kết quả từ queryGrid thật. Đổi màu vài điểm bằng brute force không chứng minh thuật toán Grid đang dùng là đúng.",
        },
      ],
    },
    "p28-l05": {
      focus: "Thay neighbor search, giữ nguyên steering và chỉ đổi state sau một bước đầy đủ.",
      expected:
        "N=256 hoặc 1.024 chạy bằng Brute hoặc Grid trên cùng state. M không reset đàn; single-step tăng time đúng 1/60 s sau khi đã cập nhật đủ N.",
      files: ["include/grid/step.hpp", "include/app/scene.hpp", "include/app/controls.hpp"],
      steps: [
        {
          title: "Chọn phương thức mà không reset",
          explanation:
            "Brute/Grid cùng đọc một đàn hiện tại. Đổi phương thức chỉ hủy job dở, không đổi seed, position hay velocity.",
        },
        {
          title: "Giữ snapshot đọc và output ghi riêng",
          explanation:
            "Một StepJob giữ input và Params của riêng nó. Steering vẫn là hàm đã học; Grid chỉ cung cấp danh sách hàng xóm.",
        },
        {
          title: "Chỉ commit khi đủ cả đàn",
          explanation:
            "Sau khi nextIndex bằng N mới swap. Các checkpoint 5–7 dùng đàn nhỏ; bài 8 bổ sung chia thời gian và preset 10.000.",
        },
      ],
    },
    "p28-l06": {
      focus: "Đối chiếu toàn đàn nhỏ: tập hàng xóm, từng steering và state một bước.",
      expected:
        "Bấm V để đối chiếu mọi cá thể của đàn nhỏ: checked=N, failures=0. Bỏ một bucket trong fixture phải tạo failures; hủy không đổi state đang xem.",
      files: [
        "include/grid/validation.hpp",
        "include/app/controls.hpp",
        "tests/boids-grid-cases.hpp",
      ],
      steps: [
        {
          title: "So tập hàng xóm trước khi so số thực",
          explanation:
            "Sắp thứ tự index/ID để so tập, không ép thứ tự bucket phải giống brute force.",
        },
        {
          title: "So từng steering và state một bước",
          explanation:
            "Tolerance 1e−9 áp dụng cho separation, alignment, cohesion, acceleration, position và velocity. Không dùng quỹ đạo dài phải trùng bit.",
        },
        {
          title: "Cố ý làm hỏng grid",
          explanation:
            "Bỏ một bucket rồi validator phải phát hiện sai khác. Checksum và một vài ảnh nhìn giống nhau không thay được phép kiểm này.",
        },
      ],
    },
    "p28-l07": {
      focus: "Thử phân bố đều, hai cụm và cụm rất đặc trên cùng seed; đọc occupancy.",
      expected:
        "Có ba layout tái lập theo seed. Đổi S không đổi input; Dense ở N=1.024 vẫn có đủ 1.047.552 hàng xóm có hướng và occupancy tập trung.",
      files: ["include/grid/dataset.hpp", "include/app/view.hpp", "include/app/controls.hpp"],
      steps: [
        {
          title: "Giữ seed và cell size độc lập",
          explanation:
            "Các layout chỉ biến đổi vị trí ban đầu; vận tốc và luật tương tác không đổi. Đổi S không được làm lại một dataset khác.",
        },
        {
          title: "Đọc occupancy cùng candidates",
          explanation:
            "Cell quá nhỏ tăng số cell duyệt; cell quá lớn chứa nhiều candidate. Khi đàn tụ rất đặc, Grid vẫn phải xét gần mọi cặp.",
        },
        {
          title: "Đổi layout trong ứng dụng",
          explanation:
            "Phím L hoặc select tạo lại phân bố có chủ đích. Đây là reset dataset, khác với thao tác M chỉ đổi cách tìm hàng xóm.",
        },
      ],
    },
    "p28-l08": {
      focus: "Chia việc giữa các frame, không cắt hàng xóm và không công bố nửa bước.",
      expected:
        "Preset 10.000 cập nhật và vẽ đủ đàn, progress đi qua các lô nhưng steps/time chỉ đổi sau commit. Pause/Escape hủy được phần đang tính; clock không chạy nhanh ở 120 Hz.",
      files: ["include/grid/step.hpp", "include/app/scene.hpp", "include/app/controls.hpp", "include/app/application.hpp"],
      steps: [
        {
          title: "Chia CPU giữa hai cá thể",
          explanation:
            "Một lát tối đa khoảng 6 ms; một cá thể vẫn xét đủ hàng xóm. Ngân sách không phải giới hạn cứng cho từng microsecond.",
        },
        {
          title: "Công bố toàn bước hoặc không công bố",
          explanation:
            "UI tiếp tục vẽ snapshot cũ khi job chưa xong. Pause/Reset/drag/đổi tham số hủy phần output dở.",
        },
        {
          title: "Tách thời gian mô phỏng khỏi thời gian chờ",
          explanation:
            "Mỗi commit tăng đúng 1/60 s. Clock không tăng nhanh trên màn hình 120 Hz và không chạy bù vô hạn khi đàn quá tải.",
        },
      ],
    },
    "p28-l09": {
      focus: "Hai warm-up, năm mẫu đo, median/min/max và trường hợp Grid chậm hơn.",
      expected:
        "Scale plan kết thúc với năm dòng, cell study có bảy dòng; mỗi dòng có năm mẫu sau hai warm-up. Bảng hiện rebuild/query/update/total, median/min/max và có thể hủy dòng đang đo.",
      files: [
        "include/grid/benchmark.hpp",
        "include/app/controls.hpp",
        "include/app/application.hpp",
      ],
      steps: [
        {
          title: "Cố định đầu vào của mỗi dòng",
          explanation:
            "Mỗi mẫu đọc lại snapshot cùng seed/layout; warm-up không đẩy đàn sang trạng thái khác.",
        },
        {
          title: "Đo mọi phần cần để có output",
          explanation:
            "CPU total gồm validation, copy snapshot, build và các lô query/update; không gồm chờ frame, render hoặc checksum.",
        },
        {
          title: "Báo phân bố chứ không chỉ một lần chạy",
          explanation:
            "Hai warm-up rồi năm mẫu; median, min và max là dữ liệu của máy đang chạy. Cell study có baseline brute và nhiều S, kể cả layout đặc.",
        },
      ],
    },
    "p28-l10": {
      focus: "Build Debug/Release, CTest, smoke hữu hạn và mã nguồn đầy đủ chạy độc lập.",
      expected:
        "Final build được ở Debug/Release, CTest trả kết quả rõ và smoke lớn báo N=10000, drawn=10000, steps≥1. ZIP có đủ mọi file, tests và README để chạy độc lập.",
      files: ["src/main.cpp", "tests/tests.cpp", "tests/boids-grid-cases.hpp"],
      steps: [
        {
          title: "Build từ ZIP độc lập",
          explanation:
            "Final là target mặc định. BUILD_CHECKPOINTS bật starter và mười checkpoint; không cần source của Project 27 nằm cạnh ZIP.",
        },
        {
          title: "Chạy CTest ở hai cấu hình",
          explanation:
            "Các test thuần không mở cửa sổ. Có oracle chín ảnh, insertion, equivalence, batching, cancellation và cập nhật 10.000.",
        },
        {
          title: "Nghiệm thu đúng phạm vi",
          explanation:
            "Smoke hữu hạn chứng minh chương trình cập nhật/vẽ đủ đàn; kiểm thao tác desktop trực tiếp vẫn là một việc riêng khi localhost được bật.",
        },
      ],
    },
  },
  references: {
    "p28-l01": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l02": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l03": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l04": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l05": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l06": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l07": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l08": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l09": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p28-l10": [
      {
        label: "Spatial Grid",
        href: "/glossary#spatial-grid",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
