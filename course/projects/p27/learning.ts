import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p27-l01": {
      focus:
        "Khởi đầu từ khung SDL có sẵn, sinh đủ 100.000 Particle theo seed rồi đưa dữ liệu thật lên framebuffer.",
      expected:
        "Cùng một `seed` luôn tạo lại đúng vị trí theo từng index; đổi `seed` làm đám hạt thay đổi nhưng không hạt nào ra ngoài `[0,1]²`.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc dữ liệu trước khi vẽ",
          explanation:
            "Ở project này, mỗi hạt chỉ cần vị trí. Index trong vector đóng vai trò định danh ổn định, nên kết quả truy vấn chỉ cần trả về các index.",
        },
        {
          title: "Dùng lại cùng chuỗi số",
          explanation:
            "`XorShift32` tạo lại cùng chuỗi số sau mỗi lần reset. Nhờ đó phép đo hiệu năng và truy vấn đối chiếu luôn dùng đúng cùng dữ liệu.",
        },
        {
          title: "Vẽ từng hạt từ vector",
          explanation:
            "Sinh dữ liệu trước vòng lặp chính và trước vùng đo thời gian. Mỗi khung hình chỉ đọc vector đã có để vẽ.",
        },
      ],
    },
    "p27-l02": {
      focus:
        "Đặt CircleQuery bằng chuột, đổi tọa độ đúng một lần và hiểu phép kiểm một hạt trước khi viết vòng lặp.",
      expected:
        "Tọa độ chuột được đổi đúng một lần rồi clamp vào world; đọc vị trí tâm, R và phép kiểm riêng hạt index 0.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi vị trí chuột về world",
          explanation:
            "Tâm truy vấn phải dùng world coordinates. Khi cửa sổ đổi kích thước, chỉ hình vẽ thay đổi; vị trí truy vấn trong thế giới vẫn giữ nguyên.",
        },
        {
          title: "Kiểm một hạt trước",
          explanation:
            "Lấy `dx` và `dy` từ tâm đến hạt rồi tính khoảng cách Euclid. Renderer chỉ hiển thị kết quả, không được quyết định hạt nào là hit.",
        },
        {
          title: "Nhận cả điểm trên biên",
          explanation:
            "Dùng `distance <= radius` để hạt nằm đúng trên đường tròn vẫn được tính là hit. Test và ứng dụng phải dùng cùng quy ước này.",
        },
      ],
    },
    "p27-l03": {
      focus:
        "Viết một full scan dễ đọc, thu mọi hit và xác định nearest kể cả khi vòng tròn không chứa hạt nào.",
      expected:
        "Full query luôn báo scanned=N; scan progress một phần chỉ trả hits trong prefix đã đi qua.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Không dừng ở hit đầu",
          explanation:
            "Đề bài cần toàn bộ hạt trong kính lúp, không chỉ hạt đầu tiên. Vì vậy vòng lặp phải chạy đến phần tử cuối cùng.",
        },
        {
          title: "Chọn nearest ổn định",
          explanation:
            "Chỉ thay hạt gần nhất khi khoảng cách mới nhỏ hơn hẳn. Nếu hai hạt cách đều tâm, giữ hạt có index xuất hiện trước.",
        },
        {
          title: "Đếm việc đã làm, không chỉ kết quả",
          explanation:
            "`hits` cho biết có bao nhiêu hạt nằm trong vòng tròn; `scanned` cho biết thuật toán đã kiểm bao nhiêu hạt. Đây là hai ý nghĩa khác nhau.",
        },
      ],
    },
    "p27-l04": {
      focus: "Bỏ phép căn và dùng lại QueryWorkspace nhưng giữ đường reference để kiểm kết quả.",
      expected:
        "Hai phiên bản trả về cùng danh sách hit và cùng hạt gần nhất; vector kết quả không phải cấp phát lại ở mỗi truy vấn.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "So khoảng cách bình phương",
          explanation:
            "Vì radius không âm, distance <= radius tương đương distance² <= radius² mà không cần gọi sqrt cho từng particle.",
        },
        {
          title: "Giữ sức chứa của vector",
          explanation:
            "`QueryWorkspace` sống qua nhiều lần gọi. `clear()` xóa kết quả cũ nhưng vẫn giữ vùng nhớ đã `reserve()` để dùng tiếp.",
        },
        {
          title: "Đối chiếu toàn bộ index",
          explanation:
            "Chỉ đo tốc độ sau khi hai phiên bản cho cùng kết quả. Chạy nhanh hơn nhưng bỏ sót biên hoặc chọn sai hạt gần nhất vẫn là sai.",
        },
      ],
    },
    "p27-l05": {
      focus: "Đo riêng query với warm-up, checksum đầy đủ và job hữu hạn có thể hủy.",
      expected:
        "Sau 24 warm-up, benchmark đo đúng 48 query; totalScanned=N×48, checksum lặp lại được và thời gian không chứa rendering.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "Chuẩn bị dữ liệu ngoài vùng đo",
          explanation:
            "Particle generation, query generation, reserve và render không được tính vào thời gian brute-force scan.",
        },
        {
          title: "Chạy warm-up trước",
          explanation:
            "Chạy thử một lượt trước khi bật đồng hồ để cache và runtime đã đi qua đúng đoạn mã sẽ đo. Lượt này không được cộng vào kết quả.",
        },
        {
          title: "Dùng kết quả và đếm đúng work",
          explanation:
            "Checksum phụ thuộc vào kết quả từng truy vấn; `totalScanned` xác nhận vòng lặp đã thực hiện đúng số lần kiểm dự kiến.",
        },
      ],
    },
    "p27-l06": {
      focus: "Giữ cùng probes, chỉ đổi N để so bảng timing và exact work trên ba prefix chuẩn.",
      expected:
        "Ba dòng đều có Q=48, scans=48.000 / 480.000 / 4.800.000; không ép timing tăng đúng mười lần.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "Giữ cùng dữ liệu và câu hỏi",
          explanation:
            "Mỗi mốc chỉ lấy một đoạn đầu của cùng vector 100.000 hạt. Không sinh ba cảnh khác nhau vì như vậy phép so sánh sẽ bị nhiễu.",
        },
        {
          title: "Đọc số lần kiểm trước timing",
          explanation:
            "Thời gian có thể dao động theo máy, còn `N × Q` là số lần kiểm xác định. Hãy đọc con số này trước để thấy trực tiếp độ phức tạp O(N).",
        },
        {
          title: "Phân biệt bán kính với độ phức tạp",
          explanation:
            "Bán kính lớn tạo nhiều hit hơn, nhưng brute force vẫn phải kiểm mọi hạt. Chỉ phần chi phí ghi kết quả có thể tăng thêm.",
        },
      ],
    },
    "p27-l07": {
      focus:
        "Hoàn thiện auto probe, clean mode, input lifecycle và bộ test cho ứng dụng SDL hoàn chỉnh.",
      expected:
        "Bản cuối chạy với 100.000 hạt, luôn nhả chuột đúng lúc, phép đo luôn kết thúc và CTest đạt ở cả Debug lẫn Release.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "include/presentation.hpp",
        "tests/tests.cpp",
        "tests/extra-cases.hpp",
      ],
      steps: [
        {
          title: "Ghép tương tác vào state hiện có",
          explanation:
            "Chuột và bàn phím chỉ đổi query hoặc cấu hình; job dùng probes riêng, dừng được và không ghi đè kết quả kính lúp.",
        },
        {
          title: "Vẽ đủ số hạt đã chọn",
          explanation:
            "Canvas và C++ đều đưa toàn bộ N hạt lên ảnh; bitmap nền được dùng lại để tránh vẽ lại đám hạt khi chỉ tâm query thay đổi.",
        },
        {
          title: "Giữ mốc đối chiếu cho Project 28",
          explanation:
            "Lưu lại checksum, bộ truy vấn và bảng tăng trưởng. Project 28 sẽ dùng chính chúng để so Spatial Grid với brute force trên cùng bài toán.",
        },
      ],
    },
  },
  references: {
    "p27-l01": [
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      {
        label: "Row-major order",
        href: "/glossary#row-major-order",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l02": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Circle query",
        href: "/glossary#circle-query",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l03": [
      {
        label: "Brute-force query",
        href: "/glossary#brute-force-query",
        kind: "Thuật ngữ",
      },
      {
        label: "Linear complexity",
        href: "/glossary#linear-complexity",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l04": [
      {
        label: "Squared distance",
        href: "/glossary#squared-distance",
        kind: "Thuật ngữ",
      },
      {
        label: "Hot loop",
        href: "/glossary#hot-loop",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l05": [
      {
        label: "Benchmark warm-up",
        href: "/glossary#benchmark-warm-up",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l06": [
      {
        label: "Linear complexity",
        href: "/glossary#linear-complexity",
        kind: "Thuật ngữ",
      },
      {
        label: "Brute-force query",
        href: "/glossary#brute-force-query",
        kind: "Thuật ngữ",
      },
    ],
    "p27-l07": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
