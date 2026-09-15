export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  keywords?: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: "angular-velocity",
    term: "Angular velocity",
    definition:
      "Tốc độ thay đổi của góc theo thời gian, dùng đơn vị radian/giây trong Project 07. Góc mới được tính bằng angle + angularVelocity × deltaTime; dấu của vận tốc quyết định chiều quay.",
  },
  {
    id: "atan2",
    term: "atan2",
    definition:
      "Hàm nhận riêng hai thành phần y và x để suy góc của một hướng. Khác atan(y/x), atan2 phân biệt được đủ bốn góc phần tư và không cần chia cho x khi hướng nằm trên trục dọc.",
  },
  {
    id: "alpha-channel",
    term: "Alpha channel",
    definition:
      "Kênh thứ tư của màu RGBA, dùng để biểu diễn độ trong suốt. Giá trị 0 là trong suốt hoàn toàn, còn 255 là đục hoàn toàn. Alpha chỉ có ý nghĩa khi cách blend màu cũng được xác định rõ.",
  },
  {
    id: "bounds-check",
    term: "Bounds check",
    definition:
      "Kiểm tra chỉ số hoặc tọa độ trước khi truy cập bộ nhớ. Với framebuffer, bước này giúp putPixel bỏ qua điểm nằm ngoài vùng [0, width) × [0, height), thay vì ghi nhầm sang vùng nhớ khác.",
  },
  {
    id: "bresenham",
    term: "Bresenham",
    definition:
      "Thuật toán raster đường thẳng chỉ cần cộng, trừ và so sánh số nguyên. Một error term cho biết đường lý tưởng đang lệch khỏi pixel hiện tại bao xa, từ đó quyết định bước tiếp theo đi theo trục X, trục Y hay cả hai.",
  },
  {
    id: "build-directory",
    term: "Build directory",
    definition:
      "Thư mục chứa file do CMake và compiler tạo ra, chẳng hạn build/. Giữ nó tách khỏi source giúp bạn có thể xóa và configure lại mà không làm mất mã đang viết.",
  },
  {
    id: "camera-2d",
    term: "Camera2D",
    definition:
      "Tập tham số mô tả phần thế giới đang được nhìn thấy. Trong Project 05, camera gồm tâm nhìn trong world space và zoom tính bằng pixel trên mỗi world unit; đổi camera không làm đổi tọa độ gốc của vật thể.",
  },
  {
    id: "checkpoint",
    term: "Checkpoint",
    definition:
      "Một bản mã nguồn chạy độc lập, ghi lại đúng trạng thái của dự án sau một bài. Bạn có thể build checkpoint để so với chương trình của mình; nó không chứa sẵn code của những bài phía sau.",
  },
  {
    id: "cmake-target",
    term: "CMake target",
    definition:
      "Tên của một sản phẩm mà CMake biết cách build, ví dụ project_1_starter hoặc project_1_final. Chỉ định target giúp compiler dựng đúng chương trình bạn đang học, thay vì build mọi phiên bản trong gói source.",
  },
  {
    id: "configure",
    term: "Configure (CMake)",
    definition:
      "Bước CMake đọc CMakeLists.txt, kiểm tra compiler và chuẩn bị build directory. Configure chưa tạo ra chương trình chạy được; sau đó bạn vẫn cần dùng cmake --build để biên dịch và liên kết source.",
  },
  {
    id: "dda",
    term: "DDA",
    definition:
      "Digital Differential Analyzer. Thuật toán chia đoạn thẳng thành số bước bằng trục dài hơn, tăng X và Y một lượng cố định ở mỗi bước rồi làm tròn vị trí sang pixel gần nhất.",
  },
  {
    id: "delta-time",
    term: "Delta time (dt)",
    definition:
      "Khoảng thời gian thực giữa hai lần cập nhật, tính bằng giây trong khóa học này. Quãng đường của một frame được tính bằng velocity × dt, nhờ đó vật không tự chạy nhanh hơn chỉ vì máy render được nhiều frame hơn.",
  },
  {
    id: "distance",
    term: "Distance",
    definition:
      "Khoảng cách không âm giữa hai điểm. Với hai điểm A và B, distance(A,B) được tính bằng magnitude của vector B−A; nó khác với phép lấy length(A) trừ length(B).",
  },
  {
    id: "dot-product",
    term: "Dot product",
    definition:
      "Phép nhân vô hướng của hai vector: ax×bx + ay×by trong 2D. Với hai vector đơn vị, kết quả bằng cosine của góc giữa chúng: gần 1 khi cùng hướng, 0 khi vuông góc và -1 khi ngược hướng.",
  },
  {
    id: "event-loop",
    term: "Event loop",
    definition:
      "Vòng lặp lấy và xử lý các sự kiện như đóng cửa sổ, nhấn phím, di chuyển chuột hoặc đổi kích thước. Nếu không bơm event đều đặn, hệ điều hành có thể xem ứng dụng là không phản hồi.",
  },
  {
    id: "fixed-timestep",
    term: "Fixed timestep",
    definition:
      "Cập nhật mô phỏng bằng một bước thời gian cố định, chẳng hạn 1/60 giây. Cách này giúp kết quả ổn định và dễ lặp lại, dù số frame được vẽ giữa các máy có thể khác nhau.",
  },
  {
    id: "framebuffer",
    term: "Framebuffer",
    definition:
      "Mảng bộ nhớ giữ màu của từng pixel trong một frame. Ở Project 01, chương trình tự ghi vào mảng này, đưa dữ liệu sang streaming texture rồi mới yêu cầu SDL trình bày nó ra cửa sổ.",
  },
  {
    id: "input-sampling",
    term: "Input sampling",
    definition:
      "Việc đọc vị trí hoặc trạng thái input tại những thời điểm rời rạc. Khi chuột đi xa giữa hai mẫu, chỉ đóng dấu brush tại từng mẫu sẽ để lại khoảng hở; nội suy được dùng để thêm các điểm còn thiếu.",
  },
  {
    id: "linear-interpolation",
    term: "Linear interpolation (lerp)",
    definition:
      "Tạo một điểm trên đường thẳng từ start tới end bằng công thức start + (end−start) × t. Với t bằng 0, 0.5 và 1, kết quả lần lượt là start, trung điểm và end.",
  },
  {
    id: "local-space",
    term: "Local space",
    definition:
      "Hệ tọa độ riêng của một vật thể. Hình vuông trong Project 09 giữ bốn đỉnh quanh local origin; scale, rotation, shear và translation mới quyết định các đỉnh đó xuất hiện ở đâu trong world space.",
  },
  {
    id: "angle-between",
    term: "Angle between vectors",
    definition:
      "Góc không dấu nhỏ nhất giữa hai vector, nằm trong khoảng từ 0 tới π. Có thể tính bằng acos của normalized dot; công thức cần xử lý zero vector và chặn cosine về [-1,1].",
  },
  {
    id: "magnitude",
    term: "Magnitude",
    definition:
      "Độ dài của vector, tính bằng căn bậc hai của x²+y² trong 2D. Magnitude cho biết đi bao xa nhưng không cho biết hướng; ký hiệu thường dùng là |v|.",
  },
  {
    id: "interpolation",
    term: "Interpolation",
    definition:
      "Tạo các giá trị nằm giữa hai giá trị đã biết. Trong Mini Paint, chương trình nội suy các vị trí giữa previous và current để khoảng cách giữa hai lần đóng brush không vượt quá ngưỡng cho phép.",
  },
  {
    id: "invariant",
    term: "Invariant",
    definition:
      "Một điều kiện phải luôn đúng nếu thuật toán hoạt động đúng. Chẳng hạn, đường raster phải chứa cả hai endpoint và hai pixel liên tiếp không được cách nhau quá một ô theo mỗi trục.",
  },
  {
    id: "epsilon",
    term: "Epsilon",
    definition:
      "Một tolerance dương rất nhỏ dùng khi so sánh số thực. Thay vì yêu cầu d bằng 0 tuyệt đối, code xem |d|≤epsilon là nằm trên biên để kết quả ổn định trước sai số làm tròn.",
  },
  {
    id: "normalization",
    term: "Normalization",
    definition:
      "Đổi một vector khác zero thành vector cùng hướng nhưng có độ dài 1. Khi chuẩn hóa input WASD trước khi nhân với speed, chuyển động chéo không còn nhanh hơn chuyển động ngang hoặc dọc.",
  },
  {
    id: "octant",
    term: "Octant",
    definition:
      "Một trong tám vùng hướng quanh một điểm trên mặt phẳng. Kiểm thử đủ tám octant giúp phát hiện thuật toán vẽ đường chỉ đúng khi đi sang phải hoặc chỉ đúng với độ dốc nhỏ.",
  },
  {
    id: "pitch-stride",
    term: "Pitch / stride",
    definition:
      "Số byte cần đi từ đầu một hàng pixel đến đầu hàng kế tiếp. Pitch có thể lớn hơn width × bytesPerPixel vì thư viện được phép chèn phần đệm ở cuối hàng.",
  },
  {
    id: "pointer-capture",
    term: "Pointer capture",
    definition:
      "Giữ một thao tác kéo thuộc về canvas hoặc cửa sổ ngay cả khi con trỏ tạm đi ra ngoài vùng đó. Nhờ vậy nét vẽ hoặc thao tác pan không bị ngắt giữa chừng.",
  },
  {
    id: "bounding-box",
    term: "Bounding box",
    definition:
      "Hình chữ nhật nhỏ nhất song song với trục tọa độ và chứa toàn bộ primitive. Triangle rasterizer clamp bounding box vào framebuffer rồi chỉ kiểm tra các pixel trong vùng này thay vì quét cả màn hình.",
  },
  {
    id: "edge-function",
    term: "Edge function",
    definition:
      "Biểu thức orient2D(A,B,P) đo diện tích có dấu của tam giác ABP. Dấu của kết quả cho biết sample P nằm ở half-plane nào của cạnh có hướng A→B; giá trị 0 nghĩa là sample nằm trên đường cạnh.",
  },
  {
    id: "half-plane",
    term: "Half-plane",
    definition:
      "Một trong hai nửa mặt phẳng do một đường thẳng chia ra. Sau khi thống nhất winding, phần trong tam giác là giao của ba half-plane nằm về cùng phía ba cạnh.",
  },
  {
    id: "pixel-center",
    term: "Pixel center",
    definition:
      "Điểm lấy mẫu nằm giữa pixel có chỉ số nguyên (x,y), tại tọa độ (x+0.5,y+0.5). Kiểm coverage tại tâm giúp quy ước raster đối xứng và tránh dịch biên nửa pixel.",
  },
  {
    id: "coverage-test",
    term: "Coverage test",
    definition:
      "Phép quyết định một sample của pixel có thuộc primitive hay không. Với triangle winding dương, Project 16 kiểm edge function của cả ba cạnh và chỉ nhận sample thỏa đồng thời ba điều kiện.",
  },
  {
    id: "top-left-rule",
    term: "Top-left rule",
    definition:
      "Quy tắc giao sample nằm đúng trên cạnh cho một phía xác định, để hai triangle chung cạnh không cùng tô một pixel và cũng không để lại khe hở. Cạnh được nhận còn phụ thuộc quy ước winding và chiều trục Y.",
  },
  {
    id: "barycentric-coordinates",
    term: "Barycentric coordinates",
    definition:
      "Ba trọng số (wA,wB,wC) biểu diễn một điểm tương đối với ba đỉnh tam giác và có tổng bằng 1. Trong rasterizer, edge function chuẩn hóa theo area tạo các trọng số dùng để nội suy màu, depth, normal hoặc texture coordinate.",
  },
  {
    id: "rasterization",
    term: "Rasterization",
    definition:
      "Biến hình học liên tục như đoạn thẳng, hình tròn hoặc tam giác thành tập pixel rời rạc có thể tô lên framebuffer. Với tam giác, rasterizer còn quyết định coverage và nội suy thuộc tính cho từng sample được nhận.",
  },
  {
    id: "radian",
    term: "Radian",
    definition:
      "Đơn vị góc dựa trên đường tròn: một radian chắn một cung dài bằng bán kính. Một vòng bằng 2π radian. Các hàm std::sin, std::cos và std::atan2 làm việc với radian.",
  },
  {
    id: "round-trip-test",
    term: "Round-trip test",
    definition:
      "Biến đổi A → B → A rồi đo độ lệch so với giá trị ban đầu. Camera2D dùng phép thử world → screen → world để kiểm tra hai hàm có thật sự là nghịch đảo của nhau hay không.",
  },
  {
    id: "row-major-order",
    term: "Row-major order",
    definition:
      "Cách xếp mảng hai chiều thành một dãy liên tục theo từng hàng. Với lưới rộng width, pixel (x, y) nằm tại chỉ số y × width + x.",
  },
  {
    id: "affine-transform",
    term: "Affine transform",
    definition:
      "Phép biến đổi giữ đường thẳng và tính song song, gồm translation cùng các phép tuyến tính như scale, rotation và shear. Trong 2D, có thể gói toàn bộ chuỗi này vào một ma trận 3×3.",
  },
  {
    id: "determinant",
    term: "Determinant",
    definition:
      "Một scalar tóm tắt cách phần tuyến tính của phép biến đổi thay đổi diện tích và chiều. Trị tuyệt đối là tỉ lệ diện tích; determinant âm cho biết hình đã bị phản chiếu; giá trị 0 nghĩa là hình bị ép xuống đường hoặc điểm.",
  },
  {
    id: "shear",
    term: "Shear",
    definition:
      "Phép làm xiên trong đó một tọa độ nhận thêm một phần của tọa độ kia. Shear X dùng x′=x+kx×y; shear Y dùng y′=ky×x+y. Các đường thẳng và cặp cạnh song song vẫn được giữ.",
  },
  {
    id: "transformation-matrix",
    term: "Transformation matrix",
    definition:
      "Ma trận dùng để biến đổi điểm hoặc vector. Project 09 dùng ma trận 3×3, column vector [x,y,1]ᵀ và matrix multiplication để ghép nhiều phép biến đổi thành một ma trận duy nhất.",
  },
  {
    id: "screen-space",
    term: "Screen space",
    definition:
      "Hệ tọa độ gắn với vùng hiển thị. Trong khóa học, gốc nằm ở góc trên bên trái, X tăng sang phải, Y tăng xuống dưới và đơn vị thường là pixel.",
  },
  {
    id: "streaming-texture",
    term: "Streaming texture",
    definition:
      "Texture được tạo để nhận dữ liệu pixel mới thường xuyên. Project 01 dùng SDL_UpdateTexture để chép framebuffer CPU sang texture trước khi render.",
  },
  {
    id: "scalar-multiplication",
    term: "Scalar multiplication",
    definition:
      "Nhân mọi thành phần của vector với cùng một số. Scalar dương giữ hướng, scalar âm đảo hướng, còn trị tuyệt đối của scalar quyết định magnitude được co hoặc giãn bao nhiêu lần.",
  },
  {
    id: "variable-timestep",
    term: "Variable timestep",
    definition:
      "Cập nhật mô phỏng một lần cho mỗi frame bằng dt vừa đo được. Cách này trực tiếp và dễ bắt đầu, nhưng cần chặn dt quá lớn khi cửa sổ bị kéo, pause hoặc debugger dừng chương trình.",
  },
  {
    id: "unit-circle",
    term: "Unit circle",
    definition:
      "Đường tròn bán kính 1 đặt tại gốc tọa độ. Điểm ứng với angle có tọa độ (cos(angle), sin(angle)), vì vậy unit circle nối trực tiếp góc với một vector hướng có độ dài 1.",
  },
  {
    id: "vector-projection",
    term: "Vector projection",
    definition:
      "Phần của một vector nằm dọc theo một hướng được chọn. Với trục đơn vị u, projection của v là u×dot(v,u); phần còn lại v−projection được gọi là rejection và vuông góc với u.",
  },
  {
    id: "cross-product-2d",
    term: "2D cross product",
    definition:
      "Trong 2D, biểu thức ax×by−ay×bx cho thành phần Z của cross product. Dấu dương hoặc âm cho biết vector thứ hai nằm bên trái hay bên phải vector thứ nhất, nên có thể dùng để chọn chiều quay.",
  },
  {
    id: "view-cone",
    term: "View cone",
    definition:
      "Vùng hướng mà cảm biến hoặc vật thể được xem là đang nhìn thấy mục tiêu. Trong 2D, mục tiêu nằm trong cone khi góc lệch không vượt halfAngle; có thể kiểm tra bằng normalized dot ≥ cos(halfAngle).",
  },
  {
    id: "world-space",
    term: "World space",
    definition:
      "Hệ tọa độ của mô hình hoặc thế giới, không phụ thuộc vào kích thước cửa sổ. Camera đổi world space sang screen space để pan và zoom mà không phải sửa dữ liệu gốc.",
  },
  {
    id: "vector-3d",
    term: "Vector 3D",
    definition:
      "Một độ dời có hướng trong không gian, lưu bằng ba thành phần x, y và z. Các phép cộng, trừ, nhân scalar và dot product vẫn làm theo từng thành phần; thành phần thứ ba cho phép biểu diễn hướng ra khỏi mặt phẳng 2D.",
  },
  {
    id: "axonometric-projection",
    term: "Axonometric projection",
    definition:
      "Cách vẽ sơ đồ 3D bằng các trục nghiêng song song mà không làm vật ở xa nhỏ lại. Project 10 dùng một phép chiếu axonometric cố định để nhìn thấy X/Y/Z trên Canvas; đây chưa phải perspective projection hay camera 3D hoàn chỉnh.",
  },
  {
    id: "cross-product",
    term: "Cross product",
    definition:
      "Phép toán nhận hai vector 3D và trả một vector vuông góc với cả hai. Độ dài kết quả bằng diện tích hình bình hành do hai vector dựng nên; đổi thứ tự hai đầu vào làm kết quả đổi dấu.",
  },
  {
    id: "normal-vector",
    term: "Normal vector",
    definition:
      "Vector vuông góc với một mặt. Với tam giác ABC, raw normal được tính bằng (B−A)×(C−A); unit normal là kết quả sau khi chuẩn hóa và chỉ còn thông tin về hướng.",
  },
  {
    id: "winding-order",
    term: "Winding order",
    definition:
      "Thứ tự đi qua các đỉnh quanh một polygon. Đổi tam giác từ A-B-C sang A-C-B không đổi vị trí ba điểm hoặc diện tích, nhưng làm cross product và normal đổi hướng.",
  },
  {
    id: "degenerate-triangle",
    term: "Degenerate triangle",
    definition:
      "Tam giác không còn diện tích vì ba điểm thẳng hàng hoặc có điểm trùng nhau. Hai vector cạnh khi đó phụ thuộc tuyến tính, cross product gần zero và unit normal không có hướng xác định.",
  },
  {
    id: "vector-2d",
    term: "Vector 2D",
    definition:
      "Một độ dời có hướng trên mặt phẳng, lưu bằng hai thành phần x và y. Khi vẽ từ gốc, hai thành phần cũng chính là tọa độ endpoint, nhưng về ý nghĩa vector mô tả ‘đi bao xa theo hướng nào’ chứ không chỉ ‘đang ở đâu’.",
  },
  {
    id: "vector-addition",
    term: "Vector addition",
    definition:
      "Cộng các thành phần tương ứng: (ax,ay)+(bx,by)=(ax+bx,ay+by). Về hình học, A+B nằm tại góc đối diện của hình bình hành dựng từ A và B.",
  },
  {
    id: "vector-subtraction",
    term: "Vector subtraction",
    definition:
      "Trừ các thành phần tương ứng. A−B là độ dời cần đi từ endpoint B tới endpoint A, không phải hiệu giữa hai magnitude.",
  },
  {
    id: "zero-vector",
    term: "Zero vector",
    definition:
      "Vector có mọi thành phần bằng 0. Nó có magnitude bằng 0 nhưng không có hướng xác định; vì vậy normalize phải xử lý riêng thay vì chia cho độ dài.",
  },
  {
    id: "zoom-anchor",
    term: "Zoom anchor",
    definition:
      "Điểm được giữ cố định khi thay đổi zoom. Với cursor-anchored zoom, world point đang nằm dưới con trỏ phải trở lại đúng vị trí con trỏ sau khi scale thay đổi.",
  },
  {
    id: "camera-space",
    term: "Camera space",
    definition:
      "Hệ tọa độ lấy camera làm gốc. Trong Project 11 camera chưa xoay, vì vậy camera point được tính bằng world point trừ camera position; Z dương nghĩa là point nằm phía trước camera.",
  },
  {
    id: "perspective-projection",
    term: "Perspective projection",
    definition:
      "Phép chiếu làm vật ở xa trông nhỏ hơn bằng cách chia độ lệch X/Y cho depth Z. Project 11 tự dựng chuỗi camera space → perspective divide → NDC → pixel trên CPU.",
  },
  {
    id: "perspective-divide",
    term: "Perspective divide",
    definition:
      "Bước đổi camera point (x,y,z) thành (x/z,y/z). Công thức xuất phát từ tam giác đồng dạng và chỉ an toàn sau khi xác nhận Z nằm phía trước camera, ngoài vùng near plane.",
  },
  {
    id: "similar-triangles",
    term: "Similar triangles",
    definition:
      "Hai tam giác có các góc tương ứng bằng nhau nên các cạnh tương ứng cùng một tỉ lệ. Trong perspective projection, tam giác từ camera tới point và tam giác tới mặt phẳng ảnh cho quan hệ x′/1=x/z và y′/1=y/z.",
  },
  {
    id: "field-of-view",
    term: "Field of view (FOV)",
    definition:
      "Góc mở của camera. Vertical FOV là góc từ cạnh dưới tới cạnh trên của khung nhìn; FOV lớn cho góc nhìn rộng và làm cùng một point xuất hiện gần tâm màn hình hơn.",
  },
  {
    id: "aspect-ratio",
    term: "Aspect ratio",
    definition:
      "Tỉ số chiều rộng trên chiều cao của viewport. Khi lens dùng vertical FOV, thành phần NDC X phải xét aspect ratio để resize cửa sổ không làm hình bị kéo méo.",
  },
  {
    id: "normalized-device-coordinates",
    term: "Normalized device coordinates (NDC)",
    definition:
      "Hệ tọa độ chuẩn hóa sau projection, độc lập với số pixel. Trong khóa học, tâm viewport là (0,0), cạnh trái/phải là X=−1/+1 và cạnh dưới/trên là Y=−1/+1.",
  },
  {
    id: "near-plane",
    term: "Near plane",
    definition:
      "Mặt phẳng gần nhất trước camera mà point được phép đi qua projection. Loại bỏ vùng 0<Z<near tránh phép chia tạo số cực lớn và dành một khoảng an toàn quanh camera.",
  },
  {
    id: "half-space",
    term: "Half-space",
    definition:
      "Một trong hai miền do một mặt phẳng chia không gian. Với near plane của khóa học, half-space được giữ có z−near≥0; clipping loại phần primitive nằm ở miền còn lại.",
  },
  {
    id: "segment-plane-intersection",
    term: "Segment–plane intersection",
    definition:
      "Giao điểm giữa một đoạn thẳng và mặt phẳng. Với near plane z=near, tham số trên cạnh start→end là t=(near−start.z)/(end.z−start.z); cùng t phải được dùng cho position và mọi vertex attribute.",
  },
  {
    id: "vertex-attribute",
    term: "Vertex attribute",
    definition:
      "Dữ liệu đi kèm một vertex ngoài position, chẳng hạn color, normal hoặc texture coordinates. Khi clipping sinh vertex mới, các attribute cũng phải được nội suy tại đúng giao điểm.",
  },
  {
    id: "clipping",
    term: "Clipping",
    definition:
      "Cắt primitive theo biên của vùng nhìn thấy trước khi projection hoặc rasterization. Phần ở trong được giữ, cạnh crossing sinh giao điểm mới và phần ở ngoài bị loại.",
  },
  {
    id: "sutherland-hodgman",
    term: "Sutherland–Hodgman clipping",
    definition:
      "Thuật toán duyệt tuần tự các cạnh polygon qua một hoặc nhiều clipping plane. Mỗi cặp previous/current được xử lý theo bốn chuyển trạng thái in→in, in→out, out→in và out→out.",
  },
  {
    id: "triangle-fan",
    term: "Triangle fan",
    definition:
      "Cách chia một polygon lồi thành các triangle (v0,vi,vi+1). Polygon bốn đỉnh sau near-plane clipping trở thành hai triangle dùng chung đường chéo v0–v2.",
  },
  {
    id: "view-frustum",
    term: "View frustum",
    definition:
      "Thể tích camera có thể nhìn thấy, có dạng chóp cụt trong perspective projection. Với một point đã qua perspective divide, kiểm tra |NDC.x|≤1 và |NDC.y|≤1 cho biết nó nằm trong biên trái/phải/trên/dưới của frustum.",
  },
  {
    id: "wireframe",
    term: "Wireframe",
    definition:
      "Cách hiển thị hình 3D chỉ bằng vertex và edge, chưa tô kín bề mặt. Project 12 nối một tam giác; Project 13 dùng cùng ý tưởng cho cube có tám vertex và mười hai edge.",
  },
  {
    id: "vertex-index",
    term: "Vertex index",
    definition:
      "Số nguyên dùng để tham chiếu một vertex trong array. Edge chỉ cần lưu hai index thay vì sao chép tọa độ, nên nhiều edge có thể dùng chung đúng một vertex đã transform và project.",
  },
  {
    id: "edge-list",
    term: "Edge list",
    definition:
      "Danh sách các cặp vertex index mô tả những điểm cần nối. Với cube, edge list có 12 cặp: bốn cạnh ở mỗi lớp Z và bốn cạnh nối hai lớp.",
  },
  {
    id: "mesh-topology",
    term: "Mesh topology",
    definition:
      "Cấu trúc kết nối giữa vertex, edge và face, độc lập với vị trí cụ thể của chúng. Rotation thay tọa độ vertex nhưng không làm thay đổi topology của cube.",
  },
  {
    id: "depth-cue",
    term: "Depth cue",
    definition:
      "Cách dùng độ sáng, độ đậm hoặc màu để gợi ý khoảng cách tới camera. Depth cue giúp wireframe dễ đọc hơn nhưng không xác định chính xác phần nào bị bề mặt che khuất và không thay thế Z-buffer.",
  },
  {
    id: "pivot",
    term: "Pivot",
    definition:
      "Điểm làm tâm của một phép biến đổi. Muốn xoay model quanh pivot, trước hết trừ pivot để đưa vertex về quanh local origin, thực hiện rotation rồi cộng model position trở lại.",
  },
  {
    id: "rotation-3d",
    term: "3D rotation",
    definition:
      "Phép đổi orientation trong không gian nhưng giữ khoảng cách và góc. Rotation quanh một trục giữ thành phần trên trục đó, đồng thời xoay hai thành phần còn lại như một rotation 2D bằng sin/cos.",
  },
  {
    id: "euler-angles",
    term: "Euler angles",
    definition:
      "Ba angle mô tả orientation bằng các rotation tuần tự quanh ba trục. Khóa học gọi rotation X là pitch, Y là yaw và Z là roll; kết quả còn phụ thuộc rotation order.",
  },
  {
    id: "rotation-order",
    term: "Rotation order",
    definition:
      "Thứ tự áp dụng các rotation thành phần. XYZ nghĩa là xoay quanh X rồi Y rồi Z; với angle tổng quát, đổi thành ZYX thường tạo orientation khác.",
  },
  {
    id: "non-commutative",
    term: "Non-commutative",
    definition:
      "Tính chất trong đó đổi thứ tự hai phép toán làm kết quả thay đổi. Rotation 3D nói chung không giao hoán: rotateX rồi rotateY không giống rotateY rồi rotateX.",
  },
  {
    id: "mouse-delta",
    term: "Mouse delta",
    definition:
      "Độ dời của chuột kể từ mouse-motion event trước, thường ghi bằng deltaX/deltaY hoặc xrel/yrel. Nhân delta với sensitivity cho lượng angle cần thay đổi mà không phụ thuộc vị trí tuyệt đối của cursor.",
  },
  {
    id: "fps-camera",
    term: "FPS camera",
    definition:
      "Camera góc nhìn thứ nhất đặt người xem tại một position và dùng yaw/pitch để xác định hướng nhìn. Trong Project 14, camera đi trên mặt phẳng XZ ở eye height cố định; pitch chỉ đổi hướng nhìn chứ không làm phím W khiến người xem bay lên.",
  },
  {
    id: "view-transform",
    term: "View transform",
    definition:
      "Phép đổi world point sang hệ trục của camera. Nó hoàn tác pose của camera: trừ camera position rồi áp dụng các rotation nghịch đảo theo thứ tự ngược với orientation, sau đó mới đưa camera-space point qua projection.",
  },
  {
    id: "camera-basis",
    term: "Camera basis",
    definition:
      "Ba vector đơn vị forward, right và up mô tả các trục của camera trong world space. Một basis đúng phải có magnitude gần 1 cho từng vector và dot product gần 0 cho mọi cặp trục khác nhau.",
  },
  {
    id: "relative-mouse-mode",
    term: "Relative mouse mode",
    definition:
      "Chế độ chuột báo độ dịch chuyển liên tục thay vì buộc ứng dụng theo dõi vị trí cursor tuyệt đối. Nó phù hợp với mouse look vì thao tác không dừng khi cursor chạm mép cửa sổ; ứng dụng phải có đường nhả mode rõ ràng khi mất focus hoặc người dùng nhấn Escape.",
  },
  {
    id: "room-bounds",
    term: "Room bounds",
    definition:
      "Các giới hạn min/max của căn phòng trong world space. Camera được clamp vào khoảng bounds đã trừ một margin nhỏ để tâm người xem không chạm hoặc vượt qua mặt tường.",
  },
  {
    id: "pipeline-trace",
    term: "Pipeline trace",
    definition:
      "Bản ghi giữ riêng giá trị của cùng một vertex tại từng stage. Project 15 lưu Local, World, Camera, Clip, NDC và Screen để người học có thể tìm chính xác stage đầu tiên tạo ra kết quả sai.",
  },
  {
    id: "homogeneous-coordinates",
    term: "Homogeneous coordinates",
    definition:
      "Cách thêm thành phần w vào vector 3D. Point dùng w=1 nên nhận translation; direction dùng w=0 nên chỉ nhận scale và rotation. Projection còn dùng w làm mẫu số cho perspective divide.",
  },
  {
    id: "column-vector",
    term: "Column vector",
    definition:
      "Quy ước viết vector thành một cột ở bên phải matrix. Với quy ước này, A×B×v áp dụng B trước rồi mới A; vì vậy MVP được ghép thành Projection×View×Model.",
  },
  {
    id: "model-matrix",
    term: "Model matrix",
    definition:
      "Ma trận đổi vertex từ local space của vật thể sang world space. Trong Project 15, Model = Translation×RotationY×Scale nên scale chạy trước, sau đó rotation rồi translation.",
  },
  {
    id: "view-matrix",
    term: "View matrix",
    definition:
      "Dạng ma trận của view transform. Nó hoàn tác camera pose để đưa world point sang camera space; với column vector, inverse translation nằm gần world point và các inverse rotation nằm bên trái theo thứ tự cần áp dụng.",
  },
  {
    id: "clip-space",
    term: "Clip space",
    definition:
      "Hệ tọa độ bốn thành phần ngay sau projection matrix và trước perspective divide. Clip X/Y/Z vẫn chưa phải NDC; clip.w giữ mẫu số, thường là camera-space depth trong quy ước của khóa học.",
  },
  {
    id: "viewport-transform",
    term: "Viewport transform",
    definition:
      "Phép đổi NDC sang pixel của vùng vẽ. NDC X/Y từ [-1,+1] được ánh xạ vào chiều rộng/chiều cao; trục Y đồng thời bị đảo vì framebuffer tăng xuống dưới.",
  },
  {
    id: "mvp-matrix",
    term: "MVP matrix",
    definition:
      "Ma trận ghép Model, View và Projection. Với column vector, MVP = Projection×View×Model; nhân MVP với local vertex cho cùng clip point như chạy riêng ba stage theo đúng thứ tự.",
  },
];
