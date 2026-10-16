import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p60-l01": {
      focus:
        "Chạy khung có sẵn khối đất, rồi thêm tâm ngắm và đưa tọa độ chuột về đúng pixel của ảnh CPU.",
      expected: "Khối đất hiển thị được; mouse hoặc WASD dịch tâm ngắm mà chưa sửa block nào.",
      files: ["include/editor.hpp", "include/controls.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy starter",
          explanation:
            "Build starter trước để thấy khối đất. ZIP đã có đủ camera và rasterizer từ Project 59.",
        },
        {
          title: "Đặt crosshair",
          explanation:
            "Vẽ dấu cộng ở tâm pixel, tức tọa độ nguyên cộng 0.5, để trùng vị trí lấy mẫu của rasterizer.",
        },
        {
          title: "Đổi tọa độ input",
          explanation:
            "Đổi sự kiện về SDL logical coordinates rồi chia 2. Bỏ sự kiện ngoài vùng ảnh, kể cả phần letterbox.",
        },
      ],
    },
    "p60-l02": {
      focus: "Đảo phép chiếu trực giao bằng right/up/towardViewer và kiểm chiếu ngược.",
      expected:
        "Tia qua đúng tâm pixel đang ngắm; chiếu một điểm trên tia về screen vẫn trả lại pixel đó.",
      files: ["include/ray.hpp", "include/editor.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Dựng basis inverse",
          explanation:
            "Từ yaw và pitch, dựng ba hướng right/up/towardViewer để đảo phép chiếu camera đang dùng.",
        },
        {
          title: "Tạo origin và direction",
          explanation:
            "Đặt origin trên mặt phẳng depth=32 và chuẩn hóa direction hướng vào scene. Các ray trực giao song song với nhau.",
        },
        {
          title: "Kiểm chiếu ngược",
          explanation:
            "Thử nhiều điểm theo t và nhiều góc camera. DPR chỉ thuộc bước hiển thị Canvas, không nhân vào world ray.",
        },
      ],
    },
    "p60-l03": {
      focus: "Slab test, phương song song, half-open bounds, tầm với và miss.",
      expected: "Nhận đúng khoảng enter/exit hoặc MISS, kể cả ray song song và ray chạm biên.",
      files: ["include/clip.hpp", "include/editor.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Xét từng slab",
          explanation:
            "Nếu direction của một trục bằng zero, kiểm origin có thuộc slab half-open hay không trước mọi phép chia.",
        },
        {
          title: "Giao khoảng t",
          explanation:
            "Lấy giao khoảng của ba slab với reach; chỉ nhận khi đoạn bên trong dài hơn tolerance đã công bố.",
        },
        {
          title: "Đọc entry normal",
          explanation:
            "Giữ mặt vừa đi vào để dùng ở bài sau. Nếu origin đã trong chunk thì không tự bịa một entry normal.",
        },
      ],
    },
    "p60-l04": {
      focus: "Cell đầu theo hướng đi, step/tMax/tDelta, tie và preview hữu hạn.",
      expected:
        "Xem được từng ô mà tia thật sự đi vào, theo thứ tự gần đến xa và không ghé ô chỉ chạm góc.",
      files: ["include/traversal.hpp", "include/editor.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Chọn ô đầu",
          explanation:
            "Tại biên nguyên, hướng âm đi vào ô phía âm. Chỉ xử lý sai số điểm đầu sau khi đã clip thành công.",
        },
        {
          title: "Khởi tạo crossing",
          explanation:
            "Tính step theo dấu direction, tMax từ ray origin và tDelta=1/abs(d) cho từng trục.",
        },
        {
          title: "Đi qua tie",
          explanation:
            "Nếu vượt nhiều mặt cùng lúc thì tiến mọi trục tie. Chỉ ghi đoạn đi bên trong và giới hạn 64 vòng.",
        },
      ],
    },
    "p60-l05": {
      focus: "Hit gần nhất, normal hướng ra, tie X/Y/Z và origin trong block.",
      expected:
        "Outline chỉ đúng block gần nhất; readout cho biết cell, khoảng cách và normal hướng ra.",
      files: ["include/traversal.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Dừng tại solid",
          explanation:
            "Sau khi có một visit đủ dài, đọc Block ID; gặp ô khác Air đầu tiên thì trả hit ngay.",
        },
        {
          title: "Đọc hit",
          explanation:
            "Trả cell, distance và normal thành các trường riêng. Khi ray đi qua góc, ô Air trước đó không nhất thiết kề mặt hit.",
        },
        {
          title: "Chốt quy ước biên",
          explanation:
            "Normal tie ưu tiên X/Y/Z. Origin trong block cho t=0 và normal zero; không dùng kết quả ấy để đặt block.",
        },
      ],
    },
    "p60-l06": {
      focus: "Mutation có chủ đích, re-query và lộ block phía sau.",
      expected: "Mỗi lần click hoặc nhấn Delete chỉ xóa một block và làm lộ các mặt phía sau.",
      files: ["include/editing.hpp", "include/editor.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Giữ query const",
          explanation:
            "Giữ traversal chỉ đọc chunk. Chỉ hàm breakBlock mới ghi ID Air khi action xảy ra.",
        },
        {
          title: "Re-query khi action",
          explanation:
            "Tạo ray từ camera/aim hiện tại và đọc lại chunk, không dùng cached Hit của preview.",
        },
        {
          title: "Invalidate khi đổi thật",
          explanation:
            "Chỉ action thành công mới đánh dấu mesh/frame/pick để cập nhật; MISS chỉ trả thông báo.",
        },
      ],
    },
    "p60-l07": {
      focus: "hit+normal, preview xanh, kiểm occupancy/biên và vật liệu.",
      expected:
        "Ghost chỉ ô Air kề mặt hit; đặt một block hoặc từ chối rõ ràng khi ô đích không hợp lệ.",
      files: ["include/editing.hpp", "include/controls.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Tạo ô đích",
          explanation:
            "Cộng normal hướng ra vào hit.cell để tìm neighbor kề mặt, rồi kiểm nó còn trong chunk.",
        },
        {
          title: "Kiểm occupancy/material",
          explanation:
            "Chỉ ghi material 1..3 vào Air. Không ghi đè đất hoặc tự tạo chunk khi target vượt biên.",
        },
        {
          title: "Vẽ ghost",
          explanation:
            "Outline xanh chỉ là dự báo. Nút, phím E và click phải đều gọi cùng action đặt một lần.",
        },
      ],
    },
    "p60-l08": {
      focus: "Aim chỉ query, camera raster/query, edit rebuild; action không dùng preview cũ.",
      expected:
        "Các counter chứng minh aim không rebuild/raster, camera không rebuild và idle không query lại.",
      files: ["include/editor.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Tách dirty flags",
          explanation:
            "Aim/reach chỉ làm pickDirty; camera thêm frameDirty; dữ liệu block đổi mới làm meshDirty.",
        },
        {
          title: "Cache preview",
          explanation:
            "Giữ trace khi đầu vào chưa đổi, nhưng action vẫn query lại để không sửa theo preview cũ.",
        },
        {
          title: "Dừng sạch",
          explanation:
            "Bỏ key repeat, nhả capture khi blur/reset và dừng playback hữu hạn. Reduced-motion vẫn xem được từng bước.",
        },
      ],
    },
    "p60-l09": {
      focus: "Oracle AABB độc lập, fixture biên/tie, Debug/Release và source đầy đủ.",
      expected:
        "Build và test được final; phân biệt rõ pure tests, smoke một frame và kiểm tương tác desktop.",
      files: ["include/audit.hpp", "tests/tests.cpp", "include/controls.hpp"],
      steps: [
        {
          title: "Dùng oracle AABB",
          explanation:
            "Quét từng block AABB để đối chiếu hit gần nhất; bổ sung fixture có đáp án tay vì oracle dùng chung slab test.",
        },
        {
          title: "Kiểm mutation/cache",
          explanation:
            "So toàn chunk trước/sau action. Kiểm cả thất bại, hai edit trước refresh và số lần dựng mesh.",
        },
        {
          title: "Build có giới hạn",
          explanation:
            "Build Debug/Release với tối đa hai compiler, CTest có timeout và smoke một frame. Báo riêng phần tương tác desktop chưa kiểm.",
        },
      ],
    },
  },
  references: {
    "p60-l01": [
      {
        label: "Thuật ngữ voxel picking",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l02": [
      {
        label: "Thuật ngữ voxel picking",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l03": [
      {
        label: "Thuật ngữ voxel picking",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l04": [
      {
        label: "PBRT — DDA trong grid",
        href: "https://pbr-book.org/4ed/Volume_Scattering/Media",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l05": [
      {
        label: "Thuật ngữ voxel picking",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l06": [
      {
        label: "Thuật ngữ voxel picking",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l07": [
      {
        label: "Thuật ngữ voxel picking",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l08": [
      {
        label: "Thuật ngữ voxel picking",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p60-l09": [
      {
        label: "SDL3 CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
