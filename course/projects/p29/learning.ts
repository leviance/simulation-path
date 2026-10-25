import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p29-l01": {
      focus: "Từ khung SDL đến dataset 100.000 đối tượng có ID, vị trí và kích thước thật.",
      expected:
        "Checkpoint mở bản đồ với đủ 100.000 đối tượng. Camera chỉ vẽ phần đang thấy; nhà, cây và công viên phân biệt được bằng hình/màu, không phải một đám điểm.",
      files: ["include/model/dataset.hpp", "include/graphics/view.hpp", "include/editor/scene.hpp"],
      steps: [
        {
          title: "Dữ liệu có vị trí và kích thước",
          explanation:
            "Box.x/y là vị trí góc trên trái trong world; width/height phải dương. ID ổn định và kind cho biết cách vẽ, không dùng chỉ số vector làm danh tính.",
        },
        {
          title: "Vẽ được một loại đối tượng trước",
          explanation:
            "Framebuffer và clipping được cung cấp từ bộ vẽ 2D. Hàm drawObject thêm mái, thân cây hoặc lối đi trong chính AABB của đối tượng.",
        },
        {
          title: "Nối dataset vào khung SDL",
          explanation:
            "resetScene tạo Document, dựng baseline rồi lấy danh sách visible. drawScene đọc danh sách đó để vẽ; chưa dùng Quadtree để tăng tốc.",
        },
      ],
    },
    "p29-l02": {
      focus: "Pan, zoom giữ điểm dưới con trỏ và đổi tọa độ window/board/world đúng một lần.",
      expected:
        "Kéo Pan làm bản đồ dịch theo tay; wheel zoom quanh con trỏ. World position của đối tượng không đổi, Home về đúng vùng có dữ liệu của layout hiện tại.",
      files: [
        "include/model/geometry.hpp",
        "include/editor/scene.hpp",
        "include/app/application.hpp",
      ],
      steps: [
        {
          title: "Dùng lại cặp biến đổi thuận/nghịch",
          explanation:
            "Screen dùng pixel logic của viewport; world dùng đơn vị bản đồ. Chỉ renderer nhân scale, không sửa world position khi pan/zoom.",
        },
        {
          title: "Pan từ vị trí bắt đầu kéo",
          explanation:
            "Dùng camera lúc pointer-down và tổng delta, không cộng lại một delta đã áp dụng từ event trước.",
        },
        {
          title: "Zoom quanh con trỏ",
          explanation:
            "Đo world point trước/sau khi đổi zoom rồi bù camera. SDL chỉ đổi window sang logical board một lần; boardToScreen trừ offset viewport.",
        },
      ],
    },
    "p29-l03": {
      focus: "Click lớp trên cùng và kéo vùng chọn theo giao AABB, kể cả chạm cạnh và kéo ngược.",
      expected:
        "Click chọn ID lớn nhất trong các AABB chồng nhau. Kéo qua một góc đối tượng vẫn chọn được dù tâm nằm ngoài vùng; Shift giữ/thêm selection.",
      files: [
        "include/model/geometry.hpp",
        "include/editor/document.hpp",
        "include/editor/scene.hpp",
      ],
      steps: [
        {
          title: "Chốt điều kiện giao AABB",
          explanation:
            "Chạm cạnh cũng được nhận. Object phải có diện tích; query có thể rộng/cao bằng 0 để phục vụ click.",
        },
        {
          title: "Click có thứ tự rõ ràng",
          explanation:
            "Renderer vẽ ID tăng dần, nên click nhận ID lớn nhất. Quy tắc không phụ thuộc thứ tự trả về của Quadtree.",
        },
        {
          title: "Kéo vùng chọn rồi commit selection",
          explanation:
            "Chuẩn hóa hai góc ở mọi hướng; khi kéo chỉ vẽ rectangle, thả mới cập nhật tập ID. Shift bổ sung hoặc toggle theo thao tác.",
        },
      ],
    },
    "p29-l04": {
      focus: "Node index, split có giới hạn và giữ đối tượng cắt đường chia ở node cha.",
      expected:
        "Cây chia được dữ liệu nhưng mỗi ID vẫn chỉ lưu một lần. Đối tượng vắt qua split ở lại cha; depth/minimum size/node budget chặn chia vô hạn.",
      files: ["include/spatial/quadtree.hpp"],
      steps: [
        {
          title: "Chọn child bằng toàn bộ AABB",
          explanation:
            "Chỉ đi xuống nếu cả box nằm trong một child. Object cắt split ở lại cha, không nhân bản và không chỉ index tâm.",
        },
        {
          title: "Chia có giới hạn",
          explanation:
            "Capacity là ngưỡng gợi ý split, không phải lý do bỏ đối tượng. Max depth, minimum size và node budget chặn dữ liệu trùng/chật.",
        },
        {
          title: "Giữ index thay vì reference vào vector",
          explanation:
            "push_back có thể realloc nodes. Sao chép bounds/IDs cần dùng, rồi truy cập lại nodes[nodeIndex] để phân phối.",
        },
      ],
    },
    "p29-l05": {
      focus: "Duyệt cây theo AABB, kiểm cả bucket ở node cha và đo visited/pruned/candidates.",
      expected:
        "Query chọn vùng dùng cây thật và khớp brute force. Bucket của node cha vẫn được kiểm; không mất nhà/công viên lớn cắt nhiều quadrant.",
      files: ["include/spatial/quadtree.hpp", "include/editor/document.hpp"],
      steps: [
        {
          title: "Prune bằng bounds của node",
          explanation:
            "Nếu node không giao query, toàn bộ subtree có thể bỏ qua vì mọi object trong đó nằm trong bounds ấy.",
        },
        {
          title: "Kiểm bucket ở cả node cha",
          explanation:
            "Internal node có thể giữ object lớn; chỉ kiểm leaf sẽ làm mất dữ liệu. Mỗi candidate vẫn phải qua intersects.",
        },
        {
          title: "Nối query vào selection",
          explanation:
            "Document chọn Tree hay Brute trên cùng data và cùng predicate. Sort chỉ để đối chiếu/paint order, không nằm trong hot query.",
        },
      ],
    },
    "p29-l06": {
      focus: "Dùng cùng index cho viewport culling, giữ paint order và tách culling khỏi render.",
      expected:
        "N vẫn là 100.000 nhưng renderer nhận đúng danh sách object giao viewport. Chuyển M Tree/Brute giữ nguyên camera, selection và hình hiển thị.",
      files: ["include/editor/scene.hpp", "include/graphics/view.hpp", "include/app/controls.hpp"],
      steps: [
        {
          title: "Từ camera lấy world viewport",
          explanation:
            "Viewport là một Box trong world. Culling dùng chính query AABB đã kiểm, không tạo một index chỉ để trang trí.",
        },
        {
          title: "Vẽ đầy đủ danh sách visible",
          explanation:
            "Không lấy mẫu object để giả tăng tốc. Khi zoom xa hình có thể nhỏ, nhưng mọi AABB giao viewport vẫn nằm trong danh sách vẽ.",
        },
        {
          title: "So hình ở cùng camera",
          explanation:
            "M chỉ đổi cách query; không reset seed hoặc zoom. Candidate/query time tách khỏi sorting và rasterization.",
        },
      ],
    },
    "p29-l07": {
      focus: "Lưu node theo ID, remove tại chỗ, insert lại và kiểm toàn bộ proposal trước khi ghi.",
      expected:
        "Thêm tại camera được ID mới; Delete xóa đúng selection; Shift+mũi tên dời nhóm nhưng giữ ID. Query không còn thấy object đã xóa hoặc vị trí cũ.",
      files: [
        "include/spatial/quadtree.hpp",
        "include/editor/document.hpp",
        "include/app/controls.hpp",
      ],
      steps: [
        {
          title: "Xóa bằng ID và node sở hữu",
          explanation:
            "location cho biết bucket cần gỡ. Không để một bản ghi ở node cũ sau khi object đã biến mất khỏi model.",
        },
        {
          title: "Kiểm cả nhóm trước khi di chuyển",
          explanation:
            "Tạo proposal và kiểm root cho tất cả ID trước khi remove/insert. Một object vượt biên thì không ghi bất kỳ vị trí nào.",
        },
        {
          title: "Giữ ID và selection qua update",
          explanation:
            "Object di chuyển được remove rồi insert lại cùng ID. Thêm mới dùng nextId tăng đơn điệu; xóa không tái sử dụng ID cũ.",
        },
      ],
    },
    "p29-l08": {
      focus: "Pointer capture, preview không sửa data và rollback toàn nhóm khi vượt root.",
      expected:
        "Trong lúc kéo chỉ có preview. Thả hợp lệ cập nhật cả nhóm; Escape/mất capture hủy, vượt root giữ nguyên mọi vị trí. Preview nhận cả object vừa đi từ ngoài vào viewport.",
      files: [
        "include/editor/scene.hpp",
        "include/graphics/view.hpp",
        "include/app/application.hpp",
      ],
      steps: [
        {
          title: "Tách preview khỏi model",
          explanation:
            "Gesture giữ offset và group bounds. Khi pointer-move, tree và object positions chưa thay đổi.",
        },
        {
          title: "Query cả vùng sẽ đi vào viewport",
          explanation:
            "Dịch viewport ngược offset để tìm các object đã chọn sắp xuất hiện. Chỉ dùng culling cũ sẽ mất preview ở mép.",
        },
        {
          title: "Chốt đúng sample cuối và hủy sạch",
          explanation:
            "Pointer-up cập nhật vị trí lần cuối rồi commit; cancel/lost capture/blur/resize bỏ preview và khôi phục selection trước gesture.",
        },
      ],
    },
    "p29-l09": {
      focus: "Oracle độc lập, topology và query IDs trước/sau chuỗi thêm, di chuyển, xóa.",
      expected:
        "Reference check hoàn tất các fixture và viewport với 0 lỗi; cố ý làm hỏng location/bucket phải bị phát hiện. Kết quả cũ bị bỏ khi revision đổi.",
      files: ["include/editor/validation.hpp", "tests/tests.cpp", "include/app/controls.hpp"],
      steps: [
        {
          title: "Kiểm cấu trúc trước khi query",
          explanation:
            "Mỗi ID nằm một lần, location khớp, child index/depth hợp lệ và overflow chỉ xảy ra khi guard chặn split.",
        },
        {
          title: "So IDs với oracle khác cách viết",
          explanation:
            "Test dùng interval gap thay vì gọi intersects production. Runtime reference giúp phát hiện lỗi index trên map đang sửa.",
        },
        {
          title: "Kiểm sau chuỗi thao tác",
          explanation:
            "Không chỉ kiểm cây mới build: thêm, move group, xóa rồi query lại cả vùng chọn và viewport. Revision cũ không được báo như kết quả hiện tại.",
        },
      ],
    },
    "p29-l10": {
      focus: "Cùng dataset/query, hai warm-up + năm mẫu; thử layout dày và đối tượng lớn.",
      expected:
        "Benchmark có hai dòng Tree/Brute, mỗi dòng 16 query và 5 samples. Build/update/culling được báo riêng; có hủy và không công bố dòng còn thiếu mẫu.",
      files: [
        "include/editor/benchmark.hpp",
        "include/editor/document.hpp",
        "include/app/presentation.hpp",
      ],
      steps: [
        {
          title: "Cố định dataset và tập query",
          explanation:
            "Hai phương thức đọc cùng tree objects và 16 Box không đổi. Hai warm-up bị bỏ, sau đó lấy năm mẫu cho mỗi dòng.",
        },
        {
          title: "Tách các loại chi phí",
          explanation:
            "Build index, update/edit, query selection và culling có số riêng. Render, checksum và paint-order sorting không nằm trong query timer.",
        },
        {
          title: "Đọc counters trước khi kết luận",
          explanation:
            "Đối tượng lớn nằm ở cha và query rộng có thể làm tree xét gần mọi object. Không hứa một hệ số speedup hay FPS chung.",
        },
      ],
    },
    "p29-l11": {
      focus: "CMake độc lập, CTest Debug/Release và workflow đầy đủ trên 100.000 đối tượng.",
      expected:
        "ZIP build được mọi mốc và final; smoke workflow báo N=100000, drawn=visible, query khớp brute sau các thao tác. Mã hoàn chỉnh từng file có ở cuối bài.",
      files: ["src/main.cpp", "tests/tests.cpp", "include/app/application.hpp"],
      steps: [
        {
          title: "Build từ source độc lập",
          explanation:
            "CMake FetchContent khóa SDL 3.4.8 và link SDL3::SDL3. Final mặc định; BUILD_CHECKPOINTS mở starter và 11 mốc.",
        },
        {
          title: "Chạy test ở hai cấu hình",
          explanation:
            "Bộ đếm failures/exit code không bị tắt bởi NDEBUG. Smoke hữu hạn dùng SDL thật và kiểm workflow 100.000 object.",
        },
        {
          title: "Nghiệm thu một công cụ dùng được",
          explanation:
            "Tìm vùng, chọn, di chuyển, thêm/xóa và kiểm lại; bật/tắt debug vẫn giữ cùng dữ liệu và thao tác. Canvas không thay executable C++.",
        },
      ],
    },
  },
  references: {
    "p29-l01": [
      {
        label: "Quadtree",
        href: "/glossary#quadtree",
        kind: "Thuật ngữ",
      },
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l02": [
      {
        label: "Camera2D",
        href: "/glossary#camera-2d",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l03": [
      {
        label: "Conservative candidate set",
        href: "/glossary#conservative-candidate-set",
        kind: "Thuật ngữ",
      },
      {
        label: "Brute-force query",
        href: "/glossary#brute-force-query",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l04": [
      {
        label: "Quadtree node",
        href: "/glossary#quadtree-node",
        kind: "Thuật ngữ",
      },
      {
        label: "Leaf capacity",
        href: "/glossary#leaf-capacity",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l05": [
      {
        label: "Spatial pruning",
        href: "/glossary#spatial-pruning",
        kind: "Thuật ngữ",
      },
      {
        label: "Quadtree",
        href: "/glossary#quadtree",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l06": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l07": [
      {
        label: "Quadtree node",
        href: "/glossary#quadtree-node",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l08": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
      {
        label: "Camera2D",
        href: "/glossary#camera-2d",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l09": [
      {
        label: "Brute-force query",
        href: "/glossary#brute-force-query",
        kind: "Thuật ngữ",
      },
      {
        label: "Maximum tree depth",
        href: "/glossary#maximum-tree-depth",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l10": [
      {
        label: "Benchmark warm-up",
        href: "/glossary#benchmark-warm-up",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l11": [
      {
        label: "Quadtree",
        href: "/glossary#quadtree",
        kind: "Thuật ngữ",
      },
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
