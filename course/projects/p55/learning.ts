import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p55-l01": {
      focus: "Streaming texture, RGBA và ảnh kiểm pipeline trước vật lý.",
      expected: "Ảnh trắng có patch tối, texture 80×60 giữ aspect khi resize.",
      files: ["include/detector.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tạo texture nhỏ",
          explanation:
            "Tạo streaming texture RGBA32 80×60, chọn nearest và hủy texture trước renderer.",
        },
        {
          title: "Dựng ảnh CPU",
          explanation:
            "Nền trắng và patch tối kiểm ảnh được truyền đúng lên texture; chưa tính ray hay vật liệu.",
        },
        {
          title: "Upload đủ row",
          explanation:
            "Ghi đủ từng hàng theo pitch SDL trả về, unlock rồi RenderTexture; pitch tính bằng byte.",
        },
      ],
    },
    "p55-l02": {
      focus: "Pixel centre, beam normalized và chiều dài đoạn hữu hạn.",
      expected: "Gradient hướng ray và marker pixel trùng tia source→detector.",
      files: ["include/geometry.hpp", "include/view.hpp", "include/detector.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt source và detector",
          explanation: "Đặt nguồn ở z=-6, detector ở z=6 với kích thước 6×4.5 world units.",
        },
        {
          title: "Sinh beam ở pixel centre",
          explanation:
            "Chuẩn hóa direction, đồng thời giữ khoảng cách từ source tới pixel làm maximum.",
        },
        {
          title: "Chọn pixel và xem tia",
          explanation:
            "Đổi input sang logical coordinates, bỏ letterbox và xem tia trong hình chiếu XZ.",
        },
      ],
    },
    "p55-l03": {
      focus: "Slab interval, source inside, detector clip và xoay object space.",
      expected: "Silhouette mức xám theo chiều dài qua một slab xoay.",
      files: [
        "include/geometry.hpp",
        "include/materials.hpp",
        "include/detector.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Giao slab trong đoạn hữu hạn",
          explanation: "Bắt đầu entry=0, exit=maximum; xét ray song song trước khi chia.",
        },
        {
          title: "Đổi ray sang object space",
          explanation: "Đổi ray bằng rotation nghịch đảo; giữ độ dài t và không xoay detector.",
        },
        {
          title: "Vẽ ảnh length chẩn đoán",
          explanation:
            "Ảnh L/4 chỉ giúp kiểm chiều dài; đối chiếu tia giữa và tia xiên trước khi thêm absorption.",
        },
      ],
    },
    "p55-l04": {
      focus: "Optical depth cộng, transmission nhân và overlap cộng mu.",
      expected: "Ảnh transmission qua layers, đọc được tau/T/I.",
      files: [
        "include/materials.hpp",
        "include/projection.hpp",
        "include/detector.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Tạo scene nhiều lớp",
          explanation:
            "Mỗi material giữ mu riêng; vùng overlap cộng hệ số, không ưu tiên theo draw order.",
        },
        {
          title: "Cộng optical depth",
          explanation: "Lấy chord của mỗi box rồi cộng mu*length; mu có đơn vị 1/world-unit.",
        },
        {
          title: "Tính intensity tại detector",
          explanation: "T=exp−tau, I=I0*T, không C+T*background hay alpha blend.",
        },
      ],
    },
    "p55-l05": {
      focus: "Midpoint, partial tail, air segment và sai số biên không đơn điệu.",
      expected: "Exact/midpoint đổi được và biết sai số do crossing boundary.",
      files: ["include/materials.hpp", "include/projection.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lấy midpoint cả source–detector",
          explanation: "Mẫu trong không khí có mu=0; đoạn cuối dùng ds còn lại thật sự.",
        },
        {
          title: "Chặn chất lượng không hợp lệ",
          explanation:
            "Kiểm step và cap trước vòng lặp; không nhận một ray bị cắt cụt như kết quả đúng.",
        },
        {
          title: "So biên với chord analytic",
          explanation:
            "Dùng bound cho các cell cắt biên; sai số không nhất thiết giảm đều ở từng pixel.",
        },
      ],
    },
    "p55-l06": {
      focus: "I/I0, -ln(T), display range và palette không sửa measurement.",
      expected: "Raw I thay theo I0 nhưng ratio/p giữ nguyên; palette chỉ display.",
      files: ["include/detector.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ measurement raw",
          explanation:
            "Trong mô hình không noise, exposure đổi raw I nhưng không đổi ratio hoặc p.",
        },
        {
          title: "Lấy log có floor",
          explanation:
            "Giữ T raw; chỉ đặt floor khi lấy log, báo flag khi clamp và tách display range.",
        },
        {
          title: "Đổi palette không đổi physics",
          explanation:
            "Ratio/log/invert chỉ đổi cách vẽ trong detector.hpp, không sửa optical depth.",
        },
      ],
    },
    "p55-l07": {
      focus: "Phổ hai thành phần minh họa vì sao log không còn tuyến tính theo độ dày.",
      expected: "Mono/two-energy khác nhau, weight 0/1 kiểm được theo công thức.",
      files: ["include/projection.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt hai hệ số mỗi material",
          explanation:
            "Hai hệ số là số tổng hợp để thử công thức, không bảng dữ liệu vật liệu theo keV.",
        },
        {
          title: "Cộng transmission theo weight",
          explanation: "Cộng intensity trước log; weight 0/1 trả về mono high/low tương ứng.",
        },
        {
          title: "Thấy log không còn tuyến tính",
          explanation:
            "Khi vật thể dày hơn, thành phần ít suy giảm chiếm tỉ lệ lớn hơn trong tín hiệu truyền qua.",
        },
      ],
    },
    "p55-l08": {
      focus: "Oracle slab, CTest Debug/Release, audit và giới hạn mô hình.",
      expected: "V audit PASS và final chạy với đầy đủ controls.",
      files: ["include/audit.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm slab độc lập",
          explanation:
            "Dùng thickness và mu biết trước để có nghiệm độc lập, không so hai bản code có cùng lỗi.",
        },
        {
          title: "Chạy test có timeout",
          explanation:
            "Chạy CTest không window ở Debug/Release; kiểm SDL smoke riêng với timeout 30 giây.",
        },
        {
          title: "Bàn giao và nêu scope",
          explanation:
            "Bàn giao đủ source/README/ZIP; kiểm mouse, keyboard và resize riêng với các test toán.",
        },
      ],
    },
  },
  references: {
    "p55-l01": [
      {
        label: "SDL_LockTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p55-l02": [
      {
        label: "X-ray optical depth",
        href: "/glossary#xray-optical-depth",
        kind: "Thuật ngữ",
      },
    ],
    "p55-l03": [
      {
        label: "X-ray optical depth",
        href: "/glossary#xray-optical-depth",
        kind: "Thuật ngữ",
      },
    ],
    "p55-l04": [
      {
        label: "X-ray optical depth",
        href: "/glossary#xray-optical-depth",
        kind: "Thuật ngữ",
      },
    ],
    "p55-l05": [
      {
        label: "X-ray optical depth",
        href: "/glossary#xray-optical-depth",
        kind: "Thuật ngữ",
      },
    ],
    "p55-l06": [
      {
        label: "Flat-field và ảnh log",
        href: "/glossary#xray-flat-field-log",
        kind: "Thuật ngữ",
      },
    ],
    "p55-l07": [
      {
        label: "Phổ hai thành phần",
        href: "/glossary#xray-two-energy",
        kind: "Thuật ngữ",
      },
    ],
    "p55-l08": [
      {
        label: "Phổ hai thành phần",
        href: "/glossary#xray-two-energy",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
