import type { GlossaryTerm } from "./glossary";

export const volumeSculptorGlossaryTerms: GlossaryTerm[] = [
  {
    id: "sculpt-scalar-grid",
    term: "Scalar grid: samples khác cells",
    definition:
      "Project 44 lưu một scalar F ở mỗi mẫu của lưới 3D. N samples mỗi trục tạo (N−1)³ cells; index=(z*N+y)*N+x. Với origin và extent, spacing=extent/(N−1), world=origin+grid*spacing. Grid 128³ có 2.097.152 samples nhưng chỉ 2.048.383 cells. F<isovalue là trong, equality thuộc ngoài; scalar không phải màu hoặc tọa độ.",
    keywords:
      "volume sculptor stored field scalar samples cells row major world grid spacing isosurface",
  },
  {
    id: "sculpt-edge-interpolation",
    term: "Nội suy cạnh cắt isovalue",
    definition:
      "Với hai mẫu ở hai phía khác nhau, t=(iso−Fa)/(Fb−Fa), P=Pa+t(Pb−Pa). Ví dụ Fa=−1, Fb=3 và iso=0 cho t=0,25. Project 44 sắp hai endpoint theo sample ID trước khi tính, để các cell dùng chung cạnh tính giao điểm cùng thứ tự; không chia nếu cạnh không cắt hoặc hiệu scalar không hữu hạn.",
    keywords: "marching tetrahedra edge interpolation canonical sample ID intersection t isovalue",
  },
  {
    id: "sculpt-tetra-topology",
    term: "Marching tetrahedra và topology mặt chung",
    definition:
      "Mỗi cube của Project 44 chia cùng sáu tetra quanh diagonal 0–6. Tetra có 0/4 đỉnh trong không tạo mặt; 1/3 đỉnh trong thường cho một triangle, 2 đỉnh trong cho hai. Equality thuộc outside và triangle gần suy biến bị bỏ trong cả count lẫn emit. Mặt chung phải dùng cùng diagonal và edge order; smooth shading không sửa được crack do chia khác nhau.",
    keywords:
      "Freudenthal marching tetrahedra topology shared face ambiguity winding degeneracy crack",
  },
  {
    id: "sculpt-field-gradient",
    term: "Gradient normal của stored field",
    definition:
      "Normal hướng ra ngoài là normalize(∇F) khi F âm phía trong. Hỏi trilinear field tại p±h theo ba trục, h=spacing/2; sát biên chia cho khoảng cách thực còn lại thay vì luôn dùng 2h. Gradient gần zero dùng face normal và được đếm. Nội suy trong tetra quyết định geometry, còn trilinear sampling cung cấp gradient; không giả vờ hai field nội suy là một.",
    keywords:
      "stored scalar field gradient normal finite differences trilinear one sided boundary fallback",
  },
  {
    id: "sculpt-brush-falloff",
    term: "Cọ add/subtract có falloff",
    definition:
      "Đặt q=distance(point,center)/radius, w=max(0,1−q²)². Add giảm F đi strength*w, subtract tăng cùng lượng; strength là độ đổi scalar mỗi stamp, không phải lực. Chỉ samples trong radius được sửa, sample biên được bảo vệ. Sau nhiều stamp, stored field thường không còn là signed distance field.",
    keywords: "volume sculpting brush falloff add subtract strength radius scalar edit SDF",
  },
  {
    id: "sculpt-field-picking",
    term: "Picking trên field không còn là SDF",
    definition:
      "Sau khi nặn, độ lớn F không còn bảo đảm là khoảng cách đến mặt. Project 44 dùng bước ray hữu hạn rồi chia đôi khi thấy đổi dấu, có giới hạn số bước; không sphere-trace tùy ý bằng F. Điểm hit đầu đặt mặt phẳng kéo vuông góc hướng nhìn. Chi tiết mỏng hơn bước hoặc ca tiếp tuyến vẫn cần đối chứng riêng; Canvas đặt cọ trực tiếp trên slice, không nhận là cùng thao tác picking native.",
    keywords: "volume brush picking ray finite steps bisection tangent surface plane SDF",
  },
  {
    id: "sculpt-stroke-transaction",
    term: "Một stroke là một giao dịch chỉnh sửa",
    definition:
      "Nét kéo có một pointer owner, snapshot trước nét và nhiều stamp cách nhau theo quãng đường radius/4. Thả owner mới commit một mục undo; cancel/blur/reset trả field trước nét và bỏ input cũ. No-op không thêm history hoặc xóa redo. Lịch sử native có giới hạn bốn snapshot; save field không đồng nghĩa lưu cả lịch sử chỉnh sửa.",
    keywords:
      "sculpt stroke transaction pointer capture owner undo redo snapshot distance sampling rollback",
  },
  {
    id: "sculpt-count-scan-emit",
    term: "Count/scan/emit của mesh volume",
    definition:
      "Count cho biết mỗi cell cần bao nhiêu vertices; exclusive scan dành range không chồng nhau, rồi emit ghi đúng range từ cùng field snapshot. Ví dụ counts [3,0,6] cho offsets [0,3,3], tổng 9. Native Project 44 tự scan các đoạn 512 phần tử rồi scan tổng đoạn/add-back. Kiểm tổng/capacity trước mesh allocation; không cắt bớt triangles khi thiếu buffer.",
    keywords: "volume GPU count exclusive prefix scan emit output capacity padding buffer overflow",
  },
  {
    id: "sculpt-dirty-generation",
    term: "Dirty halo và mesh generation",
    definition:
      "Samples đổi ở [low,high] ảnh hưởng geometry và gradient của cell lân cận; Project 44 dùng halo cell [low−2,high+1] rồi kẹp về domain trước khi chọn chunk. Field revision nhận diện dữ liệu, generation nhận diện yêu cầu dựng mesh, kể cả remesh cùng field. Chunk chỉ được reuse khi phụ thuộc không đổi; candidate phải xong đủ mới thay last-good. Camera không tạo generation mới.",
    keywords:
      "volume dirty chunks normal halo field revision requested mesh generation stale last good reuse cancel",
  },
  {
    id: "sculpt-resampling",
    term: "Resample stored field khi đổi resolution",
    definition:
      "Giữ world domain, tạo các sample vị trí mới và nội suy trilinear từ một bản field nguồn immutable. Đây không phải reset primitive. Hạ N có thể mất chi tiết; tăng N trở lại không tự lấy lại chi tiết đó. Native dùng model candidate và chỉ handoff sau mesh hoàn chỉnh; history khác grid bị xóa, chọn lại cùng N là no-op.",
    keywords:
      "volume resampling resolution grid trilinear immutable candidate aliasing detail history",
  },
  {
    id: "sculpt-field-archive",
    term: "Field snapshot khác mesh snapshot",
    definition:
      "File .scl của Project 44 lưu header little-endian, metadata và scalar binary32 đã nặn; OBJ lưu triangles/positions/normals để dùng bề mặt ở nơi khác. OBJ không khôi phục stored field hoặc undo history. Save/export giữ snapshot, stream theo batch, kiểm lại rồi mới rename partial thành kết quả. Checksum/fingerprint không phải chữ ký hoặc bằng chứng byte-exact; fixtures so trực tiếp dữ liệu đã đọc.",
    keywords:
      "sculpt field archive save load scl OBJ export snapshot checksum little endian binary32 partial",
  },
  {
    id: "sculpt-pass-benchmark",
    term: "Benchmark từng pass của công cụ nặn khối",
    definition:
      "Protocol cố định tạo sphere mới, một stamp, dirty remesh, full remesh cùng edited field và mesh-only draw. Bỏ hai warm-up, giữ năm raw samples, tính median/min/max/MAD. GL_TIME_ELAPSED đo phạm vi GPU query, không phải thời gian CPU submit; draw không gồm panel/clear/swap. Báo host total và tracked buffer bytes riêng, kèm máy/driver/build/grid; không suy ra FPS hoặc speedup chung từ một lượt đo.",
    keywords:
      "volume benchmark GL TIME ELAPSED GPU query warm up median MAD raw samples host time VRAM",
  },
];
