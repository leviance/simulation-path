import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p11-l01": {
      focus:
        "Bắt đầu từ cửa sổ và framebuffer đã chạy được; thêm Vec3, marker có hình dạng dễ nhận biết, bản xem trước X/Y và input riêng cho cả ba tọa độ.",
      expected:
        "Một điểm sáng có viền, tâm và hai nét chữ thập xuất hiện trên lưới. Arrows đổi X/Y, Q/E đổi Z trên title bar; source chưa giả vờ rằng bản xem trước này là perspective.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tạo dữ liệu Vec3 trước khi nghĩ tới camera",
          explanation:
            "worldPoint giữ X/Y/Z theo world unit. Hàm vẽ chỉ nhận một Vec2 tạm nên không làm mất thành phần Z của dữ liệu gốc.",
        },
        {
          title: "Vẽ một marker đủ rõ để gỡ lỗi",
          explanation:
            "Hai circle và hai đường chữ thập dễ nhìn hơn một pixel đơn. Ta có thể xác nhận framebuffer, tọa độ tâm và resize trước khi công thức projection xuất hiện.",
        },
        {
          title: "Nối input với đúng thành phần",
          explanation:
            "Arrows sửa X/Y còn Q/E sửa Z. Ở checkpoint này Z chỉ hiện trên title; đó là bằng chứng dữ liệu 3D hoạt động dù hình vẽ tạm chưa dùng depth.",
        },
      ],
    },
    "p11-l02": {
      focus:
        "Thêm Camera3D và cặp hàm worldToCamera/cameraToWorld; di chuyển camera bằng WASD/Z/X rồi dùng cameraPoint cho bản xem trước.",
      expected:
        "worldPoint đứng yên nhưng cameraPoint đổi ngược chiều khi camera di chuyển. Camera tiến +1 theo X làm cameraPoint.x giảm đúng 1.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ world point và camera point thành hai biến",
          explanation:
            "worldPoint là vị trí trong scene; cameraPoint trả lời point nằm đâu so với camera. Ghi đè biến đầu tiên sẽ làm camera movement tích lũy sai.",
        },
        {
          title: "Đổi gốc bằng một phép trừ",
          explanation:
            "Camera của project này chưa xoay, nên worldToCamera chỉ cần worldPoint−camera.position. Dấu trừ giải thích vì sao camera đi phải làm scene trượt trái.",
        },
        {
          title: "Viết luôn phép đổi ngược",
          explanation:
            "cameraToWorld cộng lại camera.position. Cặp hàm đối xứng vừa giúp preset/drag ở bài sau, vừa tạo được round-trip test rõ ràng.",
        },
      ],
    },
    "p11-l03": {
      focus:
        "Suy perspectiveDivide từ hai cặp tam giác đồng dạng, thay bản xem trước song song bằng x/z và y/z rồi quan sát depth làm thay đổi độ lệch.",
      expected:
        "Giữ X/Y và tăng Z gấp đôi làm marker gần tâm đúng một nửa. Điểm chưa bị biến thành pixel cho tới sau khi perspective divide hoàn tất.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt mặt phẳng ảnh ở depth bằng 1",
          explanation:
            "Tia từ camera qua point cắt mặt phẳng này. Tam giác nhỏ và tam giác chứa point có cùng góc, nên tỉ lệ ngang là x′/1=x/z.",
        },
        {
          title: "Chia cả X lẫn Y cho cùng depth",
          explanation:
            "perspectiveDivide trả Vec2 `(x/z,y/z)`. Z càng lớn thì cả hai độ lệch càng nhỏ; đây chính là cảm giác vật ở xa tiến về tâm.",
        },
        {
          title: "Giữ focal length xem trước tách khỏi phép chia",
          explanation:
            "Checkpoint 3 nhân kết quả với một số pixel tạm để nhìn thấy marker. Bài sau mới thay con số này bằng focal scale suy từ FOV.",
        },
      ],
    },
    "p11-l04": {
      focus:
        "Dùng vertical FOV để tính focal scale, xét aspect ratio, tạo NDC rồi đổi NDC sang pixel với quy ước trục Y của màn hình.",
      expected:
        "Point trên trục nhìn nằm đúng tâm sau resize. FOV rộng hơn đưa marker gần tâm hơn; NDC (−1,+1) tới góc trên trái và (+1,−1) tới góc dưới phải.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy focal scale từ nửa FOV",
          explanation:
            "Ở cạnh trên của khung nhìn, tan(FOV/2)=1/focalScale. Vì vậy focalScale=1/tan(FOV/2), không phải một magic number theo pixel.",
        },
        {
          title: "Chuẩn hóa X theo aspect ratio",
          explanation:
            "FOV được chọn theo chiều dọc. Viewport rộng hơn chứa nhiều không gian ngang hơn, nên ndc.x phải chia thêm width/height để hình không bị kéo ngang.",
        },
        {
          title: "Đổi NDC sang pixel ở bước cuối",
          explanation:
            "NDC dùng tâm (0,0), còn framebuffer dùng góc trên trái và Y hướng xuống. ndcToScreen vừa scale nửa kích thước vừa đảo dấu Y.",
        },
      ],
    },
    "p11-l05": {
      focus:
        "Gói pipeline trong ProjectionResult và phân loại behind, before-near, outside, visible theo đúng thứ tự trước khi vẽ marker.",
      expected:
        "Bốn preset cho bốn nhãn khác nhau; point không visible không ghi marker. Đưa Z qua 0 không tạo NaN hoặc số pixel cực lớn.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chặn Z không dương trước phép chia",
          explanation:
            "Point sau camera không có ảnh hợp lệ trong mô hình này. Kiểm tra cameraPoint.z≤0 phải chạy trước cameraToNdc để tránh chia cho zero hoặc đảo hình.",
        },
        {
          title: "Dành một vùng an toàn bằng near plane",
          explanation:
            "Ngay trước camera, x/z tăng quá nhanh và rất nhạy với sai số. Near plane loại bỏ vùng 0<Z<near trước khi projection xảy ra.",
        },
        {
          title: "Kiểm tra frustum trong NDC",
          explanation:
            "Sau khi chia an toàn, point chỉ nằm trong viewport nếu |ndc.x|≤1 và |ndc.y|≤1. Screen pixel ngoài khung không được xem là visible.",
        },
      ],
    },
    "p11-l06": {
      focus:
        "Cho point bay bằng elapsed time, thêm pause/step/drag với phép đổi ngược ở depth cố định và khóa các tính chất projection bằng CTest.",
      expected:
        "Quỹ đạo không phụ thuộc FPS, kéo chuột giữ nguyên depth, round-trip error dưới 10⁻⁹ và starter/sáu checkpoint/final build ở Debug lẫn Release.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tính quỹ đạo từ elapsed time",
          explanation:
            "flightPoint là hàm thuần của thời gian, không cộng một quãng đường cố định mỗi frame. advanceFlightTime chặn dt trong [0,0.1] để debugger không làm point nhảy xa.",
        },
        {
          title: "Đổi pixel ngược về một depth đã biết",
          explanation:
            "Một pixel đơn lẻ không xác định được vị trí 3D duy nhất. Khi giữ cameraDepth hiện tại, ta đảo NDC và focal scale để tìm lại X/Y rồi cộng camera.position.",
        },
        {
          title: "Kiểm tra từng invariant không cần SDL",
          explanation:
            "Tests khóa tâm viewport, quy luật gấp đôi depth, ảnh hưởng của FOV, bốn status, NDC round trip, inverse tại depth cố định và dt clamp.",
        },
        {
          title: "Chạy bản hoàn chỉnh",
          explanation:
            "Sau CTest, mở project_11_final; thử camera, FOV, near plane, bốn preset, pause/step, drag, resize và reset trước khi kết thúc project.",
        },
      ],
    },
  },
  references: {
    "p11-l01": [
      { label: "Vector 3D", href: "/glossary#vector-3d", kind: "Thuật ngữ" },
      { label: "Framebuffer", href: "/glossary#framebuffer", kind: "Thuật ngữ" },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
    ],
    "p11-l02": [
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
      { label: "Vector subtraction", href: "/glossary#vector-subtraction", kind: "Thuật ngữ" },
      { label: "Round-trip test", href: "/glossary#round-trip-test", kind: "Thuật ngữ" },
    ],
    "p11-l03": [
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
      {
        label: "Perspective divide",
        href: "/glossary#perspective-divide",
        kind: "Thuật ngữ",
      },
      { label: "Similar triangles", href: "/glossary#similar-triangles", kind: "Thuật ngữ" },
    ],
    "p11-l04": [
      { label: "Field of view", href: "/glossary#field-of-view", kind: "Thuật ngữ" },
      { label: "Aspect ratio", href: "/glossary#aspect-ratio", kind: "Thuật ngữ" },
      {
        label: "Normalized device coordinates",
        href: "/glossary#normalized-device-coordinates",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l05": [
      { label: "Near plane", href: "/glossary#near-plane", kind: "Thuật ngữ" },
      { label: "View frustum", href: "/glossary#view-frustum", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p11-l06": [
      { label: "Variable timestep", href: "/glossary#variable-timestep", kind: "Thuật ngữ" },
      { label: "Round-trip test", href: "/glossary#round-trip-test", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
