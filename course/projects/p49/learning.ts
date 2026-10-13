import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p49-l01": {
      focus: "Nhìn thấy dữ liệu scalar trước khi viết solver.",
      expected: "Đám khói đứng yên gần đáy hộp; resize không đổi Grid.",
      files: ["include/grid.hpp", "include/diagnostics.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy cửa sổ nền tối",
          explanation: "Starter kiểm lỗi SDL và dùng logical presentation 800×800.",
        },
        {
          title: "Lưu concentration ở tâm ô",
          explanation: "Density là scalar của khói trên N² ô; h=1/N và vị trí mẫu có offset nửa ô.",
        },
        {
          title: "Vẽ từng ô",
          explanation: "drawGrid đổi concentration sang grayscale, không ghi màu ngược vào solver.",
        },
      ],
    },
    "p49-l02": {
      focus: "Nối input với scalar trong Grid.",
      expected: "Brush đặt/xóa nét liền và inspector đọc ô đúng sau resize.",
      files: ["include/input.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi tọa độ chuột",
          explanation: "mouseWorld đi qua logical presentation; screen y được đổi về world y lên.",
        },
        {
          title: "Đặt giá trị trong brush",
          explanation: "paintDisk xét tâm ô trong bán kính 1–6 ô và đặt concentration 0/1.",
        },
        {
          title: "Nối stroke và hủy khi ra miền",
          explanation:
            "paintStroke lấy mẫu theo quãng đường; ra khỏi bản đồ hoặc mất focus hủy điểm nối trước.",
        },
      ],
    },
    "p49-l03": {
      focus: "Vận chuyển scalar bằng một velocity cho trước.",
      expected: "N dịch khói sang phải theo (0.2,0); scalar hằng vẫn hằng.",
      files: ["include/transport.hpp", "include/simulation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tìm điểm xuất phát",
          explanation: "Backtrace từ tâm ô bằng p−dt*v, không đẩy mẫu đi bằng dấu cộng.",
        },
        {
          title: "Bilinear với offset tâm ô",
          explanation:
            "sample đổi world sang lattice, trừ offset 0.5 rồi blend bốn mẫu; ngoài miền lặp giá trị sát mép.",
        },
        {
          title: "Giữ state cũ",
          explanation: "Tất cả ô đọc density, ghi densityNext, rồi swap khi xong lưới.",
        },
      ],
    },
    "p49-l04": {
      focus: "Xây D trên một lưới MAC có tường kín.",
      expected:
        "Inspector đọc bốn cạnh; preset nén/giãn có divergence, vortex từ streamfunction gần 0.",
      files: [
        "include/grid.hpp",
        "include/transport.hpp",
        "include/pressure.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Tách ba lattice",
          explanation:
            "Scalar ở tâm, u ở cạnh dọc, v ở cạnh ngang; mỗi mảng có kích thước và offset riêng.",
        },
        {
          title: "Chặn normal velocity",
          explanation:
            "enforceWalls đặt u tại tường trái/phải và v tại đáy/trên bằng 0; cho phép trượt tiếp tuyến.",
        },
        {
          title: "Đo dòng ra",
          explanation: "D=(uR−uL+vT−vB)/h; dùng cùng các cạnh sẽ được pressure sửa ở bài sau.",
        },
      ],
    },
    "p49-l05": {
      focus: "Giải pressure trước khi thay velocity.",
      expected: "J cho ±0.1875 ở vòng đầu ca 8×8; N giải trọn budget nhưng u/v chưa đổi.",
      files: ["include/pressure.hpp", "include/simulation.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy ra hệ phương trình",
          explanation: "Với rho=1, yêu cầu D(v−dt*Gp)=0 dẫn đến A*p=−D(v)/dt, A=−D*G.",
        },
        {
          title: "Viết weighted Jacobi",
          explanation:
            "Tính tay hai vòng trên ca 8×8, đối chiếu RHS/hàng xóm/candidate rồi dùng J chạy cùng hàm Jacobi trong solver.",
        },
        {
          title: "Đo residual và chọn gauge",
          explanation:
            "Trừ mean pressure, loại mean RHS do làm tròn; báo RMS(Ap−b), không kết luận hội tụ từ số vòng lặp.",
        },
      ],
    },
    "p49-l06": {
      focus: "Ghép gradient pressure vào các cạnh MAC.",
      expected: "Div RMS giảm và gần dt*residual; normal wall vẫn 0.",
      files: ["include/pressure.hpp", "include/simulation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Sửa u tại cạnh nội bộ",
          explanation: "u trừ dt*(pR−pL)/h, không dùng sai phân trung tâm tại tâm ô.",
        },
        {
          title: "Sửa v và giữ tường",
          explanation: "v dùng pressure trên/dưới; sau cập nhật enforceWalls và đo divergence lại.",
        },
        {
          title: "Đối chiếu sai số",
          explanation:
            "Divergence sau chiếu bằng dt*(Ap−b), trừ phần mean rất nhỏ do làm tròn; tiêu chí ca chuẩn nêu rõ N và budget.",
        },
      ],
    },
    "p49-l07": {
      focus: "Vận chuyển cả trường velocity.",
      expected: "u/v thay đổi từ cùng state cũ; project lại rồi density theo velocity mới.",
      files: ["include/transport.hpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Backtrace từ vị trí u",
          explanation:
            "Tại cạnh dọc, lấy đủ vector bằng hai sampler offset khác nhau rồi lấy mẫu u cũ.",
        },
        {
          title: "Làm tương tự với v",
          explanation: "Ghi vNext nhưng chưa swap u; nếu swap sớm, v sẽ đọc state mới của u.",
        },
        {
          title: "Chiếu lại trước scalar",
          explanation:
            "Nội suy/advection velocity có thể tạo divergence, nên project trước advectDensity.",
        },
      ],
    },
    "p49-l08": {
      focus: "Thêm một solve implicit cho viscosity.",
      expected: "ν=0 giữ bước diffusion không đổi; ν>0 làm giảm norm năng lượng trong ca chuẩn.",
      files: ["include/diffusion.hpp", "include/simulation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ source cố định",
          explanation: "SourceU/SourceV là RHS của I−νdt*L; không thay RHS qua mỗi iteration.",
        },
        {
          title: "Giải theo từng lattice",
          explanation:
            "Mỗi thành phần có normal wall 0 và tangent free-slip; stencil dùng count hợp lệ.",
        },
        {
          title: "Kiểm phương trình",
          explanation:
            "Đo residual implicit và chỉ số năng lượng; 12 vòng nằm trong giới hạn ν và N của project.",
        },
      ],
    },
    "p49-l09": {
      focus: "Tạo velocity bằng input và lực nổi.",
      expected: "Kéo khuấy hoặc WASD tạo impulse; buoyancy làm khói thấp đi lên ở các tick sau.",
      files: ["include/input.hpp", "include/simulation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Impulse theo displacement",
          explanation:
            "addImpulse tăng velocity theo delta world, nhân Gaussian; không nhân dt thêm lần nữa.",
        },
        {
          title: "Buoyancy theo dt",
          explanation: "Cạnh v lấy trung bình density hai ô và cộng dt*strength*concentration.",
        },
        {
          title: "Tách tác động input khỏi solver",
          explanation:
            "Mouse capture/blur quản lý stroke; input có thể thêm divergence, project ở tick tiếp theo sửa nó.",
        },
      ],
    },
    "p49-l10": {
      focus: "Ghép toán tử và điều khiển thời gian.",
      expected: "Chạy/dừng/reset hoạt động, đổi FPS vẫn dùng dt=1/60 và frame nghẽn bị giới hạn.",
      files: ["include/simulation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ đúng thứ tự",
          explanation:
            "Lực → diffuse velocity → project → advect velocity → project → advectDensity.",
        },
        {
          title: "Dùng accumulator",
          explanation:
            "planSteps quyết định số tick, nhận tối đa 0.25 giây và làm tối đa bốn bước mỗi frame.",
        },
        {
          title: "Báo work bị bỏ",
          explanation:
            "Pause/blur xóa accumulator; đổi resolution dựng lại scene, đổi settings chỉ dừng để đo tiếp.",
        },
      ],
    },
    "p49-l11": {
      focus: "Kiểm solver bằng ca nhỏ độc lập và chạy full source.",
      expected: "Validator ca chuẩn và CTest Debug/Release đạt, interaction vẫn có số đo riêng.",
      files: ["include/diagnostics.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Kiểm từng toán tử",
          explanation:
            "Affine sampler, scalar hằng, flux telescoping, streamfunction và phương trình implicit có oracle riêng.",
        },
        {
          title: "Kiểm projection và timing",
          explanation:
            "N=16, 160 vòng có threshold rõ; lịch FPS so cùng tick và frame nghẽn chỉ kiểm work hữu hạn.",
        },
        {
          title: "Bàn giao ZIP",
          explanation:
            "Starter, 11 checkpoint, final, README và tests chạy riêng; tests không mở window hoặc dùng assert tắt trong Release.",
        },
      ],
    },
  },
  references: {
    "p49-l01": [
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
    ],
    "p49-l02": [
      {
        label: "SDL_RenderCoordinatesFromWindow",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderCoordinatesFromWindow",
        kind: "SDL API",
      },
    ],
    "p49-l03": [{ label: "Semi-Lagrangian", href: "/glossary#semi-lagrangian", kind: "Thuật ngữ" }],
    "p49-l04": [{ label: "Lưới MAC", href: "/glossary#mac-grid", kind: "Thuật ngữ" }],
    "p49-l05": [
      { label: "Pressure Poisson", href: "/glossary#pressure-poisson", kind: "Thuật ngữ" },
    ],
    "p49-l06": [
      { label: "Pressure projection", href: "/glossary#pressure-projection", kind: "Thuật ngữ" },
    ],
    "p49-l07": [{ label: "Semi-Lagrangian", href: "/glossary#semi-lagrangian", kind: "Thuật ngữ" }],
    "p49-l08": [
      { label: "Viscosity implicit", href: "/glossary#implicit-viscosity", kind: "Thuật ngữ" },
    ],
    "p49-l09": [
      { label: "Impulse và lực", href: "/glossary#fluid-input-impulse", kind: "Thuật ngữ" },
    ],
    "p49-l10": [{ label: "Chỉ số Courant", href: "/glossary#fluid-courant", kind: "Thuật ngữ" }],
    "p49-l11": [
      { label: "Residual pressure", href: "/glossary#pressure-poisson", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
