import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p54-l01": {
      focus: "Đi từ starter có context tới một ảnh do fragment shader vẽ ra.",
      expected: "Một ảnh UV đầy viewport, chưa có volume.",
      files: [
        "include/platform.hpp",
        "include/program.hpp",
        "include/renderer.hpp",
        "shaders/fullscreen.vert",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy starter trước",
          explanation:
            "Platform kiểm từng tài nguyên SDL/GL; lỗi compile shader giữ tên file và driver log.",
        },
        {
          title: "Vẽ một triangle đủ lớn",
          explanation: "Ba vertex phủ viewport; gl_VertexID không cần VBO cho pass này.",
        },
        {
          title: "Nối render và present",
          explanation:
            "Resize target theo drawable, render vào RGBA32F rồi present; đường dữ liệu này giữ lại cho các bài sau.",
        },
      ],
    },
    "p54-l02": {
      focus: "Đặt đúng ray ở tâm pixel và chứng minh camera không xoay lại mảng scalar.",
      expected: "Màu direction đổi liên tục khi orbit/zoom.",
      files: ["include/model.hpp", "include/renderer.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Đọc basis được cung cấp",
          explanation:
            "Origin, forward/right/up có tên rõ; inside đổi origin nhưng vẫn giữ yaw/pitch.",
        },
        {
          title: "Đi từ pixel sang direction",
          explanation: "FOV dọc 50°, aspect của target và pixel centre xác định ray normalized.",
        },
        {
          title: "Đối chiếu hai chiều y",
          explanation:
            "CPU nhận v đi xuống; GL fragment đi lên. Chỉ đảo v tại ranh giới, không đảo density thêm lần nữa.",
        },
      ],
    },
    "p54-l03": {
      focus: "Chỉ đi trên đoạn giao volume, kể cả lúc mắt đã ở trong khối.",
      expected: "Ảnh độ dài interval và các ca miss/parallel giải thích được.",
      files: ["include/model.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Cắt ray theo từng slab",
          explanation: "Mỗi trục cho một interval; giao ba interval mới là phần nằm trong box.",
        },
        {
          title: "Xử lý direction zero",
          explanation: "Kiểm slab song song trước khi chia; tránh Inf/NaN lan vào loop count.",
        },
        {
          title: "Giữ entry không âm",
          explanation:
            "Camera inside bắt đầu ở t=0; không đi ngược ra sau mắt hoặc lấy mẫu trên đoạn ngoài box.",
        },
      ],
    },
    "p54-l04": {
      focus: "Đưa mảng scalar thật lên GL_R32F và giữ đúng centre/clamp convention.",
      expected: "Một midpoint từ texture 3D, chưa gọi đó là volume integration.",
      files: [
        "include/volume.hpp",
        "include/state.hpp",
        "include/renderer.hpp",
        "shaders/volume.frag",
      ],
      steps: [
        {
          title: "Đặt N và kiểm cấp phát",
          explanation:
            "X thay đổi nhanh nhất; spacing 2/N và giới hạn side được kiểm trước phép nhân.",
        },
        {
          title: "Upload đúng kiểu",
          explanation:
            "GL_R32F/GL_RED/GL_FLOAT, GL_LINEAR và CLAMP_TO_EDGE; chỉ upload khi dataset đổi.",
        },
        {
          title: "Đọc một điểm biết trước",
          explanation:
            "Ramp và constant giúp kiểm mapping; ảnh midpoint là mốc trung gian, không thay ảnh ray marching cuối.",
        },
      ],
    },
    "p54-l05": {
      focus: "Viết vòng march phủ hết interval rồi áp dụng hai reducer scalar.",
      expected: "MIP và average khác nhau trên slab/lõi đặc.",
      files: ["include/reference.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Chia interval thành đoạn",
          explanation:
            "Count là ceil(L/step); mỗi ds chặn ở exit và lấy midpoint của chính đoạn ấy.",
        },
        {
          title: "Giữ hai phép gộp riêng",
          explanation: "Maximum không cần chuẩn hóa; average cộng density*ds rồi chia L.",
        },
        {
          title: "Nối mode từ UI tới shader",
          explanation:
            "Cùng volume/camera/step, chỉ đổi uMode; chưa có màu phát xạ hay nghĩa quang học.",
        },
      ],
    },
    "p54-l06": {
      focus: "Thêm alpha vào loop đã chạy, không đưa ra công thức chưa có bối cảnh.",
      expected: "Các lớp gần xa đóng góp đúng thứ tự; constant medium không đổi khi đổi step.",
      files: ["include/reference.hpp", "shaders/volume.frag", "shaders/present.frag"],
      steps: [
        {
          title: "Tính phần cản của một đoạn",
          explanation: "Sigma*rho*ds không có đơn vị; alpha thay đổi khi ds đổi.",
        },
        {
          title: "Dùng T cũ trước",
          explanation:
            "Màu đoạn được nhân T hiện tại rồi mới giảm T; không trộn thêm alpha lần nữa ở present.",
        },
        {
          title: "Kiểm medium hằng",
          explanation:
            "T=exp(-sigma*rho*L) là đáp số độc lập; dùng white transfer và tắt lighting khi kiểm công thức này.",
        },
      ],
    },
    "p54-l07": {
      focus:
        "Phân loại scalar, chọn palette và giải thích lighting như một lớp trình bày tùy chọn.",
      expected: "Thấy rõ cấu trúc 3D nhưng không gọi local gradient lighting là scattering.",
      files: ["include/reference.hpp", "shaders/volume.frag", "shaders/present.frag"],
      steps: [
        {
          title: "Giữ cutoff có một nghĩa",
          explanation: "Cả ba mode lấy cùng rho đã phân loại; đổi palette không sửa volume hoặc T.",
        },
        {
          title: "Thêm màu trước gamma",
          explanation: "Alpha tích lũy C linear; MIP/average ánh xạ scalar sau phép gộp.",
        },
        {
          title: "Bật tắt ánh sáng cục bộ",
          explanation:
            "Gradient central difference cho normal xấp xỉ; source được cung cấp và giải thích rõ chi phí sáu mẫu phụ.",
        },
      ],
    },
    "p54-l08": {
      focus: "Nối input với một ray cụ thể và giữ inspector độc lập với ảnh gamma.",
      expected: "Chọn pixel, tiến từng mẫu, đọc raw/classified density, ds và T.",
      files: ["include/input.hpp", "include/state.hpp", "include/reference.hpp", "include/ui.hpp"],
      steps: [
        {
          title: "Chuẩn hóa điểm chọn",
          explanation:
            "Shift+click dùng tọa độ trong scene, không gồm sidebar; u/v vẫn theo chiều y CPU.",
        },
        {
          title: "Tách kéo và chọn",
          explanation:
            "Drag orbit không đổi u/v; mất left-button mask, blur hoặc reset đều nhả capture.",
        },
        {
          title: "Đọc trace thật",
          explanation:
            "Trace gọi cùng sampling/compositing trên CPU cho ray đang chọn, không lấy giá trị từ màu ảnh đã gamma.",
        },
      ],
    },
    "p54-l09": {
      focus: "Đo tradeoff trên cùng input và không đồng nhất queue time với GPU time.",
      expected: "Bảng bốn step có max error và GPU median/IQR, có thể hủy.",
      files: [
        "include/benchmark.hpp",
        "include/renderer.hpp",
        "include/reference.hpp",
        "shaders/volume.frag",
      ],
      steps: [
        {
          title: "Đặt hai ngân sách riêng",
          explanation:
            "512 đoạn/ray là hard cap; early T chỉ là xấp xỉ alpha có bound, không sửa cap.",
        },
        {
          title: "Đo một kernel đã đồng bộ",
          explanation:
            "GL_TIME_ELAPSED và poll availability; warm-up rồi năm lần đo cùng target 320×240.",
        },
        {
          title: "Giữ job hữu hạn",
          explanation:
            "Mỗi tick một draw, có deadline/cancel; đổi tham số xóa kết quả cũ thay vì để bảng số trông như vẫn đúng.",
        },
      ],
    },
    "p54-l10": {
      focus: "Chứng minh đúng bản chất sản phẩm, rồi bàn giao chương trình hoàn chỉnh.",
      expected: "C++ 128³, đầy đủ mode/controls, source/ZIP khớp và giới hạn kiểm tra được ghi rõ.",
      files: ["tests/tests.cpp", "include/validation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách các oracle",
          explanation:
            "Constant/slab có đáp số độc lập; CPU/GPU cùng-step kiểm implementation; CPU fine chỉ ước lượng convergence.",
        },
        {
          title: "Giữ checks trong Release",
          explanation: "Không dùng assert để đếm PASS; NaN/Inf và sai policy đều là lỗi.",
        },
        {
          title: "Build và tự dùng sản phẩm",
          explanation:
            "Chạy cả Debug/Release, kiểm viewport/Tab/camera/controls và đối chiếu ZIP; không coi screenshot là thay executable.",
        },
      ],
    },
  },
  references: {
    "p54-l01": [
      {
        label: "SDL_GL_CreateContext",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext",
        kind: "SDL API",
      },
    ],
    "p54-l02": [{ label: "Basis của camera", href: "/glossary#camera-basis", kind: "Thuật ngữ" }],
    "p54-l03": [
      { label: "Ray-box slab interval", href: "/glossary#ray-slab-interval", kind: "Thuật ngữ" },
    ],
    "p54-l04": [
      {
        label: "glTexImage3D",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glTexImage3D.xhtml",
        kind: "OpenGL API",
      },
      { label: "Tâm voxel và sampling", href: "/glossary#volume-trilinear", kind: "Thuật ngữ" },
    ],
    "p54-l05": [
      {
        label: "MIP và length-weighted average",
        href: "/glossary#volume-projection-modes",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l06": [
      {
        label: "Front-to-back và transmittance",
        href: "/glossary#volume-front-to-back",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l07": [
      {
        label: "Transfer function và gradient lighting",
        href: "/glossary#volume-transfer-lighting",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l08": [
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p54-l09": [
      {
        label: "glGetQueryObject — query result",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetQueryObject.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "SDL_GetWindowSizeInPixels",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
    ],
    "p54-l10": [
      {
        label: "CMake/SDL3 độc lập",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
