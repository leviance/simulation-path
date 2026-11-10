# Project 41 — Xưởng hình học 3D

Thử thay cách biến hai tham số `u` và `v` thành tọa độ 3D. Cùng một lưới có thể ôm quanh một vòng tròn, xoắn thành dải Möbius hoặc chạy dọc đường cong để tạo vỏ ốc và nút thắt. Khi hai mép gặp nhau, vị trí trùng nhau chưa đủ: còn phải xét chiều của cạnh, hướng pháp tuyến và UV.

Ứng dụng SDL3/OpenGL có bốn preset, camera và bảng kéo tham số. Bật UV, wireframe, tangent/normal hoặc đường nối để tìm xem chỗ gãy xuất phát từ hình học hay cách vẽ. Đổi chế độ xem không dựng lại mesh.

## Dựng hình và đường nối

| Preset     | Dựng hình                                      | Hai mép gặp nhau thế nào?                                        |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| Torus      | Hai góc quanh vòng lớn và vòng tiết diện       | Tuần hoàn ở cả `u` và `v`, cùng hướng normal                      |
| Vỏ ốc      | Tiết diện elip đi dọc đường xoắn ngày càng rộng | Hai đầu theo `u` để mở; tiết diện theo `v` khép kín                |
| Möbius     | Quay bề rộng của dải theo số nửa vòng lẻ        | Cuối `u` nối với đầu theo thứ tự `v` đảo; hướng normal bị lật      |
| Torus knot | Tiết diện elip đi dọc một đường cong kín        | Bù dần góc xoay còn dư theo độ dài cung để khép đường nối `u`      |

Torus và Möbius tính tangent bằng đạo hàm giải tích. Ở hai dạng sweep, mỗi tiết diện dùng frame từ tiết diện trước, chỉ xoay đủ để tangent cũ khớp tangent mới. Tangent theo `u` của bề mặt lấy từ hai hàng lân cận, dùng bước `1 / uSegments`; ở đầu mở dùng sai phân một phía. Renderer chiếu sáng mặt đang thấy của Möbius bằng `gl_FrontFacing`, không cố gán một hướng normal liên tục cho cả dải.

Đỉnh được nhân ở đường nối để giữ UV của từng mép. Đây là đường nối hình học, không phải phép hàn chỉ số để tạo một mesh kín. Giới hạn bán kính, bề rộng và subdivision tránh nhiều cấu hình suy biến, nhưng không bảo đảm loại mọi tự giao khi tăng bề dày hoặc ép các vòng vỏ ốc lại gần nhau.

Mesh ở mức 256×256 ô có 66.049 bản ghi đỉnh và 131.072 tam giác. Bộ đếm trên bảng chỉ tính payload đỉnh và chỉ số của mesh đang vẽ, không phải tổng RAM hay VRAM. Khi kéo, ứng dụng lấy yêu cầu mới nhất và dựng preview tối đa 65×17 mẫu; chưa dựng lưới đầy đủ trong lúc giữ chuột. Khi buông, lưới đầy đủ tiến tối đa tám hàng mỗi frame. CPU chỉ chuyển sang mesh mới sau khi GPU đã chứa đủ payload. Hủy hoặc gặp cấu hình lỗi sẽ bỏ công việc đang làm và giữ bản đầy đủ gần nhất.

## Chạy bản hoàn chỉnh từ ZIP

