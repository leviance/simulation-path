import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p57-l01": {
      focus: "Vẽ được miền vật liệu và điểm phát trước khi gọi RNG.",
      expected: "Rectangle XY và photon ở cạnh trái, không hiệu ứng suy giảm giả.",
      files: ["include/model.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy starter",
          explanation: "Window/renderer, event loop và cleanup SDL chạy độc lập với website.",
        },
        {
          title: "Giữ dữ liệu world XY",
          explanation: "Photon giữ position/direction; screen mới đảo y và đổi sang logical pixel.",
        },
        {
          title: "Vẽ vật thể nhỏ nhất",
          explanation:
            "SDL_RenderFillRect dựng medium và marker; SDL_RenderDebugText chỉ dùng nhãn ASCII.",
        },
      ],
    },
    "p57-l02": {
      focus: "Dùng ngẫu nhiên có thể tái lập để lấy mẫu khoảng cách liên tục.",
      expected: "Cùng seed/ID cho cùng y, U và S; đổi ID tạo một luồng khác.",
      files: ["include/random.hpp", "include/controls.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Làm chủ RNG",
          explanation:
            "Xorshift32 dùng uint32 wrap; JS dùng >>> và Math.imul để giữ quy tắc tương ứng.",
        },
        {
          title: "Tránh hai endpoint",
          explanation:
            "U=(uint32+.5)/2^32 nằm trong (0,1); không dùng phép chia trả về đúng 1 rồi log(0).",
        },
        {
          title: "Đổi U thành S",
          explanation: "S=-log1p(-U)/muT; muT=0 cho vô hạn và được xử lý như chân không.",
        },
      ],
    },
    "p57-l03": {
      focus: "Tương tác chỉ tồn tại bên trong đoạn trước khi photon rời medium.",
      expected:
        "Photon dừng tại ứng viên tương tác hoặc đúng một cạnh, không bay ra ngoài rồi mới xử lý.",
      files: ["include/geometry.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tìm cạnh sắp gặp",
          explanation:
            "Với mỗi trục có direction khác 0, chọn cạnh theo dấu rồi lấy khoảng cách nhỏ nhất.",
        },
        {
          title: "So hai sự kiện cạnh tranh",
          explanation: "Đi min(S,boundary); S>=boundary được xếp thoát, kể cả tie hữu hạn.",
        },
        {
          title: "Kiểm các trường hợp khó",
          explanation:
            "Ở cạnh hướng ra ngoài có distance 0; hướng song song không chia cho 0, không đẩy epsilon vào medium.",
        },
      ],
    },
    "p57-l04": {
      focus: "Hoàn tất một lịch sử hấp thụ thuần trước khi thêm scattering.",
      expected: "Trace có emission rồi absorption hoặc escape; muS bắt buộc bằng 0.",
      files: ["include/transport.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Ghi điểm phát",
          explanation: "Khởi tạo RNG theo photon ID, lấy y và ghi vertex Emission đầu tiên.",
        },
        {
          title: "Kết thúc đúng sự kiện",
          explanation:
            "Nếu chạm biên trước thì Escaped; nếu gặp tương tác trong medium chỉ hấp thụ thì Absorbed.",
        },
        {
          title: "Không giảm trọng số lần nữa",
          explanation:
            "Analog photon còn hoặc mất một đơn vị; không nhân exp(-muA*S) thêm vào mẫu đã lấy theo phân bố mũ.",
        },
      ],
    },
    "p57-l05": {
      focus: "Phân biệt hấp thụ, tán xạ và hết ngân sách mà chưa biết kết cục.",
      expected:
        "Có đường gấp khúc; thanh timeline chỉ xem lại, màu ở điểm đang xem theo sự kiện tại điểm đó.",
      files: ["include/transport.hpp", "include/controls.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn loại tương tác",
          explanation:
            "Tại collision, dùng U mới so muA/muT; không dùng lại U đã quyết định free path.",
        },
        {
          title: "Sinh hướng mới",
          explanation: "angle=2πU cho hướng đều trên đường tròn 2D, không phải sphere sampling 3D.",
        },
        {
          title: "Lặp từng bước và trả đúng lịch sử",
          explanation:
            "advancePhoton trả void sau một bước; tracePhoton trả Trace khi kết thúc, hoặc ghi Censored nếu hết ngân sách mà vẫn sống.",
        },
      ],
    },
    "p57-l06": {
      focus: "Biến các lịch sử riêng thành thống kê đúng mẫu số.",
      expected: "completed=absorbed+escaped+censored; xem lại ID không làm tăng completed.",
      files: ["include/statistics.hpp", "include/controls.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Định nghĩa nhóm kết thúc",
          explanation:
            "Một photon chỉ vào một nhóm; scatteredPhotons và scatterEvents là readout bổ sung, không cộng vào tổng kết cục.",
        },
        {
          title: "Đếm từng ID một lần",
          explanation:
            "ID kế tiếp bằng completed; luồng RNG theo ID làm batch 1 và batch 32 cho cùng Counts.",
        },
        {
          title: "Giữ phần nhìn nhỏ",
          explanation:
            "Chỉ lưu 24 trace gần nhất; preview ID khác được dựng lại có giới hạn mà không tally.",
        },
      ],
    },
    "p57-l07": {
      focus: "Đọc ước lượng có sai số, không đòi Monte Carlo khớp một số chính xác.",
      expected:
        "Ballistic estimate so với exp(-muT*3), Wilson 95% và khoảng kết cục do Censored được ghi nhãn riêng.",
      files: ["include/statistics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn đúng đại lượng lý thuyết",
          explanation:
            "Beer–Lambert ở đây dự đoán không tương tác, không phải tổng thoát khi còn tán xạ.",
        },
        {
          title: "Tính Wilson interval",
          explanation:
            "Dùng k ballistic trên N completed; N=0 chưa có ước lượng, k=0/N vẫn có interval không suy biến.",
        },
        {
          title: "Tách hai nguồn bất định",
          explanation:
            "Sai số mẫu giảm theo 1/sqrt(N) trong mô hình lý tưởng; tăng N không xóa censoring hoặc sai mô hình.",
        },
      ],
    },
    "p57-l08": {
      focus: "Hoàn thiện lượt chạy có ngân sách và kiểm nguồn chuẩn.",
      expected:
        "Scheduler tối đa 32 photon mới/frame, dừng/reset đúng; CTest Debug/Release và audit fixture nhỏ pass.",
      files: ["include/audit.hpp", "include/controls.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ UI phản hồi",
          explanation:
            "Không catch-up theo dt; batch 32 có trần 64 tương tác/photon, hủy RAF khi rời bài hoặc blur.",
        },
        {
          title: "Không trộn cấu hình",
          explanation: "Settings/seed/limit/count đổi tạo Experiment mới; timeline/ID chỉ xem lại.",
        },
        {
          title: "Kiểm độc lập",
          explanation:
            "PRNG fixture, inverse CDF, boundary, conservation, batch invariance và Beer–Lambert dùng expected riêng; tests không mở SDL window.",
        },
      ],
    },
  },
  references: {
    "p57-l01": [
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
    ],
    "p57-l02": [
      { label: "Quãng đường tự do", href: "/glossary#photon-free-path", kind: "Thuật ngữ" },
    ],
    "p57-l03": [
      { label: "Quãng đường tự do", href: "/glossary#photon-free-path", kind: "Thuật ngữ" },
    ],
    "p57-l04": [
      {
        label: "Analog photon transport",
        href: "/glossary#photon-analog-transport",
        kind: "Thuật ngữ",
      },
    ],
    "p57-l05": [
      {
        label: "Photon bị dừng bởi ngân sách",
        href: "/glossary#photon-censoring",
        kind: "Thuật ngữ",
      },
    ],
    "p57-l06": [
      { label: "Ballistic và tổng thoát", href: "/glossary#photon-ballistic", kind: "Thuật ngữ" },
    ],
    "p57-l07": [
      {
        label: "Bất định Monte Carlo",
        href: "/glossary#photon-monte-carlo-uncertainty",
        kind: "Thuật ngữ",
      },
    ],
    "p57-l08": [
      {
        label: "Photon bị dừng bởi ngân sách",
        href: "/glossary#photon-censoring",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
