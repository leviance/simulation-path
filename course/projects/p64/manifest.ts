import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Ghép terrain procedural, streaming và ray picking thành một sandbox dựng khối: phá/đặt qua biên chunk, chọn vật liệu, giữ thay đổi khi đi xa, undo/redo và xuất/nhập bản lưu VXL1. Mỗi phần có giới hạn và kiểm chứng riêng, không giả vờ là một game Minecraft đầy đủ.",
  duration: "16–23 giờ",
  prerequisites: [
    "Project 58–63 — storage voxel, face culling, DDA, greedy mesh, streaming và terrain",
    "Project 60 — ray/normal/ô đặt; Project 63 — tọa độ world và regeneration",
    "C++20 — array/map/vector, optional, value ownership và text parsing; ZIP chứa toàn bộ nền",
  ],
  objectives: [
    "Chạy terrain/streaming trước, đặt tâm ngắm vào ảnh CPU và phân biệt thao tác xem với sửa dữ liệu.",
    "Bù offset player, đi qua tâm pixel và giữ t là khoảng cách từ mặt phẳng origin của camera trực giao.",
    "DDA world có giới hạn; xử lý tọa độ âm, tie và vùng chưa tải mà không chọn xuyên qua dữ liệu chưa biết.",
    "Mỗi action truy vấn lại ray rồi sửa tối đa một cell; không ghi đè, không đặt vượt tầng hoặc vào chunk chưa tải.",
    "Tách terrain nền với delta world, lưu cả Air khi phá và phủ lại delta sau regeneration.",
    "Gộp dirty Key sau edit, xử lý mặt biên và tách bộ đếm mesh edit khỏi batch streaming.",
    "Command giữ cell/before/after, lịch sử hữu hạn và có thể hoàn tác cả khi chunk đã gỡ.",
    "Định dạng VXL1 dùng chung C++/Canvas; parse toàn bộ, kiểm giới hạn rồi mới thay world.",
    "Thêm preset di chuyển giữ edit, ngắm bằng phím, pause/reset, capture/blur và thao tác không auto-repeat.",
    "Đối chiếu picking bằng oracle AABB, kiểm surface, session delta, bản lưu và source hoàn chỉnh.",
  ],
  challenge: {
    timebox: "210–300 phút tự thử trước khi đọc lời giải",
    mission:
      "Tự xây dựng một thế giới voxel 3D cho phép ngắm, phá và đặt block trên địa hình procedural nhiều chunk. Người dùng chọn vật liệu, đi xa rồi quay về vẫn thấy phần đã xây, undo/redo và xuất bản lưu để khôi phục phiên sau.",
    outcome:
      "Cửa sổ SDL3 có terrain, tâm ngắm, viền hit và ô đặt. Một công trình bắc qua đường chia chunk vẫn đúng sau unload/reload; bản lưu text có thể chuyển giữa native và Canvas.",
    requirements: [
      "C++20, CMake ≥3.24, SDL3 3.4.8; starter giữ terrain/greedy mesh/streaming của Project 63 và CPU Z-buffer 320×240.",
      "Camera trực giao, scale 2, pixel center (x+0.5,y+0.5); near ≥64 đứng trước mọi chunk resident, far=near−96. Render/pick cùng khoảng depth; reach 96 từ origin plane, không phải khoảng cách tay FPS.",
      "Chunk 16³, tầng Y=0..15; player X/Z±512, địa chỉ edit X/Z trong [−1024,1024), y nguyên 0..15. Terrain seed42/scale32/octaves3 mặc định.",
      "DDA front-to-back tối đa 256 vòng, tolerance t=1e-9, step mọi trục tie và normal ưu tiên X/Y/Z. Bỏ tiếp xúc không có đoạn đi trong ô đủ dài.",
      "Chưa resident là Unknown, không phải Air cho picking. Dừng ray ở chunk chưa tải; không tự generate neighbor hoặc sửa dữ liệu chưa có.",
      "Click/button/key không repeat sửa tối đa một cell; phá thành Air, đặt ở hit+normal nếu Air resident, material 1/2/3, không overwrite hoặc đặt ngoài tầng.",
      "Delta theo tọa độ world lưu cả tombstone Air; bỏ delta nếu khôi phục đúng nền. Tối đa 512 delta, vượt cap không thay state.",
      "Giữ scheduler P62: resident≤49, pending≤74, 1–2 job/tick. Edit biên ảnh hưởng self và neighbor trực tiếp X/Z, tối đa ba Key mỗi cell góc; gộp trước frame.",
      "Undo/redo tối đa 32 lệnh; giữ địa chỉ/before/after chứ không Entry pointer. Undo chunk đã gỡ cập nhật delta, không tải chunk chỉ để hoàn tác.",
      "VXL1 chỉ chứa config và delta canonical, không mesh/cache/history. ASCII≤32768 byte, tối đa 512 records; reject duplicate, redundant, invalid, overflow/trailing data trước mutation.",
      "Native F5 copy snapshot, Shift+F9 nhập clipboard; Canvas textarea xuất/nhập có lựa chọn thay phiên đang có edit. Người dùng tự lưu text ra file; không backend hoặc autosave.",
      "Canvas có pause/reset/preset, keyboard, pointer capture/cancel, DPR, reduced-motion và readout; ZIP có README, starter, 10 checkpoint, final và tests.",
    ],
    constraints: [
      "Đây là sandbox dựng khối với camera trực giao, chưa FPS controller, gravity/collision, survival, inventory theo số lượng, crafting, texture atlas, lighting hoặc multiplayer.",
      "Dữ liệu chỉnh sửa chỉ trong RAM; muốn giữ qua đóng chương trình/reload phải xuất text. LocalStorage tiến độ học không phải bản lưu sandbox. R cố ý xóa phiên.",
      "Mesher coi neighbor chưa tải là Air để đóng frontier; picker coi là Unknown để chặn thao tác. Hai quy tắc khác nhau theo mục đích, không được trộn.",
      "Terrain vẫn heightfield, nhưng delta có thể tạo hốc và khối treo trong tầng. Không streaming theo Y, erosion, lưu edit vô hạn hay thread/network.",
      "Bài 04 chỉ sửa resident và có thể mất edit khi unload; bài 05 mới thêm delta. Bài 04–05 remesh eager để dễ hiểu, bài 06 mới gom dirty set.",
      "Overlay hit/ghost/path là debug, không depth-test để chọn. Picking dùng Block ID đầy đủ, không đọc pixel màu hoặc depth buffer.",
      "Import thay toàn bộ config/delta, giữ vị trí player và xóa history/cache. Native cần Shift+F9; Canvas xác nhận thay phiên có edit. Parse lỗi giữ nguyên phiên cũ.",
      "Job budget giới hạn số việc, không bảo đảm millisecond. Full oracle chạy trong Node/CTest; nút audit resident không thay kiểm tương tác và hành trình.",
    ],
    definitionOfDone: [
      "Mười bài theo các lớp tích hợp thực tế; starter có terrain nhìn thấy được, thuật toán mới chỉ xuất hiện ở checkpoint tương ứng.",
      "Ray chiếu ngược về đúng pixel ở nhiều player âm/dương, yaw/zoom; pick qua biên chunk khớp oracle quét AABB và không xuyên Unknown.",
      "Phá/đặt một cell, không dùng stale Hit, không auto-repeat/paint, reject boundary/material/inside-normal-zero và delta cap trước mutation.",
      "Delta Air không mất sau unload, quay về giữ công trình; khôi phục nền xóa delta. Query/camera không ghi blocks.",
      "Edit interior chỉ một mesh, góc X/Z tối đa ba; nhiều sửa trước frame được gộp. lastMeshes thuộc streaming không bị cộng lịch sử edit.",
      "Undo/redo LIFO hữu hạn, branch edit xóa redo, offline undo không sinh chunk, import/reset xóa lịch sử.",
      "VXL1 canonical khớp byte C++/TS, import round-trip, input thiếu/dư/trùng/NaN/overflow/ngoài miền bị từ chối mà không sửa world.",
      "Golden terrain P63 còn đúng khi không delta; oracle resident so base+delta, oracle surface so multiset hướng/vật liệu, oracle picking độc lập bước DDA.",
      "Build starter, 10 checkpoint và final Debug/Release, CTest thuần và hidden smoke có deadline; tối đa hai compiler, không tự bật server.",
      "Roadmap/search/glossary/ZIP và source cuối bài đồng bộ. Các project chưa phát hành ghi Sắp ra mắt; phần UI tương tác trực tiếp được báo riêng.",
    ],
  },
  lessons: [
    {
      id: "p64-l01",
      slug: "01-chay-sandbox-va-tam-ngam",
      title: "Chạy world đang có và thêm tâm ngắm",
      summary:
        "Chạy terrain/streaming trước, đặt tâm ngắm vào ảnh CPU và phân biệt thao tác xem với sửa dữ liệu.",
      order: 1,
      estimatedMinutes: 70,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l02",
      slug: "02-ray-tu-camera-sang-world",
      title: "Đưa tia từ camera về đúng world",
      summary:
        "Bù offset player, đi qua tâm pixel và giữ t là khoảng cách từ mặt phẳng origin của camera trực giao.",
      order: 2,
      estimatedMinutes: 95,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l03",
      slug: "03-chon-block-qua-nhieu-chunk",
      title: "Chọn block đầu tiên qua nhiều chunk",
      summary:
        "DDA world có giới hạn; xử lý tọa độ âm, tie và vùng chưa tải mà không chọn xuyên qua dữ liệu chưa biết.",
      order: 3,
      estimatedMinutes: 120,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l04",
      slug: "04-pha-dat-va-thanh-vat-lieu",
      title: "Phá, đặt và chọn vật liệu",
      summary:
        "Mỗi action truy vấn lại ray rồi sửa tối đa một cell; không ghi đè, không đặt vượt tầng hoặc vào chunk chưa tải.",
      order: 4,
      estimatedMinutes: 90,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l05",
      slug: "05-giu-chinh-sua-khi-chunk-bi-go",
      title: "Giữ thay đổi khi chunk bị gỡ khỏi RAM",
      summary:
        "Tách terrain nền với delta world, lưu cả Air khi phá và phủ lại delta sau regeneration.",
      order: 5,
      estimatedMinutes: 100,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l06",
      slug: "06-cap-nhat-mesh-va-preview",
      title: "Cập nhật mesh và preview đúng lúc",
      summary:
        "Gộp dirty Key sau edit, xử lý mặt biên và tách bộ đếm mesh edit khỏi batch streaming.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l07",
      slug: "07-undo-redo-theo-toa-do-world",
      title: "Undo và redo bằng địa chỉ world",
      summary:
        "Command giữ cell/before/after, lịch sử hữu hạn và có thể hoàn tác cả khi chunk đã gỡ.",
      order: 7,
      estimatedMinutes: 95,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l08",
      slug: "08-xuat-nhap-ban-luu",
      title: "Xuất và nhập một bản lưu có thể kiểm tra",
      summary:
        "Định dạng VXL1 dùng chung C++/Canvas; parse toàn bộ, kiểm giới hạn rồi mới thay world.",
      order: 8,
      estimatedMinutes: 110,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l09",
      slug: "09-hoan-thien-dieu-khien",
      title: "Hoàn thiện điều khiển và vòng đời tương tác",
      summary:
        "Thêm preset di chuyển giữ edit, ngắm bằng phím, pause/reset, capture/blur và thao tác không auto-repeat.",
      order: 9,
      estimatedMinutes: 85,
      demoId: "voxel-sandbox",
    },
    {
      id: "p64-l10",
      slug: "10-kiem-chung-va-nghiem-thu",
      title: "Kiểm chứng và nghiệm thu sandbox",
      summary:
        "Đối chiếu picking bằng oracle AABB, kiểm surface, session delta, bản lưu và source hoàn chỉnh.",
      order: 10,
      estimatedMinutes: 115,
      demoId: "voxel-sandbox",
    },
  ],
} satisfies PublishedProjectEditorial;
export default data;
