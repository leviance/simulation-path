import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p30-l01": {
      focus: "Từ khung SDL đến dữ liệu phòng 100.000 điểm, có ID và đơn vị mét.",
      expected: "Cửa sổ hiển thị sàn, tường, kệ và cột; số điểm giữ nguyên sau khi đọc CSV.",
      files: ["include/io/csv.hpp", "include/model/dataset.hpp", "include/view/render.hpp"],
      steps: [
        {
          title: "Chốt schema trước khi đọc dữ liệu",
          explanation:
            "ID là danh tính, không phải thứ tự hàng. CSV dùng id,x,y,z; Y là chiều cao, mọi tọa độ tính bằng mét.",
        },
        {
          title: "Đọc vào vector tạm rồi mới nhận dataset",
          explanation:
            "Mỗi hàng phải đủ bốn cột, ID duy nhất và số hữu hạn. Gặp lỗi thì giữ thông báo có số dòng, không dùng nửa file đã đọc.",
        },
        {
          title: "Nối dữ liệu với đường vẽ đã có",
          explanation:
            "defaultCloud đi qua writeCsv/readCsv; renderPoints chiếu từng point vào framebuffer/depth buffer trước khi SDL_UpdateTexture present.",
        },
      ],
    },
    "p30-l02": {
      focus: "Dùng cùng basis cho orbit, free-fly và phép chiếu; camera không sửa tọa độ điểm.",
      expected: "Orbit, pan, tiến/lùi và đổi chế độ giữ nguyên world; Home nhìn toàn dataset.",
      files: ["include/view/camera.hpp", "include/app/application.hpp"],
      steps: [
        {
          title: "Dựng basis từ yaw và pitch",
          explanation:
            "forward hướng vào cảnh; right và up tạo hệ trực chuẩn. Hai chế độ khác vị trí eye chứ không khác phép chiếu.",
        },
        {
          title: "Chia perspective sau near-plane test",
          explanation:
            "Lens giữ basis/frustum cho cả frame, tránh tính lại trig với từng point. Đi sau near plane không được đem chia cho depth.",
        },
        {
          title: "Nối gesture vào event loop",
          explanation:
            "Giữ camera lúc bắt đầu kéo và tổng delta; sample pointer-up được áp dụng trước khi nhả capture. Escape hủy gesture.",
        },
      ],
    },
    "p30-l03": {
      focus: "Điều khiển vùng chọn trong world, dựng brute-force reference trước khi có cây.",
      expected:
        "Đổi tâm/kích thước vùng chọn thay hit set nhưng không reset camera; chạm mặt hộp hoặc mặt cầu vẫn được nhận.",
      files: ["include/model/geometry.hpp", "include/app/controls.hpp", "include/survey/scene.hpp"],
      steps: [
        {
          title: "Biểu diễn một vùng trong world",
          explanation:
            "center, half và radius có cùng đơn vị mét với dataset. Không dùng tọa độ sau projection để chọn dữ liệu.",
        },
        {
          title: "Kiểm từng điểm bằng hình học thật",
          explanation:
            "Hộp xét ba khoảng đóng; cầu xét khoảng cách bình phương. Đây là đáp án chuẩn sẽ dùng khi thay đường tìm kiếm.",
        },
        {
          title: "Đưa thay đổi vào scene",
          explanation:
            "J/L, I/K, U/O đổi tâm; [ ] đổi kích thước. refreshSelection cập nhật indices rồi renderer tô vàng các điểm được chọn.",
        },
      ],
    },
    "p30-l04": {
      focus: "Node indices, ba bit octant và các giới hạn dừng split.",
      expected:
        "Mỗi point index nằm đúng một leaf; dữ liệu trùng vị trí không làm cây chia vô hạn.",
      files: ["include/spatial/octree.hpp"],
      steps: [
        {
          title: "Lưu index thay vì copy tọa độ",
          explanation:
            "Vector points bất biến, node chỉ giữ các chỉ số. Sau này export lấy ID gốc qua pointIndex.",
        },
        {
          title: "Chọn duy nhất một octant",
          explanation:
            "Ba phép >= đặt ba bit X/Y/Z. Hai child có thể chạm mặt nhưng một point chỉ đi một đường.",
        },
        {
          title: "Split có giới hạn và ownership rõ",
          explanation:
            "Chuyển indices ra biến tạm trước khi push tám child; không giữ Node& qua vector reallocation. Depth, minimum size và node budget chặn chia.",
        },
      ],
    },
    "p30-l05": {
      focus: "AABB–box/sphere broad phase rồi exact-test điểm trong leaf.",
      expected:
        "Octree và brute trả cùng tập ID với hộp/cầu; counters cho biết đã bỏ được bao nhiêu công việc.",
      files: [
        "include/model/geometry.hpp",
        "include/spatial/octree.hpp",
        "include/survey/scene.hpp",
      ],
      steps: [
        {
          title: "Kiểm khả năng giao trước khi xuống node",
          explanation:
            "Hộp dùng overlap; cầu dùng điểm gần tâm cầu nhất trên AABB. Không dùng khoảng cách tới tâm node.",
        },
        {
          title: "Duyệt bằng stack và kiểm leaf",
          explanation:
            "Node bị loại không cần mở children. Node còn giao chỉ cho danh sách ứng viên, chưa phải kết quả.",
        },
        {
          title: "Thay đường query trong ứng dụng",
          explanation:
            "M đổi Tree/Brute trên cùng scene.region và dataset. Giữ indices để so tập, không lấy số hit hay checksum thay correctness.",
        },
      ],
    },
    "p30-l06": {
      focus: "Sáu mặt frustum, phép thử node bảo thủ và depth-buffer presentation.",
      expected:
        "Bật/tắt culling cho cùng ảnh tại cùng camera, kể cả khi camera ở trong phòng và sát near plane.",
      files: [
        "include/view/camera.hpp",
        "include/model/geometry.hpp",
        "include/survey/scene.hpp",
        "include/view/render.hpp",
      ],
      steps: [
        {
          title: "Viết frustum bằng các nửa không gian",
          explanation:
            "Normal hướng vào trong; near/far và bốn mặt bên cùng dùng basis camera. Plane không cần normalized nếu tolerance đi theo hệ số.",
        },
        {
          title: "Dùng cùng cây để lấy visible indices",
          explanation:
            "Chọn positive vertex của AABB để chứng minh cả node ở ngoài một plane. Nếu còn nghi ngờ thì giữ node, không đoán bỏ.",
        },
        {
          title: "Giữ renderer độc lập với cách lấy danh sách",
          explanation:
            "Dù danh sách đến từ Tree hay Brute, từng point vẫn phải qua clip/projection/depth test giống nhau. Không lấy mẫu để tạo số đo đẹp.",
        },
      ],
    },
    "p30-l07": {
      focus: "Giao vùng hình học với khoảng Y, rồi tính count/bounds/centroid.",
      expected: "Chọn mặt sàn Y=0 cho 20.000 điểm ở preset phòng; empty selection không sinh NaN.",
      files: [
        "include/model/geometry.hpp",
        "include/survey/statistics.hpp",
        "include/survey/scene.hpp",
      ],
      steps: [
        {
          title: "Lọc theo thuộc tính có ý nghĩa",
          explanation:
            "Y là chiều cao: lọc một lát sàn hoặc tầng kệ. Chạm hai đầu khoảng vẫn được nhận; filter cũng áp dụng cho viewport.",
        },
        {
          title: "Tính thống kê từ điểm thật",
          explanation:
            "Bounds của selection không phải bounds node hay bounds vùng chọn. Centroid là trung bình tọa độ của các điểm hit.",
        },
        {
          title: "Nối kết quả vào readout",
          explanation:
            "refreshSelection gọi statistics sau query. Camera không nằm trong luồng cập nhật filter nên giữ nguyên góc nhìn.",
        },
      ],
    },
    "p30-l08": {
      focus: "Export ID/tọa độ, công bố precision và xử lý lỗi ghi file.",
      expected: "CSV xuất ra mở được bằng cùng parser; giữ đúng tập ID và tọa độ, kể cả tập rỗng.",
      files: ["include/survey/statistics.hpp", "include/io/csv.hpp", "include/io/files.hpp"],
      steps: [
        {
          title: "Lấy dữ liệu qua pointIndex",
          explanation:
            "Query trả index để tránh copy trong hot path. Khi export mới lấy Point, rồi sắp theo ID cho file dễ đối chiếu.",
        },
        {
          title: "Ghi đủ precision để đọc lại",
          explanation:
            "C++ dùng max_digits10 với classic locale; schema không đổi. Không cắt tọa độ xuống vài chữ số chỉ vì readout đang hiển thị ngắn.",
        },
        {
          title: "Tạo file mới và báo lỗi",
          explanation:
            "X ghi vào .runtime/selection-N.csv, không ghi đè file cũ. Export không cần camera hay cây trong file kết quả.",
        },
      ],
    },
    "p30-l09": {
      focus: "Oracle độc lập, topology và job validation hữu hạn.",
      expected:
        "Reference so tập ID trên dataset hiện tại; biên, vị trí trùng, split, vùng rỗng và near plane có fixture riêng.",
      files: ["include/survey/validation.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "So tập ID chứ không tin số lượng",
          explanation:
            "Hai kết quả có thể cùng count nhưng khác điểm. Canonicalize bản sao ngoài hot path để phát hiện thiếu/trùng indices.",
        },
        {
          title: "Kiểm cấu trúc độc lập với query",
          explanation:
            "Đếm storage, reachability và containment; đánh dấu node đã tới để validator không lặp vô hạn nếu cây bị hỏng.",
        },
        {
          title: "Chia công việc và hủy đúng lúc",
          explanation:
            "Mỗi tick xử lý query hữu hạn rồi trả về event loop. Một query riêng vẫn có thể vượt 6 ms; đổi workload phải hủy kết quả cũ.",
        },
      ],
    },
    "p30-l10": {
      focus: "Workload cố định, warm-up và nhiều mẫu; tách build/query/culling/render/bộ nhớ.",
      expected:
        "Tree và Brute dùng cùng 16 vùng; có median/min/max, checksum và các số đo pipeline riêng, không hứa speedup chung.",
      files: [
        "include/survey/benchmark.hpp",
        "include/spatial/octree.hpp",
        "include/app/presentation.hpp",
      ],
      steps: [
        {
          title: "Giữ nguyên câu hỏi khi đổi thuật toán",
          explanation:
            "Lấy cùng 16 vùng từ seed, cùng dataset và filter; hai warm-up không tính vào năm mẫu báo cáo.",
        },
        {
          title: "Đo query ở nơi query thực sự chạy",
          explanation:
            "Không sort/export/render trong khoảng timing. Job chạy có giới hạn, Pause/Cancel không khóa camera.",
        },
        {
          title: "Tách bộ nhớ với thời gian",
          explanation:
            "allocatedBytes chỉ ước tính backing storage C++; không giả là process RSS hoặc bộ nhớ JS. Renderer/depth buffers có ngân sách riêng.",
        },
      ],
    },
    "p30-l11": {
      focus: "Build ZIP độc lập và hoàn tất mở → khảo sát → chọn/lọc → thống kê → xuất → đọc lại.",
      expected:
        "C++ chạy đủ 100.000 điểm; tests Debug/Release, smoke workflow và giới hạn tài nguyên được ghi riêng với desktop QA.",
      files: ["src/main.cpp", "include/app/application.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Theo dõi toàn bộ đường dữ liệu",
          explanation:
            "runApplication mở CSV, dựng Scene/Octree rồi event loop cập nhật camera, selection, jobs và framebuffer. Canvas không thay ứng dụng SDL.",
        },
        {
          title: "Build đúng target đang sửa",
          explanation:
            "Final mặc định; BUILD_CHECKPOINTS mở starter và 11 checkpoint. Tests dùng final/include, đổi sang starter/include khi muốn kiểm lời giải của bạn.",
        },
        {
          title: "Nghiệm thu theo hành vi sử dụng",
          explanation:
            "Chạy quy trình 100k và mở lại CSV xuất ra. Đối chiếu ảnh culling trên cùng camera, không lấy build/test xanh làm thay cho thao tác desktop.",
        },
      ],
    },
  },
  references: {
    "p30-l01": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l02": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l03": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l04": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l05": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l06": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l07": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l08": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l09": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l10": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l11": [
      {
        label: "SDL CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
      {
        label: "Octree",
        href: "/glossary#octree",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
