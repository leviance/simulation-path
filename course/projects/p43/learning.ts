import type { LessonReference, ProjectLearningAssets } from "../../learning/types";
function term(id: string, label: string): LessonReference {
  return { label, href: "/glossary#" + id, kind: "Thuật ngữ" };
}
const learning = {
  guides: {
    "p43-l01": {
      focus: "Nối phép lặp vào pixel của một mặt cắt đang chạy.",
      expected: "Preview 120×68 thay đổi theo power; chưa phải ảnh 3D cuối.",
      files: [
        "shaders/bulb.comp",
        "include/bulb_field.hpp",
        "include/bulb_app.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Định nghĩa mapping có guard",
          explanation: "Giữ cực Z, xử lý r=0/near-axis rồi nhân bán kính và góc.",
        },
        {
          title: "Gọi recurrence tại c cố định",
          explanation:
            "Từ uv dựng c trên lát cắt, dùng state/số vòng để tô màu; main vẫn poll SDL.",
        },
      ],
    },
    "p43-l02": {
      focus: "Thay cách chọn điểm: một ray 3D cho mỗi pixel.",
      expected: "Có đường bao khối bằng fixed steps, phân biệt miss/budget/invalid.",
      files: ["include/bulb_camera.hpp", "shaders/bulb.comp", "include/bulb_trace.hpp"],
      steps: [
        {
          title: "Dựng ray và chặn đoạn",
          explanation: "Chuẩn hóa hướng, aspect 16:9, cắt sphere R=2 và far bound.",
        },
        {
          title: "Đi bước đều trước",
          explanation: "Hỏi field trong vòng ray, trả state hữu hạn rồi nối trace vào màu ảnh.",
        },
      ],
    },
    "p43-l03": {
      focus: "Chọn bước theo DE nhưng không gọi nó là exact SDF.",
      expected: "Derivative/DE đi cùng recurrence, có epsilon shell và không che invalid.",
      files: ["shaders/bulb.comp", "include/bulb_field.hpp", "include/bulb_trace.hpp"],
      steps: [
        {
          title: "Dùng cùng radius cho z và dr",
          explanation: "Chỉ log/divide ở nhánh escaped, kiểm finite và derivative dương.",
        },
        {
          title: "Sửa vòng march đang dùng",
          explanation:
            "Safety, clamp bước và tám lần chia đôi hữu hạn; giữ điểm shading phía ngoài.",
        },
      ],
    },
    "p43-l04": {
      focus: "Từ giao điểm lấy normal và làm hiện chiều sâu.",
      expected: "Normals có bước H riêng; fallback/invalid được đếm chứ không che.",
      files: ["shaders/bulb.comp"],
      steps: [
        {
          title: "Sáu probe quanh p",
          explanation: "Central differences rồi normalize, có fallback cho gradient phẳng.",
        },
        {
          title: "Gọi lighting sau trace",
          explanation:
            "Light world-space, không sửa geometry theo góc nhìn; orbit work gồm các probe phụ.",
        },
      ],
    },
    "p43-l05": {
      focus: "Nối các helper camera vào input thật.",
      expected: "Chuột/phím orbit–pan–dolly, capture được nhả và inside có chính sách rõ.",
      files: ["include/bulb_app.hpp", "include/bulb_camera.hpp", "shaders/bulb.comp"],
      steps: [
        {
          title: "Input tạo snapshot mới",
          explanation:
            "Delta chuột gọi đúng helper rồi request; camera không làm phép lặp đổi trục.",
        },
        {
          title: "Không kẹt ở trong hoặc ngoài viewport",
          explanation: "Focus/mouse-up nhả capture, có IJKL/PgUp/Dn và giới hạn camera hữu hạn.",
        },
      ],
    },
    "p43-l06": {
      focus: "Kiểm kết quả và công việc bằng các đường riêng.",
      expected: "GPU field probes khớp orbit ổn định; heatmap/counters/timings có nghĩa rõ.",
      files: [
        "include/bulb_reference.hpp",
        "include/bulb_gpu_probe.hpp",
        "include/bulb_verify.hpp",
        "include/bulb_gpu.hpp",
        "shaders/bulb.comp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Đếm nơi thực sự chạy",
          explanation: "Ray steps khác orbit bodies, kể cả normal và các probe phụ.",
        },
        {
          title: "Oracle không gọi lại hàm chính",
          explanation:
            "Nhân số phức độc lập, probe cùng GLSL và phân biệt tolerance số học với sai số ray.",
        },
        {
          title: "Đọc query muộn",
          explanation:
            "Fence/query-ready trước readback; CPU submit không được gắn nhãn kernel time.",
        },
      ],
    },
    "p43-l07": {
      focus: "Tăng độ phân giải mà không giữ UI trong render cả ảnh.",
      expected: "Preview 120×68→final 960×540, tile không trộn generation và có Cancel.",
      files: [
        "include/bulb_jobs.hpp",
        "include/bulb_gpu.hpp",
        "include/bulb_app.hpp",
        "shaders/display.frag",
      ],
      steps: [
        {
          title: "Chốt preview trước",
          explanation:
            "Ping-pong, chỉ công bố yêu cầu mới nhất khi buffer đủ; giữ nhãn ACTIVE cũ trong lúc chờ.",
        },
        {
          title: "Refine đúng ảnh",
          explanation:
            "Tile mép đúng kích thước; pixel kiểm generation, chỉ một finite dispatch đang chờ.",
        },
      ],
    },
    "p43-l08": {
      focus: "Đổi cách trình bày mà không làm sai dữ liệu hoặc phép đo.",
      expected: "AO/shadow hữu hạn, bốn sample là bốn ray thật và COMPLETE đúng số mẫu.",
      files: ["shaders/bulb.comp", "include/bulb_app.hpp", "include/bulb_gpu.hpp"],
      steps: [
        {
          title: "Cộng chi phí của hiệu ứng",
          explanation: "Trap là màu đồ họa; AO/shadow cũng tăng orbit-work counters.",
        },
        {
          title: "Tích lũy trước encode",
          explanation:
            "Sample center hoặc bốn vị trí ¼/¾, trung bình linear RGB rồi tone-map/gamma.",
        },
      ],
    },
    "p43-l09": {
      focus: "Bàn giao ứng dụng đầy đủ với bằng chứng đúng phạm vi.",
      expected: "Toàn pixel đúng generation/count/work; ray oracle, export và source độc lập.",
      files: [
        "include/bulb_verify.hpp",
        "include/bulb_export.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Đọc toàn buffer theo chunk",
          explanation: "Finite color/normal/canary và counters khớp; AA không suy hit từ OR mask.",
        },
        {
          title: "Kiểm ray và xuất đúng ảnh",
          explanation:
            "Uniform scanner độc lập, công bố giới hạn; export từ chối incomplete/slice/overwrite.",
        },
        {
          title: "Build tất cả trước bàn giao",
          explanation:
            "Debug/Release, starter/checkpoints/final và gói ZIP độc lập; phân biệt kiểm native, web và package.",
        },
      ],
    },
  },
  references: {
    "p43-l01": [term("bulb-spherical-map", "Spherical-power recurrence")],
    "p43-l02": [term("bulb-ray-bounds", "Ray và vùng khảo sát")],
    "p43-l03": [term("bulb-distance-estimator", "DE và epsilon shell")],
    "p43-l04": [term("bulb-field-normal", "Normal từ sai phân field")],
    "p43-l05": [term("bulb-camera-inside", "Camera và trạng thái inside")],
    "p43-l06": [term("bulb-work-oracle", "Work, oracle và GPU timing")],
    "p43-l07": [term("bulb-image-generation", "Generation và progressive refinement")],
    "p43-l08": [term("bulb-progressive-sampling", "Subpixel accumulation và trap")],
    "p43-l09": [
      term("bulb-precision-policy", "Precision và phạm vi kiểm chứng"),
      term("bulb-work-oracle", "Oracle độc lập"),
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
