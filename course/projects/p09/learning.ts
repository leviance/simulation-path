import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p09-l01": {
      focus: "Dựng hình nhìn thấy được trước: đỉnh, cạnh, basis và đổi world/screen.",
      expected: "Hình vuông có bốn đỉnh và hai basis, dữ liệu local không đổi.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ hình dạng trong local",
          explanation:
            "makeSquare trả bốn điểm quanh gốc, theo thứ tự quanh biên. drawSquare đóng cạnh cuối về điểm đầu.",
        },
        {
          title: "Chỉ đổi Y ở biên vẽ",
          explanation:
            "worldToScreen cộng (450,400), nhân 50 pixel/world và đảo Y; phép toán không phụ thuộc kích thước cửa sổ.",
        },
        {
          title: "Nối cảnh đã chạy được",
          explanation:
            "Starter có ảnh CPU/texture. Thêm drawSquare và hai basis trong renderScene trước khi học scale.",
        },
      ],
    },
    "p09-l02": {
      focus: "Giữ nguyên dữ liệu gốc, đổi scaleX/Y và nhìn cả scale âm lẫn scale 0.",
      expected: "Scale âm phản chiếu; scale 0 ép hình xuống đoạn thẳng.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Nhân từng thành phần",
          explanation:
            "scalePoint không sửa đầu vào. Scale X âm phản chiếu qua trục Y; scale X bằng 0 ép hình lên trục Y.",
        },
        {
          title: "Tính lại từ gốc",
          explanation:
            "transformedSquare luôn bắt đầu từ makeSquare, không dùng kết quả frame trước.",
        },
        {
          title: "Thử ba dấu của scale",
          explanation: "So giá trị dương, 0 và âm bằng A/D, S/W, rồi R để về identity.",
        },
      ],
    },
    "p09-l03": {
      focus: "Suy công thức từ sin/cos, giữ góc trong radian và kiểm độ dài.",
      expected: "Rotation dương quay ngược chiều kim đồng hồ trong world Y-up.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy ảnh của hai basis",
          explanation: "ex thành (cos,sin), ey thành (−sin,cos); đó là hai cột của rotation.",
        },
        {
          title: "Giữ radian trong state",
          explanation:
            "Q/E đổi π/36 mỗi lần; world Y-up quyết định chiều góc dương, không đảo Y trong rotatePoint.",
        },
        {
          title: "Kiểm rotation thuần",
          explanation: "Reset scale về (1,1) trước khi kiểm độ dài và góc vuông.",
        },
      ],
    },
    "p09-l04": {
      focus: "Tính shear đồng thời, đọc hai cột cơ sở và nhân ma trận 2×2.",
      expected: "Mat2 làm cùng phép tuyến tính với công thức thành phần.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Shear dùng hai tọa độ cũ",
          explanation: "Hai phương trình đồng thời khác hai shear nối tiếp; det(H)=1−hx·hy.",
        },
        {
          title: "Đọc cột của Mat2",
          explanation:
            "Hai cột là ảnh của ex/ey. Row-major là cách lưu, không tự quyết hướng của vector.",
        },
        {
          title: "Nhân hàng với cột",
          explanation: "Tính tay [[1,2],[3,4]]·[[2,0],[1,2]], sau đó dùng R·H·S thật trong render.",
        },
      ],
    },
    "p09-l05": {
      focus: "Tự viết Mat3 và phép nhân; translation nằm ở cột cuối, không phải hàng cuối.",
      expected: "Translation nằm ở cột cuối; direction không bị dịch chuyển.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Thêm thành phần 1 hoặc 0",
          explanation:
            "Điểm nhận translation; hướng không nhận translation vì thành phần cuối là 0.",
        },
        {
          title: "Viết Mat3 affine",
          explanation:
            "Translation ở cột cuối và hàng cuối giữ [0,0,1]; không trộn với ma trận projection.",
        },
        {
          title: "Thay đường render",
          explanation:
            "worldPoint gọi transformPoint(sceneMatrix,local); basis lấy hiệu hai point hoặc transformDirection.",
        },
      ],
    },
    "p09-l06": {
      focus: "So T·R·H·S với T·S·H·R bằng cùng tham số, không tráo slider.",
      expected: "Hai order dùng cùng tham số cho hai hình khác ở preset ghép.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ tham số, chỉ đổi tích",
          explanation: "O chọn T·R·H·S hoặc T·S·H·R; translation vẫn ở ngoài trong cả hai.",
        },
        {
          title: "Đưa cả lưới qua matrix",
          explanation: "Biến đổi hai đầu mỗi đường lưới bằng cùng worldPoint dùng cho shape.",
        },
        {
          title: "Kiểm bằng một điểm cụ thể",
          explanation: "Scale(2,1) và quay 90° cho (−1,2) hoặc (−2,1) từ điểm (1,1).",
        },
      ],
    },
    "p09-l07": {
      focus: "Vẽ track/nút kéo, hit-test, capture và đổi input sang tọa độ logic đúng một lần.",
      expected: "Bảy slider SDL3 hoạt động bằng chuột và bàn phím, capture có owner.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/controls.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Từ track tới giá trị",
          explanation:
            "Hit-test chọn slider một lần; fraction được clamp rồi map sang miền đã khai báo.",
        },
        {
          title: "Giữ owner và điểm nắm",
          explanation:
            "Một capture cho mỗi thao tác; viewport drag giữ offset; mouse-up nhận mẫu cuối rồi hủy.",
        },
        {
          title: "Đổi input đúng một lần",
          explanation:
            "SDL_ConvertEventToRenderCoordinates đưa mouse về bảng logic; resize/blur/reset hủy kéo và không nhân DPI lần nữa.",
        },
      ],
    },
    "p09-l08": {
      focus: "Kiểm bằng số biết trước, hai cách tính độc lập, diện tích có dấu và CTest.",
      expected: "Có source đầy đủ, test active Debug/Release và kiểm chứng diện tích có dấu.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/controls.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Không chỉ kiểm ảnh nhìn hợp lý",
          explanation:
            "Dùng số biết trước, oracle hệ số khai triển và so từng đỉnh; diện tích không bắt được mọi lỗi order.",
        },
        {
          title: "Giữ dấu diện tích",
          explanation:
            "Signed area/4≈det; absolute area/4≈|det|. Gần 0 được ghi rõ là suy biến/gần suy biến.",
        },
        {
          title: "Chạy đủ hai cấu hình",
          explanation:
            "Build tất cả target rồi CTest Debug/Release; sau smoke vẫn cần QA slider/capture/DPI trực tiếp.",
        },
      ],
    },
  },
  references: {
    "p09-l01": [
      {
        label: "Local space",
        href: "/glossary#local-space",
        kind: "Thuật ngữ",
      },
    ],
    "p09-l02": [
      {
        label: "Scalar multiplication",
        href: "/glossary#scalar-multiplication",
        kind: "Thuật ngữ",
      },
    ],
    "p09-l03": [
      {
        label: "Radian",
        href: "/glossary#radian",
        kind: "Thuật ngữ",
      },
    ],
    "p09-l04": [
      {
        label: "Shear",
        href: "/glossary#shear",
        kind: "Thuật ngữ",
      },
    ],
    "p09-l05": [
      {
        label: "Transformation matrix",
        href: "/glossary#transformation-matrix",
        kind: "Thuật ngữ",
      },
    ],
    "p09-l06": [
      {
        label: "Affine transform",
        href: "/glossary#affine-transform",
        kind: "Thuật ngữ",
      },
    ],
    "p09-l07": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
    ],
    "p09-l08": [
      {
        label: "Determinant",
        href: "/glossary#determinant",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
