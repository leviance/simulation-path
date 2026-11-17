import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p53-l01": {
      focus: "Từ phantom scalar đến ảnh mức xám và streaming texture SDL3.",
      expected: "Nhìn thấy lát cắt đầu tiên",
      files: ["include/model.hpp", "include/display.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy bộ khung SDL",
          explanation:
            "Starter mở window và renderer; Bài 01 thêm texture, không bắt đầu bằng một mảng 3D chưa nhìn được.",
        },
        {
          title: "Lấy mẫu một mặt phẳng",
          explanation:
            "Giữ z tại một giá trị, đổi pixel centre sang x/y world rồi tính phantom bất đối xứng.",
        },
        {
          title: "Ghi RGBA theo pitch",
          explanation:
            "Ghi đủ mỗi row vào texture streaming, unlock rồi RenderTexture; CPU giữ bản ảnh riêng.",
        },
      ],
    },
    "p53-l02": {
      focus: "Khối 64³/128³ thật, tâm mẫu, spacing và địa chỉ x nhanh nhất.",
      expected: "Lưu cả khối, không chỉ tính một ảnh",
      files: ["include/volume.hpp", "include/model.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Cấp phát volume thật và giữ nguyên extent",
          explanation:
            "Bắt đầu 64³ (2 MiB), cuối mở 128³ (16 MiB); spacing dương hữu hạn và extent giữ nguyên.",
        },
        {
          title: "Đổi index sang world centre",
          explanation:
            "Gốc world ở giữa box; tâm mẫu là lower+(index+0.5)*spacing. Đừng coi tâm voxel là góc ô.",
        },
        {
          title: "Lấy nearest từ dữ liệu thật",
          explanation:
            "Phantom được lấy mẫu một lần; ảnh sau đó đọc volume. Ramp kiểm hướng và stride độc lập.",
        },
      ],
    },
    "p53-l03": {
      focus: "XY/XZ/YZ, trục giữ cố định và tỉ lệ hình theo physical spacing.",
      expected: "Ba mặt cắt của cùng một khối",
      files: ["include/model.hpp", "include/display.hpp", "include/layout.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt tên các trục trong mỗi view",
          explanation:
            "XY giữ z, XZ giữ y, YZ giữ x; quy ước toán rõ ràng, không gọi là radiology convention.",
        },
        {
          title: "Dùng ba thanh cắt độc lập",
          explanation:
            "XY/XZ/YZ lần lượt giữ z/y/x; khối cắt mở dùng lại ba ảnh ấy, không tạo volume khác hoặc đo bằng mesh vỏ.",
        },
        {
          title: "Fit ảnh bằng physical extent",
          explanation:
            "Kích thước thật là count*spacing; ảnh dùng cùng scale hai chiều và để viền thừa không bị méo.",
        },
      ],
    },
    "p53-l04": {
      focus: "Tách scalar, window/level, brightness và byte màu.",
      expected: "Làm rõ chi tiết mà không sửa dữ liệu",
      files: ["include/display.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn một cửa sổ scalar",
          explanation: "Level là tâm, width là khoảng giá trị; giá trị ngoài cửa sổ bị clamp.",
        },
        {
          title: "Đổi scalar thành mức xám",
          explanation:
            "Brightness nằm trong [0,1], quantize thành 0..255 sau sampling; không nội suy byte màu thay scalar.",
        },
        {
          title: "Đối chiếu inspector",
          explanation:
            "Inspector luôn hiện scalar gốc; W/S/A/D chỉ đổi display mapping, histogram không thay.",
        },
      ],
    },
    "p53-l05": {
      focus: "Tâm mẫu, tám voxel, bảy lerp và cách xử lý nửa voxel sát mép.",
      expected: "Đi giữa hai lát bằng trilinear",
      files: ["include/sampling.hpp", "include/display.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tìm hai centre quanh mỗi tọa độ",
          explanation: "Chặn ngoài physical box trước khi clamp grid coordinate về vùng centre.",
        },
        {
          title: "Nội suy bốn cạnh x, hai cạnh y rồi một cạnh z",
          explanation:
            "Bảy lerp dùng tám voxel; bảng trọng số minh họa cùng phép tính và tổng trọng số bằng một.",
        },
        {
          title: "So nearest và trilinear",
          explanation:
            "L bật sampling; PageUp/Down dời 0.1 voxel; cùng world point có thể cho hai scalar khác nhau.",
        },
      ],
    },
    "p53-l06": {
      focus: "Crosshair đồng bộ, pointer input, keyboard và quét có thể dừng.",
      expected: "Chọn một điểm, hiểu cả ba mặt cắt",
      files: ["include/layout.hpp", "include/input.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dùng một cursor cho cả ba view",
          explanation:
            "Một Point world là state duy nhất, mỗi view giữ một thành phần làm cut coordinate.",
        },
        {
          title: "Đổi pixel trong ảnh sang world",
          explanation:
            "Chỉ pick fitted image, giữ trục cut; kéo vùng khối thì orbit camera. Ctrl+mũi tên không dời probe.",
        },
        {
          title: "Cho quét chạy có giới hạn",
          explanation:
            "Mở paused, scan tối đa 4 voxel/s và dt clamp 0.1; tới lát cuối dừng, blur/reset hủy drag.",
        },
      ],
    },
    "p53-l07": {
      focus: "Phím V, affine-field oracle, CTest Debug/Release và source tải về.",
      expected: "Chứng minh trình xem đang đọc đúng dữ liệu",
      files: ["include/diagnostics.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm shape và index độc lập",
          explanation:
            "Dataset không cubic bắt lỗi tráo trục; test centre, corner và biên ngoài riêng.",
        },
        {
          title: "Dùng affine field làm oracle",
          explanation:
            "Trilinear phải tái tạo trường tuyến tính ở miền centre; không dùng lại phantom sampler làm expected.",
        },
        {
          title: "Bàn giao bản chạy độc lập",
          explanation:
            "V audit hữu hạn; CTest không window, không assert bị Release bỏ; kiểm desktop riêng theo README.",
        },
      ],
    },
  },
  references: {
    "p53-l01": [
      {
        label: "SDL_LockTexture và pitch",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p53-l02": [
      {
        label: "Voxel centre và physical spacing",
        href: "/glossary#volume-voxel-centre",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l03": [
      {
        label: "Voxel centre và physical spacing",
        href: "/glossary#volume-voxel-centre",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l04": [
      {
        label: "Voxel centre và physical spacing",
        href: "/glossary#volume-voxel-centre",
        kind: "Thuật ngữ",
      },
      {
        label: "Window/level",
        href: "/glossary#volume-window-level",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l05": [
      {
        label: "Voxel centre và physical spacing",
        href: "/glossary#volume-voxel-centre",
        kind: "Thuật ngữ",
      },
      {
        label: "Trilinear sampling",
        href: "/glossary#volume-trilinear",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l06": [
      {
        label: "Voxel centre và physical spacing",
        href: "/glossary#volume-voxel-centre",
        kind: "Thuật ngữ",
      },
    ],
    "p53-l07": [
      {
        label: "Voxel centre và physical spacing",
        href: "/glossary#volume-voxel-centre",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
