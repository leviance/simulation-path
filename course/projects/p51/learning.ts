import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p51-l01": {
      focus: "Dựng bể và nhìn rõ từng lớp hạt",
      expected: "Build target project_51_checkpoint_1.",
      files: [
        "src/main.cpp",
        "include/fluid/model.hpp",
        "include/app/camera.hpp",
        "shaders/water/sphere.vert",
      ],
      steps: [
        {
          title: "Giữ đúng vòng đời cửa sổ OpenGL",
          explanation: "run() chứa vòng sự kiện và tài nguyên GL.",
        },
        {
          title: "Đặt hạt vào tâm từng ô",
          explanation: "x thay nhanh nhất, rồi y, cuối cùng z.",
        },
        {
          title: "Tính vị trí người quan sát",
          explanation: "forward trỏ về khối nước; right và up nằm trên mặt phẳng ảnh.",
        },
      ],
    },
    "p51-l02": {
      focus: "Đổi SPH từ diện tích sang thể tích",
      expected:
        "Chạy CTest của bản cuối để kiểm chuẩn hóa 3D và gradient bằng finite difference; đọc các ca trong tests/tests.cpp.",
      files: ["include/fluid/model.hpp", "include/fluid/kernel.hpp", "include/fluid/reference.hpp"],
      steps: [
        {
          title: "Chốt đơn vị và độ phân giải",
          explanation: "side = 48 cho 110.592 hạt.",
        },
        {
          title: "Viết kernel và gradient bằng double",
          explanation: "Đạo hàm theo q cần thêm hệ số 1/h.",
        },
        {
          title: "Giữ một cách tính chậm nhưng dễ kiểm",
          explanation:
            "Tất cả lực đều đọc cùng một state cũ và cùng một mảng density đã tính xong.",
        },
      ],
    },
    "p51-l03": {
      focus: "Tạo dữ liệu hạt trực tiếp trên GPU",
      expected: "Build project_51_checkpoint_3 và kiểm không có lỗi compile/link shader.",
      files: [
        "include/fluid/model.hpp",
        "include/gpu/storage.hpp",
        "shaders/sph/initialize.comp",
        "include/gpu/passes.hpp",
      ],
      steps: [
        {
          title: "Khóa layout bằng static_assert",
          explanation: "alignas bảo đảm điểm bắt đầu record, static_assert bảo đảm stride.",
        },
        {
          title: "Giữ thống kê nhỏ tách khỏi mảng hạt",
          explanation: "offsetof(body) phải bằng 48.",
        },
        {
          title: "Cho mỗi invocation khởi tạo một hạt",
          explanation: "Workgroup cuối có thể không đủ 128 hạt.",
        },
      ],
    },
    "p51-l04": {
      focus: "Tính density và pressure mà chưa di chuyển hạt",
      expected: "N = 257 và 512 phải khớp CPU trong tolerance được ghi trong verification.hpp.",
      files: ["shaders/shared/physics.glsl", "shaders/sph/density.comp", "include/gpu/passes.hpp"],
      steps: [
        {
          title: "Đưa đúng kernel 3D sang GLSL",
          explanation: "GPU dùng float nên không yêu cầu từng bit giống CPU double.",
        },
        {
          title: "Mỗi invocation tự cộng density của mình",
          explanation: "Self term có r = 0 và W(0) hữu hạn.",
        },
        {
          title: "Tính pressure từ kết quả vừa cộng",
          explanation: "Không gán rho = rho0 để làm màu hiển thị đẹp hơn.",
        },
      ],
    },
    "p51-l05": {
      focus: "Cho nước chuyển động từ lực SPH",
      expected:
        "CPU/GPU integration phải khớp ở một bước từ cùng position, velocity, density và dt.",
      files: [
        "shaders/sph/force.comp",
        "include/fluid/reference.hpp",
        "shaders/sph/integrate.comp",
        "include/gpu/passes.hpp",
      ],
      steps: [
        {
          title: "Viết lực pressure và viscosity",
          explanation: "Hai density ở mẫu số đều cần thiết để giữ biểu thức đối xứng.",
        },
        {
          title: "Kiểm lại dấu của vận tốc tương đối",
          explanation: "Một cặp tách xa không nhận artificial viscosity.",
        },
        {
          title: "Tích phân sang bank khác",
          explanation: "Chỉ phản xạ thành phần velocity hướng ra ngoài.",
        },
      ],
    },
    "p51-l06": {
      focus: "Tìm hàng xóm bằng grid 3D trên GPU",
      expected: "Offsets bắt đầu bằng 0, không giảm và kết thúc bằng N.",
      files: [
        "shaders/sph/count.comp",
        "shaders/sph/scan.comp",
        "include/gpu/passes.hpp",
        "shaders/sph/scatter.comp",
      ],
      steps: [
        {
          title: "Đếm occupancy của từng cell",
          explanation: "Atomic ở đây chỉ bảo vệ bộ đếm; nó không quyết định thứ tự ID cuối cùng.",
        },
        {
          title: "Biến counts thành khoảng lưu trữ",
          explanation: "Không return sớm ở tail trước barrier.",
        },
        {
          title: "Ghép scan nhiều tầng trên host",
          explanation: "counts được tái sử dụng làm cursors sau khi scan đã đọc xong.",
        },
      ],
    },
    "p51-l07": {
      focus: "Chọn timestep từ dữ liệu của chính tick hiện tại",
      expected:
        "Fixture có vmax lớn phải kích hoạt acoustic bound; fixture có acceleration lớn phải kích hoạt force bound.",
      files: [
        "include/fluid/reference.hpp",
        "shaders/sph/reduce.comp",
        "include/gpu/passes.hpp",
        "include/fluid/model.hpp",
      ],
      steps: [
        {
          title: "Viết đáp án dt trước khi port",
          explanation: "Floor 1e−7 là điểm dừng an toàn.",
        },
        {
          title: "Thu gọn trong một workgroup",
          explanation: "Mọi lane phải đến mọi barrier.",
        },
        {
          title: "Lặp reduction tới một record",
          explanation: "Không đọc kết quả về CPU giữa các tầng.",
        },
      ],
    },
    "p51-l08": {
      focus: "Dựng độ sâu và độ dày từ các hạt nước",
      expected: "Không có readback position trên đường render thông thường.",
      files: ["shaders/water/sphere.vert", "shaders/water/sphere.frag", "include/render/water.hpp"],
      steps: [
        {
          title: "Vẽ một quad đủ che mặt cầu",
          explanation: "Bán kính vẽ 1,15 spacing khác smoothingLength h.",
        },
        {
          title: "Ghi độ sâu mặt cầu thật",
          explanation:
            "Nếu ghi depth của tâm quad, hạt trước/sau sẽ che nhau sai và normal tái dựng sẽ có mảng phẳng.",
        },
        {
          title: "Cộng độ dày bằng blending",
          explanation: "Không lấy số pixel phủ để thay độ dày world.",
        },
      ],
    },
    "p51-l09": {
      focus: "Biến ảnh độ sâu thành mặt nước có chiều sâu",
      expected: "Camera/resize không đổi model time hoặc positions.",
      files: [
        "shaders/water/filter.frag",
        "shaders/water/composite.frag",
        "shaders/water/lighting.glsl",
        "include/render/water.hpp",
      ],
      steps: [
        {
          title: "Lọc depth nhưng giữ cạnh",
          explanation:
            "Ba lượt stencil 3 × 3 ở stride 1/2/4 lọc cả depth và thickness; sigma = 2 spacing chỉ thuộc đường vẽ.",
        },
        {
          title: "Dựng normal từ vị trí world",
          explanation: "cross(dx,dy) cho hướng pháp tuyến nhưng có thể quay lưng về camera.",
        },
        {
          title: "Kết hợp độ dày và góc nhìn",
          explanation:
            "Đây là screen-space approximation: không có ray tracing nhiều lần trong thể tích, không có caustics chính xác và không giải quang học vật lý đầy đủ.",
        },
      ],
    },
    "p51-l10": {
      focus: "Kéo vật cản để tạo dòng chảy 3D",
      expected: "Camera drag không đổi target/position; paddle drag không đổi camera.",
      files: [
        "include/fluid/reference.hpp",
        "shaders/sph/force.comp",
        "include/app/camera.hpp",
        "include/app/input.hpp",
      ],
      steps: [
        {
          title: "Cấp support ở vùng rắn",
          explanation:
            "Ở thành tĩnh, boundary velocity bằng 0; trong quả cầu, nó bằng velocity của quả cầu.",
        },
        {
          title: "Dùng cùng điều kiện biên trên GPU",
          explanation: "Pressure của ghost dùng pressure của hạt đang xét, density biên dùng rho0.",
        },
        {
          title: "Đổi con trỏ thành target world",
          explanation:
            "Camera gần song song mặt phẳng có thể không tạo điểm hợp lệ; phải bỏ thao tác thay vì tạo target rất lớn.",
        },
      ],
    },
    "p51-l11": {
      focus: "Giữ cửa sổ phản hồi khi GPU đang tính",
      expected:
        "Không dùng glFinish, không spin loop chờ query, không có hai simulation batch pending.",
      files: ["include/gpu/storage.hpp", "include/gpu/engine.hpp"],
      steps: [
        {
          title: "Đọc một báo cáo nhỏ sau batch",
          explanation: "Không dùng timer như dấu hiệu state hợp lệ.",
        },
        {
          title: "Gửi một lượng công việc hữu hạn",
          explanation: "Mỗi submit nhận 1–4 tick, không xếp backlog theo số frame bị chậm.",
        },
        {
          title: "Poll không khóa event loop",
          explanation: "Sau năm giây chưa hoàn tất, ứng dụng dừng submit và báo lỗi.",
        },
      ],
    },
    "p51-l12": {
      focus: "Chạy 110.592 hạt và đo từng phần",
      expected:
        "Bản chuẩn phải thật sự chạy cảnh động với ít nhất 100.000 hạt, model time tăng, updated và drawn bằng N.",
      files: [
        "include/fluid/model.hpp",
        "include/gpu/capabilities.hpp",
        "include/app/benchmark.hpp",
        "include/fluid/statistics.hpp",
      ],
      steps: [
        {
          title: "Dự toán trước khi cấp phát",
          explanation: "Đây là ước lượng simulation buffers, không phải đo tổng VRAM đang dùng.",
        },
        {
          title: "Đối chiếu với giới hạn GL",
          explanation: "Budget 192 MiB là giới hạn chủ động của ứng dụng.",
        },
        {
          title: "Đo một phiên có điểm dừng",
          explanation: "Không chia thời gian một lượt tám tick cho tám rồi gọi đó là median.",
        },
      ],
    },
    "p51-l13": {
      focus: "Kiểm chứng rồi đóng gói bể nước hoàn chỉnh",
      expected: "Build starter, 13 checkpoint và final; chạy CTest ở Debug/Release.",
      files: [
        "include/app/verification.hpp",
        "include/fluid/reference.hpp",
        "include/app/report.hpp",
      ],
      steps: [
        {
          title: "So sánh trên cùng input, không cùng implementation",
          explanation:
            "Sáu fixture có tail 257, khối nén có pressure khác 0, vận tốc tương đối, vật cản và sparse grid đủ lớn cho scan nhiều tầng.",
        },
        {
          title: "Giữ reference không phụ thuộc CSR",
          explanation:
            "Tolerance nằm trong verifier: rho tuyệt đối 0,05 kg/m³, pressure 25 Pa, force scaled 0,003, position 2e−5 m và velocity 0,002 m/s.",
        },
        {
          title: "Kiểm một bước từ state cũ",
          explanation:
            "Kiểm acceleration trước integration giúp tách lỗi force khỏi lỗi dt/contact.",
        },
      ],
    },
  },
  references: {
    "p51-l01": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l02": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l03": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l04": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l05": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l06": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l07": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l08": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l09": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l10": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l11": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l12": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l13": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
