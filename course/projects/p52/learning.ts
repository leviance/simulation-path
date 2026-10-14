import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p52-l01": {
      focus: "Mở SDL window, chiếu world lên màn hình và vẽ bốn hình bằng khung dây.",
      expected: "Dựng cảnh để nhìn thấy thứ mình sắp chọn",
      files: ["include/shapes.hpp", "include/camera.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy bộ khung SDL",
          explanation: "Starter mở window và renderer, xử lý thoát; chưa vẽ hình hay tính giao.",
        },
        {
          title: "Đặt bốn hình trong world",
          explanation: "Plane, sphere, AABB và triangle giữ dữ liệu hình học tách khỏi pixel.",
        },
        {
          title: "Chiếu rồi vẽ cạnh",
          explanation:
            "Camera basis và vertical FOV quyết định projection; các đoạn qua near plane được cắt trước khi chia depth.",
        },
      ],
    },
    "p52-l02": {
      focus: "Đổi tọa độ input, aspect và FOV thành direction; kiểm ngược bằng projection.",
      expected: "Từ vị trí chuột đến một tia trong world",
      files: ["include/camera.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Quy ước một tia",
          explanation:
            "Ray giữ origin, direction và khoảng t hợp lệ; t chỉ là khoảng cách khi direction có độ dài một.",
        },
        {
          title: "Dựng direction qua image plane",
          explanation:
            "u/v nằm trong [0,1]; đổi dấu y rồi dùng cùng basis, aspect và FOV với projection.",
        },
        {
          title: "Nối input vào ray",
          explanation:
            "Đổi SDL event sang logical renderer coordinates để letterbox và DPI không làm lệch tia.",
        },
      ],
    },
    "p52-l03": {
      focus: "Giải một phương trình theo t, thêm Hit và xử lý khoảng tia cùng normal.",
      expected: "Tìm điểm chạm mặt phẳng và nhận ra tia song song",
      files: ["include/hit.hpp", "include/query.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn dữ liệu trả về",
          explanation:
            "optional<Hit> biểu diễn hit hoặc miss, không dùng t=0 làm dấu hiệu thất bại.",
        },
        {
          title: "Giải phương trình mặt phẳng",
          explanation:
            "Dot với normal để tìm t; ngưỡng góc loại tia gần song song và coplanar không có điểm duy nhất.",
        },
        {
          title: "Vẽ điểm và normal",
          explanation:
            "Các hit riêng được ghi lên title và vẽ đoạn normal; plane là vô hạn dù lưới chỉ vẽ hữu hạn.",
        },
      ],
    },
    "p52-l04": {
      focus: "Giải quadratic với direction bất kỳ, chọn nghiệm hợp lệ và giữ outward normal.",
      expected: "Hai nghiệm của sphere: vào, ra và tiếp tuyến",
      files: ["include/sphere.hpp", "include/query.hpp"],
      steps: [
        {
          title: "Thay tia vào phương trình sphere",
          explanation: "Offset từ tâm cho a, halfB, c; không giả sử a=1 trong hàm giao.",
        },
        {
          title: "Tính hai nghiệm ít triệt tiêu",
          explanation: "q dùng dấu halfB; q=0 có nhánh riêng, discriminant âm là miss.",
        },
        {
          title: "Chọn nghiệm trong range",
          explanation:
            "Thử entry rồi exit; tia xuất phát trong sphere phải lấy nghiệm dương phía sau.",
        },
      ],
    },
    "p52-l05": {
      focus: "Lấy giao khoảng x/y/z; phân biệt xuyên thể tích với chạm bề mặt.",
      expected: "Thu hẹp khoảng tia qua ba slab của box",
      files: ["include/box.hpp", "include/query.hpp"],
      steps: [
        {
          title: "Tách box thành ba slab",
          explanation: "Mỗi trục cho một entry/exit; hướng âm đổi thứ tự và normal theo mặt.",
        },
        {
          title: "Giao các khoảng",
          explanation:
            "Entry lớn nhất và exit nhỏ nhất tạo khoảng chung; direction bằng zero xử lý trước phép chia.",
        },
        {
          title: "Chọn mặt vào hoặc mặt thoát",
          explanation:
            "Giữ interval chưa cắt range để không biến tMin ở trong hộp thành một hit giả.",
        },
      ],
    },
    "p52-l06": {
      focus: "Möller–Trumbore, barycentric, hai phía và tam giác suy biến.",
      expected: "Chọn đúng phần bên trong tam giác",
      files: ["include/triangle.hpp", "include/query.hpp"],
      steps: [
        {
          title: "Dựng hai cạnh từ A",
          explanation: "B−A và C−A tạo cơ sở trên mặt tam giác; cross cho normal hình học.",
        },
        {
          title: "Giải t, u và v",
          explanation: "Cross/dot tương ứng hệ ba ẩn; determinant gần zero không được đem chia.",
        },
        {
          title: "Kiểm miền barycentric",
          explanation: "u,v không âm và u+v≤1; w=1−u−v tái dựng point để kiểm độc lập.",
        },
      ],
    },
    "p52-l07": {
      focus: "So t trên cùng ray, giữ ID ổn định và thêm preset, scan/pause, range.",
      expected: "Ghép bốn phép giao thành công cụ chọn vật thể",
      files: ["include/query.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Thu đủ ứng viên",
          explanation:
            "Giữ kết quả mỗi primitive để inspector giải thích được tại sao một hình thua.",
        },
        {
          title: "Chọn t nhỏ nhất",
          explanation:
            "Tie chính xác dùng ID nhỏ hơn, không phụ thuộc thứ tự duyệt; không lấy hình vẽ sau cùng.",
        },
        {
          title: "Thêm điều khiển có thể dừng",
          explanation:
            "Preset trong sphere/box kiểm exit; scan chỉ bật chủ động, blur dừng và reset đưa mọi tham số về mặc định.",
        },
      ],
    },
    "p52-l08": {
      focus: "CTest Debug/Release, round-trip, residual và source độc lập tải về.",
      expected: "Kiểm chứng hình học và chạy project hoàn chỉnh",
      files: ["tests/tests.cpp", "include/validation.hpp", "include/query.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm camera bằng chiều ngược lại",
          explanation:
            "Lấy point trên ray rồi project về đúng u/v ở nhiều aspect; không chỉ nhìn crosshair.",
        },
        {
          title: "Kiểm giao bằng hình học độc lập",
          explanation:
            "Sphere residual, box face và barycentric reconstruction kiểm point chứ không so hàm với chính nó.",
        },
        {
          title: "Đóng gói và chạy cả Release",
          explanation:
            "Phím V kiểm các hit hiện tại bằng phương trình hình; CTest kiểm thêm ca có nghiệm biết trước và vẫn chạy thật ở Release.",
        },
      ],
    },
  },
  references: {
    "p52-l01": [
      {
        label: "Ray interval và surface hit",
        href: "/glossary#ray-surface-hit",
        kind: "Thuật ngữ",
      },
    ],
    "p52-l02": [
      {
        label: "SDL input → render coordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p52-l03": [
      {
        label: "Ray interval và surface hit",
        href: "/glossary#ray-surface-hit",
        kind: "Thuật ngữ",
      },
    ],
    "p52-l04": [
      {
        label: "Ray interval và surface hit",
        href: "/glossary#ray-surface-hit",
        kind: "Thuật ngữ",
      },
    ],
    "p52-l05": [
      {
        label: "Ray interval và surface hit",
        href: "/glossary#ray-surface-hit",
        kind: "Thuật ngữ",
      },
      {
        label: "Slab interval",
        href: "/glossary#ray-slab-interval",
        kind: "Thuật ngữ",
      },
    ],
    "p52-l06": [
      {
        label: "Ray interval và surface hit",
        href: "/glossary#ray-surface-hit",
        kind: "Thuật ngữ",
      },
      {
        label: "Ray–triangle barycentric",
        href: "/glossary#ray-triangle-barycentric",
        kind: "Thuật ngữ",
      },
    ],
    "p52-l07": [
      {
        label: "Ray interval và surface hit",
        href: "/glossary#ray-surface-hit",
        kind: "Thuật ngữ",
      },
    ],
    "p52-l08": [
      {
        label: "Ray interval và surface hit",
        href: "/glossary#ray-surface-hit",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
