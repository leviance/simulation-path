import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p10-l01": {
      focus:
        "Bắt đầu từ cửa sổ, framebuffer và drawLine đã chạy được; thêm Vec3, projectIsometric, phép đổi sang pixel và ba mũi tên X/Y/Z.",
      expected:
        "Một la bàn có trục X đỏ, Y xanh lá và Z xanh dương xuất hiện quanh gốc vàng. Resize không làm gốc lệch khỏi tâm và source không sửa tọa độ Vec3 thành pixel.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Thêm thành phần Z vào kiểu dữ liệu",
          explanation:
            "Vec3 giữ ba số có cùng vai trò. Phép cộng và nhân scalar vẫn thực hiện theo từng thành phần như Vec2, chỉ có thêm z.",
        },
        {
          title: "Chiếu để vẽ nhưng không làm mất dữ liệu gốc",
          explanation:
            "projectIsometric trả một Vec2 tạm dùng cho sơ đồ. Điểm Vec3 ban đầu vẫn còn nguyên để các bài sau tính cạnh và normal trong không gian.",
        },
        {
          title: "Vẽ ba trục từ cùng một gốc",
          explanation:
            "Mỗi trục là một vector cơ sở có đúng một thành phần bằng 1. Màu và hướng màn hình giúp ta đọc được ba chiều trên mặt phẳng.",
        },
      ],
    },
    "p10-l02": {
      focus:
        "Thêm Triangle, phép trừ Vec3, triangleEdges, các hàm chọn đỉnh và thao tác bàn phím/chuột trước khi tính cross product.",
      expected:
        "Tam giác ABC hiện trên la bàn; cạnh AB màu cam, AC màu xanh. Phím 1–3 chọn đỉnh, arrows/Q/E và kéo chuột cập nhật đúng hai vector cạnh.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lưu ba point thay vì ba edge",
          explanation:
            "A, B, C là dữ liệu gốc của tam giác. AB và AC được tính lại bằng phép trừ nên không thể bị cũ khi một đỉnh di chuyển.",
        },
        {
          title: "Dựng hai cạnh cùng xuất phát từ A",
          explanation:
            "Cross product cần hai vector có cùng gốc về mặt ý nghĩa. Vì vậy ta dùng B−A và C−A, không dùng AB với BC.",
        },
        {
          title: "Cho người học thay đổi từng tọa độ",
          explanation:
            "Kéo chuột đổi X/Y trong mặt phẳng sơ đồ; Q/E đổi riêng Z. Cả hai đường điều khiển đều sửa cùng một Triangle.",
        },
      ],
    },
    "p10-l03": {
      focus:
        "Tự cài đặt cross theo ba thành phần, dùng cross(AB,AC) làm raw normal và vẽ nó từ centroid của tam giác.",
      expected:
        "Mũi tên tím thay đổi khi kéo bất kỳ đỉnh nào. Dot product giữa raw normal với AB và AC đều gần 0 với tam giác hợp lệ.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Viết đủ ba thành phần của cross",
          explanation:
            "Mỗi thành phần lấy định thức 2×2 của hai thành phần còn lại. Giữ công thức trên nhiều dòng để dễ đối chiếu dấu trừ.",
        },
        {
          title: "Tính raw normal từ dữ liệu hiện tại",
          explanation:
            "triangleRawNormal gọi triangleEdges mỗi lần. Nó không giữ cache và vì vậy luôn khớp với ba đỉnh đang được vẽ.",
        },
        {
          title: "Kiểm tra bằng hai dot product",
          explanation:
            "Nếu N thật sự vuông góc với mặt, N·AB và N·AC đều bằng 0. Hai phép đo độc lập này dễ bắt lỗi chép sai công thức cross.",
        },
      ],
    },
    "p10-l04": {
      focus:
        "Thêm dot, magnitude, normalize có epsilon, triangleUnitNormal và triangleArea; chuyển mũi tên hiển thị sang độ dài cố định.",
      expected:
        "Unit normal dài gần 1 dù tam giác lớn hay nhỏ. Raw normal dài gấp đôi diện tích và tam giác vuông 3×2 cho area bằng 3.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách độ dài khỏi hướng",
          explanation:
            "Raw normal mang cả hai thông tin. Normalize chia cho magnitude để tạo unit normal chỉ còn hướng và dễ dùng làm mũi tên ổn định.",
        },
        {
          title: "Chặn phép chia gần zero",
          explanation:
            "Normalize trả zero vector nếu length không vượt epsilon. Đây là lớp bảo vệ cần có trước khi bàn tới tam giác suy biến ở bài cuối.",
        },
        {
          title: "Đọc diện tích từ hình bình hành",
          explanation:
            "Độ dài AB×AC là diện tích hình bình hành do hai cạnh dựng nên. Tam giác chiếm đúng một nửa diện tích đó.",
        },
      ],
    },
    "p10-l05": {
      focus:
        "Thêm reverseWinding và facingAmount, nối phím F vào event loop rồi dùng dấu dot product để đổi nhãn front/back.",
      expected:
        "Nhấn F đổi B với C, mũi tên normal quay ngược và nhãn front/back đổi theo. Giá trị area trước và sau thao tác bằng nhau.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đảo thứ tự mà không đổi hình học",
          explanation:
            "reverseWinding giữ A và đổi vị trí B,C. Ba điểm không di chuyển trong không gian nhưng thứ tự đi quanh biên đã đảo.",
        },
        {
          title: "Liên hệ thứ tự với dấu của cross",
          explanation:
            "AC×AB bằng −(AB×AC), nên normal quay đúng 180°. Quy tắc bàn tay phải giúp dự đoán hướng trước khi nhìn kết quả.",
        },
        {
          title: "So normal với hướng nhìn",
          explanation:
            "facingAmount lấy dot giữa hai vector đã normalize. Dấu cho biết normal nằm cùng hay ngược phía với viewDirection cố định của sơ đồ.",
        },
      ],
    },
    "p10-l06": {
      focus:
        "Nhận diện raw normal gần zero, không vẽ unit normal giả, thêm preset P và kiểm chứng cross, area, winding cùng degenerate bằng CTest.",
      expected:
        "Preset thẳng hàng hiện degenerate, unit normal không được vẽ và mọi số trên title vẫn hữu hạn. Bản final cùng tests build ở Debug/Release.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Dùng magnitude để nhận diện mặt không có diện tích",
          explanation:
            "Ba điểm thẳng hàng làm AB và AC song song, vì vậy cross bằng zero. So length với epsilon ổn định hơn đòi ba thành phần bằng 0 tuyệt đối.",
        },
        {
          title: "Tách trạng thái không xác định khỏi một hướng hợp lệ",
          explanation:
            "Zero vector từ normalize là giá trị an toàn cho tính toán, nhưng UI phải gọi tên trạng thái degenerate thay vì giả vờ đó là một normal có hướng.",
        },
        {
          title: "Khóa các tính chất bằng test độc lập",
          explanation:
            "Tests kiểm tra basis cross, vuông góc, diện tích, winding, số hữu hạn và tam giác thẳng hàng mà không khởi tạo SDL.",
        },
        {
          title: "Chạy bản hoàn chỉnh",
          explanation:
            "Sau CTest, mở project_10_final và thử kéo cả ba đỉnh, đổi Z, đảo winding, chuyển bốn preset, reset cùng resize.",
        },
      ],
    },
  },
  references: {
    "p10-l01": [
      { label: "Vector 3D", href: "/glossary#vector-3d", kind: "Thuật ngữ" },
      {
        label: "Axonometric projection",
        href: "/glossary#axonometric-projection",
        kind: "Thuật ngữ",
      },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
    ],
    "p10-l02": [
      { label: "Vector subtraction", href: "/glossary#vector-subtraction", kind: "Thuật ngữ" },
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      { label: "Vector 3D", href: "/glossary#vector-3d", kind: "Thuật ngữ" },
    ],
    "p10-l03": [
      { label: "Cross product", href: "/glossary#cross-product", kind: "Thuật ngữ" },
      { label: "Normal vector", href: "/glossary#normal-vector", kind: "Thuật ngữ" },
      { label: "Dot product", href: "/glossary#dot-product", kind: "Thuật ngữ" },
    ],
    "p10-l04": [
      { label: "Normalization", href: "/glossary#normalization", kind: "Thuật ngữ" },
      { label: "Normal vector", href: "/glossary#normal-vector", kind: "Thuật ngữ" },
      { label: "Magnitude", href: "/glossary#magnitude", kind: "Thuật ngữ" },
    ],
    "p10-l05": [
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
      { label: "Cross product", href: "/glossary#cross-product", kind: "Thuật ngữ" },
      { label: "Dot product", href: "/glossary#dot-product", kind: "Thuật ngữ" },
    ],
    "p10-l06": [
      { label: "Degenerate triangle", href: "/glossary#degenerate-triangle", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
