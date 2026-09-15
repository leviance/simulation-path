import type { ProjectLearningAssets } from "../../learning/types";

const files = ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"];

const learning = {
  guides: {
    "p27-l01": {
      focus:
        "Thay đám điểm minh họa bằng 100.000 `Particle` thật, được sinh từ cùng một vùng và có thể tạo lại nhờ `seed`.",
      expected:
        "Cùng một `seed` luôn tạo lại đúng vị trí theo từng index; đổi `seed` làm đám hạt thay đổi nhưng không hạt nào ra ngoài `[0,1]²`.",
      files,
      steps: [
        {
          title: "Giữ Particle tối giản",
          explanation:
            "Ở project này, mỗi hạt chỉ cần vị trí. Index trong vector đóng vai trò định danh ổn định, nên kết quả truy vấn chỉ cần trả về các index.",
        },
        {
          title: "Dùng PRNG có seed",
          explanation:
            "`XorShift32` tạo lại cùng chuỗi số sau mỗi lần reset. Nhờ đó phép đo hiệu năng và truy vấn đối chiếu luôn dùng đúng cùng dữ liệu.",
        },
        {
          title: "Tạo cloud đúng một lần",
          explanation:
            "Sinh dữ liệu trước vòng lặp chính và trước vùng đo thời gian. Mỗi khung hình chỉ đọc vector đã có để vẽ.",
        },
      ],
    },
    "p27-l02": {
      focus:
        "Đổi vị trí chuột sang world space, tạo một `CircleQuery`, rồi kiểm tra một hạt có nằm trong hình tròn hay không.",
      expected:
        "Pointer được clamp vào bounds; point trên boundary được nhận, point ngoài radius bị loại.",
      files,
      steps: [
        {
          title: "Đổi screen point về world point",
          explanation:
            "Tâm truy vấn phải dùng world coordinates. Khi cửa sổ đổi kích thước, chỉ hình vẽ thay đổi; vị trí truy vấn trong thế giới vẫn giữ nguyên.",
        },
        {
          title: "Tính delta từ center tới particle",
          explanation:
            "Lấy `dx` và `dy` từ tâm đến hạt rồi tính khoảng cách Euclid. Renderer chỉ hiển thị kết quả, không được quyết định hạt nào là hit.",
        },
        {
          title: "Chốt boundary inclusive",
          explanation:
            "Dùng `distance <= radius` để hạt nằm đúng trên đường tròn vẫn được tính là hit. Test và ứng dụng phải dùng cùng quy ước này.",
        },
      ],
    },
    "p27-l03": {
      focus:
        "Viết phiên bản brute force dễ đọc nhất: duyệt từng hạt, lưu mọi hit và theo dõi hạt gần tâm nhất.",
      expected:
        "Full query luôn báo scanned=N; scan progress một phần chỉ trả hits trong prefix đã đi qua.",
      files,
      steps: [
        {
          title: "Không dừng sau hit đầu tiên",
          explanation:
            "Đề bài cần toàn bộ hạt trong kính lúp, không chỉ hạt đầu tiên. Vì vậy vòng lặp phải chạy đến phần tử cuối cùng.",
        },
        {
          title: "Giữ nearest tie ổn định",
          explanation:
            "Chỉ thay hạt gần nhất khi khoảng cách mới nhỏ hơn hẳn. Nếu hai hạt cách đều tâm, giữ hạt có index xuất hiện trước.",
        },
        {
          title: "Đếm scanned độc lập với hits",
          explanation:
            "`hits` cho biết có bao nhiêu hạt nằm trong vòng tròn; `scanned` cho biết thuật toán đã kiểm bao nhiêu hạt. Đây là hai ý nghĩa khác nhau.",
        },
      ],
    },
    "p27-l04": {
      focus:
        "Bỏ phép căn bậc hai khỏi vòng lặp và dùng lại bộ đệm kết quả, nhưng vẫn giữ phiên bản dễ đọc để đối chiếu.",
      expected:
        "Hai phiên bản trả về cùng danh sách hit và cùng hạt gần nhất; vector kết quả không phải cấp phát lại ở mỗi truy vấn.",
      files,
      steps: [
        {
          title: "So hai đại lượng bình phương",
          explanation:
            "Vì radius không âm, distance <= radius tương đương distance² <= radius² mà không cần gọi sqrt cho từng particle.",
        },
        {
          title: "Clear size, không hủy capacity",
          explanation:
            "`QueryWorkspace` sống qua nhiều lần gọi. `clear()` xóa kết quả cũ nhưng vẫn giữ vùng nhớ đã `reserve()` để dùng tiếp.",
        },
        {
          title: "Đối chiếu output trước timing",
          explanation:
            "Chỉ đo tốc độ sau khi hai phiên bản cho cùng kết quả. Chạy nhanh hơn nhưng bỏ sót biên hoặc chọn sai hạt gần nhất vẫn là sai.",
        },
      ],
    },
    "p27-l05": {
      focus:
        "Đo riêng thời gian truy vấn bằng một bộ dữ liệu cố định, có warm-up, số lần lặp hữu hạn và checksum để chống tối ưu bỏ kết quả.",
      expected:
        "Benchmark báo đúng số truy vấn, `totalScanned = N × Q × repetitions`, checksum lặp lại được và thời gian trung bình cho mỗi truy vấn.",
      files,
      steps: [
        {
          title: "Chuẩn bị dữ liệu trước vùng đo",
          explanation:
            "Particle generation, query generation, reserve và render không được tính vào thời gian brute-force scan.",
        },
        {
          title: "Warm-up đúng code path",
          explanation:
            "Chạy thử một lượt trước khi bật đồng hồ để cache và runtime đã đi qua đúng đoạn mã sẽ đo. Lượt này không được cộng vào kết quả.",
        },
        {
          title: "Giữ checksum cùng exact work",
          explanation:
            "Checksum phụ thuộc vào kết quả từng truy vấn; `totalScanned` xác nhận vòng lặp đã thực hiện đúng số lần kiểm dự kiến.",
        },
      ],
    },
    "p27-l06": {
      focus:
        "Giữ nguyên các vòng tròn truy vấn, chỉ tăng số hạt từ 1.000 lên 10.000 rồi 100.000 để quan sát chi phí của brute force.",
      expected:
        "Ba dòng kết quả có số lần kiểm theo tỉ lệ 1:10:100; đổi bán kính làm số hit thay đổi nhưng không làm giảm số hạt phải quét.",
      files,
      steps: [
        {
          title: "Dùng cùng particle storage và query set",
          explanation:
            "Mỗi mốc chỉ lấy một đoạn đầu của cùng vector 100.000 hạt. Không sinh ba cảnh khác nhau vì như vậy phép so sánh sẽ bị nhiễu.",
        },
        {
          title: "Đọc operation count trước timing",
          explanation:
            "Thời gian có thể dao động theo máy, còn `N × Q` là số lần kiểm xác định. Hãy đọc con số này trước để thấy trực tiếp độ phức tạp O(N).",
        },
        {
          title: "Tách radius khỏi complexity",
          explanation:
            "Bán kính lớn tạo nhiều hit hơn, nhưng brute force vẫn phải kiểm mọi hạt. Chỉ phần chi phí ghi kết quả có thể tăng thêm.",
        },
      ],
    },
    "p27-l07": {
      focus:
        "Ghép các phần thành ứng dụng hoàn chỉnh rồi kiểm dữ liệu lặp lại được, kết quả đối chiếu, số lần quét và thao tác chuột.",
      expected:
        "Bản cuối chạy với 100.000 hạt, luôn nhả chuột đúng lúc, phép đo luôn kết thúc và CTest đạt ở cả Debug lẫn Release.",
      files,
      steps: [
        {
          title: "Ghép controls nhưng giữ query thuần",
          explanation:
            "Chuột và bàn phím chỉ thay tâm, bán kính hoặc số hạt. Ứng dụng, benchmark và test cùng gọi một hàm truy vấn duy nhất.",
        },
        {
          title: "Nói rõ draw sample khác workload",
          explanation:
            "Canvas có thể chỉ vẽ 30.000 điểm để giữ giao diện mượt, nhưng thuật toán vẫn quét đủ N hạt và phần số liệu phải ghi rõ điều đó.",
        },
        {
          title: "Giữ baseline cho Project 28",
          explanation:
            "Lưu lại checksum, bộ truy vấn và bảng tăng trưởng. Project 28 sẽ dùng chính chúng để so Spatial Grid với brute force trên cùng bài toán.",
        },
      ],
    },
  },
  references: {
    "p27-l01": [
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      { label: "Row-major order", href: "/glossary#row-major-order", kind: "Thuật ngữ" },
    ],
    "p27-l02": [
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
      { label: "Circle query", href: "/glossary#circle-query", kind: "Thuật ngữ" },
    ],
    "p27-l03": [
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
      { label: "Linear complexity", href: "/glossary#linear-complexity", kind: "Thuật ngữ" },
    ],
    "p27-l04": [
      { label: "Squared distance", href: "/glossary#squared-distance", kind: "Thuật ngữ" },
      { label: "Hot loop", href: "/glossary#hot-loop", kind: "Thuật ngữ" },
    ],
    "p27-l05": [
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p27-l06": [
      { label: "Linear complexity", href: "/glossary#linear-complexity", kind: "Thuật ngữ" },
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
    ],
    "p27-l07": [
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
