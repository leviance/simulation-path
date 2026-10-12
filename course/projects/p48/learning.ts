import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p48-l01": {
      focus: "Dựng hình trước khi đo đạo hàm.",
      expected: "Thấy lưới mũi tên đồng hướng, resize vẫn giữ world y hướng lên.",
      files: ["include/field.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy starter",
          explanation: "Mở cửa sổ nền tối, kiểm renderer và logical presentation 800×600.",
        },
        {
          title: "Tạo lưới các nút",
          explanation:
            "Field có 33×25 nút, mỗi nút giữ hai thành phần vector; world gồm cả hai đầu miền.",
        },
        {
          title: "Vẽ thân và đầu mũi tên",
          explanation:
            "Dùng SDL_RenderLine, đổi world sang screen tại một chỗ và xử lý vector 0 riêng.",
        },
      ],
    },
    "p48-l02": {
      focus: "Xem các trường mẫu rồi đọc số tại nút.",
      expected: "P đổi gió đều/tỏa/hút/xoay/trượt; chuột, mũi tên và I đọc được vector đúng.",
      files: ["include/field.hpp", "include/scenes.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt công thức tại nút",
          explanation: "populate dựng vector từ world(x,y), không dùng index thay cho tọa độ.",
        },
        {
          title: "Đổi preset",
          explanation: "Scene giữ lựa chọn, Field giữ dữ liệu đã lấy mẫu; P dựng lại Field.",
        },
        {
          title: "Chọn và đọc nút",
          explanation:
            "Input đổi qua logical presentation, đảo y về world rồi chọn nút gần nhất; I in giá trị ra console.",
        },
      ],
    },
    "p48-l03": {
      focus: "Dựng gradient của một trường scalar.",
      expected: "Lòng chảo có gradient hướng ra; đỉnh đồi có gradient hướng về đỉnh.",
      files: ["include/derivatives.hpp", "include/scenes.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lưu scalar phi",
          explanation:
            "Tạo phi từ bowl hoặc hill; màu hiển thị scalar nhưng không thay giá trị trong mảng.",
        },
        {
          title: "Lấy hai đạo hàm riêng",
          explanation:
            "derivativeX/Y chia đúng khoảng cách; trong miền dùng hai phía, mép dùng ba điểm một phía.",
        },
        {
          title: "Gán hai thành phần gradient",
          explanation:
            "gradient ghi vx và vy từ scalar; chỉ preset Gradient chọn vector này làm trường gió.",
        },
      ],
    },
    "p48-l04": {
      focus: "Đo dòng ra ròng quanh một điểm.",
      expected: "Source cho divergence 2, sink −2 và gió đều 0, màu giữ dấu của số đo.",
      files: ["include/derivatives.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "So hai cạnh đối diện",
          explanation:
            "Chênh lệch vx theo x và vy theo y tạo ra hai phần của dòng ra trên một đơn vị diện tích.",
        },
        {
          title: "Cộng hai đạo hàm",
          explanation: "divergence trả một số; không cộng độ dài vector hoặc đạo hàm chéo.",
        },
        {
          title: "Vẽ lớp màu có dấu",
          explanation: "Xanh âm, cam dương, tối 0; inspector đọc số thật khi màu bão hòa.",
        },
      ],
    },
    "p48-l05": {
      focus: "Đo xu hướng quay cục bộ và kiểm dấu.",
      expected: "Rotation có curl 2; shear có curl −1 dù đường dòng thẳng.",
      files: ["include/derivatives.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc vận tốc tiếp tuyến",
          explanation: "Chênh lệch vy theo x đóng góp dương, chênh lệch vx theo y đóng góp âm.",
        },
        {
          title: "Tính curl z",
          explanation:
            "curl=∂vy/∂x−∂vx/∂y với trục y lên; quay cứng cho curl bằng hai lần tốc độ góc.",
        },
        {
          title: "So rotation với shear",
          explanation:
            "Dùng L và I để kiểm số; hình vòng tròn không phải điều kiện bắt buộc để có curl.",
        },
      ],
    },
    "p48-l06": {
      focus: "Đo lỗi của phép lấy đạo hàm.",
      expected:
        "Sai số hill giảm hơn ba lần khi tăng từ 33×25 lên 65×49; sai số mép được báo riêng.",
      files: ["include/diagnostics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Viết đáp án giải tích",
          explanation:
            "Gradient Gaussian bằng −2(x,y) exp(−x²−y²), không gọi lại derivativeX/Y để làm oracle.",
        },
        {
          title: "Tách mép và trong miền",
          explanation:
            "gradientError lấy max độ dài sai số vector cho hai vùng; không che lỗi mép bằng một giá trị trung bình.",
        },
        {
          title: "Tinh lưới trên cùng miền",
          explanation: "G đổi số nút, giữ miền world; dx/dy giảm một nửa và I in lại sai số.",
        },
      ],
    },
    "p48-l07": {
      focus: "Lấy vận tốc ở vị trí bất kỳ rồi di chuyển tracer.",
      expected:
        "N tiến đúng 1/60 s, Space chạy có giới hạn công việc; hạt đi theo trường nhưng không sửa Field.",
      files: ["include/particles.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Nội suy bốn nút",
          explanation:
            "sampleVelocity dùng bilinear, chọn ô cuối đúng cách tại biên phải/trên và từ chối điểm ngoài miền.",
        },
        {
          title: "Lấy vận tốc tại điểm giữa",
          explanation:
            "midpointStep dự đoán vị trí ở nửa bước, lấy vận tốc lần hai rồi cập nhật từ vị trí đầu.",
        },
        {
          title: "Tách tick khỏi frame",
          explanation:
            "dt=1/60, tối đa tám bước mỗi frame; hạt ra khỏi miền hoặc quá tám giây được gieo lại.",
        },
      ],
    },
    "p48-l08": {
      focus: "Thêm một xoáy Gaussian có tâm tương tác.",
      expected:
        "Kéo tâm xoáy hoặc dùng Enter, đổi dấu quay, thấy curl thay đổi mà không cộng dồn qua event.",
      files: ["include/scenes.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tạo vector tiếp tuyến",
          explanation:
            "Với q=p−center, vector (−qy,qx) quay quanh tâm; trọng số Gaussian giảm tác động ra xa.",
        },
        {
          title: "Dựng lại nền rồi cộng xoáy",
          explanation:
            "populate luôn ghi nền trước addVortex; cùng trạng thái Scene phải tạo cùng Field.",
        },
        {
          title: "Nối input với tâm",
          explanation:
            "Capture chuột khi kéo, thả khi mất focus; Enter đặt tâm tại nút chọn và B bật/tắt xoáy.",
        },
      ],
    },
    "p48-l09": {
      focus: "Kiểm các phép toán bằng đáp án độc lập.",
      expected:
        "V báo PASS trên các field riêng; starter, chín checkpoint, final và tests build độc lập.",
      files: ["include/diagnostics.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Chọn ca có số biết trước",
          explanation:
            "Uniform/source/sink/rotation/shear kiểm đạo hàm, dấu và mép; curl của gradient kiểm quan hệ giữa các toán tử.",
        },
        {
          title: "Kiểm hội tụ và nội suy",
          explanation:
            "So Gaussian với công thức giải tích; tests thêm trường affine, vị trí biên và chuyển động trong gió đều.",
        },
        {
          title: "Build cả hai cấu hình",
          explanation:
            "CTest không dùng assert tắt trong Release; ZIP có README và toàn bộ source để chạy riêng.",
        },
      ],
    },
  },
  references: {
    "p48-l01": [
      {
        label: "SDL_RenderLine",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderLine",
        kind: "SDL API",
      },
    ],
    "p48-l02": [{ label: "Trường vector", href: "/glossary#vector-field", kind: "Thuật ngữ" }],
    "p48-l03": [{ label: "Gradient", href: "/glossary#field-gradient", kind: "Thuật ngữ" }],
    "p48-l04": [{ label: "Divergence", href: "/glossary#field-divergence", kind: "Thuật ngữ" }],
    "p48-l05": [{ label: "Curl 2D", href: "/glossary#field-curl", kind: "Thuật ngữ" }],
    "p48-l06": [
      { label: "Sai phân một phía", href: "/glossary#one-sided-derivative", kind: "Thuật ngữ" },
    ],
    "p48-l07": [{ label: "Hạt đánh dấu", href: "/glossary#flow-tracer", kind: "Thuật ngữ" }],
    "p48-l08": [
      {
        label: "SDL_RenderCoordinatesFromWindow",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderCoordinatesFromWindow",
        kind: "SDL API",
      },
    ],
    "p48-l09": [{ label: "Curl 2D", href: "/glossary#field-curl", kind: "Thuật ngữ" }],
  },
} satisfies ProjectLearningAssets;
export default learning;
