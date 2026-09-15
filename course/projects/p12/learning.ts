import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p12-l01": {
      focus:
        "Bắt đầu từ framebuffer và projection của Project 11; tạo Triangle3, project riêng A/B/C, rồi nối đúng ba cạnh chỉ khi mọi vertex đều visible.",
      expected:
        "Tam giác có ba cạnh màu và ba marker A/B/C xuất hiện trên lưới. Preset near/behind/outside ẩn toàn bộ cạnh thay vì dùng screen value không hợp lệ.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lưu ba vertex trong world space",
          explanation:
            "Triangle3 chỉ nhóm A, B, C; mỗi vertex vẫn là Vec3 và chưa chứa pixel. Tam giác mặc định được đặt trước camera để checkpoint đầu có hình nhìn thấy ngay.",
        },
        {
          title: "Project từng vertex nhưng giữ status",
          explanation:
            "projectTriangle gọi projectPerspective ba lần. Kết quả screen chỉ được dùng sau khi cả ba status đều là Visible.",
        },
        {
          title: "Nối cạnh cuối trở lại A",
          explanation:
            "Ba đoạn AB, BC và CA khép tam giác. Màu khác nhau cùng marker đỉnh giúp phát hiện nhanh việc nối sai chỉ số.",
        },
      ],
    },
    "p12-l02": {
      focus:
        "Tính centroid làm pivot, trừ pivot khỏi ba world vertex để tạo local triangle, rồi cộng modelPosition lại ở ranh giới local→world.",
      expected:
        "Dấu chữ thập đỏ nằm tại centroid. Dịch model bằng sliders hoặc phím làm cả hình và pivot đi cùng nhau; local centroid vẫn bằng zero.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tìm điểm trung bình của ba vertex",
          explanation:
            "Centroid là trung bình từng thành phần. Với triangle mặc định, pivot nằm tại (0,0,6), thuận tiện để kiểm tra bằng tay.",
        },
        {
          title: "Đưa pivot về local origin",
          explanation:
            "toLocalTriangle lấy mỗi world vertex trừ pivot. Ba local vertex mô tả hình dạng quanh gốc, không còn mang vị trí trong scene.",
        },
        {
          title: "Cộng model position sau cùng",
          explanation:
            "translateTriangle dựng world triangle mới mỗi frame. Rotation ở các bài sau sẽ chen vào giữa local triangle và translation này.",
        },
      ],
    },
    "p12-l03": {
      focus:
        "Nhìn dọc trục X để biến rotation 3D thành rotation 2D trên mặt phẳng Y–Z, rồi áp dụng cùng rotateX cho ba local vertex.",
      expected:
        "W/S thay pitch; X của từng local vertex giữ nguyên, Y/Z chạy trên đường tròn và độ dài từ pivot không đổi.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ trục quay làm thành phần bất biến",
          explanation:
            "Rotation quanh X không thay x. Cặp (y,z) đóng vai trò như (x,y) của rotation 2D đã học ở Project 09.",
        },
        {
          title: "Viết hai phương trình sin/cos",
          explanation:
            "y′=cos·y−sin·z và z′=sin·y+cos·z. Viết chúng từ dữ liệu cũ trong một Vec3 mới để tránh dùng y đã cập nhật khi tính z.",
        },
        {
          title: "Luôn rotate từ local triangle gốc",
          explanation:
            "Mỗi frame gọi rotateTriangleX(localTriangle,pitch). Không sửa dồn rotatedLocal của frame trước nên hình không tích lũy sai số.",
        },
      ],
    },
    "p12-l04": {
      focus:
        "Thêm rotateY, rotateZ, EulerAngles và hai order XYZ/ZYX; áp dụng từng hàm tuần tự để thấy rotation 3D không giao hoán.",
      expected:
        "W/S, A/D, Q/E điều khiển pitch/yaw/roll. O đổi order và làm orientation thay đổi với angle tổng quát dù edge lengths vẫn giữ nguyên.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Xoay hai mặt phẳng còn lại",
          explanation:
            "Rotation Y xoay X/Z và giữ Y; rotation Z xoay X/Y và giữ Z. Dấu được chọn theo cùng quy tắc bàn tay phải với rotateX.",
        },
        {
          title: "Đặt tên ba angle theo vai trò",
          explanation:
            "Pitch dùng X, yaw dùng Y, roll dùng Z. Struct giữ đơn vị radian và tránh truyền ba double không rõ nghĩa.",
        },
        {
          title: "Viết thứ tự thành code có thể đọc",
          explanation:
            "XYZ gọi rotateX rồi Y rồi Z; ZYX làm ngược lại. Biến tạm `rotated` cho thấy chính xác phép nào chạy trước mà chưa cần matrix.",
        },
      ],
    },
    "p12-l05": {
      focus:
        "Đổi mouse delta thành yaw/pitch, clamp pitch ở ±89°, capture mouse giữa button down/up và pause animation khi người dùng bắt đầu kéo.",
      expected:
        "Kéo ngang đổi yaw, kéo dọc đổi pitch; thả chuột ngoài canvas vẫn kết thúc drag. Sensitivity thay đổi lượng angle trên mỗi pixel.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dùng delta thay vì vị trí tuyệt đối",
          explanation:
            "Orientation cần biết chuột vừa đi bao xa, không cần biết cursor đang ở pixel nào. xrel/yrel cho cảm giác kéo giống nhau ở mọi kích thước cửa sổ.",
        },
        {
          title: "Đổi pixel thành radian có kiểm soát",
          explanation:
            "sensitivity mang đơn vị radian/pixel. Y màn hình tăng xuống nên deltaY được trừ khỏi pitch để kéo lên làm model ngẩng lên.",
        },
        {
          title: "Capture và nhả chuột thành một cặp",
          explanation:
            "Mouse down bật capture; mouse up luôn tắt capture. Nhờ vậy drag không kẹt khi pointer rời cửa sổ trước khi người dùng thả nút.",
        },
      ],
    },
    "p12-l06": {
      focus:
        "Cập nhật Euler angles bằng angular velocity×dt, viết inverse theo thứ tự đảo, đo edge-length error và khóa mọi invariant bằng CTest.",
      expected:
        "Auto rotation có pause/step; edge error và round-trip error ở gần 10⁻¹⁵. Starter, sáu checkpoint, final và tests build ở Debug/Release.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Cập nhật ba angle bằng cùng delta time",
          explanation:
            "advanceEulerAngles clamp dt vào [0,0.1] rồi cộng angular velocity×dt. Animation vì vậy không phụ thuộc FPS và không nhảy xa sau debugger.",
        },
        {
          title: "Đảo cả dấu lẫn thứ tự",
          explanation:
            "Inverse của XYZ chạy Z⁻¹, Y⁻¹, X⁻¹. Chỉ đổi dấu nhưng giữ nguyên thứ tự sẽ không trở về point ban đầu với angle tổng quát.",
        },
        {
          title: "Đo invariant của hình",
          explanation:
            "Rotation phải giữ ba edge lengths. maximumEdgeLengthError so từng cạnh trước/sau, còn round-trip test kiểm tra chiều ngược độc lập.",
        },
        {
          title: "Chạy bản hoàn chỉnh",
          explanation:
            "Sau CTest, thử translation, ba angle, hai order, mouse drag, auto rotation, pause/step, reset và resize trên project_12_final.",
        },
      ],
    },
  },
  references: {
    "p12-l01": [
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
      { label: "View frustum", href: "/glossary#view-frustum", kind: "Thuật ngữ" },
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
    ],
    "p12-l02": [
      { label: "Pivot", href: "/glossary#pivot", kind: "Thuật ngữ" },
      { label: "Local space", href: "/glossary#local-space", kind: "Thuật ngữ" },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
    ],
    "p12-l03": [
      { label: "3D rotation", href: "/glossary#rotation-3d", kind: "Thuật ngữ" },
      { label: "Unit circle", href: "/glossary#unit-circle", kind: "Thuật ngữ" },
      { label: "Radian", href: "/glossary#radian", kind: "Thuật ngữ" },
    ],
    "p12-l04": [
      { label: "Euler angles", href: "/glossary#euler-angles", kind: "Thuật ngữ" },
      { label: "Rotation order", href: "/glossary#rotation-order", kind: "Thuật ngữ" },
      { label: "Non-commutative", href: "/glossary#non-commutative", kind: "Thuật ngữ" },
    ],
    "p12-l05": [
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      { label: "Mouse delta", href: "/glossary#mouse-delta", kind: "Thuật ngữ" },
      { label: "Euler angles", href: "/glossary#euler-angles", kind: "Thuật ngữ" },
    ],
    "p12-l06": [
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
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
