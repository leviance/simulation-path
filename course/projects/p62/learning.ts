import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p62-l01": {
      focus:
        "Chạy khung SDL3 có greedy mesh, thêm marker và dịch nhân vật trước khi tải nhiều chunk.",
      expected: "Một chunk phẳng hiện rõ; WASD dịch marker trong chunk, camera vẫn dùng Z-buffer.",
      files: ["include/controls.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy khung có đất trước",
          explanation:
            "Cấu hình CMake với BUILD_CHECKPOINTS=ON, chạy starter để kiểm SDL window, renderer và streaming texture. Ảnh CPU 320×240 được phóng lên vùng 640×480.",
        },
        {
          title: "Dịch nhân vật bằng hành động rõ ràng",
          explanation:
            "WASD thay X/Z đúng 4 world units mỗi lần nhấn. Đây là lệnh bước tay để thử streaming, không phải mô phỏng vận tốc theo frame.",
        },
        {
          title: "Vẽ marker bằng cùng camera",
          explanation:
            "Ảnh world được dịch theo vị trí nhân vật nên trong hệ tọa độ dùng để vẽ, nhân vật luôn ở X=Z=8. Marker đi qua project giống geometry rồi đổi về kích thước SDL.",
        },
      ],
    },
    "p62-l02": {
      focus:
        "Dùng floor thay vì phép chia số nguyên về zero; tách chunk index, local và voxel index.",
      expected: "−0.5 thuộc chunk −1, local 15.5; −16 thuộc chunk −1, local 0.",
      files: ["include/coordinates.hpp", "include/controller.hpp"],
      steps: [
        {
          title: "Tách vị trí liên tục bằng floor",
          explanation:
            "splitAxis kiểm finite và miền [−512,512] trước phép cast. local vẫn là double để marker dịch được giữa hai voxel; block là chỉ số nguyên để đọc storage.",
        },
        {
          title: "Sửa phép chia cho world block nguyên",
          explanation:
            "Nếu phần dư âm thì quotient phải lùi một. Với −16 phần dư bằng zero nên không lùi; với −17 cần chunk −2.",
        },
        {
          title: "Ghép X/Z thành Key của nhân vật",
          explanation:
            "Key dùng địa chỉ chunk chứ không dùng tọa độ local. Camera vẫn bám player world.",
        },
      ],
    },
    "p62-l03": {
      focus: "Tạo tập wanted hình vuông, lưu Entry theo Key và đưa mesh local về world khi vẽ.",
      expected: "Bán kính 1 tải 9 chunk; mỗi chunk có dữ liệu và mesh riêng, chưa gỡ chunk cũ.",
      files: ["include/world.hpp", "include/scheduler.hpp", "include/controller.hpp"],
      steps: [
        {
          title: "Tạo danh sách wanted",
          explanation:
            "Hai vòng lặp bao gồm cả hai đầu center±r. Với tọa độ âm, center đã được tính bằng floor ở bài 02.",
        },
        {
          title: "Nạp Entry chưa có",
          explanation:
            "loadChunk kiểm trùng và cap trước khi tạo data. Mỗi Entry có buffer 4096 ID riêng; std::move chuyển ownership vào map.",
        },
        {
          title: "Đưa mesh local vào ảnh world",
          explanation:
            "sceneMesh tạo bản triangle để vẽ, không thay tọa độ trong entry.mesh. Nhờ đó cùng một mesh dùng lại được khi player/camera đi.",
        },
      ],
    },
    "p62-l04": {
      focus: "Xóa Entry an toàn, giải phóng buffer và kiểm dữ liệu tái tạo bằng checksum.",
      expected:
        "Đi xa không giữ toàn bộ lịch sử chunk; quay lại có Block ID giống trước, không có con trỏ treo.",
      files: ["include/world.hpp", "include/scheduler.hpp"],
      steps: [
        {
          title: "Xóa Entry, không chỉ ẩn hình",
          explanation:
            "unloadChunk dùng erase để giải phóng ownership. Job và inspector giữ Key chứ không giữ con trỏ Entry; sau erase, đọc lại bằng find.",
        },
        {
          title: "Thu thập Key trước khi erase",
          explanation:
            "Không vừa range-for qua map vừa erase phần tử đang duyệt. synchronize lấy danh sách retiring rồi xóa ở vòng riêng, sau đó mới tải wanted còn thiếu.",
        },
        {
          title: "Đối chiếu dữ liệu sau khi quay lại",
          explanation:
            "Hash chỉ đọc Block ID, không đọc vector capacity, địa chỉ hoặc màu pixel. Chunk (0,0) có hash 2424852421, chunk (−1,0) có 3845785541 trong cả hai bản.",
        },
      ],
    },
    "p62-l05": {
      focus: "Ưu tiên gỡ xa rồi tải gần, giới hạn 1–2 job mỗi tick thay vì xử lý cả world một lần.",
      expected:
        "Starter vẫn có một chunk nhìn thấy được; 8 chunk quanh nó được tải dần khi nhấn N hoặc chạy playback.",
      files: ["include/scheduler.hpp", "include/controller.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Định nghĩa thứ tự không mơ hồ",
          explanation:
            "earlierJob đặt unload trước load. Với unload, priority lớn đi trước; với load, nhỏ đi trước.",
        },
        {
          title: "Lập kế hoạch từ resident và wanted",
          explanation: "plan chỉ đọc World. Nó không generate, erase hoặc rebuild.",
        },
        {
          title: "Chỉ lấy một prefix có giới hạn",
          explanation:
            "pump chụp các job hiện tại, xử lý tối đa budget rồi hoàn tất mesh cho batch. Cuối hàm lập lại pending từ state mới.",
        },
      ],
    },
    "p62-l06": {
      focus: "Phân biệt wanted và retained, hủy kế hoạch cũ khi teleport hoặc đổi bán kính.",
      expected:
        "Đi qua rồi quay lại sát biên không tái tạo chunk còn giữ; job chờ luôn theo mục tiêu mới.",
      files: ["include/world.hpp", "include/scheduler.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Mở rộng vùng giữ, không vùng tạo",
          explanation:
            "Chỉ keepRadius thêm một, wanted không đổi. Theo bảng tick trong bài: đi sang center (1,0) tải ba chunk mới, resident tăng 9→11→12; quay về không có job mới.",
        },
        {
          title: "Bỏ job không còn thuộc mục tiêu",
          explanation:
            "retarget dựng job mới rồi đếm các job cũ không còn cần. Preset chỉ di chuyển trong World hiện tại, giữ radius/budget/bộ đếm để thí nghiệm teleport rồi quay về thật sự kiểm queue cũ. Reset mới tạo lại World.",
        },
        {
          title: "Đổi radius và budget có kiểm tra",
          explanation: "settings từ chối tham số sai trước khi sửa state. r chỉ nhận 1/2.",
        },
      ],
    },
    "p62-l07": {
      focus: "Tra neighbor bằng tọa độ world; mặt nguồn chỉ thuộc chunk đang dựng mesh.",
      expected: "Hai chunk opaque kề nhau bỏ cả hai mặt trong; gỡ neighbor khôi phục mặt biên.",
      files: ["include/meshing.hpp"],
      steps: [
        {
          title: "Tra block theo địa chỉ world",
          explanation:
            "worldBlock xử lý y ngoài tầng trước, rồi tìm Key X/Z và local. Không tự generate dữ liệu neighbor khi query; lookup phải chỉ đọc state resident.",
        },
        {
          title: "Giữ quyền sở hữu source",
          explanation:
            "Trong makeWorldMask, dựng source local theo face/plane như bài greedy. Kiểm inside trước khi đọc source.",
        },
        {
          title: "Hỏi neighbor rồi đưa mask vào greedy",
          explanation:
            "Neighbor được đổi sang global X/Z bằng Key*16. Cả source Stone và neighbor Grass đều opaque nên mặt bị bỏ.",
        },
      ],
    },
    "p62-l08": {
      focus: "Invalidate chunk thay đổi cùng bốn hàng xóm, hoàn tất batch trước khi cập nhật ảnh.",
      expected:
        "Một job tác động tối đa 5 mesh; camera/di chuyển trong chunk không dựng lại geometry.",
      files: ["include/meshing.hpp", "include/scheduler.hpp", "include/controller.hpp"],
      steps: [
        {
          title: "Ghi đúng tập ảnh hưởng",
          explanation:
            "markAffected không quét cả world. Key vừa unload có thể không còn trong map; rebuild tự bỏ qua nó.",
        },
        {
          title: "Hoàn tất geometry trước frame",
          explanation:
            "refreshMeshes lấy hợp các Key thay đổi của cả batch, rebuild các Entry còn sống rồi đánh dấu frameDirty. Không trả lại UI giữa lúc resident đã đổi nhưng neighbor mesh chưa cập nhật.",
        },
        {
          title: "Chỉ raster khi ảnh thật sự đổi",
          explanation:
            "refreshFrame đọc mesh đã cache. Không gọi sceneMesh/render khi cả frameDirty và cameraDirty đều false.",
        },
      ],
    },
    "p62-l09": {
      focus: "Thêm route hữu hạn theo mốc, teleport từ inspector, pause/reset và cleanup input.",
      expected:
        "Tự đi theo mốc chỉ chạy khi bật; blur/reduced-motion dừng và vẫn đi từng tick bằng keyboard được.",
      files: ["include/controller.hpp", "include/controls.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Thêm route mà không sửa scheduler",
          explanation:
            "step chỉ đổi player theo mốc nếu autoTravel bật, rồi gọi pump. Chỉ số quay vòng có giới hạn.",
        },
        {
          title: "Cho thời gian chạy theo nhịp hữu hạn",
          explanation:
            "tick kẹp dt tối đa 0.1 giây, xử lý một batch khi đủ 0.2 giây. Pause không tích lũy thời gian.",
        },
        {
          title: "Teleport từ inspector có kiểm miền",
          explanation:
            "IJKL/click map chỉ đổi Key đang chọn. E/Đến chunk đã chọn mới đổi player về tâm chunk nếu còn trong miền demo.",
        },
      ],
    },
    "p62-l10": {
      focus: "Oracle bề mặt global, hành trình có giới hạn, regeneration và build Debug/Release.",
      expected:
        "Test bắt được sai tọa độ, job lỗi thời, vượt cap, seam, regeneration và rebuild thừa; có final chạy độc lập.",
      files: ["include/oracle.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Tạo đáp án từ global cell",
          explanation:
            "Oracle đọc storage thành solid map rồi xét sáu offset. Key dùng world, không local; hai mặt local giống nhau ở hai chunk khác nhau không được đánh đồng.",
        },
        {
          title: "Đối chiếu bề mặt và giới hạn công việc",
          explanation:
            "Surface oracle so hướng/vật liệu và duplicate. verifySchedule chỉ sanity state hiện tại; hành trình, regeneration, seam, idle/camera và round-trip cần Node/CTest riêng.",
        },
        {
          title: "Build Debug/Release và chạy final",
          explanation:
            "CTest code thuần không tạo SDL window. Tối đa hai compiler; --smoke mở hidden và thoát một frame với deadline ngoài.",
        },
      ],
    },
  },
  references: {
    "p62-l01": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l02": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l03": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l04": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l05": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l06": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l07": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l08": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l09": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
    "p62-l10": [
      {
        label: "World, chunk và local",
        href: "/glossary#chunk-signed-address",
        kind: "Thuật ngữ",
      },
      {
        label: "Chunk streaming",
        href: "/glossary#chunk-streaming",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
