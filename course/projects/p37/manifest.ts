import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 06 — phép cộng, phép trừ, nhân scalar và cách đọc từng thành phần của vector",
    "Project 32 — workload một triệu phần tử, memory layout, checksum và benchmark hữu hạn",
    "Project 33 — SDL3 tạo OpenGL context, shader compile/link và GPU resource lifetime",
    "Project 35 — shader file, diagnostics và nguyên tắc giữ chương trình last-good",
  ],
  summary:
    "Xây một máy tính vector bằng OpenGL compute shader. Hai buffer đầu vào chứa hơn một triệu vec4; GPU thực hiện Add, AXPY hoặc Difference rồi ghi kết quả vào SSBO thứ ba. Bản tính đối chiếu trên CPU, kiểm tra giới hạn mảng, memory barrier và timer query sẽ giúp bạn trả lời hai câu hỏi riêng biệt: kết quả có đúng không, và GPU thực sự mất bao lâu để tính.",
  challenge: {
    timebox: "900–1.180 phút",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3/OpenGL 4.3 nhận hai mảng vector A và B, thực hiện phép toán element-wise trên hơn một triệu phần tử bằng compute shader rồi kiểm kết quả với cùng phép toán chạy trên CPU.",
    outcome:
      "Một cửa sổ hiển thị một số cột được đọc từ output buffer. Phím 1/2/3 chọn Add, AXPY hoặc Difference; [/] đổi số phần tử; -/= đổi scalar; B chạy một lượt benchmark có giới hạn. Thanh tiêu đề cho biết số phần tử, local size, số workgroup, thời gian GPU, sai số lớn nhất và kết quả kiểm tra.",
    requirements: [
      "Starter tạo SDL window cùng OpenGL 4.3 Core context và báo lỗi rõ nếu máy không hỗ trợ compute shader.",
      "Dữ liệu đầu vào phải tái lập được từ seed. Một bản tính đối chiếu trên CPU (CPU oracle) được viết tách khỏi phần dispatch; bản hoàn chỉnh mặc định xử lý 1.000.003 vec4 để luôn có workgroup cuối không đầy.",
      "Kiểu C++ truyền vào SSBO có alignment/stride 16 byte, khớp một mảng vec4 trong layout std430.",
      "Ba SSBO giữ input A, input B và output; binding 0/1/2 trong C++ phải khớp shader source.",
      "Checkpoint compute đầu tiên chạy đúng một workgroup 256 invocations trước khi mở rộng lên toàn bộ dữ liệu.",
      "Số workgroup dùng ceil division; shader kiểm gl_GlobalInvocationID.x trước mọi lần đọc hoặc ghi buffer.",
      "Sau dispatch, glMemoryBarrier phải dùng bit phù hợp với bước đọc tiếp theo là buffer readback; hãy chọn barrier theo cách dữ liệu sắp được dùng.",
      "Kết quả GPU được so với bản CPU bằng sai số tuyệt đối/tương đối; báo cáo phải nêu số phần tử sai, sai số lớn nhất và vị trí xuất hiện NaN/Inf.",
      "GPU timing dùng GL_TIME_ELAPSED query; upload, readback, vẽ UI và title update không nằm trong vùng đo compute kernel.",
      "Benchmark có warm-up, số lần lặp hữu hạn, median và checksum/output validation cạnh timing.",
      "Kèm starter, chín checkpoint độc lập, final có comment, compute shader, README và CTest thuần CPU.",
    ],
    constraints: [
      "Không dùng CUDA, OpenCL, Vulkan, WebGPU, WebGL hoặc thư viện compute có sẵn.",
      "Không dùng dot-product/reduction toàn mảng; Project 39 sẽ xử lý giao tiếp giữa các workgroup.",
      "Không giả sử số phần tử chia hết cho local size; shader phải kiểm tra index trước khi đọc hoặc ghi buffer.",
      "Không dùng vec3 làm phần tử mảng chia sẻ CPU–GPU; project cố ý dùng vec4 để stride hiển nhiên là 16 byte.",
      "Không dùng glFinish hoặc FPS để thay timer query cho kernel.",
      "Không đưa upload/readback vào số đo rồi gọi đó là compute time; nếu đo end-to-end phải ghi nhãn riêng.",
      "Không coi vài cột trông có vẻ hợp lý là bằng chứng chương trình đúng; phải so toàn bộ kết quả với bản CPU và báo rõ lỗi nằm ở đâu.",
      "Không chạy benchmark vô hạn hoặc cho app có window vào CTest.",
    ],
    definitionOfDone: [
      "Ứng dụng kiểm được OpenGL 4.3, maximum local size/invocations, maximum workgroup count và SSBO capacity trước khi cấp phát.",
      "sizeof(Vec4) và alignof(Vec4) đều là 16; binding 0/1/2 khớp ba shader storage blocks.",
      "Với 256 phần tử, một workgroup ghi đúng toàn bộ output.",
      "Với 1.000.003 phần tử và local size 256, dispatch tạo 3.907 workgroups, 189 invocations dư bị bounds guard loại bỏ.",
      "Readback sau GL_BUFFER_UPDATE_BARRIER_BIT cho output hữu hạn và không còn sentinel ở phần tử hợp lệ.",
      "Add, AXPY và Difference khớp CPU oracle trong tolerance; report nêu maximum error và mismatch count.",
      "Timer query chỉ bao quanh glDispatchCompute; benchmark có warm-up, chín mẫu và median.",
      "Benchmark submit nhiều nhất một sample mỗi frame, đọc result qua availability gate, có thể hủy và tự dừng sau 10 giây.",
      "Các cột mẫu trong cửa sổ đọc từ output thật sau readback, không dựng lại bằng công thức CPU ở final.",
      "Resize/high-DPI không làm sai viewport; reset tái lập preset; input không làm chạy compute mỗi frame vô ích.",
      "Canvas có pause/reset, pointer capture, keyboard, DPR, reduced motion và nói rõ đây là mô hình Canvas 2D chứ không phải GPU benchmark.",
      "Starter, chín checkpoint, final build ở Debug/Release; CTest, Canvas tests và website build đều đạt trong timeout hữu hạn.",
    ],
  },
  duration: "25–32 giờ",
  objectives: [
    "Hiểu compute dispatch như một lưới workgroup và invocation, trong đó mỗi invocation có index toàn cục và phần đuôi cần được kiểm tra",
    "Biết nối CPU với SSBO một cách rõ ràng: layout, binding, đồng bộ, readback và sai số cho phép",
    "Phân biệt độ đúng, thời gian chạy compute shader và thời gian của toàn bộ quy trình để không đọc sai kết quả benchmark",
  ],
  lessons: [
    {
      id: "p37-l01",
      slug: "01-khoa-workload-va-cpu-oracle",
      title: "Chốt phép tính và viết bản đối chiếu CPU",
      summary:
        "Định nghĩa Vec4, ba phép toán element-wise, dữ liệu deterministic và baseline CPU trước khi GPU được phép trở thành nguồn kết quả.",
      order: 1,
      estimatedMinutes: 125,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l02",
      slug: "02-yeu-cau-opengl-43-va-doc-compute-limits",
      title: "Kiểm tra OpenGL 4.3 và giới hạn compute",
      summary:
        "Tạo context đúng phiên bản, nạp entry points và kiểm local size, invocation count, workgroup count cùng SSBO capacity trước cấp phát.",
      order: 2,
      estimatedMinutes: 120,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l03",
      slug: "03-dong-goi-vec4-vao-ssbo-std430",
      title: "Đưa mảng vec4 vào SSBO với std430",
      summary:
        "Nối một Vec4 16 byte ở C++ với mảng vec4 std430 trong GLSL, tạo ba buffer và khóa binding 0/1/2.",
      order: 3,
      estimatedMinutes: 145,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l04",
      slug: "04-compute-shader-dau-tien-mot-workgroup",
      title: "Compute shader đầu tiên với một workgroup",
      summary:
        "Compile một compute shader local_size_x=256, dispatch đúng một group và theo dõi local/global invocation IDs trên 256 phần tử đầu.",
      order: 4,
      estimatedMinutes: 145,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l05",
      slug: "05-dispatch-hon-mot-trieu-vector",
      title: "Chạy phép tính trên hơn một triệu vector",
      summary:
        "Dùng ceil division để tạo 3.907 workgroups và thêm bounds guard cho 189 invocation nằm ngoài 1.000.003 phần tử hợp lệ.",
      order: 5,
      estimatedMinutes: 135,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l06",
      slug: "06-memory-barrier-va-readback",
      title: "Đồng bộ rồi đọc kết quả về CPU",
      summary:
        "Chọn barrier theo consumer kế tiếp, tải output về CPU rồi biến sentinel, stale data và wrong barrier thành lỗi có thể quan sát.",
      order: 6,
      estimatedMinutes: 145,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l07",
      slug: "07-doi-chieu-cpu-gpu",
      title: "Kiểm tra toàn bộ kết quả CPU–GPU",
      summary:
        "So mọi thành phần bằng mixed tolerance, chặn NaN/Inf và báo maximum error, mismatch count cùng phần tử lỗi đầu tiên.",
      order: 7,
      estimatedMinutes: 135,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l08",
      slug: "08-do-thoi-gian-gpu-dung-cach",
      title: "Đo thời gian GPU đúng cách",
      summary:
        "Đặt GL_TIME_ELAPSED quanh dispatch, warm-up trước khi đo, lấy chín mẫu hữu hạn và đọc median cạnh validation.",
      order: 8,
      estimatedMinutes: 145,
      demoId: "million-vector-gpu",
    },
    {
      id: "p37-l09",
      slug: "09-hoan-thien-may-tinh-vector-gpu",
      title: "Hoàn thiện máy tính vector GPU",
      summary:
        "Ghép ba operation, scale/count controls, output bars, named validation, resource cleanup và source hoàn chỉnh trước particle GPU ở Project 38.",
      order: 9,
      estimatedMinutes: 155,
      demoId: "million-vector-gpu",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
