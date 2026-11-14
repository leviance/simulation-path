import type { LessonReference, ProjectLearningAssets } from "../../learning/types";
const term = (id: string, label: string): LessonReference => ({
  label,
  href: "/glossary#" + id,
  kind: "Thuật ngữ",
});
const gpuBarrier: LessonReference = {
  label: "Khronos — glMemoryBarrier",
  href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml",
  kind: "OpenGL API",
};
const learning = {
  guides: {
    "p44-l01": {
      focus: "Nối phép nội suy vào cửa sổ đã vẽ bốn mẫu nhưng chưa có mặt.",
      expected:
        "Một tetra có một hoặc hai triangle thay đổi theo bốn scalar; không phải mesh toàn volume.",
      files: ["include/sculpt_topology.hpp", "include/sculpt_tetra.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc dữ liệu đầu vào",
          explanation:
            "Corner giữ sample ID, world point và scalar. Window, GL loader, camera và renderer đã được cấp sẵn; chúng không quyết định topology.",
        },
        {
          title: "Tìm các cạnh cắt isovalue",
          explanation:
            "Sắp endpoint theo ID, tính t rồi nội suy point. Equality là outside; dùng cùng quy tắc ở mọi tetra.",
        },
        {
          title: "Gọi từ chương trình đang chạy",
          explanation:
            "polygonizeTetra tạo triangles; tetraSurface đổi chúng thành SurfaceVertex để runTetraPreview trình bày. Đừng chỉ chép helper mà bỏ nơi gọi.",
        },
      ],
    },
    "p44-l02": {
      focus: "Thay bốn mẫu riêng lẻ bằng một grid và vẫn dùng đúng phép trích đã biết.",
      expected:
        "Mặt cầu CPU từ stored field, có counters và face normals; camera không đổi mẫu scalar.",
      files: [
        "include/sculpt_grid.hpp",
        "include/sculpt_topology.hpp",
        "include/sculpt_cpu_mesh.hpp",
        "include/sculpt_cpu_preview.hpp",
      ],
      steps: [
        {
          title: "Thống nhất grid và world",
          explanation:
            "N samples tạo (N−1)³ cells; index=(z*N+y)*N+x, spacing=extent/(N−1). Fill scalar trước khi trích mesh.",
        },
        {
          title: "Giữ mặt chung nhất quán",
          explanation:
            "Mỗi cube dùng cùng sáu tetra quanh đường chéo 0–6. Dùng sample ID toàn grid để giao điểm cạnh chung có cùng owner order.",
        },
        {
          title: "Count rồi dựng mesh CPU nhỏ",
          explanation:
            "extractCpu đếm trước capacity, sau đó emit từ cùng grid. runCpuPreview gọi lại khi dữ liệu đổi, không remesh khi chỉ orbit.",
        },
      ],
    },
    "p44-l03": {
      focus: "Làm ánh sáng đọc được đường cong bằng cách thay normal, không thay positions.",
      expected:
        "Gradient normals mượt hơn face normals trên cùng mesh; fallback gần gradient zero có bộ đếm.",
      files: ["include/sculpt_grid.hpp", "include/sculpt_cpu_mesh.hpp"],
      steps: [
        {
          title: "Hỏi field giữa tám samples",
          explanation:
            "Trilinear sample cung cấp scalar ở vị trí vertex chưa nằm trên grid node. Nó khác nội suy tuyến tính trong từng tetra.",
        },
        {
          title: "Lấy gradient có đơn vị đúng",
          explanation:
            "Dùng ±h theo ba trục, ở boundary chia cho khoảng cách thực còn lại; không giả định mọi probe có đối xứng 2h.",
        },
        {
          title: "Đổi normal trong vòng emit",
          explanation:
            "Chuẩn hóa gradient khi đủ lớn; nếu không, dùng face normal của triangle và tăng normalFallbacks.",
        },
      ],
    },
    "p44-l04": {
      focus: "Biến vị trí con trỏ thành một cọ sửa scalar trong thể tích.",
      expected:
        "Một stamp add/subtract làm field và mesh đổi; preview thể hiện radius và mặt phẳng đặt cọ.",
      files: [
        "include/sculpt_brush.hpp",
        "include/sculpt_cpu_pick.hpp",
        "include/sculpt_cpu_controls.hpp",
      ],
      steps: [
        {
          title: "Công bố cách đặt cọ",
          explanation:
            "Native tìm điểm bắt đầu bằng ray hữu hạn trên field, rồi kéo trên mặt phẳng qua hit. Không bước ray tùy ý theo F vì field đã sửa không còn là SDF.",
        },
        {
          title: "Chỉ sửa vùng radius chạm tới",
          explanation:
            "Đổi bounds cọ sang grid, giữ sample biên và áp falloff theo distance/radius. Add giảm F; subtract tăng F.",
        },
        {
          title: "Nối input với remesh",
          explanation:
            "Controls gửi brush vào document CPU, nhận changed bounds rồi dựng mesh mới. Lát cắt Canvas chỉ là cách đặt cọ minh họa, không thay code picking native.",
        },
      ],
    },
    "p44-l05": {
      focus: "Giữ một nét kéo liền và biến nó thành đúng một mục lịch sử.",
      expected:
        "Stamp không đứt theo nhịp event; một Undo trả cả nét, Cancel trả field trước nét mà không thêm history.",
      files: [
        "include/sculpt_brush.hpp",
        "include/sculpt_document.hpp",
        "include/sculpt_cpu_controls.hpp",
      ],
      steps: [
        {
          title: "Lấy mẫu theo quãng đường",
          explanation:
            "StrokeSampler giữ previous/carry, spacing=radius/4; event mới tiêu phần quãng đường đã tích lũy chứ không đặt đúng một stamp mỗi event.",
        },
        {
          title: "Giữ một pointer owner",
          explanation:
            "Chỉ owner khởi đầu được tiếp tục hoặc kết thúc; capture/cancel/blur đóng giao dịch, không để input cũ tác động grid mới.",
        },
        {
          title: "Giới hạn lịch sử",
          explanation:
            "Chụp snapshot trước stroke, chỉ commit nếu dữ liệu đổi; undo/redo tối đa bốn snapshots, no-op không xóa redo.",
        },
      ],
    },
    "p44-l06": {
      focus: "Chuyển nơi lưu và sửa field lên GPU trước khi thêm extraction GPU.",
      expected:
        "128³ samples thật được init/edit bằng compute; viewer lát cắt đọc được kết quả, chưa count/scan/emit mesh.",
      files: [
        "include/sculpt_gpu_document.hpp",
        "include/sculpt_gpu_field_preview.hpp",
        "shaders/sculpt_field.comp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Preflight rồi tạo storage",
          explanation:
            "Kiểm context/capability, kích thước byte và budget trước buffer; shader nhận đúng layout thay vì đoán packing C++.",
        },
        {
          title: "Dispatch phần việc hữu hạn",
          explanation:
            "Kernel init/brush dùng cùng stored field. Mỗi batch có bounds, summary nhỏ, barrier và fence/query được poll thay vì chờ vô hạn.",
        },
        {
          title: "Giữ giao dịch trên GPU",
          explanation:
            "Snapshot device-to-device, queue stamp hữu hạn và rollback nếu stroke bị hủy; slice chỉ đọc/hiện field, không CPU extraction hộ.",
        },
      ],
    },
    "p44-l07": {
      focus: "Biết chính xác mesh cần bao nhiêu vertices và cell nào sẽ ghi ở đâu.",
      expected:
        "Count/scan hoàn chỉnh và prefix inspector cho chunk; output mesh chưa được cấp hoặc emit.",
      files: [
        "include/sculpt_gpu_layout.hpp",
        "include/sculpt_gpu_count_job.hpp",
        "shaders/sculpt_extract.comp",
        "shaders/sculpt_scan.comp",
      ],
      steps: [
        {
          title: "Count cùng topology sẽ emit",
          explanation:
            "Mỗi cell tính số triangle hợp lệ từ sáu tetra. Padding ngoài real cells là zero, không tăng counters giả.",
        },
        {
          title: "Tự viết exclusive scan",
          explanation:
            "Scan 512 phần tử, scan tổng block rồi add-back; barriers trong workgroup đi qua cùng control flow. Fixture có prefix reference biết trước.",
        },
        {
          title: "Giữ summary theo generation",
          explanation:
            "Counted vertices và offsets thuộc snapshot được đếm. Inspector/Cancel/Pause không biến bản pending thành current; chưa cấp mesh output ở bước này.",
        },
      ],
    },
    "p44-l08": {
      focus: "Dùng các range đã count để tạo geometry và đưa chính buffer đó sang draw.",
      expected:
        "Mesh GPU 128³ có normals và ánh sáng, emit không vượt capacity; bước này vẫn rebuild toàn grid.",
      files: [
        "include/sculpt_gpu_mesh.hpp",
        "include/sculpt_renderer.hpp",
        "shaders/sculpt_extract.comp",
        "shaders/sculpt_normals.comp",
      ],
      steps: [
        {
          title: "Kiểm capacity trước output",
          explanation:
            "Đọc summary nhỏ, cộng tổng bằng kiểu đủ rộng và chỉ cấp buffer nếu tổng nằm trong vertex/memory budget.",
        },
        {
          title: "Emit đúng offset",
          explanation:
            "Cell ghi từ offset riêng, dùng cùng edge/tie/degenerate rule như count; normal pass hỏi lại stored field, có policy khi gradient gần zero.",
        },
        {
          title: "Publish rồi mới vẽ",
          explanation:
            "Barrier theo consumer, fence xong và generation còn hợp lệ mới thay active mesh; buffer output cũng là vertex buffer, không readback toàn mesh để vẽ.",
        },
      ],
    },
    "p44-l09": {
      focus: "Giảm công việc sau nét cọ mà không làm stale geometry hoặc normals.",
      expected:
        "Dirty job reuse chunk không đổi; full/dirty khớp và Cancel giữ mesh last-good có nhãn.",
      files: [
        "include/sculpt_brush.hpp",
        "include/sculpt_gpu_mesh.hpp",
        "include/sculpt_chunk_inspector.hpp",
      ],
      steps: [
        {
          title: "Suy ra halo từ phụ thuộc",
          explanation:
            "Changed samples ảnh hưởng cell lân cận và gradient, nên dirty range dùng low−2/high+1 trước khi đổi sang chunk 16³ cells.",
        },
        {
          title: "Tách field revision và yêu cầu",
          explanation:
            "Request mới có generation riêng dù field không đổi. Mesh đang vẽ chỉ current khi khớp cả field và requested generation.",
        },
        {
          title: "Hủy candidate thay vì phá active",
          explanation:
            "Chỉ publish cả giao dịch khi mọi chunk cần thiết xong; queue/Pause/stale ticket/capacity failure không làm mất active. F5 dựng full để đối chiếu.",
        },
      ],
    },
    "p44-l10": {
      focus: "Ghép các cách kiểm field vào editor đang dùng để nặn.",
      expected:
        "Slice/probe cùng field với mesh, iso không ghi scalar và đổi resolution giữ world edits qua nội suy.",
      files: [
        "include/sculpt_slice_inspector.hpp",
        "include/sculpt_scene_tasks.hpp",
        "include/sculpt_field_slice.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đổi UV slice sang world",
          explanation:
            "Mỗi trục có cặp UV riêng; đảo v vì ảnh Y-down. Tách logical và drawable viewport khi xử lý DPR.",
        },
        {
          title: "Giữ nhãn probe có chủ sở hữu",
          explanation:
            "Cache probe gắn field revision và mesh generation; pending không được ghép probe mới với mesh cũ như cùng một kết quả.",
        },
        {
          title: "Resample qua model candidate",
          explanation:
            "Giữ source immutable, nội suy field sang grid mới rồi chờ mesh xong để handoff. Hạ N có thể mất chi tiết; history khác grid bị xóa.",
        },
      ],
    },
    "p44-l11": {
      focus: "Lưu đúng dữ liệu đã nặn và đem mesh sang một chương trình khác.",
      expected:
        "File .scl và OBJ riêng, write/read-check trước rename; load lỗi/hủy không thay document đang mở.",
      files: [
        "include/sculpt_field_file.hpp",
        "include/sculpt_mesh_file.hpp",
        "include/sculpt_export_jobs.hpp",
        "include/sculpt_file_tasks.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chốt format field",
          explanation:
            "Header little-endian và payload binary32 có size/range/checksum/EOF validation. Lưu scalar chứ không chỉ lưu preset hoặc thông số cọ.",
        },
        {
          title: "Load qua candidate",
          explanation:
            "Đọc/upload theo batch, kiểm đủ rồi dựng mesh. Chỉ handoff model mới khi cả file lẫn mesh hợp lệ; lỗi muộn vẫn giữ model cũ.",
        },
        {
          title: "Xuất snapshot mesh",
          explanation:
            "Giữ buffers immutable khi stream v/vn/f, parse lại rồi mới công bố file. Visitor fixture so từng position/normal, không chỉ tin fingerprint bằng nhau.",
        },
      ],
    },
    "p44-l12": {
      focus: "Kiểm sản phẩm thật và đo công việc thật của chính chương trình đã xây.",
      expected:
        "Final có đủ editor/IO; benchmark cố định 2 warm-up + 5 mẫu, raw/median/min/max/MAD, có deadline.",
      files: [
        "include/sculpt_benchmark.hpp",
        "include/sculpt_benchmark_statistics.hpp",
        "tests/benchmark-fixtures.cpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Tách correctness khỏi thời gian",
          explanation:
            "Khoét/ghép được kiểm bằng topology và probe độc lập; counters benchmark không thay kiểm lỗ thông hoặc UI desktop.",
        },
        {
          title: "Đặt protocol lặp được",
          explanation:
            "Mỗi trial tạo sphere mới, một stamp cố định, dirty/full remesh cùng edited field và mesh-only draw. Bỏ warm-up, giữ đủ raw samples và cấu hình máy.",
        },
        {
          title: "Đọc GPU query đúng phạm vi",
          explanation:
            "GL_TIME_ELAPSED có available/fence guard; draw không gồm clear/UI/swap. Host total được báo riêng; không gọi tracked buffers là toàn VRAM hoặc hứa FPS phổ quát.",
        },
      ],
    },
  },
  references: {
    "p44-l01": [
      term("sculpt-edge-interpolation", "Nội suy cạnh cắt isovalue"),
      term("sculpt-tetra-topology", "Marching tetrahedra và mặt chung"),
    ],
    "p44-l02": [
      term("sculpt-scalar-grid", "Samples, cells và world↔grid"),
      term("sculpt-tetra-topology", "Cách chia tetra nhất quán"),
    ],
    "p44-l03": [
      term("sculpt-field-gradient", "Gradient của stored field"),
      term("sculpt-scalar-grid", "Scalar grid"),
    ],
    "p44-l04": [
      term("sculpt-brush-falloff", "Cọ add/subtract và falloff"),
      term("sculpt-field-picking", "Picking trên field không còn là SDF"),
    ],
    "p44-l05": [
      term("sculpt-stroke-transaction", "Stroke, owner và snapshot"),
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p44-l06": [gpuBarrier, term("sculpt-count-scan-emit", "Count/scan/emit của volume")],
    "p44-l07": [term("sculpt-count-scan-emit", "Count, padding và exclusive prefix"), gpuBarrier],
    "p44-l08": [gpuBarrier, term("sculpt-field-gradient", "Gradient normal và fallback")],
    "p44-l09": [
      term("sculpt-dirty-generation", "Dirty halo và mesh generation"),
      term("sculpt-count-scan-emit", "Range output và capacity"),
    ],
    "p44-l10": [
      term("sculpt-resampling", "Resample stored field"),
      term("sculpt-scalar-grid", "World-grid mapping"),
    ],
    "p44-l11": [
      term("sculpt-field-archive", "Field snapshot và OBJ snapshot"),
      term("sculpt-stroke-transaction", "Snapshot không phải lịch sử vô hạn"),
    ],
    "p44-l12": [
      term("sculpt-pass-benchmark", "Đo từng pass với warm-up và raw samples"),
      {
        label: "Khronos — ARB_timer_query",
        href: "https://registry.khronos.org/OpenGL/extensions/ARB/ARB_timer_query.txt",
        kind: "OpenGL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
