export const gpuGlossaryTerms = [
  {
    id: "opengl-context",
    term: "OpenGL context",
    definition:
      "Đối tượng chứa state và resources của một phiên OpenGL. Project 33 tạo context từ SDL window, làm nó current rồi mới load function pointers hoặc tạo shader/buffer/texture.",
  },
  {
    id: "opengl-core-profile",
    term: "OpenGL Core Profile",
    definition:
      "Profile chỉ giữ pipeline hiện đại của OpenGL và loại các API fixed-function cũ như glBegin/glEnd. Project 33 yêu cầu OpenGL 3.3 Core để vertex data phải đi qua VBO, VAO và shader program rõ ràng.",
  },
  {
    id: "shader-program",
    term: "Shader program",
    definition:
      "Executable GPU được tạo bằng cách compile từng shader stage rồi link chúng thành một program. Compile status bắt lỗi trong mỗi source; link status bắt interface không khớp giữa vertex và fragment shader.",
  },
  {
    id: "vertex-shader",
    term: "Vertex shader",
    definition:
      "Shader chạy một lần cho mỗi input vertex. Trong Project 33, nó đọc position/color từ VAO, áp dụng rotate → scale → translate và ghi clip-space position vào gl_Position.",
  },
  {
    id: "fragment-shader",
    term: "Fragment shader",
    definition:
      "Shader chạy cho các fragments do rasterizer tạo. Nó nhận color đã được nội suy từ vertex shader và ghi màu cuối trước khi framebuffer quantize thành RGBA8.",
  },
  {
    id: "vertex-buffer-object",
    term: "Vertex Buffer Object — VBO",
    definition:
      "Buffer OpenGL giữ bytes của vertex data. VBO không tự biết byte nào là position hay color; cách diễn giải đó được khai báo trong Vertex Array Object.",
  },
  {
    id: "vertex-array-object",
    term: "Vertex Array Object — VAO",
    definition:
      "OpenGL object ghi nhớ vertex attribute bindings: location, component count, type, stride, offset và buffer liên quan. Core Profile yêu cầu một VAO hợp lệ khi vẽ vertex arrays.",
  },
  {
    id: "texture-upload",
    term: "Texture upload",
    definition:
      "Bước chuyển texel bytes từ CPU memory sang OpenGL texture storage. Project 33 upload framebuffer CPU bằng glTexSubImage2D để trình bày ở panel trái; rasterization vẫn là công việc CPU đã hoàn thành trước đó.",
  },
  {
    id: "gpu-readback",
    term: "GPU readback",
    definition:
      "Bước chép kết quả từ GPU framebuffer về CPU, chẳng hạn bằng glReadPixels. Readback có thể buộc hai processor đồng bộ nên Project 33 chỉ dùng cho probe report hữu hạn, không gọi vô điều kiện mỗi frame.",
  },
  {
    id: "renderer-backend",
    term: "Renderer backend",
    definition:
      "Một implementation nhận cùng scene/mesh contract nhưng thực hiện render bằng con đường khác. Project 34 có CPU rasterizer và OpenGL GPU backend; F1/F2 chỉ đổi backend chứ không tạo một scene thứ hai.",
  },
  {
    id: "element-buffer-object",
    term: "Element Buffer Object — EBO",
    definition:
      "OpenGL buffer giữ vertex indices cho indexed draw. Khi VAO đang bound, binding GL_ELEMENT_ARRAY_BUFFER trở thành một phần state của VAO; glDrawElements đọc index type, count và offset từ contract này.",
  },
  {
    id: "indexed-draw",
    term: "Indexed draw",
    definition:
      "Cách tạo primitives bằng một vertex array và một danh sách indices thay vì lặp lại toàn bộ vertex cho mỗi triangle. Cube của Project 34 dùng 24 vertices và 36 indices để tạo 12 triangles.",
  },
  {
    id: "gpu-depth-test",
    term: "GPU depth test",
    definition:
      "Fixed-function stage so sánh depth của fragment mới với depth đang lưu trước khi ghi color. Project 34 dùng clear depth 1.0 và GL_LESS để phản chiếu đúng phép so của CPU Z-buffer.",
  },
  {
    id: "face-culling",
    term: "Face culling",
    definition:
      "Bước loại triangle quay lưng trước rasterization dựa trên winding sau projection. Project 34 dùng source indices CCW, GL_CCW và GL_BACK; CPU screen đảo Y nên phải xét dấu signed area một cách có chủ đích.",
  },
  {
    id: "shader-hot-reload",
    term: "Shader hot reload",
    definition:
      "Workflow đọc lại GLSL, compile/link và thay program khi ứng dụng vẫn chạy. Project 35 theo dõi file nhưng chỉ commit candidate hợp lệ, vì vậy một lỗi đang sửa không làm mất hình từ last-good program.",
  },
  {
    id: "shader-info-log",
    term: "Shader info log",
    definition:
      "Chuỗi diagnostics do driver trả sau compile shader. Log thường có line number và mô tả lỗi, nhưng GL_COMPILE_STATUS mới là nguồn quyết định stage thành công hay thất bại.",
  },
  {
    id: "program-candidate",
    term: "Program candidate",
    definition:
      "OpenGL program tạm được compile, link và kiểm interface bên cạnh active program. Candidate chưa được dùng để draw cho tới khi toàn bộ shader/uniform contract hợp lệ.",
  },
  {
    id: "transactional-reload",
    term: "Transactional reload",
    definition:
      "Cách reload theo thứ tự tạo candidate, validate, commit rồi mới xóa resource cũ. Nếu một bước thất bại, active state được giữ nguyên như một giao dịch không commit.",
  },
  {
    id: "debounce",
    term: "Debounce",
    definition:
      "Cơ chế chờ một khoảng yên tĩnh sau thay đổi cuối trước khi thực hiện công việc. Shader watcher dùng debounce để nhiều lần ghi trong một thao tác Save chỉ tạo một lần compile.",
  },
  {
    id: "camera-ray",
    term: "Camera ray",
    definition:
      "Tia có origin tại camera và direction đi qua một sample trên image plane. Project 36 dựng direction từ forward/right/up, aspect và field of view rồi normalize để distance dọc ray giữ đúng world units.",
  },
  {
    id: "signed-distance-function",
    term: "Signed Distance Function — SDF",
    definition:
      "Hàm trả khoảng cách có dấu từ một điểm tới bề mặt: âm bên trong, zero trên biên và dương bên ngoài. Một SDF đúng cho sphere tracing còn cung cấp bước tiến an toàn, không chỉ một mask inside/outside.",
  },
  {
    id: "ray-marching",
    term: "Ray marching",
    definition:
      "Cách tìm giao điểm bằng cách lấy mẫu nhiều vị trí dọc ray. Project 36 dùng biến thể sphere tracing: mỗi bước tiến bằng scene distance và luôn có epsilon, maximum distance cùng maximum-step guard.",
  },
  {
    id: "sphere-tracing",
    term: "Sphere tracing",
    definition:
      "Biến thể ray marching dùng khoảng cách tới bề mặt gần nhất làm độ dài bước. Quả cầu bán kính bằng distance quanh sample không cắt bề mặt, nên ray có thể tiến hết bán kính đó mà không bỏ qua hit.",
  },
  {
    id: "sdf-normal",
    term: "SDF normal",
    definition:
      "Normal lấy từ hướng gradient của Signed Distance Function tại hit point. Project 36 xấp xỉ ba đạo hàm bằng central differences, sau đó normalize trước khi dùng cho Lambert và normal bias.",
  },
  {
    id: "ray-march-material-id",
    term: "Ray-march material ID",
    definition:
      "Nhãn đi cùng distance của primitive gần nhất trong scene query. Khi một candidate thắng phép min, cả distance và ID phải đổi cùng nhau để hit được tô đúng material mà không đoán lại primitive.",
  },
  {
    id: "shadow-ray",
    term: "Shadow ray",
    definition:
      "Tia phụ đi từ hit point về phía nguồn sáng để đo vật cản. Origin thường được đẩy ra ngoài theo normal bias; loop có step/distance guard riêng để tránh self-shadow và công việc không giới hạn.",
  },
  {
    id: "ray-march-debug-view",
    term: "Ray-march debug view",
    definition:
      "Cách tô fragment bằng dữ liệu trung gian như step ratio, hit mask hoặc encoded normal. Debug view đáng tin khi đọc cùng MarchResult với beauty path, không chạy một thuật toán chẩn đoán khác.",
  },
  {
    id: "element-wise-operation",
    term: "Element-wise operation",
    definition:
      "Phép toán mà output ở index i chỉ phụ thuộc input tại chính index i. Add, AXPY và Difference trong Project 37 không cần invocation này trao đổi dữ liệu với invocation khác; reduction toàn mảng được để lại cho Project 39.",
  },
  {
    id: "cpu-oracle",
    term: "CPU oracle",
    definition:
      "Bản tính tham chiếu chạy trên CPU bằng code độc lập với GPU dispatch. Oracle không cần nhanh; nhiệm vụ của nó là tạo expected output để phát hiện layout, binding, bounds, synchronization hoặc shader arithmetic bị sai.",
  },
  {
    id: "shader-storage-buffer-object",
    term: "Shader Storage Buffer Object — SSBO",
    definition:
      "OpenGL buffer mà shader có thể đọc và ghi qua một shader storage block. Project 37 bind input A, input B và output vào binding 0, 1, 2; binding point là contract interface, không phải tên GLuint của buffer.",
  },
  {
    id: "std430-layout",
    term: "std430 layout",
    definition:
      "Quy tắc layout GLSL dành cho shader storage blocks. Project 37 dùng mảng vec4 để mỗi phần tử có stride 16 byte khớp trực tiếp với struct Vec4 size/alignment 16 ở C++.",
  },
  {
    id: "compute-workgroup",
    term: "Compute workgroup",
    definition:
      "Nhóm shader invocations được phát cùng nhau theo local size khai báo trong compute shader. Global ID một chiều bằng workgroup ID nhân local size cộng local invocation ID; số workgroup lại được truyền cho glDispatchCompute.",
  },
  {
    id: "compute-bounds-guard",
    term: "Compute bounds guard",
    definition:
      "Điều kiện cho invocation nằm ngoài element count thoát trước mọi buffer access. Ceil division thường phát cả workgroup cuối không đầy, vì vậy guard là một phần correctness chứ không phải tối ưu tùy chọn.",
  },
  {
    id: "gpu-memory-barrier",
    term: "GPU memory barrier",
    definition:
      "Lệnh làm các GPU writes trước đó visible/ordered cho loại consumer được chỉ ra bởi barrier bits. Bit được chọn theo cách dữ liệu sẽ được đọc tiếp theo; Project 37 dùng BUFFER_UPDATE trước glGetBufferSubData.",
  },
  {
    id: "mixed-tolerance",
    term: "Mixed absolute/relative tolerance",
    definition:
      "Ngưỡng so float gồm một phần tuyệt đối quanh zero và một phần tương đối tăng theo độ lớn của hai giá trị. Finite guard phải chạy riêng vì NaN hoặc Infinity không thể được coi là sai số làm tròn hợp lệ.",
  },
  {
    id: "gpu-timer-query",
    term: "GPU timer query",
    definition:
      "OpenGL query đo thời gian GPU dành cho một vùng lệnh, chẳng hạn GL_TIME_ELAPSED quanh glDispatchCompute. Nó không tự bao gồm upload, readback hoặc CPU UI nếu các công đoạn đó nằm ngoài BeginQuery/EndQuery.",
  },
  {
    id: "named-validation",
    term: "Named validation",
    definition:
      "Report tách correctness thành các invariant có tên thay vì một biến valid chung. Khi fail, tên như layout, bounds guard, finite output hay timing sample dẫn thẳng người học tới contract cần sửa.",
  },
  {
    id: "particle-lifecycle",
    term: "Particle lifecycle",
    definition:
      "Chuỗi trạng thái từ spawn, update position/velocity/age, hết lifetime hoặc rơi khỏi miền rồi respawn. Project 38 đặt toàn bộ lifecycle trong một compute invocation để mỗi particle tự cập nhật record của chính nó.",
  },
  {
    id: "deterministic-particle-initialization",
    term: "Deterministic particle initialization",
    definition:
      "Cách tạo particle mà cùng index, seed và epoch luôn cho cùng position, velocity và lifetime. Reset và validation probe nhờ đó tái lập được thay vì phụ thuộc thứ tự gọi một RNG có state chung.",
  },
  {
    id: "gpu-hash-rng",
    term: "GPU hash RNG",
    definition:
      "Hàm băm số nguyên biến index, channel, seed và epoch thành giá trị random-like độc lập. Nó không phải RNG mật mã; lợi ích trong particle shader là không có shared state, atomic contention hoặc phụ thuộc invocation order.",
  },
  {
    id: "point-sprite",
    term: "Point sprite",
    definition:
      "Primitive GL_POINTS có vùng fragment riêng và tọa độ gl_PointCoord trong hình vuông điểm. Project 38 discard bốn góc, làm mềm biên rồi pha màu/alpha theo velocity và lifetime để tạo hạt tròn không cần texture.",
  },
  {
    id: "gpu-resident-state",
    term: "GPU-resident state",
    definition:
      "Trạng thái được giữ và biến đổi trên GPU qua nhiều frame thay vì đọc về CPU rồi upload lại. Main particle SSBO của Project 38 đi từ compute write qua barrier tới vertex read mà không full-buffer readback.",
  },
  {
    id: "delta-time-clamp",
    term: "Delta-time clamp",
    definition:
      "Giới hạn bước thời gian mô phỏng ở một giá trị tối đa dù raw frame time lớn hơn. Clamp tránh một frame spike biến thành bước tích phân quá dài; nó chấp nhận simulation chậm lại thay vì chạy nhiều catch-up dispatch không giới hạn.",
  },
  {
    id: "asynchronous-query-ring",
    term: "Asynchronous query ring",
    definition:
      "Một nhóm timer query slots luân phiên qua nhiều frame. CPU chỉ đọc slot khi GL_QUERY_RESULT_AVAILABLE báo sẵn sàng; nếu mọi slot còn pending, profiler bỏ sample thay vì block chờ GPU.",
  },
  {
    id: "gpu-validation-probe",
    term: "GPU validation probe",
    definition:
      "Workload nhỏ, deterministic chạy bằng cùng GPU program với workload chính rồi được readback để so CPU oracle. Project 38 dùng 64 particle nhằm kiểm shader/layout/integration mà không tải main SSBO 160 MB về CPU.",
  },
  {
    id: "parallel-reduction",
    term: "Parallel reduction",
    definition:
      "Cách thu nhiều giá trị về một kết quả bằng cây phép toán thay vì một vòng lặp tuần tự. Project 39 cộng 512 giá trị trong mỗi workgroup, ghi partial sum rồi lặp lại trên các partial sums cho tới một scalar.",
  },
  {
    id: "exclusive-prefix-sum",
    term: "Exclusive prefix sum — Exclusive scan",
    definition:
      "Dãy output mà phần tử i bằng tổng mọi input đứng trước i; vì vậy output[0] luôn bằng identity zero. Với input [3,1,4,2], exclusive scan là [0,3,4,8].",
  },
  {
    id: "ceil-division",
    term: "Ceil division",
    definition:
      "Phép chia nguyên làm tròn lên, thường viết 1 + (value - 1) / divisor khi value dương. Compute dispatch dùng ceil division để phát đủ workgroup cho phần đuôi không đầy mà không đi qua float rounding.",
  },
  {
    id: "floating-reduction-order",
    term: "Floating-point reduction order",
    definition:
      "Thứ tự ghép cặp khi cộng float trong một cây reduction. Phép cộng số thực có tính kết hợp nhưng float thì không hoàn toàn, nên cây GPU và vòng lặp CPU có thể cho vài bit cuối khác nhau dù cả hai thuật toán đều đúng.",
  },
  {
    id: "workgroup-barrier",
    term: "Workgroup barrier",
    definition:
      "Điểm đồng bộ mà mọi invocation trong cùng compute workgroup phải đi qua trước khi tiếp tục. Project 39 đặt barrier sau khi nạp shared memory và sau mỗi stride; lane ở phần đuôi nạp zero nhưng không được return trước barrier.",
  },
  {
    id: "hierarchical-reduction",
    term: "Hierarchical reduction",
    definition:
      "Reduction nhiều tầng trong đó mỗi dispatch tạo một mảng partial sums nhỏ hơn, rồi mảng ấy trở thành input của dispatch kế tiếp. Với 1.000.003 số và block span 512, Project 39 đi qua 1.954, 4 rồi 1 partial sum.",
  },
  {
    id: "blelloch-scan",
    term: "Blelloch scan",
    definition:
      "Thuật toán prefix sum song song gồm upsweep gom total lên root và downsweep phân phối prefix trở xuống. Đặt root về identity giữa hai pha biến kết quả thành exclusive scan.",
  },
  {
    id: "scan-uniform-add",
    term: "Scan uniform add",
    definition:
      "Pass cộng cùng một block offset vào mọi local prefix thuộc block đó. Offset là exclusive scan của block sums; block đầu nhận zero, các block sau nhận tổng của toàn bộ block đứng trước.",
  },
  {
    id: "hierarchical-scan",
    term: "Hierarchical scan",
    definition:
      "Global prefix sum được dựng bằng ba bước: scan từng block, scan đệ quy block sums, rồi uniform-add offsets theo thứ tự từ tầng nhỏ trở xuống. Intermediate sums và offsets có thể giữ hoàn toàn trong GPU buffers.",
  },
  {
    id: "std430",
    term: "std430 buffer layout",
    definition:
      "Quy tắc layout GLSL cho shader storage block. Nó cho phép một số kiểu scalar/vector được đóng chặt hơn std140, nhưng C++ vẫn phải kiểm kích thước, alignment và field order thay vì giả sử hai struct tự nhiên tương thích.",
  },
  {
    id: "atomic-contention",
    term: "Atomic contention",
    definition:
      "Tình trạng nhiều GPU invocations cùng tranh cập nhật một địa chỉ atomic. GPU Spatial Grid phân tán contention theo cell counters; cell quá lớn gom nhiều particle vào một counter và làm count/scatter chậm hơn.",
  },
  {
    id: "compressed-sparse-row",
    term: "Compressed Sparse Row — CSR",
    definition:
      "Cách lưu nhiều danh sách có độ dài khác nhau trong một mảng liên tiếp. Mỗi cell dùng offset làm vị trí bắt đầu và count làm độ dài; exclusive scan của counts tạo toàn bộ offsets mà không cần cấp phát một vector riêng cho từng cell.",
  },
  {
    id: "atomic-scatter",
    term: "Atomic scatter",
    definition:
      "Pass phân phối phần tử vào output slots bằng atomic increment trên cursor của bucket. Giá trị cũ atomicAdd trả về là slot độc quyền; thứ tự indices trong cùng bucket không được đảm bảo.",
  },
  {
    id: "candidate-set",
    term: "Candidate set",
    definition:
      "Tập phần tử có khả năng thỏa truy vấn sau bước broad phase. Particle nằm trong cell mà query AABB chạm tới chỉ là candidate; exact distance test mới quyết định nó có phải neighbor hay không.",
  },
  {
    id: "deterministic-tie-break",
    term: "Deterministic tie-break",
    definition:
      "Quy tắc phụ dùng khi hai candidate có khóa chính bằng nhau. Project 40 chọn particle index nhỏ hơn khi distance hòa, nhờ vậy nearest neighbor không phụ thuộc thứ tự atomic scatter.",
  },
  {
    id: "structural-invariant",
    term: "Structural invariant",
    definition:
      "Điều luôn phải đúng về hình dạng dữ liệu trước khi xét giá trị nghiệp vụ. Với CSR grid, tổng counts bằng N, offsets không giảm, mọi range nằm trong storage và sortedIndices là một permutation của particle indices.",
  },
  {
    id: "transactional-resource-update",
    term: "Transactional resource update",
    definition:
      "Cách tạo và kiểm tra trọn bộ tài nguyên candidate trước khi thay state đang chạy. Nếu một allocation hoặc shader contract thất bại, candidate được dọn còn workload last-good vẫn nguyên vẹn.",
  },
] as const;
