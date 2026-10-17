import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p63-l01": {
      focus:
        "Chạy starter có streaming và mesh; theo một cột từ world X/Z tới Block ID rồi lên ảnh.",
      expected:
        "Có đất nhìn thấy ngay từ starter, không cần tải hết mới thấy ảnh. H=4, block trên cùng y=3; N không vượt budget. Camera chỉ raster lại ảnh, không thay checksum Block ID. Bạn chỉ ra được chuỗi generateTerrain → Entry.blocks → rebuild → Entry.mesh → render.",
      files: ["src/main.cpp", "include/world.hpp", "include/terrain.hpp"],
      steps: [
        {
          title: "Chạy lại cửa sổ và ảnh CPU",
          explanation:
            "Mở starter trước, không chép một chương trình SDL trống mới. Window, renderer và streaming texture đã sẵn sàng; ảnh CPU vẫn có Z-buffer. Nếu chương trình không mở được, kiểm compiler và SDL trước khi viết hàm terrain.",
        },
        {
          title: "Tìm nơi Entry nhận dữ liệu",
          explanation:
            "Theo lời gọi từ createWorld tới loadChunk. Entry nhận buffer từ generateTerrain bằng đúng config của World, rồi mới được đưa vào map. Rebuild là bước sau, không được gọi generateTerrain trong lúc đọc neighbor hoặc xoay camera.",
        },
        {
          title: "Đọc độ cao đơn giản nhất",
          explanation:
            "heightAt kiểm đầu vào thông qua terrainSignal rồi hiện trả 4. Bài 01 thêm H vào bảng thông tin native. Đặt breakpoint ở generateTerrain: local x,z được cộng Key*16 trước khi hỏi heightAt; vòng y chỉ lấp đến H−1. Đây là điểm ta sẽ thay ở bài tiếp.",
        },
      ],
    },
    "p63-l02": {
      focus:
        "Dùng một hàm trơn dễ đoán trước khi thêm noise; tách số block khỏi tọa độ block trên cùng.",
      expected:
        "Inspector tại (0,0) cho H=8. Qua biên chunk không reset phase. Height trong [2,14], không có block y≥H, không có lỗ trong cột. Không đặt điều kiện H(15,z)=H(16,z): đó là hai mẫu khác nhau.",
      files: ["include/terrain.hpp"],
      steps: [
        {
          title: "Thay hằng số bằng một hàm có thể dự đoán",
          explanation:
            "Thay tín hiệu hằng 0 của bài trước bằng hàm sin/cos. Tại (0,0), H=8; tại cột nguyên (24,0), n≈0.9975 và H=13. Dùng các số này để đối chiếu inspector, không chỉ nhìn hình đồi.",
        },
        {
          title: "Đổi tín hiệu thành số block",
          explanation:
            "floor quyết định quy tắc lượng tử hóa; clamp giữ cột trong tầng Y=0..15. H là số lượng nên mesh mặt trên nằm trên mặt phẳng y=H, còn ID trên cùng tại y=H−1. Heightfield này không thể biểu diễn hang hay mỏm đá nhô ra.",
        },
        {
          title: "Dùng tọa độ world khi lấp từng chunk",
          explanation:
            "Key(-1,0), local x=15 tương ứng world x=−1. Key(0,0), local x=0 tương ứng world x=0. Hai vị trí khác nhau có thể cao khác nhau; thứ phải nhất quán là hai cách hỏi cùng một world point, chẳng hạn local 16 của chunk trái và local 0 của chunk phải.",
        },
      ],
    },
    "p63-l03": {
      focus:
        "Viết hash uint32_t theo địa chỉ lattice, thử seed và thấy vì sao hash riêng lẻ chưa tạo được đồi.",
      expected:
        "Ba fixture hash nguyên khớp bit giữa hai bản. Thứ tự hỏi nút và thứ tự tạo chunk không ảnh hưởng dữ liệu. Hash-only dùng scale=32 giống bài nội suy để so sánh chỉ một thay đổi.",
      files: ["include/noise.hpp", "include/terrain.hpp"],
      steps: [
        {
          title: "Trộn địa chỉ bằng uint32_t",
          explanation:
            "Cast tọa độ âm sang uint32_t trước phép nhân. C++ unsigned tràn theo modulo 2³²; TypeScript dùng Math.imul và >>> để giữ cùng bit pattern. Các hằng hex là hằng trộn bit đã chọn cho bài, không mang đơn vị độ dài hay độ cao. Không dùng std::hash vì ta cần fixture có thể đối chiếu.",
        },
        {
          title: "Đổi bit thành một giá trị hữu hạn",
          explanation:
            "Mask 65535 giữ 16 bit; chia 65535.0 để có số thực trong [0,1], nhân 2 rồi trừ 1. Với seed 42, latticeHash(0,0)=388445122 và latticeHash(−1,0)=4012630698. Ghi các số này làm golden fixture cho C++ và TypeScript.",
        },
        {
          title: "Thử địa hình chỉ có hash",
          explanation:
            "Bài này lấy floor(world/scale), mặc định scale=32, làm địa chỉ lattice. Giữ cùng scale ở bài sau để chỉ thay cách nội suy. Hash giải quyết tính tái lập, chưa tạo sự chuyển tiếp êm.",
        },
      ],
    },
    "p63-l04": {
      focus:
        "Floor ở miền âm, smoothstep và nội suy hai chiều; phân biệt value noise với gradient noise.",
      expected:
        "Tại nút nguyên, valueNoise bằng latticeValue. Mẫu (−0.25,0.5), seed 42 cho khoảng −0.27946993972686357. Qua hai phía x=−1,0,1, giá trị và độ dốc một phía tiến về nhau trong sai số cho phép. H sau floor vẫn có bậc là bình thường.",
      files: ["include/noise.hpp"],
      steps: [
        {
          title: "Viết phép trộn hai giá trị",
          explanation:
            "blend(a,b,t) trả a khi t=0 và b khi t=1. Công thức a+(b−a)t cho biết t là phần đường đã đi từ a tới b; không phải tọa độ world. Hàm này được dùng ba lần trong một mẫu noise.",
        },
        {
          title: "Làm êm trọng số, không làm mờ pixel",
          explanation:
            "s(0)=0, s(1)=1 và s′(t)=6t(1−t), nên s′ bằng zero ở hai đầu. Ghép các ô có thể giữ tín hiệu và đạo hàm bậc nhất liên tục (C1). Điều này nói về hàm trước floor, không biến bề mặt voxel thành đường trơn.",
        },
        {
          title: "Nội suy bốn góc của cùng một ô",
          explanation:
            "Dùng Canvas bốn góc với x0=−1,z0=0,tx=0.75,tz=0.5 và seed=42. Hai hàng cho a≈−0.38212406, b≈−0.17681582; trộn theo Z cho n≈−0.27946994. Kéo điểm hoặc dùng input để đối chiếu trọng số, góc và kết quả; đây là không gian noise, chưa phải block world.",
        },
      ],
    },
    "p63-l05": {
      focus:
        "Cộng các lớp có tần số tăng, biên độ giảm, chuẩn hóa tổng và giới hạn tần số lấy mẫu.",
      expected:
        "Với mọi scale/octave cho phép, tín hiệu nằm trong [−1,1] và H trong [2,14]. Một octave khớp valueNoise. Tại (15,8) với mặc định, n≈−0.26170680617117803, H=6; fixture giúp nhận ra đổi nhầm thứ tự cập nhật weight.",
      files: ["include/terrain.hpp"],
      steps: [
        {
          title: "Giữ cả tổng và tổng trọng số",
          explanation:
            "Theo bảng tại world (15,8), ba lớp có biên độ 1, 0.5, 0.25. Tổng trọng số là 1.75, không phải 3. Cộng amplitude hiện tại vào weight trước khi giảm nó để n≈−0.26170681 và H=6 khớp ví dụ.",
        },
        {
          title: "Đổi tín hiệu đã chuẩn hóa thành cột",
          explanation:
            "Giữ 8 và 6 như bài trước. Khi đổi octave, khoảng độ cao vẫn nằm trong [2,14], còn hình chi tiết thay đổi. clamp là hàng rào an toàn, không phải cách chữa một tổng sai vì quên chuẩn hóa.",
        },
        {
          title: "Giới hạn cấu hình trước khi chạy",
          explanation:
            "Scale chỉ nhận 16/32/64 và octave 1..4. Ở trường hợp chi tiết nhất, khoảng lattice cuối bằng 16/2³=2 block; ta không thêm lớp có bước nhỏ hơn voxel rồi ngạc nhiên vì ảnh thay đổi thất thường. Đây là giới hạn thực hành, không chứng minh tín hiệu đã band-limit hoàn toàn.",
        },
      ],
    },
    "p63-l06": {
      focus:
        "Lấp đầy cột không off-by-one, chọn vật liệu theo độ cao và kiểm mặt chung của hai chunk.",
      expected:
        "Cột H=4 có Stone tại y0, Dirt y1/y2, Grass y3, Air từ y4. H=11/14 toàn Stone. Buffer mới không có lỗ. Hai chunk resident khớp oracle global, bao gồm hướng mặt và vật liệu; không dùng checksum ảnh thay cho kiểm Block ID.",
      files: ["include/terrain.hpp", "include/world.hpp"],
      steps: [
        {
          title: "Quyết định vật liệu bằng các điều kiện dễ đọc",
          explanation:
            "Kiểm Air trước, rồi Grass, Dirt, cuối cùng Stone. Điều kiện y>0 giữ đáy là Stone ngay cả khi H=2. Mọi ID Grass/Dirt/Stone đều opaque; khác màu không có nghĩa mặt chung cần được vẽ.",
        },
        {
          title: "Lấp đủ cột trong một buffer mới",
          explanation:
            "Chunk được zero-initialize nên mọi ô chưa lấp là Air. Vòng y chỉ chạy tới height−1. Không tái dùng buffer cũ rồi chỉ ghi phần đặc: khi H giảm, phần đỉnh cũ có thể còn sót nếu không xóa.",
        },
        {
          title: "Đưa dữ liệu vào Entry trước khi dựng mesh",
          explanation:
            "loadChunk tạo dữ liệu nhưng không tự quét toàn world. Scheduler đã gom các Key ảnh hưởng và hoàn tất mesh cho batch. Mesher Project 62 đọc neighbor resident: hai cột cao 8 và 5 vẫn có vách ba block lộ ra, không phải đường nứt cần xóa.",
        },
      ],
    },
    "p63-l07": {
      focus:
        "Chụp cấu hình bất biến, khởi tạo thế hệ mới hữu hạn rồi để streaming tải phần còn lại.",
      expected:
        "Thông số sai không thay generation, resident hoặc queue. Áp dụng tại tọa độ âm bootstrap đúng center âm. Sau khi tải hết, mọi buffer khớp config snapshot mới; sửa tiếp ô draft chưa áp dụng không đổi world. Job budget không phải cam kết thời gian ms.",
      files: ["include/terrain.hpp", "include/scheduler.hpp"],
      steps: [
        {
          title: "Kiểm cấu hình trước mọi thay đổi",
          explanation:
            "Không sửa world rồi mới phát hiện scale=8 hoặc octaves=0. Native nhận struct có kiểu rõ; Canvas có draft riêng, nút Áp dụng mới commit. Giá trị chưa hợp lệ không được làm mất resident đang xem.",
        },
        {
          title: "Dựng state kế tiếp ngoài state đang dùng",
          explanation:
            "next giữ player, radius và budget, nhận config mới và generation+1. Chỉ load/rebuild chunk dưới player, retarget từ state mới, rồi move toàn next vào world. Cấu hình được copy, không giữ tham chiếu vào ô input đang sửa.",
        },
        {
          title: "Cho tải tiếp theo nhịp cũ",
          explanation:
            "Queue cũ biến mất cùng thế hệ cũ. Mỗi tick sau bootstrap vẫn chỉ load/unload tối đa budget và dựng tập mesh ảnh hưởng. Bootstrap một chunk là công việc riêng của nút áp dụng, không được tính là một tick budget=0 mà vẫn phát sinh mesh.",
        },
      ],
    },
    "p63-l08": {
      focus:
        "Đối chiếu tín hiệu liên tục với cột voxel, thử lỗi dùng local và quan sát cả biên âm.",
      expected:
        "Cùng X/Z và cấu hình cho n/H giống nhau trong inspector native và Canvas. Space repeat không cuộn trang hoặc bật/tắt liên tục, reduced-motion vẫn cho Một tick. Đổi kích thước/DPR không gây ResizeObserver loop. Preview 2D được ghi rõ không phải danh sách resident.",
      files: ["include/controller.hpp"],
      steps: [
        {
          title: "Tách mẫu cột thành dữ liệu nhỏ",
          explanation:
            "x/z trong ColumnSample là địa chỉ cột nguyên, signal là giá trị trước lượng tử hóa, height là số block. Không lấy local làm đầu vào chỉ vì inspector đang đứng trong một chunk. Tọa độ âm gần zero là nơi dễ phát hiện sai floor nhất.",
        },
        {
          title: "Chỉ raster lại khi dữ liệu hoặc camera đổi",
          explanation:
            "Inspector/hover chỉ đọc hàm, không sửa blocks. Camera đổi làm ảnh dirty nhưng không cần generate hoặc remesh. Canvas tách cache pixel khỏi lần vẽ map/readout; đừng đặt generateTerrain trong requestAnimationFrame.",
        },
        {
          title: "Giữ playback hữu hạn và có thể dừng",
          explanation:
            "Clamp dt và chỉ chạy một batch sau 0.2 giây; không while bù hàng trăm tick sau alt-tab. Native mất focus sẽ pause và nhả capture. Canvas xử lý thêm pointercancel, reduced-motion và cleanup RAF khi đổi lesson.",
        },
      ],
    },
    "p63-l09": {
      focus: "Golden hash C++/TypeScript, oracle cột/bề mặt, regeneration và kiểm thử có deadline.",
      expected:
        "Golden hash/float, scale/octave bounds, biên âm/dương, cùng world sample qua hai halo, vùng monolithic, cột không lỗ, regeneration, cache invalidation và mesh oracle đều qua. Test cũng kiểm thông số sai trước mutation và idle không rebuild. Double không bật fast-math; fixture xác nhận toolchain hỗ trợ, không hứa bit-exact trên mọi nền tảng.",
      files: ["include/terrain-oracle.hpp", "include/mesh-oracle.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "So từng cell bằng địa chỉ world",
          explanation:
            "Oracle duyệt cả 16 lớp, gồm Air phía trên, rồi hỏi world X/Z độc lập với vòng fill của generateTerrain. Test vùng monolithic duyệt world liên tục và tách địa chỉ về storage theo đường khác; lỗi reset local hoặc off-by-one ở đỉnh sẽ bị phát hiện.",
        },
        {
          title: "Ghép kiểm dữ liệu với kiểm mặt ngoài",
          explanation:
            "verifySchedule giữ resident/job/mesh trong cap; verifyColumns kiểm mỗi buffer; verifySurface dựng đáp án từ global cell và sáu neighbor rồi so multiset mặt có hướng/vật liệu. Không so ảnh đã raster, vì Z-buffer có thể giấu mặt thừa.",
        },
        {
          title: "Giữ bài kiểm luôn có hiệu lực",
          explanation:
            "Dùng check và EXIT_FAILURE thay assert bị NDEBUG tắt. Cả Debug lẫn Release phải chạy fixture: chunk (0,0) checksum 4263195062, (−1,0) 2291264103, (1,−1) 2892146174 với mặc định seed42/scale32/octaves3. Các số này không áp cho checkpoint trung gian.",
        },
      ],
    },
  },
  references: {
    "p63-l01": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l02": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l03": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l04": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l05": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l06": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l07": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l08": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l09": [
      {
        label: "Địa hình từ một hàm world",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
      {
        label: "Value noise và octave",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
