import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p59-l01": {
      focus: "Tại sao có thể bỏ hai mặt mà vách đá vẫn nguyên?",
      expected: "Ở cùng camera, khối đặc từ 49.152 còn 3.072 tam giác mà không thủng mặt.",
      files: [
        "include/trail/visibility.hpp",
        "include/trail/region.hpp",
        "include/trail/field-render.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/scene.hpp",
        "include/trail/field-controls.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Quyết định từ hai ô, không từ camera",
          explanation:
            "Viết exposedFace trong visibility.hpp. Tự xét bốn cặp: đá–khí giữ mặt đá; đá–đá bỏ; nước–nước bỏ; đá–nước giữ mặt đá nhưng không vẽ thêm mặt nước chồng lên.",
        },
        {
          title: "Cho mỗi cột một mesh có thể dựng lại",
          explanation:
            "Trong region.hpp, giữ cột và mesh của nó cùng một địa chỉ chunk. sample đổi tọa độ world sang địa chỉ cột và ô local. put đánh dấu chính cột vừa nạp và các hàng xóm đã có dữ liệu; rebuild chọn thuật toán rồi cất kết quả vào đúng cột. Khi chưa có hàng xóm, coi phía ngoài là thoáng để không nhìn xuyên rìa bản đồ.",
        },
        {
          title: "Đưa bờ suối cũ vào cảnh có nhiều cột",
          explanation:
            "Viết field-render.hpp trước: terrainFace lấy vật liệu và ánh sáng của mặt, còn drawRegion đi qua từng mesh đã cất. Trong field-scene.hpp, làm lần lượt ba việc: generate nạp cột (0,0) hoặc fixture đã chọn và dựng phần bẩn; các bộ đếm cộng từ các cột; draw vẽ trời rồi gọi drawRegion.",
        },
        {
          title: "Đổi thuật toán mà không đổi chỗ đứng",
          explanation:
            "Trong field-controls.hpp, gắn F2 với đổi kiểu dựng mặt rồi yêu cầu dựng lại; trong window.hpp, chuyển sự kiện phím đến fieldKey và cho HUD in số liệu của cảnh mới. Hai lần bấm F2 phải quay lại cảnh ban đầu.",
        },
      ],
    },
    "p59-l02": {
      focus: "Ai chịu trách nhiệm về đường nối giữa hai bờ?",
      expected: "Ở cảnh bờ suối F1 đếm hai chunk; đường z = 16 không xuất hiện vệt hở khi đổi F2.",
      files: ["include/trail/field-scene.hpp"],
      steps: [
        {
          title: "Theo một câu hỏi đi qua đường nối",
          explanation:
            "Ô sát mép không thể tìm láng giềng bằng cách đọc local z = 16 trong cùng mảng. Region::sample của bài trước đổi tọa độ world sang chunk/local; markNeighborhood đánh dấu lại những cột có chung mép.",
        },
        {
          title: "Nạp cột thứ hai trước khi dựng mesh",
          explanation:
            "Trong field-scene.hpp, tìm nhánh cảnh bờ suối của Scene::generate. Ngay sau region.load({0, 0});, thêm region.load({0, 1});; giữ nguyên vòng xử lý các cột bẩn ngay sau đó.",
        },
      ],
    },
    "p59-l03": {
      focus: "So hai bức hình trước khi tin số tam giác",
      expected: "Phím 5 mở hốc: còn đủ trần và vách ở cả hai chế độ. M chỉ thêm đường lưới.",
      files: [
        "include/trail/visibility.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/field-controls.hpp",
      ],
      steps: [
        {
          title: "Khoét cửa hang trong dữ liệu, không xóa mặt bằng tay",
          explanation:
            "Trong visibility.hpp, bắt đầu stoneShelter từ cột đặc; đổi các ô trong miền x từ 5 tới trước 11, y từ 4 tới trước 10, z từ 0 tới trước 11 thành Air. Bộ dựng mặt của bài 1 phải tự tạo trần, hai vách và đáy hốc mà không cần trường hợp riêng cho hang.",
        },
        {
          title: "Đặt mắt trước cửa rồi bật lưới để soi",
          explanation:
            "Trong field-scene.hpp, thêm preset chứa cột hang và đặt mắt trước cửa. Trong field-controls.hpp, nối phím 5 với việc chọn/gọi lại generate; phím M chỉ bật lớp lưới.",
        },
      ],
    },
  },
  references: {
    "p59-l01": [
      {
        label: "Bỏ mặt tiếp giáp",
        href: "/glossary#voxel-neighbor-face-elimination",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l02": [
      {
        label: "Khi nào phải dựng lại mesh?",
        href: "/glossary#voxel-mesh-invalidation",
        kind: "Thuật ngữ",
      },
    ],
    "p59-l03": [
      {
        label: "Đếm mặt bằng F = 6N − 2E",
        href: "/glossary#voxel-face-count-oracle",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
