import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Từ world streaming đang chạy, tự viết value noise theo tọa độ world, ghép nhiều octave rồi tạo cột cỏ, đất và đá. Kiểm seed, đường giáp ranh, tái tạo chunk và thay cấu hình để địa hình không đổi theo thứ tự tải.",
  duration: "14–19 giờ",
  prerequisites: [
    "Project 58–62 — chunk 16³, greedy mesh, rasterizer CPU và streaming có budget",
    "Project 05, 07 — tọa độ world/local, nội suy và sin/cos",
    "C++ — uint32_t, vòng lặp, std::map/set; ZIP mang đủ nền SDL3, không cần chép mã cũ",
  ],
  objectives: [
    "Chạy starter có streaming và mesh; theo một cột từ world X/Z tới Block ID rồi lên ảnh.",
    "Dùng một hàm trơn dễ đoán trước khi thêm noise; tách số block khỏi tọa độ block trên cùng.",
    "Viết hash uint32_t theo địa chỉ lattice, thử seed và thấy vì sao hash riêng lẻ chưa tạo được đồi.",
    "Floor ở miền âm, smoothstep và nội suy hai chiều; phân biệt value noise với gradient noise.",
    "Cộng các lớp có tần số tăng, biên độ giảm, chuẩn hóa tổng và giới hạn tần số lấy mẫu.",
    "Lấp đầy cột không off-by-one, chọn vật liệu theo độ cao và kiểm mặt chung của hai chunk.",
    "Chụp cấu hình bất biến, khởi tạo thế hệ mới hữu hạn rồi để streaming tải phần còn lại.",
    "Đối chiếu tín hiệu liên tục với cột voxel, thử lỗi dùng local và quan sát cả biên âm.",
    "Golden hash C++/TypeScript, oracle cột/bề mặt, regeneration và kiểm thử có deadline.",
  ],
  challenge: {
    timebox: "180–240 phút tự thử trước khi đọc lời giải",
    mission:
      "Tự xây dựng một thế giới voxel 3D có địa hình được tạo từ một hàm độ cao hai chiều: đồi núi tự sinh theo seed, nối qua nhiều chunk và được tạo lại nguyên vẹn khi nhân vật quay về. Hiện độ cao, cấu hình và số công việc streaming để kiểm bằng số thay vì chỉ nhìn ảnh.",
    outcome:
      "Cửa sổ SDL3 có terrain nhiều chunk, cỏ ở vùng thấp và đá ở đỉnh cao; di chuyển qua gốc âm hoặc teleport vẫn nhận cùng dữ liệu. Canvas cho xem mesh 3D, height map và mặt cắt của hàm tạo độ cao.",
    requirements: [
      "C++20, CMake ≥3.24, SDL3 3.4.8; starter có streaming Project 62, greedy mesh và CPU Z-buffer 320×240.",
      "Một tầng Y=0..15; height H là số block, lấp y=0..H−1, H trong [2,14]. X/Z lấy từ Key*16+local.",
      "Hash uint32_t không giữ state; seed nguyên 0..65535, không dùng rand, thời gian hay Key làm seed riêng từng chunk.",
      "Value noise 2D nội suy bốn giá trị bằng s(t)=t²(3−2t); floor ở miền âm. Không gọi đây là gradient Perlin noise.",
      "Scale 16/32/64, 1–4 octave, lacunarity 2, persistence 0.5; tổng chia tổng trọng số. H=floor(8+6n), kẹp 2..14.",
      "Grass/Dirt/Stone là ID opaque; mesher chỉ xuất mặt source trong chunk và đọc neighbor resident theo world.",
      "Giữ scheduler hữu hạn của P62: player±512, Key±64, resident≤49, pending≤74, tối đa 1–2 load/unload mỗi tick và 5 mesh/job.",
      "Đổi cấu hình không regenerate cả vùng trong một vòng UI: bỏ thế hệ cũ, tạo một chunk dưới player, tải phần còn lại theo budget. Có thể thấy vùng tải thu lại trong lúc chuyển.",
      "Mỗi checkpoint chạy độc lập; Canvas có preset, pause/reset, bước tay, nhập tọa độ, pointer capture, DPR, keyboard, reduced-motion và giải thích bằng chữ.",
    ],
    constraints: [
      "Đây là heightfield 2D: mỗi X/Z có một cột đặc, không caves, overhang, erosion, biome khí hậu, nước hay noise 3D.",
      "Không có editor/persistence/thread/network/FPS collision. Regeneration không lưu chỉnh sửa thủ công. Thế giới và cấu hình có miền hữu hạn.",
      "Liền mạch nghĩa là cùng một hàm world ở mọi chunk, không phải H(15,z)=H(16,z). Vách đá hoặc bậc voxel là hợp lệ; đường chia do reset local/seed mới là lỗi.",
      "Continuity C1 nói về tín hiệu value noise trước floor; height voxel có bậc. Số octave hữu hạn là tổng kiểu fBm, không mô hình fractal vật lý chính xác.",
      "Seed/hash nguyên khớp bit C++/TypeScript. Noise dùng double không fast-math; golden fixtures kiểm dữ liệu trong toolchain hỗ trợ, không hứa bit-exact mọi compiler hoặc số thực vô hạn.",
      "Đổi cấu hình là một giao dịch bỏ cache, không double-buffer toàn world. Bootstrap một chunk ngoài budget tick; bộ đếm và generation được nêu riêng. Budget số việc không bảo đảm millisecond.",
    ],
    definitionOfDone: [
      "Chín lesson theo nhu cầu nội dung; starter nhìn thấy được, Bài 01 chỉ ra luồng tạo chunk trước khi đưa hash/noise vào.",
      "Hai cách truy vấn cùng world point từ hai chunk (có halo) bằng nhau ở cả biên âm; không dùng kiểm tra hai cột khác nhau phải bằng độ cao.",
      "Ghép các chunk độc lập khớp vùng world được sinh liên tục; test phát hiện đổi local, seed theo Key, thiếu block đỉnh và mặt giáp ranh sai.",
      "Fixture hash lattice và checksum chunk khớp C++/TypeScript; buffer tái tạo độc lập và không phụ thuộc thứ tự gọi.",
      "Thông số sai/NaN bị từ chối trước mutation. Đổi cấu hình bỏ chunk/queue/mesh cũ, chỉ một bootstrap và job còn lại dùng snapshot mới.",
      "Oracle cột kiểm địa chỉ/fill; oracle bề mặt global đi từ cell-neighbor, không dùng lại mesher. Golden và test nội suy kiểm công thức riêng.",
      "Idle/camera không regenerate/remesh; reload giữ buffer đúng. Debug/Release CTest không dùng assert, hidden smoke có timeout và tối đa hai compiler.",
      "Roadmap, search, glossary, ZIP và toàn source cuối bài đồng bộ; project chưa phát hành hiện Sắp ra mắt. Chỉ báo browser QA sau khi thật sự kiểm desktop.",
    ],
  },
  lessons: [
    {
      id: "p63-l01",
      slug: "01-chay-khung-dia-hinh",
      title: "Chạy world phẳng và tìm đúng chỗ tạo địa hình",
      summary:
        "Chạy starter có streaming và mesh; theo một cột từ world X/Z tới Block ID rồi lên ảnh.",
      order: 1,
      estimatedMinutes: 70,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l02",
      slug: "02-do-cao-theo-toa-do-world",
      title: "Cho mặt đất nhấp nhô bằng một hàm độ cao",
      summary:
        "Dùng một hàm trơn dễ đoán trước khi thêm noise; tách số block khỏi tọa độ block trên cùng.",
      order: 2,
      estimatedMinutes: 90,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l03",
      slug: "03-hash-va-seed",
      title: "Tạo giá trị giả ngẫu nhiên mà không phụ thuộc thứ tự tải",
      summary:
        "Viết hash uint32_t theo địa chỉ lattice, thử seed và thấy vì sao hash riêng lẻ chưa tạo được đồi.",
      order: 3,
      estimatedMinutes: 100,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l04",
      slug: "04-noi-suy-value-noise",
      title: "Nối bốn giá trị thành một mặt địa hình êm",
      summary:
        "Floor ở miền âm, smoothstep và nội suy hai chiều; phân biệt value noise với gradient noise.",
      order: 4,
      estimatedMinutes: 110,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l05",
      slug: "05-ghep-nhieu-octave",
      title: "Thêm chi tiết bằng nhiều octave",
      summary:
        "Cộng các lớp có tần số tăng, biên độ giảm, chuẩn hóa tổng và giới hạn tần số lấy mẫu.",
      order: 5,
      estimatedMinutes: 90,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l06",
      slug: "06-lap-day-cot-va-vat-lieu",
      title: "Biến độ cao thành cỏ, đất và đá",
      summary:
        "Lấp đầy cột không off-by-one, chọn vật liệu theo độ cao và kiểm mặt chung của hai chunk.",
      order: 6,
      estimatedMinutes: 85,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l07",
      slug: "07-doi-cau-hinh-khong-tron-world",
      title: "Đổi seed và cấu hình mà không trộn hai world",
      summary:
        "Chụp cấu hình bất biến, khởi tạo thế hệ mới hữu hạn rồi để streaming tải phần còn lại.",
      order: 7,
      estimatedMinutes: 100,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l08",
      slug: "08-doc-dia-hinh-bang-inspector",
      title: "Đọc địa hình bằng bản đồ và mặt cắt",
      summary:
        "Đối chiếu tín hiệu liên tục với cột voxel, thử lỗi dùng local và quan sát cả biên âm.",
      order: 8,
      estimatedMinutes: 85,
      demoId: "voxel-procedural-terrain",
    },
    {
      id: "p63-l09",
      slug: "09-kiem-chung-va-hoan-thien",
      title: "Kiểm chứng địa hình và chạy source hoàn chỉnh",
      summary:
        "Golden hash C++/TypeScript, oracle cột/bề mặt, regeneration và kiểm thử có deadline.",
      order: 9,
      estimatedMinutes: 115,
      demoId: "voxel-procedural-terrain",
    },
  ],
} satisfies PublishedProjectEditorial;
export default data;
