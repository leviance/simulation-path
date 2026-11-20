import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p58-l01": {
      focus: "Từ cửa sổ có bầu trời đến sáu mặt của một viên đá.",
      expected:
        "Một viên đá ở (7,7,7): 6 quad, 12 tam giác. Bỏ thử một hướng còn 5 quad, 10 tam giác.",
      files: ["include/trail/surface.hpp", "include/trail/scene.hpp"],
      steps: [
        {
          title: "Gấp sáu mặt thành một viên đá",
          explanation:
            "Mở surface.hpp. Face có vị trí, hướng, chiều rộng, chiều cao và vật liệu; Mesh là danh sách những mặt đó.",
        },
        {
          title: "Đặt viên đá vào cảnh",
          explanation:
            "Trong Scene::generate(), thêm viên đá ở ô (7,7,7) vào mesh vừa xóa rồi cập nhật bộ đếm thành một block đặc.",
        },
        {
          title: "Lần theo một pixel ra cửa sổ",
          explanation:
            "Không chép lại uploadFrame: starter đã có hàm này. Sau khi drawFace tô framebuffer, SDL nhận từng hàng pixel qua pitch, rồi trình bày texture trong cửa sổ.",
        },
      ],
    },
    "p58-l02": {
      focus: "Từ vị trí trong thế giới đến một địa chỉ không trùng trong mảng.",
      expected:
        "Vẫn một viên đá. Đổi vật liệu ngay trong singleStone thì màu vật đang thấy cũng đổi; world −1 thuộc chunk −1, local 15.",
      files: ["include/trail/blocks.hpp", "include/trail/bank.hpp", "include/trail/scene.hpp"],
      steps: [
        {
          title: "Đổi ba tọa độ thành một địa chỉ",
          explanation:
            "Trong blocks.hpp, khai báo Section gồm 4.096 Block. Cho x chạy nhanh nhất: sang phải một ô tăng 1, sang hàng z kế tăng 16, sang tầng y kế tăng 256.",
        },
        {
          title: "Tách tọa độ world khi đi qua gốc",
          explanation:
            "Cũng trong tệp này, lấy thương làm tròn xuống rồi tính local bằng phần còn lại. Thử nói bằng lời: ô ngay bên trái gốc là ô cuối của chunk bên trái.",
        },
        {
          title: "Cất viên đá rồi đọc nó ra",
          explanation:
            "Thêm Column vào bank.hpp: get chọn section bằng y / side, còn y % side chọn tầng trong section. singleStone() tạo cột rỗng và put đúng một lần. Trong Scene, giữ cột làm dữ liệu; ở generate dùng singleStone(), xóa mesh tạm rồi gọi appendCube với vật liệu lấy từ column.get(7, 7, 7).",
        },
      ],
    },
    "p58-l03": {
      focus: "Dựng bản chưa tối ưu để có mốc đối chiếu trước khi bỏ mặt khuất.",
      expected: "Một cột 4.096 ô đặc cho 24.576 quad, 49.152 tam giác; cột Air không tạo mặt.",
      files: ["include/trail/bank.hpp", "include/trail/surface.hpp", "include/trail/scene.hpp"],
      steps: [
        {
          title: "Chuẩn bị một cột đặc",
          explanation:
            "Trong bank.hpp, viết solidCube() từ Column của bài trước. Chỉ cần lấp đầy section đầu bằng Stone: đây là dữ liệu đầu vào, chưa có đỉnh hay tam giác nào.",
        },
        {
          title: "Đi qua cột từng tầng",
          explanation:
            "Trong surface.hpp, viết naiveMesh: đọc column.get(x,y,z), bỏ qua Air, đổi x/z từ local sang world rồi mới gọi appendCube. Hàm sáu mặt dưới đây là hàm đã viết, không viết thêm một bản cùng tên.",
        },
        {
          title: "Dùng mesh mới thay viên đá viết tay",
          explanation:
            "Sửa Scene::generate() để chọn cột theo preset, đếm các ô khác Air rồi **gán** mesh = naiveMesh(column). Chọn khối đặc khi mở và lùi camera ra để nhìn thấy cả khối.",
        },
      ],
    },
    "p58-l04": {
      focus: "Lấp từng cột đất, thêm nước và đọc họa tiết riêng trên từng mặt.",
      expected: "Phím 1 mở bờ có nước, cát và cây, phím 3 trở về khối đặc, phím 4 chỉ còn trời.",
      files: ["include/trail/bank.hpp", "include/trail/scene.hpp", "include/trail/window.hpp"],
      steps: [
        {
          title: "Khoét một dòng suối có bờ",
          explanation:
            "Trong bank.hpp, tính vị trí giữa dòng ở mỗi hàng z, rồi lấy khoảng cách của x đến đó. Càng xa dòng thì bờ càng cao.",
        },
        {
          title: "Trồng hai cây làm mốc",
          explanation:
            "Trong cùng tệp, plantTree nhận gốc ở tọa độ world. Đổi về local trước khi ghi, dựng thân gỗ rồi thêm lá vào những ô còn trống trong giới hạn cột.",
        },
        {
          title: "Bước tới đúng bờ vừa tạo",
          explanation:
            "Trong scene.hpp, cho preset bờ suối gọi makeBank() và chọn vị trí mắt nhìn dọc dòng. Trong window.hpp, ghép bốn phím số với bốn preset rồi gọi lại generate() khi đổi.",
        },
      ],
    },
    "p58-l05": {
      focus: "WASD đi trong thế giới thật; camera di chuyển nhưng dữ liệu đứng yên.",
      expected: "Đi lại làm kích thước biểu kiến của vật thay đổi, số lần dựng mesh không đổi.",
      files: ["include/trail/camera.hpp", "include/trail/scene.hpp", "include/trail/window.hpp"],
      steps: [
        {
          title: "Phân biệt hướng nhìn với hướng bước",
          explanation:
            "Trong camera.hpp, lấy hướng tiến và ngang từ yaw, không dùng pitch để quyết định bước W. Chuẩn hóa tổng hai hướng để đi chéo không nhanh hơn.",
        },
        {
          title: "Đưa vận tốc vào vị trí mắt",
          explanation:
            "Thêm travel vào scene.hpp: nhân hướng đã chuẩn hóa với tốc độ 4,5 block/giây và dt có chặn; xử lý lên/xuống riêng. Không gọi generate() trong hàm này.",
        },
        {
          title: "Nối chuột và bàn phím với camera",
          explanation:
            "Trong window.hpp, nhấp trái để bắt chuột, chuyển độ dời tương đối cho look. Mỗi frame còn focus thì đọc W/S, D/A, E/Q và gọi travel; phím mũi tên là cách nhìn không dùng chuột.",
        },
      ],
    },
    "p58-l06": {
      focus: "So lát x/z với cỏ, đất và nước dưới tầm mắt.",
      expected: "H hiện bảng đúng tầng 0–15. Đổi tầng không khoét hay dời block trong cảnh.",
      files: ["include/trail/scene.hpp", "include/trail/window.hpp"],
      steps: [
        {
          title: "Giữ con số y cần soi trong Scene",
          explanation:
            "Trong scene.hpp, thêm sliceY, cờ showSlice và hàm đọc inspectedBlock. Hàm này chỉ trả column.get(x,y,z); không viết put, không cắt mesh.",
        },
        {
          title: "Dùng H mở bảng, chọn tầng rồi tô ô",
          explanation:
            "Trong window.hpp, xử lý H và hai phím PageUp/PageDown, chặn y ở 0 và 15. Sau khi đã đưa ảnh 3D lên renderer, lặp qua x/z, lấy màu từ atlas cho từng vật liệu, tô ô nhỏ và in số tầng.",
        },
      ],
    },
    "p58-l07": {
      focus: "Đo hình học, kiểm depth rồi tự đi một vòng trong bản C++ hoàn chỉnh.",
      expected: "V kiểm được 0, 6 và 24.576 quad; bộ test chạy trên các header trong work/.",
      files: ["include/trail/scene.hpp", "include/trail/window.hpp"],
      steps: [
        {
          title: "Tạo ba cảnh cực nhỏ thay vì đếm bằng mắt",
          explanation:
            "Thêm inspectFixtures và chuỗi kết quả vào scene.hpp. Dùng đúng naiveMesh của mình dựng cột rỗng, một viên và cột đặc; báo lỗi nếu số quad khác 0, 6, 24.576.",
        },
        {
          title: "Cho phép gọi phép kiểm khi đang đi",
          explanation:
            "Trong window.hpp, phím V gọi scene.inspectFixtures() và bật bảng số. Khi bảng đang mở, in kết quả nếu chuỗi không rỗng.",
        },
      ],
    },
  },
  references: {
    "p58-l01": [
      {
        label: "SDL_UpdateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_UpdateTexture",
        kind: "SDL API",
      },
    ],
    "p58-l02": [
      {
        label: "Voxel chunk và section",
        href: "/glossary#voxel-chunk-storage",
        kind: "Thuật ngữ",
      },
    ],
    "p58-l03": [
      {
        label: "Mesh voxel chưa tối ưu",
        href: "/glossary#voxel-naive-mesh",
        kind: "Thuật ngữ",
      },
    ],
    "p58-l04": [
      {
        label: "Block ID",
        href: "/glossary#voxel-block-id",
        kind: "Thuật ngữ",
      },
    ],
    "p58-l05": [
      {
        label: "Tia từ mắt qua một pixel",
        href: "/glossary#voxel-camera-ray",
        kind: "Thuật ngữ",
      },
    ],
    "p58-l06": [
      {
        label: "Bảng đọc lớp voxel",
        href: "/glossary#voxel-slice-inspector",
        kind: "Thuật ngữ",
      },
    ],
    "p58-l07": [
      {
        label: "Đếm mặt bằng F = 6N − 2E",
        href: "/glossary#voxel-face-count-oracle",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
