import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p31-l01": {
      focus:
        "Dùng cùng một đĩa sao để phân biệt vị trí thật trong không gian với vị trí của đốm sáng trên màn hình.",
      expected:
        "Đổi từ nhìn thẳng sang nhìn cạnh: nhánh xoắn thu hẹp thành một dải, vùng sao ở tâm vẫn dày. Tâm khối không đổi theo camera.",
      files: ["include/lab.hpp", "include/galaxy-seed.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Mở bản mình sẽ viết",
          explanation:
            "Giải nén ZIP, bật COURSE_WORKBOOK và chạy project_31_work. Bộ gieo sao, camera cùng vòng lặp SDL đã có; các phép đo mới nằm ở work/include/lab.hpp.",
        },
        {
          title: "Tìm xem nhánh từ đâu mà có",
          explanation:
            "Đọc diskDensity: trên cùng một vành, có góc dễ nhận sao hơn góc bên cạnh. Cách gieo này chỉ tạo trạng thái ban đầu; sao không bị neo vào một đường cong.",
        },
        {
          title: "Cân cả thiên hà",
          explanation:
            "Cộng khối lượng và vị trí có trọng số, rồi chia một lần. Thử hai sao khác khối lượng trước khi đọc tâm khối của hàng nghìn sao.",
        },
      ],
    },
    "p31-l02": {
      focus:
        "Từ vị trí của hai sao, tự vẽ mũi tên cho biết vật thứ nhất bị vật thứ hai kéo về phía nào.",
      expected:
        "Đổi ngôi sao đang chọn làm mũi tên đổi hướng. Hai vật trùng tọa độ vẫn cho kết quả hữu hạn.",
      files: ["include/lab.hpp", "include/simulation.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Vẽ vector nối hai sao trên giấy",
          explanation:
            "Lấy vị trí nguồn trừ vị trí đích. Đưa nguồn sang phía bên trái, gia tốc phải đổi chiều dù độ sáng trên ảnh giữ nguyên.",
        },
        {
          title: "Tính một cặp",
          explanation:
            "Dùng khối lượng của nguồn và khoảng cách đã làm trơn. Thử nhân đôi khối lượng nguồn hoặc đặt hai sao trùng nhau.",
        },
        {
          title: "Đưa lực vào cửa sổ",
          explanation:
            "Lấy hai Body trong mô phỏng đang mở và chuyển vector kết quả cho hàm vẽ mũi tên. Chưa cập nhật vị trí ở bước này.",
        },
      ],
    },
    "p31-l03": {
      focus: "Thay sức hút của riêng vật tâm bằng tổng sức hút của mọi sao khác.",
      expected:
        "Một lượt tính trên ba vật xét sáu đóng góp. Dữ liệu vị trí ban đầu vẫn nguyên vẹn cho vật được xét cuối cùng.",
      files: ["include/lab.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Chọn một vật đích",
          explanation:
            "Bỏ nguồn có cùng ID, không bỏ một vật khác chỉ vì trùng tọa độ. Cộng các vector thay vì cộng độ dài.",
        },
        {
          title: "Tính cho cả hệ",
          explanation:
            "Mỗi vật ghi vào một ô gia tốc riêng. Không ghi ngược vào danh sách vị trí mà các phép tính sau còn đang đọc.",
        },
        {
          title: "Thử tính đối xứng",
          explanation:
            "Đặt hai nguồn đối xứng rồi xét thành phần gia tốc dọc đường nối chúng. Hai đóng góp ngược nhau phải triệt tiêu trên trục đó.",
        },
      ],
    },
    "p31-l04": {
      focus: "Từ một ảnh đứng yên, cho mọi sao tiến lên đúng một bước thời gian.",
      expected:
        "Nhấn N rồi chờ tính xong: đồng hồ tăng đúng dt và toàn bộ sao đổi sang trạng thái mới cùng lúc.",
      files: ["include/lab.hpp", "include/simulation.hpp", "include/application.hpp"],
      steps: [
        {
          title: "Chốt ảnh trước bước",
          explanation:
            "Dành một ô cho gia tốc của mỗi sao. Mọi phép tính trong bước cùng đọc các vị trí lúc bắt đầu.",
        },
        {
          title: "Giữ việc dở, không dời sao sớm",
          explanation:
            "Nhớ ID tiếp theo khi hết ngân sách xử lý. Có thể quay camera trong lúc chờ mà không thấy nửa đĩa đã sang thời điểm mới.",
        },
        {
          title: "Thử một bước bằng số nhỏ",
          explanation:
            "Cập nhật vận tốc trước, dùng vận tốc mới để dời vị trí. Kiểm ví dụ một chiều rồi mới quan sát thiên hà chuyển động.",
        },
      ],
    },
    "p31-l05": {
      focus:
        "Biến Octree tìm điểm thành một cây biết mỗi vùng chứa bao nhiêu khối lượng và khối lượng tập trung ở đâu.",
      expected:
        "Tổng khối lượng và tâm khối ở gốc khớp với việc duyệt toàn bộ sao, kể cả khi trong một lá có hai sao trùng tọa độ.",
      files: [
        "include/tree.hpp",
        "include/simulation.hpp",
        "include/render.hpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "Chia ô và giữ các ID",
          explanation:
            "Một ID thuộc một lá. Giới hạn chia giúp cây kết thúc khi không thể phân biệt hai tọa độ trùng nhau.",
        },
        {
          title: "Cân từ lá lên gốc",
          explanation:
            "Lá cộng khối lượng sao thật; ô cha coi mỗi con là một cụm có tổng khối lượng và tâm khối riêng.",
        },
        {
          title: "Cho cây theo kịp sao",
          explanation:
            "Dựng lại cây sau bước thay đổi vị trí. Xoay camera chỉ cần chiếu lại đường cạnh, không cần gieo lại bất kỳ sao nào.",
        },
      ],
    },
    "p31-l06": {
      focus:
        "Quyết định khi nào cả cụm sao xa có thể thay bằng một nguồn mà không tính luôn lực của vật lên chính nó.",
      expected:
        "Chọn hai sao khác nhau: cùng một ô có thể được mở khi ở gần sao thứ nhất nhưng được nhận nguyên cụm khi ở xa sao thứ hai.",
      files: [
        "include/tree.hpp",
        "include/simulation.hpp",
        "include/presentation.hpp",
        "include/application.hpp",
      ],
      steps: [
        {
          title: "Đo từ sao, không từ camera",
          explanation:
            "So cạnh ô với khoảng cách đến tâm khối. Dù nhìn màn hình từ góc nào, phép quyết định vẫn diễn ra trong không gian của mô phỏng.",
        },
        {
          title: "Bảo vệ vật đang xét",
          explanation:
            "Ô chứa vật đích luôn phải mở; khi tới lá, chỉ bỏ đúng ID của vật đích. Sau đó mới áp dụng phép tính lực cặp.",
        },
        {
          title: "Tô đúng các ô đã dùng",
          explanation:
            "Ghi các ô đã mở hoặc nhận ngay trong hàm tính lực. Đổi theta trên cùng một ảnh dừng rồi đối chiếu lớp quan sát.",
        },
      ],
    },
    "p31-l07": {
      focus:
        "Khi mũi tên lực có vẻ sai, phân biệt lỗi lưu ID, lỗi cộng khối lượng và lỗi để vật tự hút.",
      expected:
        "Một cây hỏng trả về tên điều kiện sai thay vì làm công cụ kiểm tra truy cập ngoài phạm vi.",
      files: ["include/tree.hpp", "include/application.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đếm chỗ ở của từng sao",
          explanation:
            "Duyệt tất cả lá bằng một bảng đếm chung. ID mất hoặc lặp đều phải lộ ra cho dù tổng khối lượng trông hợp lý.",
        },
        {
          title: "Kiểm con trước khi đọc",
          explanation:
            "Xác nhận các chỉ số và hình hộp phù hợp với ô cha. Một cây lỗi cũng phải kiểm được mà không làm ứng dụng dừng đột ngột.",
        },
        {
          title: "Dựng ca lỗi nhỏ",
          explanation:
            "Lặp một ID, rồi thử riêng ca hỏng liên kết con. Cuối cùng chọn một sao và đối chiếu lực với cách cộng trực tiếp.",
        },
      ],
    },
    "p31-l08": {
      focus: "Đo xem khi chấp nhận nhiều cụm hơn, lực lệch lời giải trực tiếp bao nhiêu.",
      expected:
        "Mỗi hàng theta nói về cùng một thời điểm và nhóm sao; bạn đọc được cả sai số có đơn vị gia tốc lẫn sai số tương đối.",
      files: [
        "include/analysis.hpp",
        "include/experiments.hpp",
        "include/render.hpp",
        "include/application.hpp",
      ],
      steps: [
        {
          title: "Chụp ảnh trạng thái một lần",
          explanation:
            "Giữ nguyên danh sách sao, epsilon và nhóm ID sẽ đo. Chỉ theta được phép đổi giữa các hàng.",
        },
        {
          title: "Lấy direct làm mốc",
          explanation:
            "Tính lực chính xác cho các ID mẫu rồi giữ lại để khỏi lấy một thiên hà ở thời điểm khác làm đối chứng.",
        },
        {
          title: "Đọc hai loại RMS",
          explanation:
            "Đặt sai số tuyệt đối cạnh sai số chuẩn hóa. Ở gần nơi lực triệt tiêu, một phần trăm lớn chưa hẳn là một gia tốc lớn.",
        },
      ],
    },
    "p31-l09": {
      focus:
        "Đo riêng thời gian duyệt cây và thời gian dựng cây trước khi kết luận Barnes–Hut có lợi ở cỡ hệ nào.",
      expected:
        "Mỗi hàng đủ số liệu có trung vị, khoảng dao động và lượng việc; hàng hết hạn không biến thành một số đo giả.",
      files: [
        "include/benchmark.hpp",
        "include/analysis.hpp",
        "include/application.hpp",
        "include/render.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chọn cùng dữ liệu và cấu hình",
          explanation:
            "Dùng Release với cùng seed, theta, epsilon, số vật. Đừng so khung hình/giây của toàn bộ cửa sổ với thời gian phép tính lực.",
        },
        {
          title: "Đo theo lượt hữu hạn",
          explanation:
            "Bỏ lượt làm nóng, dùng năm lượt để tính trung vị. Giữa các lượt vẫn cho phép dừng hoặc hủy.",
        },
        {
          title: "Tính giá của cả một bước",
          explanation:
            "So thời gian trực tiếp với chi phí dựng cộng duyệt cây, rồi đọc sai số của theta đã dùng ở bài trước.",
        },
      ],
    },
    "p31-l10": {
      focus: "Nối hình thiên hà với bằng chứng rằng lực và bước thời gian đang làm đúng việc.",
      expected:
        "Bản C++ trong work/ cho xem 4.096 vật từ ba góc, bước qua thời gian, đo năng lượng toàn hệ và kiểm một quỹ đạo hai vật.",
      files: [
        "include/analysis.hpp",
        "include/experiments.hpp",
        "include/simulation.hpp",
        "include/presentation.hpp",
        "include/application.hpp",
        "tests/extended.hpp",
      ],
      steps: [
        {
          title: "Theo dõi các đại lượng của cùng thời điểm",
          explanation:
            "Cộng động năng theo sao, thế năng theo từng cặp khác nhau. Ghi thời điểm và epsilon cùng với số đo.",
        },
        {
          title: "Tách hai nguồn sai số",
          explanation:
            "Dùng các lực trực tiếp để đánh giá theta. Dùng quỹ đạo hai vật có nghiệm đã biết để đánh giá dt ở cùng thời điểm cuối.",
        },
        {
          title: "Chạy bản do bạn ghép",
          explanation:
            "Build work/ và chạy CTest trên chính các header trong đó. Sau đó đổi góc nhìn, đi xuyên qua lõi và thử chuột, phím trong cửa sổ C++ thật.",
        },
      ],
    },
  },
  references: {
    "p31-l01": [
      { label: "N-body system", href: "/glossary#n-body-system", kind: "Thuật ngữ" },
      { label: "Center of mass", href: "/glossary#center-of-mass", kind: "Thuật ngữ" },
    ],
    "p31-l02": [
      {
        label: "Gravitational softening",
        href: "/glossary#gravitational-softening",
        kind: "Thuật ngữ",
      },
    ],
    "p31-l03": [
      { label: "Quadratic complexity", href: "/glossary#quadratic-complexity", kind: "Thuật ngữ" },
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
    ],
    "p31-l04": [
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
      { label: "Symplectic Euler", href: "/glossary#symplectic-euler", kind: "Thuật ngữ" },
    ],
    "p31-l05": [
      { label: "Octree", href: "/glossary#octree", kind: "Thuật ngữ" },
      { label: "Center of mass", href: "/glossary#center-of-mass", kind: "Thuật ngữ" },
    ],
    "p31-l06": [
      { label: "Barnes–Hut", href: "/glossary#barnes-hut", kind: "Thuật ngữ" },
      { label: "Opening angle", href: "/glossary#opening-angle", kind: "Thuật ngữ" },
    ],
    "p31-l07": [
      { label: "Octree node", href: "/glossary#octree-node", kind: "Thuật ngữ" },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p31-l08": [
      { label: "Opening angle", href: "/glossary#opening-angle", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p31-l09": [
      { label: "Quadratic complexity", href: "/glossary#quadratic-complexity", kind: "Thuật ngữ" },
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
    ],
    "p31-l10": [
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
