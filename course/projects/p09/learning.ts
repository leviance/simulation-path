import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p09-l01": {
      focus:
        "Bắt đầu từ cửa sổ và framebuffer đã chạy được; thêm Vec2, bốn local point, phép đổi world sang screen và hàm nối bốn cạnh thành hình vuông.",
      expected:
        "Một hình vuông xanh lá nằm giữa lưới, bốn đỉnh được đánh dấu rõ và không thay đổi khi resize. Source chỉ lưu bốn điểm quanh local origin, không chứa tọa độ pixel cố định.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt dữ liệu quanh local origin",
          explanation:
            "makeSquare tạo bốn đỉnh theo thứ tự chạy quanh biên. Half extent quyết định kích thước nhưng tâm hình vẫn là `(0,0)`.",
        },
        {
          title: "Chỉ đổi sang pixel khi vẽ",
          explanation:
            "worldToScreen cộng tâm cửa sổ và đảo dấu Y. Các hàm toán học không cần biết kích thước framebuffer hay quy ước trục của SDL.",
        },
        {
          title: "Nối cả cạnh cuối về cạnh đầu",
          explanation:
            "Chỉ số `(index+1)%size` giúp đỉnh cuối nối lại đỉnh 0, vì vậy polygon luôn khép kín mà không cần một lệnh vẽ riêng.",
        },
      ],
    },
    "p09-l02": {
      focus:
        "Viết scalePoint theo hai trục, thêm phím điều khiển và luôn tạo lại bốn world point từ localSquare thay vì sửa dồn kết quả cũ.",
      expected:
        "A/D đổi chiều rộng, S/W đổi chiều cao; scale bằng 0 ép hình xuống một đoạn thẳng và scale âm phản chiếu hình qua trục tương ứng.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Nhân đúng thành phần",
          explanation:
            "scaleX chỉ nhân với x, scaleY chỉ nhân với y. Hai tham số khác nhau tạo non-uniform scale thay vì phóng to đồng đều.",
        },
        {
          title: "Tính lại từ localSquare",
          explanation:
            "Trong mỗi frame, transformedSquare bắt đầu lại từ bốn đỉnh gốc. Cách này tránh việc nhân scale lặp lại rồi làm sai số và kích thước tăng dần ngoài ý muốn.",
        },
        {
          title: "Giữ cả trường hợp 0 và số âm",
          explanation:
            "Đây không phải input lỗi. Scale 0 cho thấy phép biến đổi làm mất một chiều; scale âm vừa co giãn vừa đảo chiều trục.",
        },
      ],
    },
    "p09-l03": {
      focus:
        "Suy công thức rotation từ ảnh của hai vector cơ sở, viết rotatePoint và áp dụng rotation sau scale cho từng local point.",
      expected:
        "Phím trái/phải xoay hình quanh local origin; khi scaleX=scaleY=1, độ dài cạnh và diện tích không đổi ở mọi góc.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Xoay hai vector cơ sở",
          explanation:
            "Trục X đơn vị trở thành `(cos,sin)`, còn trục Y trở thành `(-sin,cos)`. Một điểm là tổ hợp của hai trục nên nhận đúng công thức rotation 2D.",
        },
        {
          title: "Dùng radian trong phép tính",
          explanation:
            "Mỗi lần nhấn phím chỉ đổi 5° sang radian. std::sin và std::cos luôn nhận angle theo radian, giống Project 07.",
        },
        {
          title: "Xoay kết quả của scale",
          explanation:
            "Checkpoint 3 dùng `rotatePoint(scalePoint(point,...), angle)`. Viết lồng rõ ràng như vậy giúp thấy phép nào xảy ra trước khi ma trận xuất hiện.",
        },
      ],
    },
    "p09-l04": {
      focus:
        "Thêm shearPoint, điều khiển riêng shearX/shearY và đặt shear giữa scale với rotation trong chuỗi tính trực tiếp.",
      expected:
        "J/L và K/I làm hệ trục bị xiên; các cạnh đối diện vẫn song song. Đặt cả shearX và shearY khác 0 cho thấy diện tích có thể thay đổi dù mỗi công thức trông như chỉ trượt một tọa độ.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc công thức theo sự phụ thuộc",
          explanation:
            "Shear X giữ y và cộng `shearX×y` vào x. Shear Y giữ x và cộng `shearY×x` vào y; cả hai kết quả phải dùng tọa độ đầu vào cũ.",
        },
        {
          title: "Không cập nhật x rồi dùng x mới cho y",
          explanation:
            "Tạo và trả về Vec2 mới giúp hai phương trình được tính đồng thời. Sửa point.x trước sẽ vô tình tạo ra một phép biến đổi khác.",
        },
        {
          title: "Đối chiếu với rotation",
          explanation:
            "Rotation giữ góc vuông và độ dài khi không scale. Shear giữ tính song song nhưng thường làm góc vuông biến mất.",
        },
      ],
    },
    "p09-l05": {
      focus:
        "Biểu diễn từng phép toán bằng Mat3, tự viết matrix multiplication và thay chuỗi hàm trên bốn đỉnh bằng một composed matrix.",
      expected:
        "Hình không nhảy khi chuyển sang cách tính bằng ma trận. Kéo chuột thay đổi translation; hai vector cơ sở đỏ/xanh cho thấy phần tuyến tính của ma trận.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chốt quy ước trước khi nhân",
          explanation:
            "Mat3 lưu row-major nhưng nhân với column vector `[x,y,1]ᵀ`. Storage order và hướng của vector là hai khái niệm riêng, không được suy từ nhau.",
        },
        {
          title: "Viết phép nhân ba vòng lặp",
          explanation:
            "Mỗi ô kết quả là dot product giữa một hàng của ma trận trái và một cột của ma trận phải. Bản tổng quát dễ kiểm tra hơn chín công thức chép tay.",
        },
        {
          title: "Đọc phép ghép từ phải sang trái",
          explanation:
            "Với column vector, `T×R×H×S×p` nghĩa là p đi qua scale, shear, rotation rồi translation. Ma trận đứng sát điểm nhất chạy trước.",
        },
        {
          title: "Dùng hàng thứ ba cho translation",
          explanation:
            "Thành phần 1 trong `[x,y,1]ᵀ` cho phép translation xuất hiện trong cùng phép nhân ma trận, thay vì phải cộng riêng sau cùng.",
        },
      ],
    },
    "p09-l06": {
      focus:
        "Đóng gói tham số và thứ tự trong composeTransform, dùng determinant cùng diện tích polygon để kiểm tra kết quả, rồi chạy toàn bộ CTest và bản final.",
      expected:
        "Phím O đổi thứ tự và hình thay đổi ngay; title bar hiển thị determinant cùng area ratio khớp nhau. Tests qua ở Debug/Release và mọi điều khiển final hoạt động sau resize.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tạo hai tích ma trận khác nhau",
          explanation:
            "Scale–Shear–Rotate dùng `T×R×H×S`; Rotate–Shear–Scale dùng `T×S×H×R`. Chúng dùng cùng tham số nhưng không cho cùng kết quả nói chung.",
        },
        {
          title: "So ma trận với chuỗi hàm",
          explanation:
            "Test tính một điểm bằng từng hàm theo thứ tự rồi so với transformPoint của ma trận ghép. Đây là cách bắt lỗi đảo thứ tự trực tiếp nhất.",
        },
        {
          title: "Kiểm tra diện tích bằng determinant",
          explanation:
            "Shoelace formula đo diện tích polygon sau biến đổi. Tỉ số diện tích phải bằng trị tuyệt đối determinant của khối 2×2 phía trên bên trái.",
        },
        {
          title: "Chạy bản hoàn chỉnh",
          explanation:
            "Sau CTest, mở project_9_final và thử scale âm, scale 0, cả hai shear, kéo chuột, đổi order, reset cùng resize trước khi kết thúc project.",
        },
      ],
    },
  },
  references: {
    "p09-l01": [
      { label: "Local space", href: "/glossary#local-space", kind: "Thuật ngữ" },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
    ],
    "p09-l02": [
      {
        label: "Scalar multiplication",
        href: "/glossary#scalar-multiplication",
        kind: "Thuật ngữ",
      },
      { label: "Local space", href: "/glossary#local-space", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p09-l03": [
      { label: "Radian", href: "/glossary#radian", kind: "Thuật ngữ" },
      { label: "Unit circle", href: "/glossary#unit-circle", kind: "Thuật ngữ" },
      { label: "Vector 2D", href: "/glossary#vector-2d", kind: "Thuật ngữ" },
    ],
    "p09-l04": [
      { label: "Shear", href: "/glossary#shear", kind: "Thuật ngữ" },
      { label: "Affine transform", href: "/glossary#affine-transform", kind: "Thuật ngữ" },
      { label: "Local space", href: "/glossary#local-space", kind: "Thuật ngữ" },
    ],
    "p09-l05": [
      {
        label: "Transformation matrix",
        href: "/glossary#transformation-matrix",
        kind: "Thuật ngữ",
      },
      { label: "Affine transform", href: "/glossary#affine-transform", kind: "Thuật ngữ" },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
    ],
    "p09-l06": [
      { label: "Determinant", href: "/glossary#determinant", kind: "Thuật ngữ" },
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
