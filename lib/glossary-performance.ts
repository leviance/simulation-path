export const performanceGlossaryTerms = [
  {
    id: "circle-query",
    term: "Circle query",
    definition:
      "Truy vấn tìm các điểm nằm trong một đường tròn xác định bởi center và radius. Project 27 dùng world-space circle quanh con trỏ; boundary được nhận bằng điều kiện distance ≤ radius.",
  },
  {
    id: "brute-force-query",
    term: "Brute-force query",
    definition:
      "Cách kiểm lần lượt mọi phần tử có thể là đáp án, không dùng cấu trúc tăng tốc để loại candidate. Với N particles, mỗi circle query của Project 27 luôn đọc N positions.",
  },
  {
    id: "squared-distance",
    term: "Squared distance",
    definition:
      "Bình phương khoảng cách Euclid: dx²+dy² trong 2D. Khi chỉ cần so với một radius không âm, distance² ≤ radius² cho cùng kết quả với distance ≤ radius nhưng không cần tính căn bậc hai cho từng candidate.",
  },
  {
    id: "hot-loop",
    term: "Hot loop",
    definition:
      "Đoạn lặp được thực thi rất nhiều lần và chiếm phần đáng kể của workload. Trong Project 27, vòng quét particles là hot loop; allocation, sqrt hoặc logging đặt bên trong đều được nhân lên theo N.",
  },
  {
    id: "benchmark-warm-up",
    term: "Benchmark warm-up",
    definition:
      "Một hoặc vài lượt chạy trước khi bắt đầu timer để code path, cache và runtime đi qua trạng thái khởi động. Warm-up phải dùng cùng workload nhưng không được cộng vào queryCount hoặc elapsed time được báo cáo.",
  },
  {
    id: "benchmark-checksum",
    term: "Benchmark checksum",
    definition:
      "Giá trị gộp từ output của mọi lượt benchmark. Nó giúp xác nhận các lần chạy xử lý cùng dữ liệu và khiến kết quả tính toán vẫn được sử dụng, thay vì biến thành công việc không quan sát được.",
  },
  {
    id: "linear-complexity",
    term: "Linear complexity — O(N)",
    definition:
      "Chi phí tăng tỉ lệ với số phần tử N. Brute-force particle query kiểm đúng N candidates cho mỗi query, nên tăng cloud từ 10.000 lên 100.000 làm exact scan count tăng mười lần.",
  },
  {
    id: "spatial-grid",
    term: "Spatial Grid",
    definition:
      "Cấu trúc chia một vùng không gian thành các cell đều nhau rồi lưu index của object theo cell. Circle query chỉ mở những bucket ở gần vùng tìm kiếm, nhờ đó thường kiểm ít candidates hơn quét toàn bộ scene.",
  },
  {
    id: "cell-coordinate",
    term: "Cell coordinate",
    definition:
      "Cặp số nguyên (column,row) xác định một cell trong Spatial Grid. Với grid đều, world position được đổi về cell bằng floor((position−minimum)/cellSize), sau đó xử lý boundary trước khi tạo row-major index.",
  },
  {
    id: "spatial-bucket",
    term: "Spatial bucket",
    definition:
      "Danh sách object indices thuộc cùng một cell. Bucket là index phụ, không phải bản sao của object; tổng entry bằng số object nếu mỗi object điểm được chèn đúng một lần.",
  },
  {
    id: "conservative-candidate-set",
    term: "Conservative candidate set",
    definition:
      "Tập ứng viên được phép chứa false positive nhưng không được bỏ sót đáp án thật. Project 28 dùng các cell chạm AABB của circle làm candidate set rồi chạy exact distance test để loại phần nằm ngoài circle.",
  },
  {
    id: "grid-cell-size",
    term: "Grid cell size",
    definition:
      "Chiều rộng và chiều cao cell của uniform grid. Cell nhỏ thường giảm số candidates trong mỗi bucket nhưng tăng số cell phải duyệt và lượng metadata; cell lớn tạo ít bucket hơn nhưng mỗi bucket đông hơn.",
  },
  {
    id: "quadtree",
    term: "Quadtree",
    definition:
      "Cấu trúc phân vùng 2D trong đó một node có thể chia thành bốn child: south-west, south-east, north-west và north-east. Vùng đông dữ liệu có thể chia sâu hơn vùng thưa, thay vì dùng một cellSize cố định trên toàn world.",
  },
  {
    id: "quadtree-node",
    term: "Quadtree node",
    definition:
      "Một vùng AABB trong Quadtree. Leaf node giữ particle indices; internal node giữ bốn child indices và không còn giữ những particles đã được redistribute.",
  },
  {
    id: "leaf-capacity",
    term: "Leaf capacity",
    definition:
      "Số phần tử một leaf được phép giữ trước khi thử split. Capacity nhỏ thường tạo nhiều node và ít candidates mỗi leaf; capacity lớn tạo cây gọn hơn nhưng query có thể exact-test nhiều points hơn.",
  },
  {
    id: "spatial-pruning",
    term: "Spatial pruning",
    definition:
      "Bỏ qua toàn bộ một node hoặc subtree khi bounds của nó không thể chứa đáp án cho query hiện tại. Pruning chỉ tạo candidate set; leaf còn overlap vẫn cần exact geometric test.",
  },
  {
    id: "maximum-tree-depth",
    term: "Maximum tree depth",
    definition:
      "Giới hạn số lần Quadtree được đi từ root xuống child. Đây là guard bắt buộc khi nhiều points trùng vị trí hoặc density quá cao, giúp split recursion luôn hữu hạn.",
  },
  {
    id: "octree",
    term: "Octree",
    definition:
      "Cấu trúc phân vùng 3D trong đó mỗi internal node chia AABB của nó thành tám octant. Project 30 dùng Octree để vùng point cloud đông tự chia sâu, còn query volume có thể prune cả subtree không overlap.",
  },
  {
    id: "octant-3d",
    term: "Octant (3D)",
    definition:
      "Một trong tám phần của không gian quanh ba mặt phẳng giữa. Project 30 mã hóa positive X, Y, Z bằng ba bit 1, 2, 4; point đúng split plane đi về positive half để chỉ có một octant.",
  },
  {
    id: "octree-node",
    term: "Octree node",
    definition:
      "Một AABB 3D trong Octree. Leaf node giữ point indices; internal node giữ tám child indices liên tiếp và không còn giữ indices đã được redistribute.",
  },
  {
    id: "aabb-volume",
    term: "AABB volume",
    definition:
      "Hộp 3D song song với các trục X, Y, Z, lưu bằng minimum và maximum. Point-in-volume kiểm ba đoạn đóng; hai hộp chạm mặt vẫn overlap để không prune mất boundary hit.",
  },
  {
    id: "n-body-system",
    term: "N-body system",
    definition:
      "Hệ gồm N body cùng tác dụng lực lên nhau. Trong Project 31, mỗi body có position, velocity và mass; direct gravity cần N×(N−1) tương tác có hướng cho một full acceleration pass.",
  },
  {
    id: "center-of-mass",
    term: "Center of mass",
    definition:
      "Vị trí trung bình có trọng số khối lượng: Σ(mᵢpᵢ)/Σmᵢ. Mass Octree lưu tổng mass và center of mass để một node ở đủ xa có thể đại diện cho toàn subtree.",
  },
  {
    id: "gravitational-softening",
    term: "Gravitational softening",
    definition:
      "Tham số độ dài epsilon được thêm dưới dạng ε² vào squared distance của lực hấp dẫn. Nó giữ acceleration hữu hạn ở cự ly rất gần; quá lớn sẽ làm yếu cả lực thật cần mô phỏng.",
  },
  {
    id: "quadratic-complexity",
    term: "Quadratic complexity — O(N²)",
    definition:
      "Chi phí tăng theo bình phương kích thước dữ liệu. Direct N-body tính N−1 nguồn cho mỗi trong N target, nên tăng N gấp đôi làm interaction count gần gấp bốn.",
  },
  {
    id: "barnes-hut",
    term: "Barnes–Hut",
    definition:
      "Thuật toán xấp xỉ lực nhiều vật thể bằng cây phân vùng không gian. Một subtree đủ xa được thay bằng nguồn có total mass và center of mass; node gần target tiếp tục được mở.",
  },
  {
    id: "opening-angle",
    term: "Barnes–Hut opening angle",
    definition:
      "Ngưỡng theta trong điều kiện s/d < theta, với s là kích thước node và d là khoảng cách từ target tới center of mass. Theta nhỏ thường giảm sai số nhưng tăng traversal/exact work.",
  },
  {
    id: "symplectic-euler",
    term: "Symplectic Euler",
    definition:
      "Tên thường dùng trong mô phỏng cơ học cho semi-implicit Euler: cập nhật velocity từ acceleration trước, rồi tiến position bằng velocity mới. Đây vẫn là integrator bậc một nhưng thường giữ quỹ đạo bounded tốt hơn explicit Euler.",
  },
  {
    id: "memory-layout",
    term: "Memory layout",
    definition:
      "Cách các field và phần tử được đặt thành byte trong bộ nhớ. Project 32 giữ nguyên particle state nhưng đổi giữa AoS và SoA để đo khoảng cách giữa những field mà hot loop thực sự cần.",
  },
  {
    id: "array-of-structures",
    term: "Array of Structures — AoS",
    definition:
      "Mảng trong đó mỗi phần tử là một struct hoàn chỉnh. `std::vector<ParticleAoS>` của Project 32 đặt position xyz và velocity xyz của particle 0 cạnh nhau, rồi mới tới sáu field của particle 1.",
  },
  {
    id: "structure-of-arrays",
    term: "Structure of Arrays — SoA",
    definition:
      "Cấu trúc giữ mỗi field trong một mảng liên tục riêng, chẳng hạn `positionX[0..N)` và `velocityX[0..N)`. Particle index nối những giá trị thuộc cùng particle giữa các mảng.",
  },
  {
    id: "cache-line",
    term: "Cache line",
    definition:
      "Khối byte liên tiếp được chuyển giữa các tầng cache và memory như một đơn vị. Project 32 dùng mô hình line 64 byte để phân biệt 4 byte field hữu ích với toàn bộ byte phải nạp cùng nó.",
  },
  {
    id: "memory-stride",
    term: "Memory stride",
    definition:
      "Khoảng byte từ một giá trị cần đọc tới giá trị cùng field của phần tử kế tiếp. Với particle sáu float, stride của `positionX` là 24 byte trong AoS nhưng chỉ 4 byte trong SoA.",
  },
  {
    id: "spatial-locality",
    term: "Spatial locality",
    definition:
      "Khả năng code sắp dùng tiếp dữ liệu nằm gần byte vừa đọc. Một hot loop quét `positionX` trong SoA có locality tốt vì nhiều giá trị kế tiếp cùng nằm trên cache line đã nạp.",
  },
  {
    id: "benchmark-median",
    term: "Benchmark median",
    definition:
      "Giá trị đứng giữa sau khi sắp các timing sample. Median ít bị một lần ngắt bất thường kéo lệch hơn mean, nhưng vẫn phải đi cùng workload, repetitions, checksum và môi trường build rõ ràng.",
  },
] as const;
