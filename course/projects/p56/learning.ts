import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p56-l01": {
      focus: "Vẽ được phantom bằng SDL3 trước khi tính một phép đo nào.",
      expected:
        "Nhìn được vỏ, các vòng và mắt gỗ trước khi có số đo; ảnh mẫu không được dùng làm sinogram.",
      files: ["src/main.cpp", "include/model.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Chạy starter",
          explanation:
            "Kiểm window, renderer và event loop; chưa thay nền tối bằng công thức vật lý.",
        },
        {
          title: "Mô tả đĩa bằng dữ liệu",
          explanation: "Disk giữ centre/radius/mu; Scene độc lập với màu và tọa độ màn hình.",
        },
        {
          title: "Vẽ từng dải ngang",
          explanation: "Đổi XY sang màn hình, dùng SDL_RenderFillRect cho các span trong đĩa.",
        },
      ],
    },
    "p56-l02": {
      focus: "Nguồn và detector quay thành một cụm quanh phantom đứng yên.",
      expected: "Tia vàng nối nguồn tới pixel được chọn ở mọi góc.",
      files: ["include/geometry.hpp", "include/view.hpp", "include/controls.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dựng hai hướng vuông góc",
          explanation: "radial=(cosθ,sinθ), tangent=(-sinθ,cosθ); theta=0 có nguồn ở bên phải.",
        },
        {
          title: "Đặt endpoint",
          explanation:
            "Detector centre=-4*radial; pixel thêm offset dọc tangent, không dọc trục màn hình.",
        },
        {
          title: "Chuẩn hóa và giữ độ dài",
          explanation: "Lưu maximum trước khi chia delta; mũi tên đổi pixel và góc để kiểm sơ đồ.",
        },
      ],
    },
    "p56-l03": {
      focus: "Tính chord của đĩa trên đoạn source→detector, không dùng cả đường thẳng vô hạn.",
      expected: "Tia tâm liên tục xuyên đĩa r=1 dài 2; miss/tangent dài 0.",
      files: ["include/geometry.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chiếu tâm đĩa lên tia",
          explanation:
            "along là khoảng cách dọc direction; phần còn lại cho khoảng cách vuông góc.",
        },
        {
          title: "Tìm hai giao điểm",
          explanation: "sqrt(r²-d²) là nửa chord; tiếp tuyến không có chiều dài bên trong.",
        },
        {
          title: "Clip đoạn hữu hạn",
          explanation: "entry>=0 và exit<=maximum; nguồn bên trong hoặc detector cắt sớm vẫn đúng.",
        },
      ],
    },
    "p56-l04": {
      focus: "Tạo projection một chiều từ tín hiệu mono lý tưởng.",
      expected: "Dải detector sáng ở không khí, tối hơn khi ray đi qua vật liệu; p được đọc riêng.",
      files: ["include/projection.hpp", "include/view.hpp", "include/controls.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Cộng optical depth",
          explanation: "Từng đĩa đóng góp strength*mu*L; insert là medium bổ sung, không thay nền.",
        },
        {
          title: "Tách ratio và projection",
          explanation: "T=exp(-tau), p=-ln(T); mô hình mono cho p=tau trong sai số số thực.",
        },
        {
          title: "Duyệt pixel centre",
          explanation:
            "project trả 128 Measurement; chỉ ratio được đổi thành byte để vẽ dải detector.",
        },
      ],
    },
    "p56-l05": {
      focus: "Lưu nhiều projection theo góc mà không nhầm trục hoặc dữ liệu chưa đo.",
      expected: "Một hàng ở 0° đã đo; các hàng còn lại màu xanh, N thêm đúng một hàng.",
      files: ["include/scan.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Định nghĩa lưới góc",
          explanation: "θ=2π*row/views, không lấy cả 0° và 360°; cột là detector index.",
        },
        {
          title: "Ghi p vào hàng kế tiếp",
          explanation: "Dùng NaN khi chưa đo, tăng acquired sau khi ghi đủ hàng.",
        },
        {
          title: "Đưa số đo lên texture",
          explanation:
            "Tạo texture 128×views, ghi đủ RGBA theo pitch thật rồi RenderTexture sau clear; giữ NaN khác p=0 và đổi input sang logical coordinates.",
        },
      ],
    },
    "p56-l06": {
      focus: "Chia nhỏ công việc và bảo vệ tính nhất quán của lượt quét.",
      expected: "Space quét tối đa hai hàng/frame; pause/blur dừng, đổi vật lý xóa dữ liệu cũ.",
      files: ["include/scan.hpp", "include/controls.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt ngân sách cố định",
          explanation:
            "advance chỉ nhận budget 0..2; không đo hết trong một vòng lặp hoặc catch-up sau frame chậm.",
        },
        {
          title: "Chụp thông số lượt quét",
          explanation:
            "Scan giữ settings và Scene riêng; đổi phantom/strength/views hoặc reset tạo Scan mới.",
        },
        {
          title: "Tách đo và xem",
          explanation:
            "Chọn góc/cell, invert hoặc display range chỉ ảnh hưởng inspector/màu, không acquire lại.",
        },
      ],
    },
    "p56-l07": {
      focus: "Giải thích vệt điểm trong hình học đang dùng, không áp công thức parallel-beam.",
      expected: "Đĩa nhỏ lệch tâm tạo dải cong; đường hồng đi qua projection của tâm đĩa.",
      files: ["include/geometry.hpp", "include/view.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Đổi điểm sang cơ sở quay",
          explanation:
            "Tính p_r=dot(point,radial), p_t=dot(point,tangent), giữ nguyên point trong world space.",
        },
        {
          title: "Chiếu lên mặt detector",
          explanation: "s=8*p_t/(4-p_r); mẫu số là hệ số phối cảnh, không được bỏ.",
        },
        {
          title: "Đối chiếu trace",
          explanation:
            "Trace là vị trí một điểm, không intensity hoặc đường cực đại bắt buộc của đĩa có bán kính hữu hạn.",
        },
      ],
    },
    "p56-l08": {
      focus: "So cách lấy mẫu góc mà không trộn nó với kích thước ảnh hiển thị.",
      expected:
        "Q hoặc select chọn 30/60/120 hàng; detector vẫn 128 pixel và lưới góc chung khớp nhau.",
      files: [
        "include/scan.hpp",
        "include/controls.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Tính khoảng cách giữa các góc quét",
          explanation: "30/60/120 góc tương ứng 12°/6°/3°; không lấy lại góc 360° vì trùng với 0°.",
        },
        {
          title: "Thay texture khi đổi số hàng",
          explanation:
            "Tạo và cấu hình texture mới thành công rồi mới hủy texture cũ; sau đó tải lại dữ liệu sinogram.",
        },
        {
          title: "So cùng góc vật lý",
          explanation:
            "row j ở 30 góc khớp row 4j ở 120 góc; cùng chỉ số hàng không có nghĩa cùng góc.",
        },
        {
          title: "Quan sát khi lấy quá ít góc",
          explanation:
            "Dải lệch tâm thưa hơn khi ít góc; phóng texture không bổ sung phép đo hay chứng minh chất lượng reconstruction.",
        },
      ],
    },
    "p56-l09": {
      focus: "Kiểm forward model bằng oracle độc lập rồi chạy đầy đủ source.",
      expected:
        "CTest Debug/Release và audit hình tròn đạt; kết quả smoke tách khỏi tương tác desktop.",
      files: ["include/audit.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Dùng nghiệm hình tròn",
          explanation:
            "Tính khoảng cách đường tia đến gốc từ detector offset, không gọi lại chordLength để tạo expected.",
        },
        {
          title: "Kiểm dữ liệu và biên",
          explanation:
            "Endpoint/norm/chord/NaN/budget/góc chung/trace có explicit checks vẫn hoạt động khi NDEBUG.",
        },
        {
          title: "Build và chạy có deadline",
          explanation:
            "CMake --parallel 2, CTest --timeout 20; smoke hidden một frame với watchdog 30s, không loop benchmark.",
        },
      ],
    },
    "p56-l10": {
      focus:
        "Giấu mặt cắt tham chiếu. Ta cần tìm mắt gỗ từ số đo chứ không phải từ dữ liệu đã dùng để tạo gỗ.",
      expected: "Sau một góc có các vệt sáng theo hình quạt; đủ 180 góc thì mắt gỗ nổi rõ hơn hốc.",
      files: ["include/backprojection.hpp", "include/timber-station.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt tâm texel",
          explanation: "Dùng cùng khung tọa độ cho hai ảnh; chỉ lật y ở biên hiển thị.",
        },
        {
          title: "Tra hai cột gần nhất",
          explanation:
            "Chiếu điểm lên detector phẳng, đổi sang chỉ số tâm ô rồi nội suy các giá trị p.",
        },
        {
          title: "Thêm một hàng đúng một lần",
          explanation: "Đếm hàng đã trải ngược; pause hoặc đổi màu không làm thay đổi tổng.",
        },
      ],
    },
    "p56-l11": {
      focus:
        "Cạnh gỗ bị mờ là lỗi của máy đo hay kết quả của cách dựng ảnh? Đo hai việc này riêng.",
      expected:
        "Biết đọc hai kết quả khác nhau: sai số hàng đo so với đĩa chuẩn và RMSE hình dạng sau chuẩn hóa.",
      files: ["include/backprojection.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Tạo ảnh đối chứng",
          explanation: "Đọc mật độ tại tâm các texel nhưng không chuyển dữ liệu đó vào hàm dựng.",
        },
        {
          title: "So trên cùng miền",
          explanation:
            "Đưa hai ảnh về cực đại riêng, xử lý cả ảnh toàn 0, tính RMSE trên toàn khung.",
        },
        {
          title: "Chạy bài làm",
          explanation:
            "Build target work và tests, thử H giấu mặt cắt trước khi đoán chỗ có mắt gỗ.",
        },
      ],
    },
  },
  references: {
    "p56-l01": [
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
    ],
    "p56-l02": [
      { label: "Fan-beam và detector phẳng", href: "/glossary#ct-fan-beam", kind: "Thuật ngữ" },
    ],
    "p56-l03": [
      { label: "X-ray optical depth", href: "/glossary#xray-optical-depth", kind: "Thuật ngữ" },
    ],
    "p56-l04": [
      { label: "Flat-field và ảnh log", href: "/glossary#xray-flat-field-log", kind: "Thuật ngữ" },
    ],
    "p56-l05": [
      { label: "Sinogram", href: "/glossary#ct-sinogram", kind: "Thuật ngữ" },
      {
        label: "SDL_LockTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p56-l06": [
      { label: "Lượt quét nhất quán", href: "/glossary#ct-acquisition", kind: "Thuật ngữ" },
    ],
    "p56-l07": [
      { label: "Fan-beam và detector phẳng", href: "/glossary#ct-fan-beam", kind: "Thuật ngữ" },
    ],
    "p56-l08": [{ label: "Lấy mẫu góc", href: "/glossary#ct-angular-sampling", kind: "Thuật ngữ" }],
    "p56-l09": [{ label: "Sinogram", href: "/glossary#ct-sinogram", kind: "Thuật ngữ" }],
    "p56-l10": [{ label: "Tia hình quạt", href: "/glossary#ct-fan-beam", kind: "Thuật ngữ" }],
    "p56-l11": [{ label: "Số góc đo", href: "/glossary#ct-angular-sampling", kind: "Thuật ngữ" }],
  },
} satisfies ProjectLearningAssets;
export default data;
