import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p47-l01": {
      focus: "Lưu theta và vẽ từng ô trước khi thêm chuyển động.",
      expected: "Gaussian 32×32 đứng yên; resize không tạo lại field.",
      files: ["src/main.cpp", "include/field.hpp", "include/presets.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Chạy starter",
          explanation: "Khung SDL/RAII và panel được cung cấp; bắt đầu từ cửa sổ thật.",
        },
        {
          title: "Tạo dữ liệu một lần",
          explanation: "Field giữ double theo row-major, không giữ màu.",
        },
        {
          title: "Đặt vòng vẽ đúng chỗ",
          explanation: "Clear, drawGrid, panel rồi present; chưa có diffuse.",
        },
      ],
    },
    "p47-l02": {
      focus: "Biến input thành thay đổi dữ liệu có thể nhìn thấy.",
      expected: "Vẽ nóng/lạnh liên tục và không lệch sau resize hoặc nối qua ngoài tấm.",
      files: [
        "include/layout.hpp",
        "include/brush.hpp",
        "include/workshop.hpp",
        "include/input.hpp",
      ],
      steps: [
        {
          title: "Đổi tọa độ",
          explanation:
            "Window → logical → cell, kiểm nửa khoảng mở thay vì kéo điểm ngoài vào mép.",
        },
        {
          title: "Tô một đĩa",
          explanation: "Bán kính theo ô; bút chỉ đặt theta ở sample, không phải công suất.",
        },
        {
          title: "Nối và ngắt nét",
          explanation:
            "Stamp dùng cùng hàm cho chuột/phím; hủy previous khi ra ngoài hoặc mất focus.",
        },
      ],
    },
    "p47-l03": {
      focus: "Xây sai phân 1D từ trao đổi giữa các ô.",
      expected: "Xung 1 cho tâm 0,6, hai bên 0,2; hàng trên/dưới vẫn 0.",
      files: ["include/parameters.hpp", "include/diffusion.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tính chênh lệch hai phía",
          explanation: "Left-center và right-center cộng thành sai phân bậc hai.",
        },
        {
          title: "Đọc cùng thời điểm",
          explanation: "Mọi ô đọc current, ghi next; chỉ swap sau khi tính xong.",
        },
        {
          title: "Nối nút N",
          explanation: "Một yêu cầu step gọi một bước solver, không đổi thành một lần mỗi frame.",
        },
      ],
    },
    "p47-l04": {
      focus: "Mở bài toán từ từng hàng ra cả mặt phẳng.",
      expected: "Tâm và bốn ô cạnh bằng 0,2; ô chéo vẫn 0 sau bước đầu.",
      files: ["include/diffusion.hpp", "include/field.hpp"],
      steps: [
        {
          title: "Thêm hướng y",
          explanation: "Vertical có dy và ry riêng; không lấy trung bình tùy ý tám hàng xóm.",
        },
        {
          title: "Kiểm bằng đáp án tính tay",
          explanation: "Dấu cộng phân biệt stencil với blur 3×3 và cập nhật tại chỗ.",
        },
        {
          title: "Giữ double buffer",
          explanation: "Đảo thứ tự duyệt không được đổi kết quả một bước.",
        },
      ],
    },
    "p47-l05": {
      focus: "Nói rõ mô hình ở mép và ở nguồn.",
      expected: "Vành lạnh không bị brush phá; heater giữ 0/1 và unpin không xóa nhiệt đã có.",
      files: ["include/field.hpp", "include/brush.hpp", "include/diffusion.hpp"],
      steps: [
        {
          title: "Đóng mặt ngoài",
          explanation: "Ghost bằng chính ô sát mặt tạo thông lượng ngoài bằng 0.",
        },
        {
          title: "Giữ vành ở 0",
          explanation: "Đây là giữ tâm các ô ngoài, khác miền ghost-cell cách nhiệt.",
        },
        {
          title: "Ghi nguồn riêng",
          explanation:
            "Heater thay giá trị ứng viên và cộng sourceChange; không áp bảo toàn cho ca có nguồn.",
        },
      ],
    },
    "p47-l06": {
      focus: "Biết giới hạn dt bằng cả trọng số và thí nghiệm.",
      expected:
        "Cấu hình chuẩn chạy; checker dt=0,05 phân kỳ khi chủ động bật experiment, rồi dừng hữu hạn.",
      files: [
        "include/parameters.hpp",
        "include/diffusion.hpp",
        "include/timing.hpp",
        "include/input.hpp",
        "src/main.cpp",
      ],
      steps: [
        { title: "Đọc trọng số tâm", explanation: "1-2rx-2ry không âm khi rx+ry≤0,5." },
        {
          title: "Cho phép sai có giới hạn",
          explanation:
            "Chặn ở chế độ thường; experiment giữ raw theta và từ chối ứng viên vượt biên an toàn.",
        },
        {
          title: "Tách đồng hồ",
          explanation:
            "dt là giây mô hình, không phải thời gian một lần vẽ; dropped đã tính speed.",
        },
      ],
    },
    "p47-l07": {
      focus: "Vẽ toàn lưới lớn mà không đổi thuật toán nhiệt.",
      expected: "192×192 cập nhật/vẽ đủ 36.864 ô; G đổi h nhưng không sửa D/dt.",
      files: ["include/view.hpp", "include/pixels.hpp", "include/workshop.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Cấp texture một lần",
          explanation: "Capacity 256² đủ cả ba độ phân giải, source rect chỉ lấy vùng đã upload.",
        },
        {
          title: "Ghi RGBA theo pitch",
          explanation: "Mọi byte trong vùng lock được ghi; không mặc định pitch=width×4.",
        },
        { title: "Giữ miền vật lý", explanation: "h=96/N; tăng N có thể làm dt cũ vi phạm CFL." },
      ],
    },
    "p47-l08": {
      focus: "Đọc một thí nghiệm thay vì chỉ nhìn vùng màu sáng.",
      expected: "Có sáu cảnh, probe cố định trong grid và đồ thị theo thời gian mô hình.",
      files: [
        "include/presets.hpp",
        "include/metrics.hpp",
        "include/workshop.hpp",
        "include/panel.hpp",
      ],
      steps: [
        {
          title: "Chọn cảnh có dự đoán",
          explanation: "Uniform, checker và cosine trả lời những câu hỏi khác Gaussian.",
        },
        {
          title: "Ghi probe sau bước được chấp nhận",
          explanation: "Không ghi một sample mỗi lần present hoặc lặp khi pause.",
        },
        {
          title: "Đọc tích phân đúng đơn vị",
          explanation:
            "I*=sum(theta)dxdy, không tự gán Joule; graph tự đổi y nhưng heatmap không đổi thang.",
        },
      ],
    },
    "p47-l09": {
      focus: "Chứng minh đúng mô hình, quy mô và cách dùng bằng các phép kiểm riêng.",
      expected:
        "Source đầy đủ chạy được, oracle/CTests có thể thất bại và benchmark Release có raw samples.",
      files: [
        "include/reference.hpp",
        "include/validation.hpp",
        "include/benchmark.hpp",
        "tests/tests.cpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Oracle khác cách tính",
          explanation:
            "Thông lượng qua cạnh kiểm chéo stencil, không gọi lại sample/diffuse của bản chính.",
        },
        {
          title: "Tách hai nghiệm tham chiếu",
          explanation: "G^n kiểm scheme; exp(-Dk²t) kiểm sai phân so với PDE.",
        },
        {
          title: "Đo và bàn giao",
          explanation:
            "Build từng target từ ZIP, chạy CPU tests và kiểm trực tiếp UI; không suy FPS chung từ timing CPU.",
        },
      ],
    },
  },
  references: {
    "p47-l01": [
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
    ],
    "p47-l02": [
      {
        label: "SDL_RenderCoordinatesFromWindow",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderCoordinatesFromWindow",
        kind: "SDL API",
      },
    ],
    "p47-l03": [
      { label: "Laplacian rời rạc", href: "/glossary#heat-laplacian", kind: "Thuật ngữ" },
    ],
    "p47-l04": [
      { label: "Double buffer", href: "/glossary#heat-double-buffer", kind: "Thuật ngữ" },
    ],
    "p47-l05": [
      { label: "Điều kiện biên nhiệt", href: "/glossary#heat-boundary", kind: "Thuật ngữ" },
    ],
    "p47-l06": [
      {
        label: "Heat equation / stability — Oxford",
        href: "https://www.robots.ox.ac.uk/~ian/Teaching/Computation/lab6.pdf",
        kind: "Thuật ngữ",
      },
    ],
    "p47-l07": [
      {
        label: "SDL_LockTexture: write-only và pitch",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p47-l08": [
      { label: "Nhiệt độ chuẩn hóa", href: "/glossary#normalized-temperature", kind: "Thuật ngữ" },
    ],
    "p47-l09": [
      {
        label: "Heat equation / sai phân — Oxford",
        href: "https://www.robots.ox.ac.uk/~ian/Teaching/Computation/lab6.pdf",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
