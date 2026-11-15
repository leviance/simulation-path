import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p49-l01": {
      focus: "Chạy cửa sổ trước, rồi nối concentration với hình đang thấy.",
      expected: "Hai vệt khói đứng yên trên lưới 32×32; resize không tạo lại dữ liệu.",
      files: [
        "src/main.cpp",
        "include/app/image.hpp",
        "include/fluid/state.hpp",
        "include/fluid/scenes.hpp",
      ],
      steps: [
        {
          title: "Đọc scaffold",
          explanation:
            "Main sở hữu SDL, App giữ Grid; phần trình bày được cấp sẵn nhưng chưa có thuật toán chất lưu.",
        },
        {
          title: "Gieo và vẽ scalar",
          explanation:
            "makeScene tạo dữ liệu tại tâm ô; Image::draw đọc đủ N² mẫu vào texture streaming.",
        },
      ],
    },
    "p49-l02": {
      focus: "Viết brush có thể dùng chung cho chuột và bàn phím.",
      expected: "Nét liền, xóa được, không nối qua phần ngoài hộp.",
      files: ["include/fluid/brush.hpp", "include/app/image.hpp", "include/app/input.hpp"],
      steps: [
        {
          title: "Từ chuột tới world",
          explanation: "Đi qua logical presentation rồi đảo y; không clamp điểm ngoài vào tường.",
        },
        {
          title: "Đặt đĩa và nối nét",
          explanation:
            "paintDisk đặt giá trị, paintStroke chèn mẫu cách tối đa nửa ô; capture/blur quản lý vòng đời nét.",
        },
      ],
    },
    "p49-l03": {
      focus: "Hiểu backtrace bằng gió đều trước khi giải velocity.",
      expected: "Khói đi sang phải theo 0,18 đơn vị/giây; scalar hằng không đổi.",
      files: ["include/fluid/field.hpp", "include/fluid/transport.hpp", "include/fluid/solver.hpp"],
      steps: [
        {
          title: "Lấy mẫu giữa các ô",
          explanation: "Trừ offset tâm ô rồi nội suy bốn mẫu; xử lý mép bằng constant extension.",
        },
        {
          title: "Viết lượt vận chuyển",
          explanation: "Midpoint RK2 tìm điểm xuất phát, đọc density cũ và chỉ swap sau cả lượt.",
        },
      ],
    },
    "p49-l04": {
      focus: "Đo lượng đi ra qua đúng bốn cạnh của từng ô.",
      expected: "Tổng divergence hộp kín gần 0; vortex từ streamfunction gần divergence-free.",
      files: ["include/fluid/state.hpp", "include/fluid/field.hpp", "include/fluid/scenes.hpp"],
      steps: [
        {
          title: "Tách ba lattice",
          explanation:
            "Density ở tâm, u trên cạnh dọc, v trên cạnh ngang; ghi kích thước/index/offset riêng.",
        },
        {
          title: "Giữ tường và đo flux",
          explanation: "Normal bằng 0; D=(uR−uL+vT−vB)/h dùng các cạnh mà pressure sẽ sửa.",
        },
      ],
    },
    "p49-l05": {
      focus: "Giải một bài pressure cố định, chưa sửa vận tốc.",
      expected: "Ca 8×8: vòng đầu ±0.1875, vòng hai 0.19921875 tại ô A.",
      files: ["include/fluid/poisson.hpp", "include/fluid/solver.hpp", "include/app/input.hpp"],
      steps: [
        {
          title: "Dựng A và b",
          explanation: "A=−DG, b=−div/dt; số hàng xóm thay đổi ở tường, pressure có gauge mean 0.",
        },
        {
          title: "Chạy từng vòng",
          explanation:
            "J dùng RHS cố định, weighted Jacobi có double buffer; residual đo bằng phương trình gốc.",
        },
      ],
    },
    "p49-l06": {
      focus: "Làm pressure thực sự sửa velocity.",
      expected: "Div giảm; div sau gần dt nhân residual, tường vẫn kín.",
      files: ["include/fluid/project.hpp", "include/fluid/solver.hpp"],
      steps: [
        {
          title: "Trừ gradient trên cạnh",
          explanation: "u đọc p trái/phải, v đọc p dưới/trên; không thay bằng sai phân tại tâm.",
        },
        {
          title: "Đo trước và sau",
          explanation: "Ghi report của lần giải, phân biệt hết budget với đạt ngưỡng.",
        },
      ],
    },
    "p49-l07": {
      focus: "Cho vận tốc tự thay đổi mà không phụ thuộc thứ tự duyệt.",
      expected: "Cả u/v cùng đọc state cũ, sau đó project rồi vận chuyển scalar.",
      files: ["include/fluid/transport.hpp", "include/fluid/solver.hpp"],
      steps: [
        {
          title: "Backtrace từ từng loại cạnh",
          explanation: "Lấy đủ vector bằng hai sampler offset khác nhau, ghi buffer kế tiếp.",
        },
        {
          title: "Swap đúng lúc",
          explanation: "Chờ cả uNext/vNext hoàn tất; projection sửa divergence do nội suy sinh ra.",
        },
      ],
    },
    "p49-l08": {
      focus: "Tạo một luồng khói có thể tương tác, không phải nét vẽ chạy sẵn.",
      expected: "Nguồn phát theo giây; kéo chuột không để lại một chuỗi đĩa khói.",
      files: [
        "include/fluid/sources.hpp",
        "include/fluid/brush.hpp",
        "include/app/input.hpp",
        "include/fluid/solver.hpp",
      ],
      steps: [
        {
          title: "Thêm nguồn và lực",
          explanation:
            "Nguồn scalar và buoyancy nhân dt; hai thành phần vận tốc nhận lực trên đúng lattice.",
        },
        {
          title: "Tách click khỏi drag",
          explanation:
            "Click đặt khói; drag chia displacement thành impulse dọc đường; chuột phải chỉ khuấy.",
        },
      ],
    },
    "p49-l09": {
      focus: "Tách độ nhớt velocity khỏi diffusion số của scalar.",
      expected: "ν=0 bỏ qua solve; ν>0 giảm năng lượng trong ca chuẩn.",
      files: ["include/fluid/viscosity.hpp", "include/fluid/solver.hpp"],
      steps: [
        {
          title: "Giữ RHS cố định",
          explanation: "Giải (I−νdtL)v=s bằng 48 vòng, không thay source bằng kết quả mỗi vòng.",
        },
        {
          title: "Kiểm phương trình",
          explanation:
            "Tự thế nghiệm vào stencil implicit; free-slip tiếp tuyến khác normal wall bằng 0.",
        },
      ],
    },
    "p49-l10": {
      focus: "Nối kernel với vòng lặp SDL mà vẫn phản hồi input.",
      expected: "Tối đa bốn tick/frame; thời gian không xử lý được được báo rõ.",
      files: ["include/fluid/solver.hpp", "include/app/state.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Ghép đúng thứ tự",
          explanation: "Nguồn/lực, viscosity, project, advect velocity, project, advect scalar.",
        },
        {
          title: "Giới hạn work",
          explanation:
            "planSteps chia elapsed thành tick cố định; App trả quyền sau tick đắt và không chạy bù vô hạn.",
        },
      ],
    },
    "p49-l11": {
      focus: "Giải cùng Poisson bằng CG thay vì tăng vòng Jacobi mù quáng.",
      expected: "Lưới 128² thật; residual đạt ngưỡng hoặc báo chưa đạt.",
      files: ["include/fluid/cg.hpp", "include/fluid/project.hpp"],
      steps: [
        {
          title: "Nhân bằng stencil",
          explanation: "B=h²A không cần ma trận đặc; giải trên không gian mean 0.",
        },
        {
          title: "Theo dõi residual",
          explanation: "Warm start phải tính residual mới; kết thúc kiểm lại RMS(Ap−b) thật.",
        },
      ],
    },
    "p49-l12": {
      focus: "Giảm nhòe mà không tạo mật độ âm hoặc viền sáng giả.",
      expected: "Scalar hằng giữ nguyên; dữ liệu sau limiter nằm trong khoảng donor.",
      files: ["include/fluid/detail.hpp", "include/fluid/solver.hpp"],
      steps: [
        {
          title: "Ước lượng lượt đi/về",
          explanation:
            "MacCormack dùng hai lượt vận chuyển và nửa sai số hồi quy, không phải BFECC ba lượt.",
        },
        {
          title: "Giới hạn và tái dùng đường lấy mẫu",
          explanation:
            "Limiter dùng bốn donor cũ; ngoài lattice fallback. Bốn scalar dùng chung cache backtrace.",
        },
      ],
    },
    "p49-l13": {
      focus: "Hiểu confinement trước khi dùng nó làm khói nhiều xoáy hơn.",
      expected: "ε=0 không đổi velocity; ε>0 tạo lực từ curl thật và giữ tường.",
      files: ["include/fluid/vorticity.hpp", "include/fluid/solver.hpp"],
      steps: [
        {
          title: "Tính curl",
          explanation: "Đưa velocity về tâm, lấy ω=dv/dx−du/dy rồi gradient |ω|.",
        },
        {
          title: "Đưa lực về cạnh",
          explanation: "F=εh(Nyω,−Nxω), trung bình lực hai ô và nhân dt; project sau đó.",
        },
      ],
    },
    "p49-l14": {
      focus: "Giảm sai số pressure trên nhiều thang lưới.",
      expected: "PCG giải cùng hệ, ít vòng hơn ở ca chuẩn; 256² vẫn xử lý toàn bộ dữ liệu.",
      files: ["include/fluid/multigrid.hpp", "include/fluid/cg.hpp"],
      steps: [
        {
          title: "Viết V-cycle đối xứng",
          explanation:
            "Smooth, residual, restriction, solve thô, prolongation rồi smooth ngược; không hạ resolution của sản phẩm.",
        },
        {
          title: "Làm preconditioner",
          explanation:
            "CG dùng z=M⁻¹r và r·z; vẫn kiểm residual bằng A gốc và đo tổng thời gian, không chỉ số vòng.",
        },
      ],
    },
    "p49-l15": {
      focus: "Nghiệm thu cả hình, số và source tải về.",
      expected: "Bản hoàn chỉnh chạy độc lập; tests không mất tác dụng trong Release.",
      files: ["include/fluid/reference.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Dùng oracle độc lập",
          explanation:
            "Pressure biết trước, advection giải tích, stencil implicit và lịch thời gian kiểm từng lỗi khác nhau.",
        },
        {
          title: "Chạy bản cuối",
          explanation:
            "Kiểm tương tác, benchmark có giới hạn và đối chiếu đủ counts; PASS fixture không thay thế số đo cảnh hiện tại.",
        },
      ],
    },
  },
  references: {
    "p49-l01": [
      {
        label: "SDL_LockTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
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
      { label: "Impulse và lực", href: "/glossary#fluid-input-impulse", kind: "Thuật ngữ" },
    ],
    "p49-l09": [
      { label: "Viscosity implicit", href: "/glossary#implicit-viscosity", kind: "Thuật ngữ" },
    ],
    "p49-l10": [{ label: "Chỉ số Courant", href: "/glossary#fluid-courant", kind: "Thuật ngữ" }],
    "p49-l11": [
      { label: "Pressure Poisson", href: "/glossary#pressure-poisson", kind: "Thuật ngữ" },
    ],
    "p49-l12": [{ label: "Semi-Lagrangian", href: "/glossary#semi-lagrangian", kind: "Thuật ngữ" }],
    "p49-l13": [{ label: "Lưới MAC", href: "/glossary#mac-grid", kind: "Thuật ngữ" }],
    "p49-l14": [
      { label: "Pressure Poisson", href: "/glossary#pressure-poisson", kind: "Thuật ngữ" },
    ],
    "p49-l15": [
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
