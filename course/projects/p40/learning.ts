import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/grid_math.hpp",
  "include/gl_api.hpp",
  "include/compute_program.hpp",
  "include/gpu_scan.hpp",
  "include/gpu_grid_engine.hpp",
  "shaders/clear_counts.comp",
  "shaders/count_cells.comp",
  "shaders/scan_uint.comp",
  "shaders/uniform_add_uint.comp",
  "shaders/prepare_cursors.comp",
  "shaders/scatter_indices.comp",
  "shaders/find_neighbors.comp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p40-l01": {
      focus:
        "Xác định layout của particle, GridSpec, cách tính cell ID theo hàng và bản tìm láng giềng trên CPU trước khi dựng grid trên GPU.",
      expected:
        "Checkpoint 1 sinh cùng positions khi seed giống nhau, ánh xạ bốn mép đúng và brute-force summary loại chính particle đang hỏi.",
      files,
      steps: [
        {
          title: "Giữ cấu trúc dữ liệu nhỏ và rõ",
          explanation:
            "Position chỉ có x/y float và NeighborSummary đúng 16 byte; static_assert giữ C++ tương thích std430 thay vì đoán alignment.",
        },
        {
          title: "Tách GridSpec khỏi storage",
          explanation:
            "GridSpec chỉ trả columns, rows, cellCount và cell ID; counts/offsets/sorted indices sẽ được GPU engine sở hữu ở bài sau.",
        },
        {
          title: "Viết bản CPU có quy tắc phân xử",
          explanation:
            "CPU quét toàn bộ positions, bỏ self, kiểm radius squared rồi chọn distance nhỏ hơn hoặc index nhỏ hơn khi hòa.",
        },
      ],
    },
    "p40-l02": {
      focus:
        "Clear cellCounts rồi dùng atomicAdd một lần cho mỗi particle để tạo occupancy histogram đúng khi nhiều invocation tranh cùng cell.",
      expected:
        "Checkpoint 2 báo tổng counts bằng particle count; phiên bản cố ý bỏ atomic trong Canvas tạo lost update có thể quan sát.",
      files,
      steps: [
        {
          title: "Clear bằng compute pass có bounds guard",
          explanation:
            "cellCount và particleCount là hai domain khác nhau nên có group count và uniform riêng; tail invocation không được ghi buffer.",
        },
        {
          title: "Tính cell ID giống CPU",
          explanation:
            "Shader clamp column/row sau floor và dùng row*columns+column; cùng input phải cho cùng address ở hai phía.",
        },
        {
          title: "Atomic ở đúng contention point",
          explanation:
            "Mỗi particle chỉ tăng cell của nó; atomicAdd bảo toàn mọi increment mà không ép toàn grid qua một counter chung.",
        },
      ],
    },
    "p40-l03": {
      focus:
        "Tái sử dụng uint Blelloch scan để biến occupancy histogram thành CSR offsets mà không có CPU round-trip.",
      expected:
        "Checkpoint 3 cho counts [2,0,3,1] tạo offsets [0,2,2,5], total bằng offsets cuối cộng count cuối.",
      files,
      steps: [
        {
          title: "Đọc counts như một mảng cần scan",
          explanation:
            "Cell c sở hữu đoạn bắt đầu tại offsets[c] dài counts[c]; exclusive scan chính là phép đóng gói các đoạn không chồng nhau.",
        },
        {
          title: "Giữ block sums trên GPU",
          explanation:
            "Mỗi scan level ghi local prefixes và block sums; level nhỏ được scan tiếp rồi uniform-add trở xuống như Project 39.",
        },
        {
          title: "Kiểm sentinel bằng công thức",
          explanation:
            "Không cần offsets có C+1 phần tử: end của cell cuối là offsets[C-1]+counts[C-1], bắt buộc bằng N.",
        },
      ],
    },
    "p40-l04": {
      focus:
        "Copy offsets sang cursors rồi atomic scatter để tạo sortedParticleIndices theo các đoạn CSR không chồng nhau.",
      expected:
        "Checkpoint 4 đặt mọi particle đúng đoạn cell, cursors kết thúc tại offset+count và không đòi thứ tự index trong đoạn.",
      files,
      steps: [
        {
          title: "Bảo vệ offsets bất biến",
          explanation:
            "Scatter cần counter tăng dần nên dùng cellCursors riêng; nếu atomicAdd trực tiếp lên offsets thì query mất địa chỉ bắt đầu.",
        },
        {
          title: "Dùng slot trả về từ atomicAdd",
          explanation:
            "Giá trị cũ của cursor là slot độc quyền của invocation; sau increment không invocation nào nhận cùng slot.",
        },
        {
          title: "Validate membership, không validate order",
          explanation:
            "OpenGL không đảm bảo thứ tự giữa các atomic operation. Vì vậy ta chỉ kiểm mỗi index xuất hiện đúng một lần và thuộc đúng đoạn cell; không ép output phải có một thứ tự tùy ý.",
        },
      ],
    },
    "p40-l05": {
      focus:
        "Tính candidate cell range từ position±radius và duyệt các đoạn CSR thay vì hard-code chín cell.",
      expected:
        "Checkpoint 5 thăm 1, 4, 6, 9 hoặc nhiều cell tùy vị trí/radius, không sinh row/column ngoài grid.",
      files,
      steps: [
        {
          title: "Lấy AABB của circle",
          explanation:
            "min/max position đổi sang min/max cell bằng cùng cellSize rồi clamp; vòng lặp row/column thăm mỗi cell đúng một lần.",
        },
        {
          title: "Đọc begin và count",
          explanation:
            "Mỗi candidate cell cung cấp begin=offsets[cell], end=begin+counts[cell]; sortedIndices dẫn về positions gốc.",
        },
        {
          title: "Đếm candidate work riêng",
          explanation:
            "NeighborSummary giữ visitedCandidates để phân biệt thuật toán đúng nhưng grid quá thô với thuật toán sai.",
        },
      ],
    },
    "p40-l06": {
      focus:
        "Lọc exact radius, loại self và chọn nearest bằng cặp khóa distance/index để không lệ thuộc scatter order.",
      expected:
        "Checkpoint 6 nhận particle đúng trên radius, loại điểm chỉ nằm trong AABB và chọn index nhỏ hơn khi hai distance bằng nhau.",
      files,
      steps: [
        {
          title: "Loại self trước phép đo",
          explanation:
            "Particle hiện tại luôn nằm trong grid và có distance zero; không bỏ nó thì nearest luôn là chính nó.",
        },
        {
          title: "So distanceSquared",
          explanation:
            "Bỏ sqrt trong inner loop nhưng vẫn giữ boundary bằng <= radiusSquared; sqrt chỉ cần khi hiển thị nearest distance.",
        },
        {
          title: "Tie-break bằng index",
          explanation:
            "Nếu hai distance bằng nhau trong epsilon, index nhỏ hơn thắng; cùng membership luôn tạo cùng summary dù scatter đảo thứ tự.",
        },
      ],
    },
    "p40-l07": {
      focus:
        "Nối sáu loại compute pass thành một chuỗi rõ ràng: pass nào ghi buffer, pass nào đọc tiếp và barrier nào nằm giữa chúng.",
      expected:
        "Checkpoint 7 in clear→count→scan→prepare→scatter→neighbors; mọi compute edge dùng SHADER_STORAGE và readback edge dùng BUFFER_UPDATE.",
      files,
      steps: [
        {
          title: "Gọi tên buffer trên từng cạnh",
          explanation:
            "Nhật ký ghi buffer được tạo, miền số phần tử và bước đọc tiếp theo; nhờ đó dữ liệu cũ có thể được truy ngược về đúng cạnh bị thiếu barrier.",
        },
        {
          title: "Đặt barrier sau bước ghi",
          explanation:
            "Sau dispatch ghi SSBO, glMemoryBarrier phải phù hợp với lệnh đọc kế tiếp: SHADER_STORAGE trước compute pass khác và BUFFER_UPDATE trước glGetBufferSubData.",
        },
        {
          title: "Không dùng ALL_BARRIER_BITS",
          explanation:
            "Bit cụ thể cho biết bước kế tiếp là shader hay CPU readback, đồng thời giúp việc đọc và review code dễ kiểm chứng hơn.",
        },
      ],
    },
    "p40-l08": {
      focus:
        "Validate topology của CSR trước neighbor values, sau đó benchmark đúng chín samples bằng query ring không block.",
      expected:
        "Checkpoint 8 bắt lost count, offset overlap, duplicate index và wrong nearest; benchmark kết thúc hữu hạn và bỏ query slot còn pending.",
      files,
      steps: [
        {
          title: "Kiểm grid trước query",
          explanation:
            "sum counts, monotonic offsets, cursor end và particle permutation khoanh vùng lỗi build; chỉ khi chúng đạt mới so neighbor summary.",
        },
        {
          title: "Đối chiếu toàn bộ hoặc lấy mẫu tùy quy mô",
          explanation:
            "Preset nhỏ được so toàn bộ; preset lớn dùng một tập index cố định, có thể tái lập, để phần kiểm tra CPU không làm ứng dụng đứng quá lâu.",
        },
        {
          title: "Giới hạn benchmark",
          explanation:
            "Warm-up nằm ngoài query; vòng B submit đúng chín lần và timer ring chỉ lấy GL_QUERY_RESULT khi slot available.",
        },
      ],
    },
    "p40-l09": {
      focus:
        "Ghép việc thay workload an toàn, phần điều khiển, heatmap, kiểm tra kết quả, đo thời gian và cleanup thành GPU Grid Workbench hoàn chỉnh.",
      expected:
        "Bản final xử lý 1.000.003 particle; nếu preset mới tạo thất bại, workload đang chạy vẫn được giữ nguyên, và mọi program/query/buffer được xóa trước OpenGL context.",
      files,
      steps: [
        {
          title: "Tạo workload mới xong rồi mới thay workload cũ",
          explanation:
            "Positions, GridSpec và toàn bộ buffer mới phải được tạo thành công trước khi engine xóa workload đang hiển thị.",
        },
        {
          title: "Đặt correctness cạnh timing",
          explanation:
            "Title/console báo validation, total scatter, max occupancy, pass count và GPU median cạnh nhau để con số nhanh không che output sai.",
        },
        {
          title: "Dọn resource theo thứ tự ngược",
          explanation:
            "Query, scan hierarchy, grid buffers và programs bị xóa khi context còn current; SDL context/window bị hủy sau cùng.",
        },
      ],
    },
  },
  references: {
    "p40-l01": [
      { label: "Spatial Grid", href: "/glossary#spatial-grid", kind: "Thuật ngữ" },
      { label: "std430", href: "/glossary#std430", kind: "Thuật ngữ" },
    ],
    "p40-l02": [
      {
        label: "atomicAdd",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/atomicAdd.xhtml",
        kind: "OpenGL API",
      },
      { label: "Atomic contention", href: "/glossary#atomic-contention", kind: "Thuật ngữ" },
    ],
    "p40-l03": [
      { label: "Exclusive prefix sum", href: "/glossary#exclusive-prefix-sum", kind: "Thuật ngữ" },
      {
        label: "Compressed sparse row",
        href: "/glossary#compressed-sparse-row",
        kind: "Thuật ngữ",
      },
    ],
    "p40-l04": [
      { label: "Atomic scatter", href: "/glossary#atomic-scatter", kind: "Thuật ngữ" },
      {
        label: "Shader Storage Buffer Object",
        href: "/glossary#shader-storage-buffer-object",
        kind: "Thuật ngữ",
      },
    ],
    "p40-l05": [
      { label: "Candidate set", href: "/glossary#candidate-set", kind: "Thuật ngữ" },
      { label: "Uniform Grid", href: "/glossary#spatial-grid", kind: "Thuật ngữ" },
    ],
    "p40-l06": [
      { label: "Squared distance", href: "/glossary#squared-distance", kind: "Thuật ngữ" },
      {
        label: "Deterministic tie-break",
        href: "/glossary#deterministic-tie-break",
        kind: "Thuật ngữ",
      },
    ],
    "p40-l07": [
      {
        label: "glMemoryBarrier",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml",
        kind: "OpenGL API",
      },
      { label: "GPU memory barrier", href: "/glossary#gpu-memory-barrier", kind: "Thuật ngữ" },
    ],
    "p40-l08": [
      { label: "Structural invariant", href: "/glossary#structural-invariant", kind: "Thuật ngữ" },
      {
        label: "Asynchronous query ring",
        href: "/glossary#asynchronous-query-ring",
        kind: "Thuật ngữ",
      },
    ],
    "p40-l09": [
      {
        label: "Transactional resource update",
        href: "/glossary#transactional-resource-update",
        kind: "Thuật ngữ",
      },
      {
        label: "glDeleteBuffers",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteBuffers.xhtml",
        kind: "OpenGL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
