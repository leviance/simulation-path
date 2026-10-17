import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p64-l01": {
      focus:
        "Chạy terrain/streaming trước, đặt tâm ngắm vào ảnh CPU và phân biệt thao tác xem với sửa dữ liệu.",
      expected: "Starter có ảnh, resident=1/job=8; bốn tick budget 2 tải đủ 9 chunk.",
      files: ["src/main.cpp", "include/view.hpp", "include/controller.hpp"],
      steps: [
        {
          title: "Chạy lại thế giới đang có",
          explanation:
            "Build và mở starter trước. Bạn phải thấy một chunk, tám job chờ và camera dùng được; N tải tối đa hai job.",
        },
        {
          title: "Vẽ tâm ngắm trên ảnh, không vào dữ liệu voxel",
          explanation:
            "Bài 01 thêm hai nét nhỏ tại tâm pixel được chọn. Overlay này chỉ là lời nhắc vị trí ngắm, không phải block và không dùng màu pixel để quyết định hit.",
        },
        {
          title: "Đọc và chặn tọa độ ngắm",
          explanation:
            "aim giữ X trong 0..319, Y trong 0..239; cùng pixel thì không đánh dấu query dirty lại. Native gọi nó sau SDL_ConvertEventToRenderCoordinates.",
        },
      ],
    },
    "p64-l02": {
      focus:
        "Bù offset player, đi qua tâm pixel và giữ t là khoảng cách từ mặt phẳng origin của camera trực giao.",
      expected: "Round-trip screen của O+20D khớp x+0.5/y+0.5 trong 1e-9 cho các preset kiểm thử.",
      files: [
        "include/view.hpp",
        "include/ray.hpp",
        "include/camera-volume.hpp",
        "include/raster.hpp",
        "include/controller.hpp",
      ],
      steps: [
        {
          title: "Nhìn lại phép chiếu dùng để vẽ world",
          explanation:
            "Hàm này đưa một point world về hệ tọa độ mà camera hiện tại đang chiếu. Nếu chỉ đảo công thức của một chunk quanh gốc mà quên player, picking có thể đúng ở (8,8) rồi lệch ngay khi WASD hoặc preset âm.",
        },
        {
          title: "Dựng origin bằng right, up và normal",
          explanation:
            "u/v là độ lệch pixel đã chia camera.scale*zoom; dấu Y bị đảo vì screen đi xuống. Tâm world là (player.x,8,player.z), không phải (8,8,8).",
        },
        {
          title: "Chuẩn hóa và chặn đầu vào trước khi đi qua lưới",
          explanation:
            "Origin phải finite trong ±4096, direction finite và khác zero. Near đứng trước mọi chunk resident; renderer và ray dùng cùng lát độ sâu 96. Normalize làm t có đơn vị world distance.",
        },
      ],
    },
    "p64-l03": {
      focus:
        "DDA world có giới hạn; xử lý tọa độ âm, tie và vùng chưa tải mà không chọn xuyên qua dữ liệu chưa biết.",
      expected: "DDA khớp cell/normal/t với oracle ở ray axis, chéo, camera và tọa độ âm.",
      files: ["include/query.hpp", "include/ray.hpp"],
      steps: [
        {
          title: "Tra đúng chunk của mỗi cell",
          explanation:
            "Hàm trả ID 0 cho Air, ID 1..3 cho block và −1 cho chunk chưa resident. Mesher của P62 coi neighbor chưa tải là Air để đóng frontier; picker cố ý khác, vì cho ray đi xuyên dữ liệu chưa biết sẽ sửa nhầm block phía sau.",
        },
        {
          title: "Tìm đoạn đi bên trong, không chỉ một điểm chạm",
          explanation:
            "Mỗi trục cắt một khoảng t. Component bằng zero chỉ cần kiểm origin nằm trong khoảng half-open; không chia cho zero.",
        },
        {
          title: "Đi front-to-back và dừng ngay khi kết quả đã rõ",
          explanation:
            "cell đầu dùng floor, nếu ray đi âm và bắt đầu đúng mặt nguyên thì lùi về ô phía hướng đi. tMax là thời điểm qua mặt kế tiếp, tDelta là khoảng t cho một ô theo trục.",
        },
      ],
    },
    "p64-l04": {
      focus:
        "Mỗi action truy vấn lại ray rồi sửa tối đa một cell; không ghi đè, không đặt vượt tầng hoặc vào chunk chưa tải.",
      expected: "Một action thành công đổi tối đa một cell, material đúng palette.",
      files: ["include/editing.hpp", "include/controller.hpp"],
      steps: [
        {
          title: "Kiểm điều kiện của action trước khi ghi",
          explanation:
            "Material phải 1..3. Phá dùng chính hit; đặt kiểm normal, tọa độ trong tầng và target Air resident.",
        },
        {
          title: "Ghi một cell bằng cách đơn giản trước",
          explanation:
            "Ở checkpoint 04, writeCell chỉ sửa buffer resident và remesh eager. before==value là no-op, không ghi history hoặc đếm việc thành công.",
        },
        {
          title: "Nối input với action, không với vòng render",
          explanation:
            "action tạm dừng queue, tạo ray mới và báo changed/no change. SDL gọi ở button-down hoặc key-down không repeat, không gọi ở mouse-motion hay draw.",
        },
      ],
    },
    "p64-l05": {
      focus:
        "Tách terrain nền với delta world, lưu cả Air khi phá và phủ lại delta sau regeneration.",
      expected: "Air tombstone còn sau unload/return; khôi phục đúng base làm delta giảm.",
      files: ["include/editing.hpp", "include/world.hpp"],
      steps: [
        {
          title: "Hỏi dữ liệu nền bằng địa chỉ world",
          explanation:
            "baseBlock dùng heightAt/materialAt P63 tại x/z world và y của cell. Nó không đọc resident hoặc mesh.",
        },
        {
          title: "Tạo nền rồi phủ delta khi load",
          explanation:
            "Mỗi Entry nhận một buffer nền mới, sau đó lọc các delta thuộc Key và ghi Block ID. Map delta thuộc World, không thuộc Entry nên erase chunk không xóa công trình.",
        },
        {
          title: "Cập nhật delta cùng buffer như một thay đổi duy nhất",
          explanation:
            "Nếu value==base thì erase record; ngược lại giữ cả value=Air. Kiểm cap 512 trước khi chèn một địa chỉ mới.",
        },
      ],
    },
    "p64-l06": {
      focus:
        "Gộp dirty Key sau edit, xử lý mặt biên và tách bộ đếm mesh edit khỏi batch streaming.",
      expected:
        "Interior một mesh, góc X/Z tối đa ba mesh; dirty Key trùng được gộp, lần flush thứ hai trả 0.",
      files: ["include/editing.hpp", "include/controller.hpp"],
      steps: [
        {
          title: "Ghi đúng tập mesh bị ảnh hưởng",
          explanation:
            "Không quét cả world, cũng không thêm neighbor chéo. Nếu source chunk đang offline thì sửa delta không làm frontier resident đổi, nên không cần load/remesh chunk đó.",
        },
        {
          title: "Dựng lại tập đã gộp và giữ counter đúng nghĩa",
          explanation:
            "Từ bài 06, keys chỉ là dirty set; nhiều cell trong một chunk vẫn rebuild một lần. rebuild dùng chung tăng lastMeshes của streaming, nên flush chụp/khôi phục counter lịch sử và ghi editRebuilds riêng.",
        },
        {
          title: "Hoàn tất geometry trước khi đưa ảnh mới ra",
          explanation:
            "Flush edit trước query/render. Query đọc blocks nên hai action liên tiếp vẫn đúng ngay khi mesh đang dirty; nhưng frame chỉ được công bố khi các mặt liên quan đã dựng lại.",
        },
      ],
    },
    "p64-l07": {
      focus:
        "Command giữ cell/before/after, lịch sử hữu hạn và có thể hoàn tác cả khi chunk đã gỡ.",
      expected:
        "Undo/redo dùng địa chỉ world, làm việc cả offline mà không load; redo branch bị xóa sau edit mới.",
      files: ["include/editing.hpp"],
      steps: [
        {
          title: "Hỏi giá trị kể cả khi chunk không còn resident",
          explanation:
            "Giá trị hiện tại vẫn được quyết định bởi delta hoặc base. Undo offline không cần tải chunk chỉ để sửa một byte trong buffer; nó cập nhật dữ liệu world và Entry mới sau này sẽ phủ lại delta.",
        },
        {
          title: "Ghi command sau khi thay đổi thành công",
          explanation:
            "Chỉ record khi changed, không cho no-op hoặc cap failure vào history. Command giữ giá trị theo value, không reference.",
        },
        {
          title: "Replay mà không tự ghi lại chính mình",
          explanation:
            "Dùng writeCell(...,false), kiểm expected value trước, rồi mới chuyển command giữa hai stack. Nếu bị từ chối thì không pop lệnh.",
        },
      ],
    },
    "p64-l08": {
      focus:
        "Định dạng VXL1 dùng chung C++/Canvas; parse toàn bộ, kiểm giới hạn rồi mới thay world.",
      expected:
        "Fixture VXL1 chung khớp byte, import→export không đổi; CRLF hợp lệ được canonical thành LF.",
      files: ["include/snapshot.hpp"],
      steps: [
        {
          title: "Xuất một biểu diễn canonical",
          explanation:
            "`std::map<Cell,Block>` đã sắp lexicographic theo x/y/z; TypeScript sắp cùng thứ tự. Mỗi dòng record có bốn số nguyên, kể cả ID 0.",
        },
        {
          title: "Đọc số nguyên chặt chẽ",
          explanation:
            "from_chars cần tiêu thụ hết token và không overflow. Không chấp nhận 42x, +42 hoặc 1e2.",
        },
        {
          title: "Parse toàn bộ vào state tạm rồi mới thay phiên",
          explanation:
            "Kiểm header/config/count và từng cell/material, duplicate và redundant. Chỉ sau đó createWorld bằng config+delta mới và player hiện tại.",
        },
      ],
    },
    "p64-l09": {
      focus:
        "Thêm preset di chuyển giữ edit, ngắm bằng phím, pause/reset, capture/blur và thao tác không auto-repeat.",
      expected:
        "Preset giữ delta/history, thao tác tay pause queue; blur/cancel/reset nhả capture.",
      files: ["include/controller.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi vị trí mà giữ dữ liệu session",
          explanation:
            "Preset vị trí chỉ gọi movePlayer và giữ world, giống Project 63. Đổi config tạo generation mới; Reset xóa phiên; import thay config/delta sau validation. Không gộp bốn thao tác này thành một hàm reset chung.",
        },
        {
          title: "Giữ ngắm bằng phím độc lập camera",
          explanation:
            "IJKL dịch pixel ngắm 2 đơn vị, arrow orbit camera. Canvas có ô X/Y và các nút thao tác thay phím.",
        },
        {
          title: "Dọn trạng thái tương tác ở điểm mất quyền điều khiển",
          explanation:
            "Mất focus/minimize thì pause, hủy dragging và nhả SDL capture. Mọi key command đều bỏ repeat; middle drag chỉ orbit, mouse motion không edit.",
        },
      ],
    },
    "p64-l10": {
      focus:
        "Đối chiếu picking bằng oracle AABB, kiểm surface, session delta, bản lưu và source hoàn chỉnh.",
      expected:
        "Node và CTest qua các fixture chung; snapshot VXL1 cùng byte, terrain chưa edit giữ checksum P63.",
      files: ["include/oracle.hpp", "include/mesh-oracle.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đối chiếu ray bằng đường không dùng tMax",
          explanation:
            "Quét AABB block đặc để lấy entry gần nhất, đồng thời quét các chunk Unknown trong miền ray để không kết luận hit xuyên vùng chưa biết. Oracle chậm nhưng chỉ dùng trên fixture hữu hạn, không gọi trong mỗi frame.",
        },
        {
          title: "Kiểm dữ liệu và bề mặt sau khi flush",
          explanation:
            "Resident phải đúng effectiveBlock; flush dirty mesh trước khi so multiset địa chỉ/hướng/material. Kết quả audit có ô riêng và chỉ đúng với dữ liệu vừa kiểm: load/unload/edit/undo/redo/import làm nhãn cũ thành cần kiểm lại. Tick idle không thay dữ liệu thì giữ được kết quả.",
        },
        {
          title: "Báo lỗi thật ở cả Debug lẫn Release",
          explanation:
            "Không dùng assert bị NDEBUG tắt. Các test kiểm ray round-trip, signed seam, Unknown, action mới, tombstone, offline undo, cap, snapshot byte/malformed và cache idle.",
        },
      ],
    },
  },
  references: {
    "p64-l01": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l02": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l03": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l04": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l05": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l06": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l07": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l08": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l09": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
    "p64-l10": [
      {
        label: "Base và session delta",
        href: "/glossary#voxel-session-delta",
        kind: "Thuật ngữ",
      },
      {
        label: "Unknown trong picking",
        href: "/glossary#voxel-unknown-picking",
        kind: "Thuật ngữ",
      },
      {
        label: "VXL1 snapshot",
        href: "/glossary#voxel-snapshot",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
