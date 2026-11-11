import type { LessonReference, ProjectLearningAssets } from "../../learning/types";
function term(id: string, label: string): LessonReference {
  return { label, href: "/glossary#" + id, kind: "Thuật ngữ" };
}
const learning = {
  guides: {
    "p42-l01": {
      focus: "Nối hai bộ điểm vào cửa sổ đã có.",
      expected: "127/2.048 điểm có thể đi tới nguồn và đích; đây còn là sampling thiên lệch.",
      files: [
        "include/morph_timeline.hpp",
        "include/morph_preparation.hpp",
        "include/morph_app.hpp",
        "include/morph_renderer.hpp",
      ],
      steps: [
        {
          title: "Đọc hai vị trí cùng ID",
          explanation: "Giữ nguồn/đích riêng, tính CURRENT theo t.",
        },
        {
          title: "Nối vào frame",
          explanation: "advance xử lý dữ liệu, draw upload bản CPU và gọi DrawArrays.",
        },
      ],
    },
    "p42-l02": {
      focus: "Thay quy tắc chọn tam giác, không đổi renderer.",
      expected: "Tam giác diện tích 4 nhận xấp xỉ bốn lần mẫu so với diện tích 1.",
      files: ["include/surface_sampler.hpp", "tests/tests.cpp"],
      steps: [
        { title: "Lập phân bố diện tích", explanation: "Bỏ mặt suy biến, cộng CDF bằng double." },
        {
          title: "Đặt điểm bên trong mặt",
          explanation: "Dùng sqrt(u) rồi nhân ba vị trí với ba trọng số.",
        },
      ],
    },
    "p42-l03": {
      focus: "Tách ID, RNG và số liệu mật độ khỏi hình đang vẽ.",
      expected: "Cùng seed/config tái lập; area và triangle-biased khác histogram.",
      files: ["include/morph_math.hpp", "include/morph_preparation.hpp", "include/morph_panel.hpp"],
      steps: [
        {
          title: "Cố định thứ tự lấy số",
          explanation: "Tách RNG nguồn/đích, không rải lại mỗi frame.",
        },
        {
          title: "So đúng mẫu với đúng diện tích",
          explanation: "Gom tam giác theo tâm mặt; tính observed/expected của nhóm.",
        },
      ],
    },
    "p42-l04": {
      focus: "Dựng hai permutation, không thay bộ mẫu.",
      expected: "Mỗi target ID dùng một lần; A/B thay đường đi ở giữa.",
      files: ["include/spatial_order.hpp", "include/morph_preparation.hpp"],
      steps: [
        {
          title: "Xáo random không lặp ID",
          explanation: "Fisher–Yates chỉ đổi chỗ các target ID.",
        },
        {
          title: "Xếp nguồn và đích theo ô Morton",
          explanation:
            "Đếm/prefix/scatter ổn định, rồi ghép cùng hạng; đây không phải optimal transport.",
        },
      ],
    },
    "p42-l05": {
      focus: "Dùng thời gian tích lũy và nhánh endpoints rõ ràng.",
      expected: "Pause giữ t; reverse/loop không phụ thuộc số frame.",
      files: ["include/morph_timeline.hpp", "include/morph_app.hpp"],
      steps: [
        {
          title: "Tách time khỏi normalized t",
          explanation: "t bằng time/duration, không tăng một lượng cố định mỗi frame.",
        },
        {
          title: "Thêm nhịp và vòng cung",
          explanation:
            "Smoothstep đổi nhịp; offset liên tục đổi đường, sin(pi s) triệt tiêu ở hai đầu.",
        },
        {
          title: "Flow cho từng ID, không kéo cả mảng",
          explanation:
            "Hash cố định tạo nhịp/độ lệch riêng; sin²(pi s) triệt tiêu độ lệch và đạo hàm ở endpoints. Không lấy random theo frame.",
        },
      ],
    },
    "p42-l06": {
      focus: "Cấp candidate SSBO có preflight, chưa dùng compute để cập nhật.",
      expected:
        "Checkpoint 6 vẫn tính CURRENT trên CPU và công bố điều đó; vertex shader đọc SSBO.",
      files: ["include/morph_gpu.hpp", "shaders/particles.vert", "include/morph_settings.hpp"],
      steps: [
        {
          title: "Tính peak khi hai thế hệ cùng tồn tại",
          explanation: "Kể source/target/current/path/mapping và canary, không chỉ một buffer.",
        },
        {
          title: "Upload theo phần rồi đổi ACTIVE",
          explanation: "Kiểm byte lưu thực tế, không phá buffers cũ khi cấp phát thất bại.",
        },
      ],
    },
    "p42-l07": {
      focus: "Chuyển phép cập nhật, không chỉ chuyển chỗ lưu.",
      expected:
        "Compute ghi từng CURRENT[id], renderer dùng lại đúng SSBO; N lẻ không chạm canary.",
      files: ["shaders/morph_update.comp", "include/morph_gpu.hpp", "shaders/particles.vert"],
      steps: [
        { title: "Một invocation cho một ID", explanation: "Ceil nhóm 256 và return ở id>=N." },
        {
          title: "Nói rõ consumer của barrier",
          explanation: "Vertex shader đọc storage buffer nên dùng SHADER_STORAGE_BARRIER_BIT.",
        },
      ],
    },
    "p42-l08": {
      focus: "Giữ cửa sổ phản hồi trong cả preparation và upload.",
      expected: "Đổi/cancel/invalid giữ last-good và đúng nhãn source/target/generation.",
      files: ["include/morph_preparation.hpp", "include/morph_gpu.hpp", "include/morph_app.hpp"],
      steps: [
        {
          title: "Chia pass biến thiên theo N",
          explanation: "Mỗi batch có giới hạn, job có deadline; yêu cầu mới thay yêu cầu cũ.",
        },
        {
          title: "Chốt CPU và GPU cùng thế hệ",
          explanation: "Chỉ accept sau khi tất cả buffers đã tải xong.",
        },
      ],
    },
    "p42-l09": {
      focus: "Dùng inspector và timings để trả lời câu hỏi cụ thể.",
      expected:
        "32 đường đi native tối đa, histogram có expected/observed; query chưa có kết quả không bị gọi là 0 ms.",
      files: ["include/morph_renderer.hpp", "include/morph_timing.hpp", "include/morph_panel.hpp"],
      steps: [
        {
          title: "Vẽ subset có công bố",
          explanation: "Đường hướng dẫn không đại diện cho số hạt thật đang vẽ.",
        },
        {
          title: "Đọc query muộn",
          explanation: "Tách sampling/matching CPU, submit upload, last update GPU, draw và frame.",
        },
      ],
    },
    "p42-l10": {
      focus: "Chạy trọn sản phẩm, đối chiếu scale và gói source.",
      expected: "N=1.000.003 được update/draw thật; 32 tổ hợp khớp CPU, tail còn nguyên.",
      files: [
        "src/main.cpp",
        "include/morph_verify.hpp",
        "include/morph_gpu.hpp",
        "include/morph_settings.hpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Kiểm toàn state trong job riêng",
          explanation: "Readback chia batch, có fence/deadline; không đọc cả buffer mỗi frame.",
        },
        {
          title: "Bàn giao và ghi đúng phạm vi",
          explanation:
            "Build starter/checkpoints/final; công bố giới hạn GPU và những thao tác đã/chưa kiểm.",
        },
      ],
    },
  },
  references: {
    "p42-l01": [term("morph-model-time", "Model time và nội suy")],
    "p42-l02": [
      term("morph-area-cdf", "Area-weighted CDF"),
      term("morph-barycentric", "Barycentric sampling"),
    ],
    "p42-l03": [term("morph-density", "Mật độ theo nhóm tam giác")],
    "p42-l04": [
      term("morph-correspondence", "Correspondence song ánh"),
      term("morph-spatial-order", "Spatial order"),
    ],
    "p42-l05": [term("morph-model-time", "Model time và easing")],
    "p42-l06": [term("morph-buffer-plan", "Payload và peak memory")],
    "p42-l07": [term("morph-tail-guard", "Tail guard và canary")],
    "p42-l08": [term("morph-generation", "Candidate và last-good")],
    "p42-l09": [term("morph-timings", "Timings theo công việc")],
    "p42-l10": [
      term("morph-tail-guard", "Kiểm GPU toàn bộ"),
      term("morph-buffer-plan", "Giới hạn tài nguyên"),
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
