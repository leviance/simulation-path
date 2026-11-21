import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p32-l01": {
      focus:
        "Từ tám điểm của starter, tự tạo 256 hạt ở các độ tuổi khác nhau. Xoay camera để phân biệt hình ban đầu với một bước mô phỏng.",
      expected:
        "Khi đồng hồ còn ở 0, màn hình đã có 256 hạt. Quay lại cùng góc nhìn sau hai lần reset sẽ cho cùng một hình.",
      files: ["include/particles.hpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Chạy tám điểm trong starter",
          explanation:
            "Cấu hình COURSE_WORKBOOK=ON rồi chạy project_32_work trước khi sửa. Cửa sổ, camera và cách chiếu 3D đã có sẵn.",
        },
        {
          title: "Gieo một vòi phun",
          explanation:
            "Từ vị trí và vận tốc khi rời vòi, tính trạng thái ban đầu theo tuổi của từng hạt. Chưa cần chạy vòng cập nhật.",
        },
        {
          title: "Đếm đúng ở thời điểm 0",
          explanation:
            "Đặt số hạt sống theo chế độ warm/cold, tách nó khỏi số ô đã cấp phát và số hạt đã thực sự tiến một bước.",
        },
      ],
    },
    "p32-l02": {
      focus:
        "Cho giọt rời một vòi hơi nghiêng, theo nó qua đỉnh tia rồi đến lúc rơi. Thay độ xòe ở miệng vòi và dùng lại ô nhớ khi giọt hết tuổi.",
      expected:
        "Đặt spread bằng 0: các giọt vẫn bay về phía trước nhưng không lệch khỏi mặt phẳng của vòi. Mở rộng tia, rồi cho hạt hết tuổi giữa bước để thấy ID vẫn giữ nguyên.",
      files: [
        "include/particles.hpp",
        "include/simulation.hpp",
        "include/application.hpp",
        "include/render_panel.hpp",
        "include/showcase.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Phun thử theo hai cách",
          explanation:
            "Giữ nguyên miệng vòi và độ nghiêng. Để spread bằng 0 làm mốc trước khi thử xem vận tốc lệch sang hai bên làm màn giọt rộng ra như thế nào.",
        },
        {
          title: "Giữ phần thời gian không tròn",
          explanation:
            "Tích lũy phần lẻ khi phát hạt. Nếu hạt cũ chỉ sống thêm nửa bước, chỉ cho hạt mới tiến nửa bước còn lại.",
        },
        {
          title: "Đưa bước hoàn chỉnh lên màn hình",
          explanation:
            "beginStep lập kế hoạch phát, tickStep xử lý từng nhóm. Chỉ đổi bộ đệm khi vừa tính xong cả bước.",
        },
      ],
    },
    "p32-l03": {
      focus:
        "Đo riêng chi phí cộng trọng lực và chi phí cập nhật cả vòng đời. Kiểm số lượt thật sự đã chạy trước khi tin đồng hồ.",
      expected:
        "Mẫu đo 10.000 hạt phải ghi nhận 30.000 lượt cập nhật sau ba pass. Đây là thời gian của kernel, không phải thời gian hiển thị một khung.",
      files: [
        "include/particles.hpp",
        "include/benchmark.hpp",
        "include/application.hpp",
        "include/render_panel.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chọn việc cần đo",
          explanation:
            "Đo riêng vòng cộng trọng lực và vòng cập nhật cả vòng đời. Chọn workload chỉ đổi việc đem đo, không đổi cách giọt nước đang bay.",
        },
        {
          title: "Đặt đồng hồ sát vòng lặp",
          explanation:
            "Gieo và chép dữ liệu trước khi bấm đồng hồ. Ghi số phần tử đã làm xong sau mỗi nhóm.",
        },
        {
          title: "Đọc kết quả của năm mẫu",
          explanation:
            "Dùng dữ liệu sau phép đo để tính checksum; báo trung vị và min/max. SoA ở bài này chưa được đo.",
        },
      ],
    },
    "p32-l04": {
      focus:
        "Chuyển mười một trường dữ liệu sang các mảng riêng trong lúc đài phun đứng yên; lần ngược lại để tìm một trường bị bỏ sót.",
      expected:
        "Giữ nguyên một khung hình khi đổi AoS → SoA → AoS. Hủy giữa chừng phải còn đọc được đài phun hoàn chỉnh trước lúc đổi.",
      files: [
        "include/storage.hpp",
        "include/simulation.hpp",
        "include/application.hpp",
        "include/render_panel.hpp",
      ],
      steps: [
        {
          title: "Lập một cột cho mỗi trường",
          explanation:
            "Cho cả mười một vector dùng chung chỉ số. Tất cả dài bằng nhau, kể cả khi đang có ít hạt sống hơn số ô.",
        },
        {
          title: "Dời một bản ghi",
          explanation:
            "writeParticle đặt từng giá trị vào cột tương ứng, readParticle gom chúng lại. Làm thử với ba ID dễ nhận ra trước.",
        },
        {
          title: "Hoàn tất rồi mới chuyển sang mảng mới",
          explanation:
            "Chỉ đổi layout khi chép hết. Không gọi reset và không đánh mất phần phát hạt còn lẻ.",
        },
      ],
    },
    "p32-l05": {
      focus:
        "Cho AoS và SoA đi qua cùng 400 bước, kể cả lúc hạt sinh lại. So từng ID và từng đại lượng thay vì chỉ so hai bức hình.",
      expected:
        "Cùng seed, cùng số bước và cùng lần sinh cho trạng thái tương đương. Nếu hai bên lệch generation thì không thể sửa bằng cách nới sai số cho float.",
      files: ["include/storage.hpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Chuyển phép tính sang các cột",
          explanation:
            "Giữ thứ tự sửa vận tốc rồi đến vị trí. Khi hạt hết tuổi, dùng lại đúng quy tắc sinh đã viết cho AoS.",
        },
        {
          title: "So từng ô trước khi nhìn ảnh",
          explanation:
            "Kiểm ID và thế hệ chính xác; vị trí, vận tốc, tuổi và màu có ngưỡng riêng vì chúng khác đơn vị.",
        },
        {
          title: "Đi qua cả lần sinh lại",
          explanation:
            "Đưa SoA vào cùng vòng tính và thử cả 400 bước. So với một lần chạy độc lập của AoS ở đúng thời điểm.",
        },
      ],
    },
    "p32-l06": {
      focus:
        "Lấy bút đánh dấu địa chỉ của velocityY ở 64 hạt. Dùng kết quả để đặt giả thuyết về tốc độ, không coi đó là số lần CPU trượt cache.",
      expected:
        "Cùng 64 vận tốc là 256 byte hữu ích; mô hình mảng căn hàng cho 44 cache line ở AoS và 4 ở SoA. Đây không phải bộ đếm cache miss.",
      files: ["include/benchmark.hpp", "include/application.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Vẽ các mốc cách nhau 64 byte",
          explanation:
            "Giả sử các mảng bắt đầu ở biên cache line, đánh dấu bốn địa chỉ đầu tiên của velocityY bằng tay.",
        },
        {
          title: "Đếm phạm vi bị chạm",
          explanation:
            "Dùng offsetof và sizeof để tính các địa chỉ thay vì nhớ cứng độ dời của một kiểu C++.",
        },
        {
          title: "Kiểm cả giới hạn của mô hình",
          explanation:
            "Trường hợp đọc hết các trường chỉ là cận trên cho full lifecycle. Ghi giả định ngay cạnh kết quả.",
        },
      ],
    },
    "p32-l07": {
      focus:
        "Thử hai cách lưu trên cùng dữ liệu ở ba quy mô. Đọc trung vị cùng khoảng nhỏ nhất–lớn nhất, kể cả khi con số trái dự đoán.",
      expected:
        "Có ba quy mô, mỗi quy mô hai workload; mỗi cặp giữ cùng dữ liệu. Một kết quả SoA chậm hơn vẫn là một phần của thí nghiệm.",
      files: ["include/benchmark.hpp", "include/application.hpp", "include/render_panel.hpp"],
      steps: [
        {
          title: "Đổi cả thứ tự đo",
          explanation:
            "Chép lại cùng bản đầu và luân phiên AB/BA. Không lấy kết quả sau ba bước AoS làm đầu vào cho SoA.",
        },
        {
          title: "Đối chiếu trước khi chấp nhận một mẫu",
          explanation:
            "Đếm đủ lượt, kiểm ID và sai số từng trường bên ngoài timer. Chuyển đổi và sao chép có số đo riêng.",
        },
        {
          title: "Đọc hai hàng ở cùng N",
          explanation:
            "Giữ cả khoảng min/max và cấu hình Release. Đừng quy một tỉ số thời gian cho cache hoặc SIMD nếu chưa có thêm bằng chứng.",
        },
      ],
    },
    "p32-l08": {
      focus:
        "Xem đài phun từ trên và ngang, chọn một hạt sắp hết tuổi rồi bước tiếp. Kiểm đủ một triệu hạt trong chính chương trình vừa viết.",
      expected:
        "Ở một triệu hạt, thay đổi camera chỉ đổi số nhìn thấy. Sau một bước, từng slot có đúng tuổi và thế hệ dù chỉ lấy tối đa 40.000 mẫu để vẽ.",
      files: [
        "include/inspection.hpp",
        "include/render.hpp",
        "include/showcase.hpp",
        "include/render_panel.hpp",
        "include/application.hpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Nhìn cùng một đài phun từ ba phía",
          explanation:
            "Dừng bằng Space, dùng F1/F2/F3. Nhìn ngang để thấy cột nước cao đến đâu, nhìn từ trên để đọc bề rộng mà không đổi thời điểm.",
        },
        {
          title: "Chọn một giọt sắp hết tuổi",
          explanation:
            "Giữ slot thay vì giữ con trỏ tới AoS. Bảng soi đọc qua layout hiện hành; U tìm hạt sắp sinh lại để kiểm ID và tuổi qua một bước.",
        },
        {
          title: "Chạy cả bản vừa viết và bản đối chiếu",
          explanation:
            "Chạy --smoke-workflow trên project_32_work, rồi tự thử camera, hủy phép đo và đổi layout; final trong ZIP là bản độc lập để đối chiếu.",
        },
      ],
    },
  },
  references: {
    "p32-l01": [
      {
        label: "Array of Structures",
        href: "/glossary#array-of-structures",
        kind: "Thuật ngữ",
      },
      {
        label: "Memory layout",
        href: "/glossary#memory-layout",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l02": [
      {
        label: "Hot loop",
        href: "/glossary#hot-loop",
        kind: "Thuật ngữ",
      },
      {
        label: "Memory stride",
        href: "/glossary#memory-stride",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l03": [
      {
        label: "Benchmark warm-up",
        href: "/glossary#benchmark-warm-up",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l04": [
      {
        label: "Structure of Arrays",
        href: "/glossary#structure-of-arrays",
        kind: "Thuật ngữ",
      },
      {
        label: "Spatial locality",
        href: "/glossary#spatial-locality",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l05": [
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l06": [
      {
        label: "Cache line",
        href: "/glossary#cache-line",
        kind: "Thuật ngữ",
      },
      {
        label: "Memory stride",
        href: "/glossary#memory-stride",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l07": [
      {
        label: "Benchmark median",
        href: "/glossary#benchmark-median",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark warm-up",
        href: "/glossary#benchmark-warm-up",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l08": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
