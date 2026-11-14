import type { LessonReference, ProjectLearningAssets } from "../../learning/types";

const term = (id: string, label: string): LessonReference => ({
  label,
  href: "/glossary#" + id,
  kind: "Thuật ngữ",
});
const storage: LessonReference = {
  label: "Khronos — Shader Storage Buffer Object",
  href: "https://www.khronos.org/opengl/wiki/Shader_Storage_Buffer_Object",
  kind: "OpenGL API",
};
const barrier: LessonReference = {
  label: "Khronos — glMemoryBarrier",
  href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml",
  kind: "OpenGL API",
};
const learning = {
  guides: {
    "p45-l01": {
      focus:
        "Đọc field được cung cấp, thêm chỗ gọi renderer vào cửa sổ starter để hiện orbital đầu tiên.",
      expected:
        "Một field 2p có hai thùy và vùng nút, có nhãn rõ đây là lattice preview chứ chưa phải cloud lấy mẫu.",
      files: [
        "include/atom_catalog.hpp",
        "include/atom_math.hpp",
        "include/atom_app.hpp",
        "shaders/cloud.vert",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Phân biệt thứ đang được quan sát",
          explanation:
            "Catalog mô tả hydrogen một electron, a₀=1; một điểm mẫu về sau không phải một electron riêng. Khung window/GL/camera được cung cấp.",
        },
        {
          title: "Đọc đầu ra của density function",
          explanation:
            "evaluateDensity nhận Orbital và world point, trả density không âm cùng sign của amplitude; density khác sign và khác màu của renderer.",
        },
        {
          title: "Đưa field vào khung 3D",
          explanation:
            "Preview ban đầu hỏi field trên lattice cố định để thấy thùy/node. Giữ cách gọi này tách với sampler ngẫu nhiên được viết ở các bài tiếp theo.",
        },
      ],
    },
    "p45-l02": {
      focus: "Biến một field thành các khối xác suất theo phần tử thể tích đúng.",
      expected:
        "Hai bảng radial/angular có tổng mass hữu hạn, CDF bắt đầu 0/kết thúc 1 và hiển thị R_max/tail/table resolution.",
      files: ["include/atom_sampler.hpp", "include/atom_catalog.hpp", "include/atom_app.hpp"],
      steps: [
        {
          title: "Đưa phần tử thể tích vào trọng số",
          explanation:
            "Radial dùng r²R(r)² dr; angular dùng Y² dmu dphi với mu=cos(theta). Các vùng bằng dr không có cùng thể tích.",
        },
        {
          title: "Chuẩn hóa có kiểm dữ liệu",
          explanation:
            "normalizedCdf từ chối mass âm/NaN hoặc tổng bằng 0, cộng prefix bằng double và lưu CDF float có báo rounding error.",
        },
        {
          title: "Giữ rõ giới hạn approximation",
          explanation:
            "buildTables dùng midpoint trên miền hữu hạn; tail ngoài R_max và sai số bảng là hai đại lượng khác nhau, không được giấu bằng việc chỉ nhìn cloud.",
        },
      ],
    },
    "p45-l03": {
      focus: "Chọn bin theo CDF và tạo vị trí tái lập cho một CPU reference nhỏ.",
      expected:
        "Seed và sample ID xác định cùng vị trí; cloud CPU có histogram phù hợp reference, không phụ thuộc cách chia batch.",
      files: [
        "include/atom_sampler.hpp",
        "include/atom_statistics.hpp",
        "include/atom_app.hpp",
        "include/atom_events.hpp",
      ],
      steps: [
        {
          title: "Gắn số ngẫu nhiên với sample ID",
          explanation:
            "Counter hash nhận index/seed/dimension, tạo u trong khoảng mở (0,1); không dùng thứ tự event hoặc thời gian frame làm seed.",
        },
        {
          title: "Tìm bin rồi chọn vị trí trong bin",
          explanation:
            "invertCdf dùng upper_bound để bỏ bin zero-mass, lấy jitter riêng cho r/mu/phi rồi đổi XYZ; đây là piecewise approximation đã công bố.",
        },
        {
          title: "Kiểm điều mắt thường bỏ sót",
          explanation:
            "Đối chiếu radial CDF/region ở nhiều seed, tách uncertainty lấy mẫu với table/tail tolerance. Bản CPU nhỏ không phải đường sinh triệu points.",
        },
      ],
    },
    "p45-l04": {
      focus: "Để compute shader tự chọn tọa độ và ghi record mà renderer dùng.",
      expected: "Cloud GPU nhỏ có count/bounds/seed đúng và positions không được CPU tạo sẵn.",
      files: [
        "include/atom_gpu.hpp",
        "include/atom_scene.hpp",
        "include/atom_app.hpp",
        "include/atom_verify.hpp",
        "shaders/sample.comp",
        "shaders/density.glsl",
      ],
      steps: [
        {
          title: "Chốt layout trước upload",
          explanation:
            "PointRecord là record std430 32 bytes; CPU chỉ đưa các CDF nhỏ và cấu hình lên GPU, không đưa toàn bộ positions.",
        },
        {
          title: "Mỗi invocation sở hữu một index",
          explanation:
            "Shader dùng cùng counter RNG/CDF và ghi đúng slot. Lane ngoài N phải return; N lẻ không được làm phát sinh points ngoài buffer.",
        },
        {
          title: "Đồng bộ trước khi dùng output",
          explanation:
            "Host gửi dispatch có giới hạn, dùng barrier/fence đúng phạm vi rồi mới đọc summary hoặc vẽ record đã sinh.",
        },
      ],
    },
    "p45-l05": {
      focus: "Nâng lên một triệu samples bằng các batch vẫn có thể Pause hoặc Cancel.",
      expected:
        "Candidate hoàn chỉnh mới thành active; khi hủy/lỗi/thiếu budget, cloud last-good vẫn vẽ đúng nhãn.",
      files: [
        "include/atom_gpu.hpp",
        "include/atom_scene.hpp",
        "include/atom_sampler.hpp",
        "include/atom_app.hpp",
      ],
      steps: [
        {
          title: "Tính bytes trước cấp phát",
          explanation:
            "Requested N, record size, tables và các cloud sống đồng thời cùng tham gia budget; kiểm phép nhân trước tạo buffer.",
        },
        {
          title: "Tiến job qua từng batch",
          explanation:
            "GpuCloud::tick xử lý một bước hữu hạn, báo progress và poll fence; không khóa event loop bằng một vòng chờ hoàn tất cả triệu points.",
        },
        {
          title: "Công bố kết quả như một giao dịch",
          explanation:
            "Giữ cấu hình candidate riêng, đối chiếu generated/accepted/invalid trước publish. Cancel không đổi tên cloud cũ thành orbital chưa sinh xong.",
        },
      ],
    },
    "p45-l06": {
      focus: "Làm các thùy và node đọc được mà không đổi phân bố mẫu.",
      expected:
        "Point splat có chiều sâu và điều chỉnh palette/opacity/size; legend nói rõ transfer function của ảnh.",
      files: [
        "include/atom_render.hpp",
        "include/atom_app.hpp",
        "include/atom_events.hpp",
        "shaders/cloud.vert",
        "shaders/cloud.frag",
        "shaders/tone.frag",
      ],
      steps: [
        {
          title: "Vẽ trực tiếp record GPU",
          explanation:
            "Renderer đọc buffer đã được publish; đổi opacity/size không gọi lại sampler hoặc sửa density catalog.",
        },
        {
          title: "Kiểm soát sự chồng sáng",
          explanation:
            "Tổ chức splat và phép cộng/tonemap để tránh biến cả cloud thành khối trắng; mỗi lựa chọn là phép hiển thị, không phải thay xác suất.",
        },
        {
          title: "Đặt thước đọc bên cạnh màu",
          explanation:
            "Công bố density/brightness mapping và N. Sign palette nếu dùng mô tả sign amplitude, không phải điện tích của từng điểm.",
        },
      ],
    },
    "p45-l07": {
      focus: "Tách thao tác quan sát khỏi yêu cầu sinh cloud mới.",
      expected:
        "Camera đi vào/ra, clip plane di chuyển còn sample generation và density model giữ nguyên.",
      files: [
        "include/atom_camera.hpp",
        "include/atom_controls.hpp",
        "include/atom_events.hpp",
        "include/atom_app.hpp",
        "include/atom_render.hpp",
        "shaders/cloud.vert",
      ],
      steps: [
        {
          title: "Một chủ sở hữu cho thao tác kéo",
          explanation:
            "Phân biệt orbit/pan và điều khiển probe/clip, giữ một pointer owner; blur/reset không nối input cũ sang thao tác khác.",
        },
        {
          title: "Cắt theo world coordinates",
          explanation:
            "Clip plane chọn một nửa không gian theo cùng đơn vị a₀; không lấy tọa độ pixel làm độ sâu vật lý.",
        },
        {
          title: "Giữ dữ liệu khi chỉ đổi view",
          explanation:
            "Camera/clip chỉ thay tham số nhìn hoặc đo, không rebuild CDF hay tăng generation của cloud.",
        },
      ],
    },
    "p45-l08": {
      focus: "Đo số điểm trong vùng và hiểu tại sao ảnh không phải phép đo xác suất.",
      expected:
        "Region/histogram đọc đúng cloud/config; tỷ lệ có mẫu số N toàn cloud, reference và uncertainty được ghi riêng.",
      files: [
        "include/atom_statistics.hpp",
        "include/atom_probe.hpp",
        "include/atom_app.hpp",
        "include/atom_events.hpp",
        "shaders/probe.comp",
      ],
      steps: [
        {
          title: "Chốt câu hỏi trước phép đếm",
          explanation:
            "Một vùng sphere hoặc một radial bin cần vị trí/đơn vị/biên rõ; numerator và denominator phải thuộc cùng cloud được publish.",
        },
        {
          title: "Tách dữ liệu đo khỏi ảnh",
          explanation:
            "Probe shader duyệt record thực, đếm region/histogram và phần clip. Thay brightness không đổi số đếm, clipping không chuẩn hóa lại tổng hệ.",
        },
        {
          title: "Đọc sai lệch có ngữ cảnh",
          explanation:
            "Đặt nhiều seed cạnh reference; uncertainty binomial không bao trùm mọi table/tail bias. Uniform-volume và affine-mu là field test, không phải orbital mới.",
        },
      ],
    },
    "p45-l09": {
      focus: "So hai hình mà không thay đổi đơn vị hoặc giấu chi phí cloud thứ hai.",
      expected:
        "Hai pane có orbital/seed/N đúng, cùng world scale và budget tổng được kiểm trước candidate.",
      files: [
        "include/atom_app.hpp",
        "include/atom_events.hpp",
        "include/atom_options.hpp",
        "include/atom_render.hpp",
        "include/atom_scene.hpp",
      ],
      steps: [
        {
          title: "Giữ hai cấu hình độc lập",
          explanation:
            "Cloud trái/phải có buffer và nhãn của chính nó; đổi một bên không sửa nhầm bên còn lại hoặc vẽ lại một buffer dưới tên mới.",
        },
        {
          title: "So trên cùng thang",
          explanation:
            "Camera và đơn vị a₀ dùng chung. Nếu chọn auto-fit, nhãn phải nói rõ vì hình có thể trông lớn bằng nhau dù bán kính đặc trưng khác.",
        },
        {
          title: "Tính cả lúc chuyển đổi",
          explanation:
            "Budget phải kể active và candidate của các pane đang sống; từ chối một pane mới vẫn giữ được cặp kết quả hợp lệ trước đó.",
        },
      ],
    },
    "p45-l10": {
      focus: "Lưu điều kiện thí nghiệm nhỏ, không lưu cloud khổng lồ để né sampler.",
      expected:
        "Mở cấu hình hợp lệ/reset tái lập đúng seed, cấu hình lỗi không handoff hoặc làm mất last-good.",
      files: ["include/atom_config.hpp", "include/atom_events.hpp", "include/atom_app.hpp"],
      steps: [
        {
          title: "Chọn dữ liệu thực sự cần lưu",
          explanation:
            "Orbital/N/seed/table/domain và view cần ghi rõ version/giới hạn. Positions có thể được sinh lại, không cần nhét cả triệu record vào file cấu hình.",
        },
        {
          title: "Kiểm toàn bộ trước khi áp dụng",
          explanation:
            "Đọc candidate, từ chối giá trị ngoài catalog/budget, NaN và dữ liệu thừa/thiếu; không sửa từng phần model đang hiển thị rồi mới phát hiện lỗi.",
        },
        {
          title: "Giữ nghĩa Reset và reduced-motion",
          explanation:
            "Reset dùng đúng cấu hình/seed đã chọn, không chọn seed mới âm thầm. Cloud có thể tĩnh; không cần thêm chuyển động giả để gọi là simulation.",
        },
      ],
    },
    "p45-l11": {
      focus: "Nối sản phẩm cuối với các bằng chứng đúng phạm vi.",
      expected:
        "Ứng dụng một triệu mẫu có đủ controls/measurement/comparison và bộ kiểm hữu hạn; không chỉ console hoặc một screenshot đẹp.",
      files: [
        "src/main.cpp",
        "include/atom_app.hpp",
        "include/atom_events.hpp",
        "include/atom_verify.hpp",
        "include/atom_report.hpp",
        "include/atom_gpu.hpp",
        "include/atom_evaluate.hpp",
        "shaders/evaluate.comp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Kiểm mô hình và sampler độc lập",
          explanation:
            "Closed-form density/nodes, known-volume fixtures, seed/RNG và nhiều-seed region/histogram có oracle không đi lại đúng thuật toán đang được kiểm.",
        },
        {
          title: "Kiểm quy mô và lifecycle thật",
          explanation:
            "N=1.000.000 và N lẻ được sinh/vẽ trên GPU; counters, canary/bounds, cancel/last-good và memory có bằng chứng riêng. Năm triệu chỉ là mở rộng khi đã kiểm.",
        },
        {
          title: "Đo rồi trình bày giới hạn",
          explanation:
            "Benchmark Release dùng cùng đầu vào, warm-up, raw trials, median/p95. Pass evaluate riêng gồm đọc record, đánh giá field, so sánh và atomics; sample đã có field evaluation bên trong nên không cộng các số đó thành tổng frame hoặc gọi enqueue time là kernel time.",
        },
      ],
    },
  },
  references: {
    "p45-l01": [
      term("atom-density", "Density không phải một electron"),
      term("atom-real-basis", "Real orbital và vùng nút"),
    ],
    "p45-l02": [
      term("atom-volume-measure", "Phần tử thể tích"),
      term("atom-tail-domain", "Miền hữu hạn và tail"),
    ],
    "p45-l03": [
      term("atom-cdf", "PDF/CDF và bin zero-mass"),
      term("atom-counter-rng", "Counter RNG và seed"),
    ],
    "p45-l04": [storage, barrier, term("atom-gpu-generation", "GPU generation và counters")],
    "p45-l05": [
      term("atom-candidate", "Candidate và last-good"),
      term("atom-gpu-generation", "GPU generation và counters"),
    ],
    "p45-l06": [term("atom-transfer-function", "Transfer function của cloud")],
    "p45-l07": [term("atom-clip-probability", "Clipping khác normalization")],
    "p45-l08": [
      term("atom-region-estimate", "Tỷ lệ và uncertainty"),
      term("atom-table-error", "Sampling error khác table error"),
    ],
    "p45-l09": [
      term("atom-common-scale", "Comparison cùng thang"),
      term("atom-candidate", "Budget của active/candidate"),
    ],
    "p45-l10": [
      term("atom-counter-rng", "Seed tái lập"),
      term("atom-candidate", "Kiểm candidate trước handoff"),
    ],
    "p45-l11": [
      barrier,
      term("atom-table-error", "Các nguồn sai số"),
      term("atom-gpu-generation", "Counters thực"),
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
