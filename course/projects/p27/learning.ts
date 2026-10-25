import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p27-l01": {
      focus: "Đọc khung SDL, vẽ tam giác theo vận tốc và nối bước cập nhật vào event loop.",
      expected:
        "Starter mở khung trống; checkpoint 1 hiện một tam giác chuyển động sang phải. Bấm N làm time tăng đúng 1/60 s và x tăng gần 0,9.",
      files: ["include/lab.hpp", "include/view.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Thêm bước cập nhật vị trí",
          explanation:
            "Ở bài này acceleration bằng 0. Vì vậy velocity chưa đổi; position tăng theo velocity × dt. Việc giới hạn speed và wrap là chính sách của thế giới, không phải một nguồn lực làm cá thể quay đầu.",
        },
        {
          title: "Vẽ được hướng chuyển động",
          explanation:
            "`side` vuông góc với direction nên hai góc đuôi nằm hai bên. `worldToScreen` chỉ thêm offset viewport; resize/DPI được SDL logical presentation xử lý, không sửa position.",
        },
        {
          title: "Đọc chỗ nối vào ứng dụng",
          explanation:
            "`stepBoids` đọc vector cũ, ghi vector mới và gọi `integrateBoid`. Sau `swap`, renderer đọc đúng state mới. Đường đưa framebuffer lên texture nằm trong `presentFrame`, không nằm trong hàm tích phân.",
        },
      ],
    },
    "p27-l02": {
      focus: "ID, seed, 256–1.024 cá thể và ý nghĩa của hai snapshot đọc/ghi.",
      expected:
        "Có đủ ba preset, ID từ 0 đến N−1 và không bị đổi qua các bước. Cùng seed/cấu hình tạo lại từng position và velocity; seed 0 có chính sách rõ.",
      files: ["include/flock.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Thêm bộ sinh theo seed",
          explanation:
            "XorShift32 dùng số nguyên unsigned 32 bit. Chia cho 2³² cho giá trị trong [0,1), không sinh đúng cạnh trên. Seed 0 được thay bằng hằng số công bố; bộ sinh này không dành cho mật mã.",
        },
        {
          title: "Tạo đủ cá thể trước vòng lặp",
          explanation:
            "Ba lần lấy mẫu cho position.x, position.y và góc. Mọi cá thể bắt đầu ở 60% speed cap; không đổi vận tốc bằng random ở những bước tiếp theo.",
        },
        {
          title: "Nối đàn vào Reset",
          explanation:
            "Reset xóa time, metrics và selection cũ rồi tạo đúng cấu hình hiện tại. `next` là vùng ghi cho bước sau; nó không phải một đàn thứ hai có đời sống riêng.",
        },
      ],
    },
    "p27-l03": {
      focus: "Radius, self, minimum image và vòng lặp mọi cặp có phép kiểm độc lập.",
      expected:
        "Fixture (1,1), (4,5), (959,1) với R=5 cho hai hàng xóm của cá thể đầu. Query không trả self và nhận cá thể khác ID trùng vị trí.",
      files: [
        "include/neighbors.hpp",
        "include/simulation.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đo khoảng cách qua hai mép",
          explanation:
            "Nếu chênh lệch lớn hơn nửa chu kỳ, đi qua mép gần hơn. Tại đúng nửa chu kỳ giữ dấu để displacement của hai chiều đối nhau; radius của ứng dụng luôn nhỏ hơn nửa cạnh ngắn nhất.",
        },
        {
          title: "Tạo vector offset dùng chung",
          explanation:
            "Query, separation và cohesion phải dùng cùng quy ước. Chỉ wrap position lúc vẽ nhưng vẫn tính lực bằng khoảng cách thô sẽ tạo một đường đứt tương tác ở mép.",
        },
        {
          title: "Viết vòng tìm hàng xóm",
          explanation:
            "Bỏ self theo ID, không theo vị trí. Hai cá thể khác ID nhưng trùng vị trí vẫn là hàng xóm khi radius=0. Dùng <= để nhận đúng đường biên; chưa thêm epsilon vào radius.",
        },
        {
          title: "Chạy query cho toàn đàn",
          explanation:
            "Bản này vẫn chưa có steering nên đàn tiếp tục bay thẳng. Metrics đếm N−1 phép kiểm cho mỗi cá thể, tổng N(N−1), dù số hàng xóm thực sự ít hơn nhiều.",
        },
      ],
    },
    "p27-l04": {
      focus: "Từ hướng tránh tới desired velocity và gia tốc có giới hạn, kể cả khi trùng vị trí.",
      expected:
        "Một hàng xóm ở bên phải tạo separation sang trái khi velocity ban đầu bằng 0. Không có hàng xóm hoặc hai đóng góp đối xứng cho vector tổng bằng 0.",
      files: [
        "include/steering.hpp",
        "include/simulation.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đổi hướng mong muốn thành gia tốc",
          explanation:
            "Không gán velocity mới ngay theo direction: desired velocity trừ velocity hiện tại cho biết cần đổi bao nhiêu. Chia response time ra đơn vị world/s², rồi giới hạn maxAcceleration.",
        },
        {
          title: "Quy định trường hợp trùng vị trí",
          explanation:
            "Hai ID quyết định một trục và hai hướng đối nhau. Không phụ thuộc index nên đảo thứ tự vector không đổi quy tắc; không gọi random mới mỗi frame.",
        },
        {
          title: "Tính separation từ hàng xóm",
          explanation:
            "Mỗi offset đóng góp −offset/distance²: độ lớn tỷ lệ nghịch khoảng cách. Cá thể rất gần có ảnh hưởng hướng lớn hơn cá thể xa. Sau khi cộng, helper đổi hướng đó thành steering có giới hạn.",
        },
        {
          title: "Dùng kết quả trong bước cập nhật",
          explanation:
            "Không tính steering chỉ để vẽ mũi tên. Acceleration phải được truyền vào `integrateBoid`, rồi state mới được dùng ở frame sau. Mọi query vẫn đọc cùng snapshot cũ.",
        },
      ],
    },
    "p27-l05": {
      focus: "Đọc vận tốc cục bộ, xử lý trung bình bằng 0 và giữ separation đang có.",
      expected:
        "Một hàng xóm có velocity hướng lên/xuống tạo desired heading tương ứng, không phải hướng từ position của nó tới gốc. Hai velocity đối nhau có tổng 0 cho alignment=0.",
      files: ["include/steering.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Mở rộng hàm đang có",
          explanation:
            "Thêm `velocitySum`, cộng velocity từng hàng xóm rồi gọi `desiredSteering`. Tổng và trung bình cho cùng hướng sau chuẩn hóa khi count>0, nên code không cần chia rồi lại chuẩn hóa. Nếu tổng bằng 0, alignment trả 0, không tự phanh.",
        },
      ],
    },
    "p27-l06": {
      focus: "Tâm cục bộ từ displacement, không lấy trung bình sai giữa hai mép thế giới.",
      expected:
        "Một hàng xóm ở bên phải cho hướng cohesion sang phải khi velocity ban đầu bằng 0. Hàng xóm qua mép trái/phải được xử lý bằng displacement gần nhất.",
      files: ["include/steering.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Thêm hướng về tâm lân cận",
          explanation:
            "Tâm cục bộ là position hiện tại cộng offset trung bình. Để chỉ lấy hướng từ cá thể tới tâm, dùng offsetSum là đủ. Không lấy trung bình tọa độ x/y tuyệt đối khi đàn băng qua mép.",
        },
      ],
    },
    "p27-l07": {
      focus: "Trọng số, speed cap, fixed timestep, giới hạn catch-up và kiểm thứ tự duyệt.",
      expected:
        "Snapshot ban đầu không bị thay đổi; reverse storage rồi ghép theo ID cho cùng state một bước trong tolerance 1e-9. Sau mỗi bước, velocity không vượt maxSpeed và acceleration không vượt maxAcceleration.",
      files: ["include/simulation.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm lại toàn bộ một bước",
          explanation:
            "`boids` là const, `output` là vector khác. Không swap trong vòng lặp. Params, validation và chuẩn bị buffer nằm trong totalMs; query/update được đo thành hai phần để đọc chi phí.",
        },
        {
          title: "Giữ nhịp mô phỏng tách khỏi nhịp vẽ",
          explanation:
            "Tối đa ba bước 1/60 s mỗi frame. Nếu CPU không theo kịp, phần thời gian thực bỏ được cộng vào droppedSeconds. Đồng hồ scene.time chỉ tăng khi thật sự chạy một bước; đây không phải lời hứa chạy cùng tốc độ thời gian thực trên mọi máy.",
        },
      ],
    },
    "p27-l08": {
      focus: "Hoàn thiện controls, chọn/drag, vector debug và benchmark hữu hạn có thể hủy.",
      expected:
        "Sau 27 tick có đúng ba dòng, mỗi dòng bảy mẫu đã loại warm-up. Counts 256/512/1024 tương ứng 65.280 / 261.632 / 1.047.552 phép kiểm mỗi bước.",
      files: [
        "include/benchmark.hpp",
        "include/scene.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Giữ dữ liệu đo riêng với đàn đang xem",
          explanation:
            "BenchmarkJob sở hữu snapshot 1.024 cá thể và bản sao params. Đổi vị trí cá thể trên màn hình không làm thay đầu vào giữa các mẫu; createBenchmark chỉ tạo job, chưa chạy vòng lặp đo.",
        },
        {
          title: "Cho phép đo tiến từng bước hữu hạn",
          explanation:
            "Mỗi dòng lấy prefix cùng vector 1.024 cá thể. Hai lượt đầu là warm-up, bảy lượt sau bắt đầu từ cùng snapshot. Source copy nằm ngoài timer của stepBoids; checksum cũng nằm ngoài. UI có cơ hội xử lý Cancel giữa các tick.",
        },
        {
          title: "Nối job vào clock và bàn phím",
          explanation:
            "advanceScene xử lý một tick benchmark trước khi xét paused. B khởi tạo, Escape hủy trước khi thoát; Reset hoặc đổi mô hình không được giữ kết quả đo của cấu hình cũ.",
        },
      ],
    },
    "p27-l09": {
      focus: "Fixture, oracle chín ảnh, permutation, dt, CTest và gói source độc lập.",
      expected:
        "Chạy được 256, 512, 1.024 cá thể; chọn preset lớn và thay từng trọng số thấy hành vi đổi thật. Cùng seed/config tái lập; query khớp oracle đầy đủ ID, không chỉ count.",
      files: ["tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc những kiểm tra có đáp án biết trước",
          explanation:
            "Các hằng số đầu tiên của XorShift là fixture độc lập. Các vector separation/alignment/cohesion có thể tính bằng tay. Những nhóm test tiếp theo đối chiếu query với chín ảnh, đổi thứ tự lưu, dt, preset 1.024 và benchmark.",
        },
      ],
    },
  },
  references: {
    "p27-l01": [
      {
        label: "world-space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "fixed-timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l02": [
      {
        label: "deterministic-simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      {
        label: "boids-double-buffer",
        href: "/glossary#boids-double-buffer",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l03": [
      {
        label: "brute-force-query",
        href: "/glossary#brute-force-query",
        kind: "Thuật ngữ",
      },
      {
        label: "minimum-image",
        href: "/glossary#minimum-image",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l04": [
      {
        label: "boids-separation",
        href: "/glossary#boids-separation",
        kind: "Thuật ngữ",
      },
      {
        label: "boids-steering",
        href: "/glossary#boids-steering",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l05": [
      {
        label: "boids-alignment",
        href: "/glossary#boids-alignment",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l06": [
      {
        label: "boids-cohesion",
        href: "/glossary#boids-cohesion",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l07": [
      {
        label: "fixed-timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
      {
        label: "boids-double-buffer",
        href: "/glossary#boids-double-buffer",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l08": [
      {
        label: "benchmark-warm-up",
        href: "/glossary#benchmark-warm-up",
        kind: "Thuật ngữ",
      },
      {
        label: "benchmark-checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l09": [
      {
        label: "boids",
        href: "/glossary#boids",
        kind: "Thuật ngữ",
      },
      {
        label: "boids-double-buffer",
        href: "/glossary#boids-double-buffer",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