Cần CMake 3.24+, compiler C++20 và driver hỗ trợ OpenGL 3.3. Giải nén ZIP vào một thư mục mới, mở terminal cạnh `CMakeLists.txt`. CMake mặc định tải đúng SDL 3.4.8; nếu đã cài bản này, thêm `-DCOURSE_USE_INSTALLED_SDL3=ON -DSDL3_DIR=<thư mục chứa SDL3Config.cmake>` khi configure.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Release --parallel 2 --target project_41_final
.\build\Release\project_41_final.exe --seconds 120
```

Đường dẫn trên dùng Visual Studio. Với generator một cấu hình, executable nằm ngay trong `build`; thêm `-DCMAKE_BUILD_TYPE=Release` khi configure nếu cần. Bỏ `--seconds 120` nếu muốn để cửa sổ mở đến khi nhấn Esc. Thêm target `project_41_starter` hoặc `project_41_checkpoint_1` (đến `project_41_checkpoint_9`) để chạy từng mốc.

Nếu làm việc trong kho mã, chạy `npm run generate:course` ở thư mục gốc để sinh `CMakeLists.txt` và các snapshot, rồi configure tại thư mục Project 41 như trên.

- `1–4`: torus, vỏ ốc, Möbius, torus knot. Kéo chuột trái để xoay góc nhìn, nút giữa hoặc phải để pan, cuộn để zoom.
- `A/D`: bán kính đường dẫn; `J/L`: bán kính ống hoặc nửa bề rộng dải; `[/]`: độ phân giải; `,/.`: độ xoắn của tiết diện hoặc dải.
- `G/H`: tốc độ nở của vỏ ốc; `T/Y`: số vòng của vỏ ốc; `K`: đổi knot ba múi/năm múi.
- `W/U/N/S`: wireframe, UV, tangent/normal, đường nối; `B`: lưới sàn. Normal màu xanh ngọc, tangent màu vàng. Nhấn Tab để ẩn hoặc mở lại bảng điều khiển.
- `R`: về tham số mặc định của preset; `X`: hủy bản đang dựng; `E`: xuất OBJ của mesh đầy đủ đang có; Esc: đóng.

OBJ lưu trong một thư mục `export-N` mới dưới thư mục dữ liệu ứng dụng `SimulationPath/GeometryWorkshop` do SDL chọn. Ứng dụng đọc lại file vừa ghi để kiểm vị trí, UV, normals và chỉ số tam giác trước khi đặt tên `geometry.obj`. File không chứa tangent và bộ đọc chỉ kiểm tập con OBJ do ứng dụng này xuất, không phải trình nhập OBJ đa dụng.

## Kiểm phần hình học

Các test hình học chạy không cần cửa sổ. Sau khi configure gói ZIP với `BUILD_TESTING=ON`, chạy:

```powershell
cmake --build build --config Release --parallel 2 --target project_41_tests
ctest --test-dir build -C Release --output-on-failure --timeout 15
.\build\Release\project_41_final.exe --hidden --frames 50 --preset knot --resolution 256 --exercise-view
.\build\Release\project_41_final.exe --hidden --frames 50 --preset knot --resolution 256 --export-dir knot-export
```

Đổi `knot-export` sang một tên chưa tồn tại mỗi lần xuất. Hai lượt `--hidden` cần context OpenGL dù không mở cửa sổ; chúng kiểm đúng 66.049 đỉnh, 131.072 tam giác, 4.479.020 byte payload trên build Windows, và lượt xuất đọc lại OBJ trước khi báo thành công.

CTest Debug và Release trên Visual Studio 2022 đã kiểm các mốc torus, đường nối đảo của Möbius, frame sweep, winding, giới hạn kích thước, đổi yêu cầu khi dựng, preview/last-good và đọc lại OBJ. Test bố cục kiểm vùng click tại 740×600, 1200×800, 1920×1080 và cách đổi viewport ở DPI 2×. Lượt kiểm riêng dùng context ẩn trên RTX 3050 Laptop (OpenGL 3.3) đã vẽ cả bốn preset; torus knot 256×256 được upload đầy đủ và xuất OBJ đọc lại đúng. Sự kiện SDL mô phỏng kiểm chọn preset, kéo đến ngoài mép track, buông chuột, mất focus và hủy. Kết quả đó không thay kiểm capture của hệ điều hành.

## Kiểm trực tiếp trước khi nghiệm thu

1. Chọn Shell. Giữ và kéo Growth: preview phải đổi hình, bảng ghi `PREVIEW` và `RELEASE TO REFINE`. Buông để thấy số hàng tiến dần đến mesh đầy đủ.
2. Đổi sang Knot, kéo resolution lên 256×256. Thử xoay camera trong lúc đang dựng; hủy hoặc đổi preset giữa chừng không được hiển thị mesh cũ dưới tên mới.
3. Kéo một thanh ra ngoài cửa sổ rồi buông. Thử lại bằng cách chuyển focus khi đang giữ. Quay lại phải điều khiển được camera ngay; rê chuột không được tiếp tục thay tham số.
4. Bật UV, tangent/normal và seam ở Möbius, rồi tắt để xem bề mặt có ánh sáng ở cả hai mặt. Thử Tab ẩn bảng, Reset và Export OBJ.

Các ca chuột thật ở trên chưa được nghiệm thu. Chuỗi sự kiện tự động dùng cùng handler nhưng không thay được lần thử buông chuột ở ngoài cửa sổ.

## Giáo trình và checkpoint

Chọn Project 41 trong Phần VIII của Lộ trình để đọc đề bài và thử sức trước khi xem lời giải. Hãy bắt đầu với cửa sổ và lưới sàn trong `starter/`, dựng một mảnh mặt có ánh sáng rồi thử nối nó thành torus. Khi bí ở bước nào, mở bài và checkpoint tương ứng.

| Mốc | Bạn sẽ nhìn thấy hoặc kiểm được gì? |
| --- | --- |
| Starter | Cửa sổ, camera và lưới sàn; chưa có evaluator hay mesh. |
| 1 | Một mặt cong 8×6 ô, đổi độ cao và đọc tangent/normal. |
| 2 | Hai tam giác trong mỗi ô; đổi resolution và soi winding. |
| 3 | Torus khép cả hai chiều, giữ riêng UV ở mép. |
| 4 | Dải Möbius nối đảo cột, có ánh sáng từ hai phía. |
| 5 | Ống vỏ ốc loe dần, tiết diện đi dọc đường xoắn mở. |
| 6 | Torus knot; bù góc của frame trước khi chốt đường nối. |
| 7 | Preview khi giữ thanh, làm mịn theo batch sau khi buông, hủy giữ last-good. |
| 8 | Ghi OBJ vào thư mục mới và đọc lại trước khi công bố file. |
| 9 / final | Knot 256×256 ô, kiểm đủ buffer, camera, đổi yêu cầu và OBJ. |

Generator chính đã sinh starter, chín checkpoint và final trong một fixture riêng. Cả 11 target đã build Debug/Release và chạy smoke bằng OpenGL ẩn; CTest đạt ở hai cấu hình. Mã trong bài được đối chiếu với source của đúng checkpoint. Fixture và output build nằm ngoài Git.

Lab Canvas dùng lưới tối đa 96×40 ô, chiếu trực giao và bộ đệm độ sâu. Chín chế độ đi cùng chín bài, từ đọc tangent đến kiểm đường nối, preview và dòng OBJ. Mốc 66.049 đỉnh được kiểm trên ứng dụng C++ riêng.
