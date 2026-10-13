import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p50-l01": {
      focus: "Có hình chạy được trước khi học SPH.",
      expected: "96 hạt đứng yên bên trái bể; resize không đổi tọa độ.",
      files: ["include/model.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy starter",
          explanation: "Window/renderer có kiểm lỗi và logical presentation 800×660.",
        },
        {
          title: "Dựng dữ liệu hạt",
          explanation: "Particle giữ position/velocity; makeState tạo cột 8×12 từ spacing.",
        },
        {
          title: "Vẽ chấm tròn",
          explanation:
            "toScreen đổi world y lên; drawDisk vẽ scanline, drawScene không sửa physics.",
        },
      ],
    },
    "p50-l02": {
      focus: "Tách chuyển động tự do khỏi tương tác chất lỏng.",
      expected: "N làm velocity giảm theo g*dt; hạt dừng/nảy nhỏ ở thành, chưa lan ngang.",
      files: ["include/solver.hpp", "src/main.cpp"],
      steps: [
        { title: "Dựng acceleration", explanation: "Mỗi hạt nhận (0,−g), chưa đọc hàng xóm." },
        {
          title: "Tích phân theo dt",
          explanation: "Cập nhật velocity trước position bằng semi-implicit Euler.",
        },
        {
          title: "Giữ trong bể",
          explanation:
            "Chỉ phản xạ normal hướng ra ngoài, restitution 0.1; trần trên là giới hạn demo.",
        },
      ],
    },
    "p50-l03": {
      focus: "Hiểu trọng số trước khi cộng density.",
      expected: "Vòng nhỏ là h, vòng lớn là 2h; gradient tại gốc bằng 0.",
      files: ["include/kernel.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Chọn h và support",
          explanation: "h=1.3*spacing, support=2h; không lấy bán kính vẽ làm support.",
        },
        {
          title: "Viết cubic spline",
          explanation: "Hai nhánh polynomial, hệ số 10/(7πh²) chuẩn hóa theo diện tích.",
        },
        {
          title: "Lấy gradient",
          explanation: "Đạo hàm theo q rồi nhân displacement/r; xử lý r=0 riêng.",
        },
      ],
    },
    "p50-l04": {
      focus: "Density là một tổng có đơn vị, không phải số đếm hàng xóm.",
      expected:
        "Hạt trong lòng cột gần rho0, hạt mặt thoáng có density thấp; mẫu tường bù support đáy.",
      files: ["include/model.hpp", "include/neighbors.hpp", "include/solver.hpp"],
      steps: [
        {
          title: "Lập all-pairs",
          explanation: "Fluid đứng trước wall trong positions, giữ self trong cutoff.",
        },
        {
          title: "Cộng mW",
          explanation: "ComputeDensity hoàn tất cho mọi hạt trước khi lực đọc density.",
        },
        {
          title: "Thêm mẫu tường",
          explanation: "Ba lớp ngoài đáy/hai bên, không trùng góc; không có mẫu SPH ở trần.",
        },
      ],
    },
    "p50-l05": {
      focus: "Suy lực đẩy từ density thay vì thêm repulsion tùy ý.",
      expected:
        "Cặp độc lập cho force ±211.561054; bể dùng summation density và bắt đầu lan ngang.",
      files: ["include/solver.hpp", "include/pair.hpp", "include/pair-view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi density thành pressure",
          explanation:
            "EOS tuyến tính và clamp pressure, c điều khiển độ cứng chứ không đổi gravity.",
        },
        {
          title: "Đối xứng hai phía",
          explanation:
            "Coefficient p_i/rho_i²+p_j/rho_j² và gradient đối dấu cho lực nội cân bằng.",
        },
        {
          title: "Đọc state cũ",
          explanation:
            "Tính toàn bộ acceleration vào vector riêng rồi mới integrate; wall dùng xấp xỉ rho0/p_i.",
        },
      ],
    },
    "p50-l06": {
      focus: "Thêm tiêu tán số với điều kiện tiến lại gần.",
      expected: "Alpha dương cản cặp đang nén, không tác động cặp tách ra.",
      files: ["include/kernel.hpp", "include/solver.hpp", "include/pair.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc dấu dot product",
          explanation: "relativeVelocity·displacement âm nghĩa là khoảng cách đang giảm.",
        },
        { title: "Tính Pi", explanation: "Monaghan beta=0, epsilon²=0.01h² giữ mẫu số hữu hạn." },
        {
          title: "Ghép vào coefficient",
          explanation:
            "Cộng Pi trước khi nhân −m*gradient; so lực và công suất trên cùng cặp cho trước, không nhân dt hai lần.",
        },
      ],
    },
    "p50-l07": {
      focus: "Tối ưu search nhưng không thay mô hình.",
      expected: "Grid giảm số ứng viên và giữ nguyên kết quả của all-pairs.",
      files: ["include/neighbors.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt hạt vào bucket",
          explanation: "Cell size=2h và floor cho cả tọa độ âm của wall.",
        },
        {
          title: "Duyệt 3×3 cell",
          explanation: "Chỉ cell kề có thể giao support, vẫn lọc bình phương khoảng cách thật.",
        },
        {
          title: "So oracle",
          explanation: "Sort index giữ thứ tự cộng; test cả danh sách và trajectory 150 bước.",
        },
      ],
    },
    "p50-l08": {
      focus: "Đổ thêm mass có kiểm soát.",
      expected: "Enter/click phát hạt, overlap/capacity được báo từ chối.",
      files: ["include/emitter.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi vị trí vòi",
          explanation:
            "SDL_ConvertEventToRenderCoordinates rồi fromScreen; không dùng window pixel trực tiếp.",
        },
        {
          title: "Kiểm vị trí phát",
          explanation: "Nozzle hữu hạn, kẹp trong bể, cách hạt cũ ít nhất 0.8*spacing.",
        },
        {
          title: "Quản lý input",
          explanation:
            "Capture khi kéo; mouse up/blur/minimize hủy thao tác, arrows/Enter thay thế chuột.",
        },
      ],
    },
    "p50-l09": {
      focus: "Không buộc một frame bằng một physics step.",
      expected: "Dt thích nghi hữu hạn, dropped time hiện rõ, blur dừng solver và vòi.",
      files: ["include/solver.hpp", "include/timing.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Ước lượng dt",
          explanation: "Min của maxDt, acoustic bound và force bound, dt quá nhỏ thì dừng.",
        },
        {
          title: "Tích lũy thời gian",
          explanation: "Chỉ nhận 0.05s/frame và trừ dt thật đã chạy khỏi accumulator.",
        },
        {
          title: "Giới hạn work",
          explanation: "Tối đa 64 substep; emitter sau tick, tick tiếp theo rebuild neighbors.",
        },
      ],
    },
    "p50-l10": {
      focus: "Phân biệt kiểm đúng phép tính với chất lượng mô hình.",
      expected:
        "Ca chuẩn PASS, source đầy đủ build ở Debug/Release; compression vẫn được đọc riêng.",
      files: ["include/diagnostics.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Kernel và gradient",
          explanation:
            "Tích phân theo diện tích và finite difference độc lập với công thức derivative.",
        },
        {
          title: "Pair/search/timing",
          explanation:
            "Net force, công suất viscosity, grid oracle, emission và lịch FPS có fixture rõ.",
        },
        {
          title: "Chạy full project",
          explanation:
            "ZIP gồm starter/checkpoint/final/tests; CTest không cần window, UI V chạy ca riêng hữu hạn.",
        },
      ],
    },
  },
  references: {
    "p50-l01": [
      {
        label: "SDL_RenderLine",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderLine",
        kind: "SDL API",
      },
    ],
    "p50-l02": [
      { label: "SPH — mô phỏng chất lưu bằng hạt", href: "/glossary#sph-water", kind: "Thuật ngữ" },
    ],
    "p50-l03": [{ label: "Kernel 2D", href: "/glossary#sph-kernel-2d", kind: "Thuật ngữ" }],
    "p50-l04": [
      { label: "Summation density", href: "/glossary#sph-summation-density", kind: "Thuật ngữ" },
    ],
    "p50-l05": [{ label: "Equation of state", href: "/glossary#sph-eos", kind: "Thuật ngữ" }],
    "p50-l06": [
      {
        label: "Artificial viscosity",
        href: "/glossary#sph-artificial-viscosity",
        kind: "Thuật ngữ",
      },
    ],
    "p50-l07": [
      { label: "Support và neighbor search", href: "/glossary#sph-kernel-2d", kind: "Thuật ngữ" },
    ],
    "p50-l08": [
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p50-l09": [{ label: "SPH timestep", href: "/glossary#sph-timestep", kind: "Thuật ngữ" }],
    "p50-l10": [
      { label: "SDL với CMake", href: "https://wiki.libsdl.org/SDL3/README-cmake", kind: "CMake" },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
