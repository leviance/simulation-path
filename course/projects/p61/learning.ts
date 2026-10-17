import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p61-l01": {
      focus: "Chạy khối đất đã loại mặt tiếp giáp, phân biệt mặt đơn vị, quad và triangle.",
      expected: "Khối đặc hiển thị được; 1536 quad tương ứng 3072 triangle, chưa gộp mặt.",
      files: ["include/baseline.hpp", "include/app.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy starter và nhận diện phần đã có",
          explanation:
            "Cấu hình CMake với BUILD_CHECKPOINTS=ON rồi chạy target starter. Khung tạo texture RGBA32; camera/rasterizer đã có từ Project 59.",
        },
        {
          title: "Theo dấu một mặt ngoài",
          explanation:
            "Trong buildBaseline, ô đặc chỉ sinh mặt nếu neighbor là Air hoặc ngoài miền hiển thị. Grass sát Stone vẫn che nhau vì đều opaque.",
        },
        {
          title: "Đưa số đếm lên cửa sổ",
          explanation:
            "Bài 01 thêm readout. unitFaces đếm diện tích theo ô đơn vị; quads.size() đếm rectangle thật sự gửi xuống rasterizer.",
        },
      ],
    },
    "p61-l02": {
      focus: "Chọn hướng, mặt phẳng và đọc source/neighbor để tạo mask 16×16.",
      expected: "Xem được mask hướng +Y ở plane=16; các mặt bên trong khối đặc cho mask rỗng.",
      files: ["include/mask.hpp", "include/app.hpp"],
      steps: [
        {
          title: "Chọn hướng và hai trục trong mặt",
          explanation:
            "Sáu hướng theo thứ tự +X, −X, +Y, −Y, +Z, −Z. Mỗi cặp chung axis; dấu chọn bên source.",
        },
        {
          title: "Tìm hai block nằm hai bên plane",
          explanation:
            "Điền u/v vào hai trục còn lại. Hướng dương lùi source một ô; hướng âm không lùi.",
        },
        {
          title: "Chỉ điền mặt ngoài",
          explanation:
            "Ô có mặt giữ Block ID; ô không có mặt giữ Air từ khởi tạo. activeBlock xử lý biên và cut.",
        },
      ],
    },
    "p61-l03": {
      focus: "Tách quy tắc che mặt opaque khỏi khóa gộp mặt có vật liệu.",
      expected:
        "Mặt ngoài khác material không gộp, mặt giữa hai block đặc khác material vẫn bị bỏ.",
      files: ["include/rectangles.hpp", "include/model.hpp"],
      steps: [
        {
          title: "Giữ Block ID thay vì bool",
          explanation:
            "Giá trị Stone/Grass/Dirt là dữ liệu màu cho quad về sau. Điều kiện dưới chỉ kiểm neighbor là Air, không kiểm neighbor khác material.",
        },
        {
          title: "Viết phép so có tên",
          explanation:
            "sameFace từ chối cả Air==Air để seed rỗng không thành rectangle. Direction không bị quên: nó cố định trên toàn bộ mask.",
        },
        {
          title: "Dựng tường sọc để kiểm màu",
          explanation:
            "Preset 7 là tường dày một block tại z=8, mỗi bốn cột đổi material. Chọn +Z/plane=9: bốn dải, dải cuối trở lại Grass.",
        },
      ],
    },
    "p61-l04": {
      focus: "Duyệt v/u, mở rộng width trước height và không bắc cầu qua lỗ.",
      expected:
        "Mask thành các rectangle không trùng nhau; thứ tự tái lập, không gộp xuyên Air hoặc vật liệu khác.",
      files: ["include/rectangles.hpp", "include/app.hpp"],
      steps: [
        {
          title: "Mở chiều rộng từ seed",
          explanation:
            "Tính thử mask 4×4 trong bài: seed (0,0) mở rộng tới width=2 rồi gặp Grass. extractRectangles nhận Mask bằng giá trị nên xóa bản sao không phá mask gốc của inspector.",
        },
        {
          title: "Kiểm cả hàng trước khi tăng height",
          explanation:
            "Ở ví dụ 4×4, hàng v=1 hợp lệ nhưng hàng v=2 có lỗ tại (1,2), nên rectangle đầu là 2×2. Canvas đánh dấu seed và ô làm dừng mở rộng để đối chiếu từng điều kiện.",
        },
        {
          title: "Ghi kết quả rồi xóa vùng phủ",
          explanation: "Mỗi rectangle giữ vị trí/kích thước/hướng/plane/material. Xóa đúng w×h ô.",
        },
      ],
    },
    "p61-l05": {
      focus: "Dựng bốn đỉnh, hai triangle và thử gộp riêng hướng +Y trước.",
      expected: "Bản đầu gộp riêng +Y; khối đặc giảm từ 1536 xuống 1281 quad mà không mất mặt.",
      files: ["include/quad.hpp", "include/mesh.hpp", "include/app.hpp"],
      steps: [
        {
          title: "Đặt bốn góc trên plane",
          explanation:
            "Giữ axis không đổi cho mọi góc. Vertex biên được bằng 16: đó là mép chunk, không phải chỉ số block.",
        },
        {
          title: "Chọn thứ tự triangle hướng ra",
          explanation:
            "Đảo thứ tự cho hướng âm. CPU rasterizer vẽ cả hai mặt nên winding sai có thể vẫn hiện bình thường; bài cuối kiểm cross product độc lập.",
        },
        {
          title: "Gắn quad lớn vào mesh",
          explanation:
            "buildGreedy cộng unitFaces từ mask trước khi gộp. Các rectangle được lưu rồi đưa qua appendQuad.",
        },
      ],
    },
    "p61-l06": {
      focus: "Áp dụng cùng một quy tắc cho sáu hướng và 17 mặt phẳng mỗi hướng.",
      expected: "Khối đặc còn 6 quad; khoang Air kín có 12 quad; lớp cắt vẫn được đóng kín.",
      files: ["include/mesh.hpp", "include/mask.hpp", "include/app.hpp"],
      steps: [
        {
          title: "Quét đủ plane của mọi hướng",
          explanation:
            "Ở checkpoint 06, bỏ nhánh chỉ gộp face==2: mọi mask đi qua extractRectangles. Không nối rectangle giữa plane/hướng khác nhau.",
        },
        {
          title: "Giữ quy ước winding chung",
          explanation:
            "appendQuad vẫn đảo thứ tự theo parity của face. Chuyển X/Y/Z chỉ thay axis/uAxis/vAxis.",
        },
        {
          title: "Cắt miền hiển thị, không xóa world",
          explanation:
            "activeBlock trả Air khi p[1]>slice. PageUp/PageDown đánh dấu meshDirty và reset preview.",
        },
      ],
    },
    "p61-l07": {
      focus: "Lưu danh sách kết quả, chạy/dừng từng bước và không chạy lại mesher theo timer.",
      expected:
        "Nút bước và playback cùng đọc một danh sách; đổi preset/hướng/plane đưa preview về đầu.",
      files: ["include/stepper.hpp", "include/app.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lưu kết quả khi mask đổi",
          explanation:
            "resetPreview tạo mask và trích rectangle khi đổi preset/hướng/plane/cut, rồi đặt stepper về tạm dừng. Đổi camera chỉ đổi ảnh 3D.",
        },
        {
          title: "Tiến một rectangle, dừng ở cuối",
          explanation:
            "N và nút Một rectangle tăng prefix đúng một. Không modulo để tự nhảy về đầu; restart là thao tác riêng.",
        },
        {
          title: "Giới hạn thời gian, giải phóng input",
          explanation:
            "tick clamp dt tối đa 0.1 giây, chỉ tiến một rectangle khi đủ 0.15 giây. Canvas lấy frame đầu làm mốc, tạo đồng hồ mới khi Resume và không chạy bù thời gian Pause.",
        },
      ],
    },
    "p61-l08": {
      focus: "Tách mesh/frame dirty; đọc số công việc mà không suy ra FPS từ số triangle.",
      expected:
        "Idle không rebuild/raster; orbit chỉ raster; đổi vật liệu, preset, cut hoặc chế độ gộp mới rebuild.",
      files: ["include/cache.hpp", "include/app.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đánh dấu tại nơi dữ liệu đổi",
          explanation: "P, cut, M gọi changeMesh. Orbit/zoom chỉ frameDirty.",
        },
        {
          title: "Làm mới theo dependency",
          explanation:
            "Checkpoint 08 bỏ hai dòng ép dirty mỗi frame của bản trước. refresh dựng mesh rồi raster một lần; cả hai cờ false thì không làm gì.",
        },
        {
          title: "Chỉ upload khi ảnh mới",
          explanation:
            "So rasterizations trước/sau để quyết định upload texture. Reset tạo cache với counter=0; nhiều thay đổi trước refresh được gộp một rebuild.",
        },
      ],
    },
    "p61-l09": {
      focus: "Đối chiếu các mặt đơn vị có hướng/vật liệu, kiểm winding, raster và source cuối.",
      expected:
        "Debug/Release qua oracle, winding, raster/depth và cache tests; có final chạy độc lập.",
      files: ["include/oracle.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Tạo đáp án từ cell-neighbor",
          explanation:
            "expectedFaces không quét mask theo plane. Neighbor opaque che mặt bất kể material; Air/ngoài miền thì ghi key.",
        },
        {
          title: "So mặt có hướng/vật liệu",
          explanation:
            "expandedFaces chuyển plane về source: dương plane−1, âm plane. verify so danh sách sort, nên duplicate/mất mặt/đổi material đều thất bại dù diện tích bằng nhau.",
        },
        {
          title: "Build, test và chạy final",
          explanation:
            "Build cả Debug/Release; CTest code thuần không mở window. Smoke --smoke mở hidden, thoát sau một frame và có timeout ngoài.",
        },
      ],
    },
  },
  references: {
    "p61-l01": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l02": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l03": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l04": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l05": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l06": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l07": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l08": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
    "p61-l09": [
      {
        label: "Greedy face mask",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
