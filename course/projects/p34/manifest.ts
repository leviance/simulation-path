import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 21 — OBJ loader, chuẩn hóa mesh, normal phẳng và model viewer CPU",
    "Project 33 — SDL/OpenGL 3.3 Core, GLSL, VBO/VAO và CPU texture presenter",
    "Project 15–19 — MVP, triangle rasterizer, clipping, Z-buffer và Lambert shading",
  ],
  summary:
    "Nâng cấp model viewer Project 21 thành một ứng dụng có hai renderer. Cùng mesh OBJ, camera, góc xoay và ánh sáng được vẽ bằng CPU hoặc OpenGL; F1/F2 không làm cảnh nhảy sang tư thế khác. Ta kiểm bằng trace vertex, ảnh màu/depth và tài nguyên thật, rồi mới đo từng phần công việc.",
  duration: "28–38 giờ",
  objectives: [
    "Tái dùng model viewer trên mesh thật thay vì viết lại một demo cube",
    "Thiết kế chung Mesh/Camera/Math, tách tài nguyên CPU và GPU",
    "Kiểm clipping/depth/culling, ánh sáng và matrix trên hai backend",
    "Phân biệt CPU preparation, CPU submission, GPU geometry và presentation bằng phép đo có giới hạn",
  ],
  challenge: {
    timebox: "1.600–2.200 phút",
    mission:
      "Tự xây dựng một model viewer C++20/SDL3/OpenGL từ Project 21. Nạp rocket và sphere 2.976 tam giác, thêm GPU renderer và cho phép chuyển F1 CPU/F2 GPU trong cùng cửa sổ, ở bất kỳ góc nhìn nào mà không reset scene.",
    outcome:
      "Một viewer có orbit, pan, zoom, chọn model, ánh sáng Lambert, depth/culling và các chế độ debug. Model nằm trên lưới 3D; bảng thời gian riêng ở dưới không che hình. Cube chỉ là fixture để tìm lỗi. Source, dataset CC0 và các phép kiểm đi kèm có thể tải và build độc lập.",
    requirements: [
      "Tái dùng đầy đủ loader/dataset Project 21; giữ rocket 32 tam giác, sphere 2.976 tam giác và cube debug.",
      "Chỉ một ViewerScene giữ lựa chọn mesh, camera, object transform, ánh sáng và tùy chọn hiển thị; không đặt GLuint hoặc framebuffer pointer trong scene.",
      "Chuẩn bị một indexed ViewerMesh với position xyz/normal xyz dùng chung; normal phẳng cần tách vertex tại cạnh cứng.",
      "CPU tự transform, clip sáu mặt, perspective divide, rasterize và depth-test; presenter chỉ upload ảnh RGBA8 đã hoàn thành.",
      "GPU tự tạo VBO/EBO/VAO, shader và uniforms; không dùng engine hoặc thư viện math để che phần cốt lõi.",
      "Dùng cùng MVP column-major, hệ tay phải, view nhìn -Z, NDC z [-1,1], window depth [0,1], CCW và LESS.",
      "Có orbit/pan/zoom, reset camera, chọn mesh, pause/step, depth/culling, lighting, wireframe, normals và lưới.",
      "F1/F2 không khởi tạo lại mesh hoặc sửa scene; resize/aspect và high-DPI nhất quán ở cả hai backend.",
      "Tách thời gian CPU preparation, CPU geometry, upload, submission, GPU geometry khi đo được và presentation; không dựng speedup từ các cột khác công việc.",
      "Có CPU tests không mở window; --verify chạy riêng trên OpenGL thật với trace/ảnh/depth và kiểm resource sau ít nhất 20 lần chuyển backend.",
      "Benchmark hữu hạn dùng cùng scene/resolution, xác nhận VSync=0, ghi warm-up, số mẫu và phạm vi đồng bộ.",
      "Starter và từng checkpoint chạy độc lập; final có comment, README, tests và assets, không cần checkout Project 21.",
    ],
    constraints: [
      "Không được coi cube là sản phẩm cuối; hai mesh thực phải đi qua cả CPU lẫn GPU.",
      "Không bỏ CPU clipping hoặc dùng hai camera/application riêng để làm ảnh trông giống nhau.",
      "Không đổi winding riêng cho GPU, transpose thử đến khi đúng hình hoặc tắt culling để che lỗi.",
      "Không gọi thời gian quanh glDrawElements là GPU execution; timer query không có kết quả thì báo chưa có/không hỗ trợ.",
      "Canvas chỉ là minh họa TypeScript/Canvas 2D; kiểm GPU và đo phần cứng thuộc ứng dụng C++.",
      "Không chạy GUI trong CTest; mọi chế độ kiểm tự động có số frame/mẫu và deadline hữu hạn.",
    ],
    definitionOfDone: [
      "Rocket và sphere 2.976 tam giác xem được bằng hai backend; cube vẫn có để debug.",
      "Orbit/pan/zoom, ánh sáng, culling và mesh không reset khi đổi F1/F2.",
      "Các vertex mẫu của cả ba mesh được kiểm qua vertex shader thật bằng transform feedback.",
      "So màu/depth ở cùng snapshot: RGB <= 3/255, depth <= 2e-5 ngoài dải cạnh 1,5 pixel; công bố riêng sai khác ở cạnh.",
      "Fixture có mặt CCW/CW và tam giác cắt qua near/eye kiểm được coverage, clipping và visibility.",
      "Đổi backend 24 lần rồi resize/đổi mesh vẫn giữ các buffer/VAO/program/texture đã tạo; destroy khi context còn sống.",
      "Benchmark cố định scene 640×480, 3 warm-up/12 mẫu và VSync=0; không ép thành một hệ số nhanh hơn.",
      "Starter, chín checkpoint và final build Debug/Release; CTest và kiểm GPU được báo riêng.",
      "Canvas có preset, pause/reset/step, DPR, pointer capture, keyboard, reduced motion và mô tả văn bản.",
      "Bài cuối có toàn bộ source và ZIP cùng dataset/giấy phép; không cần ghép các đoạn mã rời.",
    ],
  },
  lessons: [
    {
      id: "p34-l01",
      slug: "01-khoa-mot-cube-scene-dung-chung",
      title: "Mở lại model viewer, tách scene khỏi renderer",
      summary:
        "Khởi động bộ khung SDL/OpenGL đã biết, đặt camera, mô hình và tùy chọn hiển thị vào một ViewerScene không chứa tài nguyên backend.",
      order: 1,
      estimatedMinutes: 130,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l02",
      slug: "02-xay-indexed-cube-mesh",
      title: "Dùng lại OBJ và chuẩn bị một mesh chung",
      summary:
        "Dùng nguyên loader và dataset Project 21; chuẩn hóa mesh, tạo normal phẳng và tách vertex tại cạnh cứng để CPU/GPU đọc cùng dữ liệu.",
      order: 2,
      estimatedMinutes: 190,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l03",
      slug: "03-ket-noi-cpu-renderer-voi-scene",
      title: "Giữ nguyên pipeline CPU cho mesh thật",
      summary:
        "Nối indexed mesh với transform, clipping sáu mặt, rasterizer và Z-buffer; texture presenter chỉ mang ảnh đã vẽ lên cửa sổ.",
      order: 3,
      estimatedMinutes: 240,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l04",
      slug: "04-ve-cube-gpu-bang-element-buffer",
      title: "Đưa mesh lên GPU bằng VBO và EBO",
      summary:
        "Định nghĩa position/normal attributes, upload VBO/EBO một lần, giữ EBO trong VAO và vẽ đủ cả mesh 2.976 tam giác.",
      order: 4,
      estimatedMinutes: 190,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l05",
      slug: "05-dong-bo-model-view-projection",
      title: "Một camera, cùng Model–View–Projection",
      summary:
        "Quy định hệ trục, thứ tự xoay, camera orbit/pan/zoom và projection; truyền đúng 16 float cho C++ lẫn GLSL.",
      order: 5,
      estimatedMinutes: 200,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l06",
      slug: "06-doi-chieu-depth-buffer-va-depth-test",
      title: "Clipping, depth và winding phải khớp",
      summary:
        "Cắt trước perspective divide, ánh xạ depth về [0,1], thống nhất LESS và CCW; chủ động tắt depth/culling để tìm lỗi.",
      order: 6,
      estimatedMinutes: 220,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l07",
      slug: "07-dong-bo-winding-va-face-culling",
      title: "Chiếu sáng và các chế độ xem mô hình",
      summary:
        "Dùng cùng normal và ánh sáng Lambert, thêm wireframe, normal vectors và lưới; phân biệt chế độ debug với ảnh dùng để đối chiếu.",
      order: 7,
      estimatedMinutes: 180,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l08",
      slug: "08-chuyen-renderer-bang-f1-f2",
      title: "Đổi backend mà không mất trạng thái",
      summary:
        "Đặt input/update trước render, giữ nguyên scene khi F1/F2, xử lý capture/focus/resize và cache tài nguyên qua nhiều lần đổi backend.",
      order: 8,
      estimatedMinutes: 170,
      demoId: "dual-renderer-cube",
    },
    {
      id: "p34-l09",
      slug: "09-hoan-thien-dual-renderer-cube",
      title: "Đối chiếu, đo thời gian và hoàn thiện viewer",
      summary:
        "Dùng CPU tests, transform feedback, so ảnh/depth và benchmark hữu hạn; đọc đúng các cột thời gian và tải toàn bộ source chạy độc lập.",
      order: 9,
      estimatedMinutes: 220,
      demoId: "dual-renderer-cube",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
