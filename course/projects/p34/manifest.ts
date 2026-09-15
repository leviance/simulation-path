import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 15 — column-major Mat4, clip space, perspective divide và viewport transform",
    "Project 17 — indexed cube, CPU triangle rasterizer, Z-buffer và visibility",
    "Project 33 — SDL/OpenGL context, shader program, VBO/VAO và texture presenter",
  ],
  summary:
    "Vẽ cùng một indexed cube từ đúng một scene state và chuyển backend bằng F1/F2. CPU tự transform, rasterize và ghi Z-buffer; GPU dùng GLSL, EBO, depth test và face culling. Mỗi bài khóa một contract chung để việc chuyển renderer không làm cube nhảy, lật mặt hoặc đổi visibility.",
  challenge: {
    timebox: "850–1.100 phút",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3/OpenGL trong đó phím F1 chọn renderer CPU và F2 chọn renderer GPU. Hai renderer phải nhận cùng `CubeScene`, cùng 24 vertices, 36 indices và cùng MVP. Khi chuyển backend giữa lúc cube đang xoay, hình, depth, culling và camera không được reset hay thay đổi.",
    outcome:
      "Một cửa sổ high-DPI hiển thị cube sáu màu. Title bar báo backend, góc xoay, depth/culling và validation; terminal giữ shader diagnostics. CPU mode upload framebuffer RGBA8, GPU mode gọi `glDrawElements`. Drag, pause, fixed step, resize và F1/F2 hoạt động trên cùng scene state.",
    requirements: [
      "Giữ OpenGL 3.3 Core context, function loader và CPU texture presenter từ Project 33 trong starter có thể chạy được.",
      "Định nghĩa `CubeScene` độc lập với renderer; nó giữ transform và các visibility options nhưng không chứa SDL, OpenGL handle hoặc framebuffer pointer.",
      "Tạo indexed cube gồm 24 `GpuCubeVertex`, 36 `uint32_t` indices và đúng 12 triangles; mọi index phải nằm trong vertex array.",
      "Mỗi vertex chứa position xyz và color rgb bằng sáu `float`; khóa stride và color offset bằng `static_assert`/`offsetof`.",
      "CPU renderer dùng cùng vertices/indices, column-major MVP, perspective divide, top-left screen mapping, triangle coverage, depth compare `LESS` và RGBA8 face color.",
      "GPU renderer upload vertex data vào VBO, indices vào EBO, lưu attribute contract trong VAO và gọi `glDrawElements(GL_TRIANGLES, 36, GL_UNSIGNED_INT, nullptr)`.",
      "C++ `Mat4` và GLSL `mat4` phải nhận cùng 16 floats; upload `uMvp` bằng `glUniformMatrix4fv(..., GL_FALSE, ...)`.",
      "Projection dùng cùng vertical FOV, aspect từ framebuffer pixels, near/far và OpenGL clip-depth convention ở cả hai backend.",
      "Phím D bật/tắt CPU Z-buffer và `GL_DEPTH_TEST` bằng cùng scene option; clear depth phải là 1 và compare function là `LESS`.",
      "Phím C bật/tắt CPU back-face culling và `GL_CULL_FACE`; source indices dùng CCW khi nhìn từ bên ngoài và GPU front face là `GL_CCW`.",
      "F1/F2 chỉ đổi `RendererKind`; không rebuild mesh, reset transform hoặc giữ hai bản scene state riêng.",
      "Resize phải đọc `SDL_GetWindowSizeInPixels`, resize CPU framebuffer/texture và cập nhật GPU viewport cùng aspect ratio.",
      "Kèm starter, chín checkpoint độc lập, final có comment, README và CTest thuần CPU không mở window.",
    ],
    constraints: [
      "Không dùng GLM, Eigen, SDL_RenderGeometry, immediate mode, fixed-function matrix hoặc hai cube mesh viết riêng cho CPU/GPU.",
      "Không gọi renderer CPU là hoàn toàn không dùng GPU: framebuffer CPU vẫn được upload qua texture presenter; phần geometry/raster/depth mới là CPU.",
      "Không đo `glDrawElements` bằng CPU timer rồi tuyên bố đó là thời gian GPU hoàn thành; project này đối chiếu correctness, không benchmark hai processor.",
      "Không transpose matrix bằng cách sửa ngẫu nhiên GLSL hoặc đảo hàng/cột chỉ đến khi hình trông đúng; column-major contract phải được test bằng vertex trace.",
      "Không sửa index order riêng cho GPU để che lỗi winding; một index buffer là nguồn chuẩn của cả hai backend.",
      "Không tắt depth/culling vĩnh viễn để tránh debug visibility; mỗi option phải có đường bật/tắt tương đương ở cả hai phía.",
      "Không dùng triangle order làm pass/fail khi depth bị tắt; đó là thí nghiệm lỗi có chủ đích.",
      "Không chạy GUI hoặc phụ thuộc GPU trong CTest; kiểm tự động chỉ dùng mesh/matrix/raster contract CPU với kích thước hữu hạn.",
    ],
    definitionOfDone: [
      "Starter tạo SDL/OpenGL window, context, function loader và event loop rồi thoát sạch.",
      "CubeScene không chứa backend handle; đổi RendererKind giữ nguyên toàn bộ scene values.",
      "Mesh có 24 vertices, 36 valid indices, 12 CCW triangles và sáu màu mặt ổn định.",
      "CPU mode vẽ cube có depth/culling, deterministic checksum và output không phụ thuộc triangle order khi depth bật.",
      "GPU mode tạo VBO/EBO/VAO, upload cùng mesh và gọi indexed draw với đúng type/count.",
      "C++/GLSL dùng cùng column-major MVP; nhiều vertex traces có clip w dương, NDC hữu hạn và window depth trong [0,1].",
      "D thay đổi visibility theo cùng `LESS` contract; depth clear và clear order đúng ở hai backend.",
      "C loại back faces theo cùng CCW convention; tắt culling vẫn giữ cube đúng nhờ depth test.",
      "F1/F2 chuyển backend liên tục khi pause/chạy/drag mà cube không nhảy và không allocation mesh mỗi frame.",
      "Resize/high-DPI cập nhật framebuffer storage, texture allocation, viewport và projection aspect.",
      "GPU objects được destroy trước context; CPU buffers theo RAII và không còn callback/function dùng context đã chết.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/step/reset và có readout văn bản.",
      "Starter, chín checkpoint và final build ở Debug/Release; CTest, Canvas tests và website build đều đạt.",
    ],
  },
  duration: "24–32 giờ",
  objectives: [
    "Thiết kế renderer backend quanh một scene/mesh/matrix contract thay vì nhân đôi state",
    "Nối CPU Z-buffer và culling với OpenGL depth/cull state bằng cùng phép so và winding",
    "Dùng indexed GPU draw, EBO và MVP uniform mà vẫn trace được từng stage như renderer CPU",
  ],
  lessons: [
    {
      id: "p34-l01",
      slug: "01-khoa-mot-cube-scene-dung-chung",
      title: "Khóa một CubeScene dùng chung",
      summary:
        "Bắt đầu từ OpenGL foundation chạy được, tách transform/visibility khỏi backend handle và tạo shell mà việc chọn renderer không thể sửa scene.",
      order: 1,
      estimatedMinutes: 115,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l02",
      slug: "02-xay-indexed-cube-mesh",
      title: "Xây indexed cube mesh",
      summary:
        "Viết 24 vertices, 36 indices, sáu mặt có winding CCW và khóa memory layout trước khi renderer nào đọc bytes.",
      order: 2,
      estimatedMinutes: 125,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l03",
      slug: "03-ket-noi-cpu-renderer-voi-scene",
      title: "Kết nối CPU renderer với scene",
      summary:
        "Dùng mesh/MVP chung để transform, rasterize, depth-test và ghi framebuffer CPU rồi upload bằng presenter kế thừa Project 33.",
      order: 3,
      estimatedMinutes: 155,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l04",
      slug: "04-ve-cube-gpu-bang-element-buffer",
      title: "Vẽ cube GPU bằng Element Buffer",
      summary:
        "Upload VBO/EBO, giữ EBO binding trong VAO và thay draw arrays bằng indexed `glDrawElements` với diagnostics rõ ràng.",
      order: 4,
      estimatedMinutes: 155,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l05",
      slug: "05-dong-bo-model-view-projection",
      title: "Đồng bộ Model–View–Projection",
      summary:
        "Khóa column-major multiplication, upload 16 floats không transpose và trace local → clip → NDC → screen ở cả C++/GLSL.",
      order: 5,
      estimatedMinutes: 150,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l06",
      slug: "06-doi-chieu-depth-buffer-va-depth-test",
      title: "Đối chiếu Z-buffer và GPU depth test",
      summary:
        "Dùng cùng clear depth, LESS compare và window-depth mapping; cố ý tắt depth để thấy triangle order quay lại chi phối hình.",
      order: 6,
      estimatedMinutes: 145,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l07",
      slug: "07-dong-bo-winding-va-face-culling",
      title: "Đồng bộ winding và face culling",
      summary:
        "Theo dõi CCW từ object/NDC sang top-left CPU screen, rồi cấu hình GL_CCW/GL_BACK mà không viết index buffer thứ hai.",
      order: 7,
      estimatedMinutes: 140,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l08",
      slug: "08-chuyen-renderer-bang-f1-f2",
      title: "Chuyển renderer bằng F1 và F2",
      summary:
        "Ghép input, animation, fixed step và resize quanh một scene snapshot; F1/F2 chỉ chọn code path render của frame hiện tại.",
      order: 8,
      estimatedMinutes: 135,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l09",
      slug: "09-hoan-thien-dual-renderer-cube",
      title: "Hoàn thiện Dual Renderer Cube",
      summary:
        "Đóng lifecycle, named validation, Debug/Release build và full source để chuẩn bị cho shader editing lab ở Project 35.",
      order: 9,
      estimatedMinutes: 155,
      demoId: "dual-renderer-cube",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
