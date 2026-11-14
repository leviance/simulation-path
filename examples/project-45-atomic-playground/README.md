# Project 45 — Atomic Playground

Từ một hàm mật độ được cung cấp, ta làm thế nào để dựng được một hình 3D có
thùy, vùng nút và chiều sâu bằng một triệu điểm? Học phần này nối ba việc thường
bị tách rời: lấy mẫu đúng phân bố, tổ chức dữ liệu lớn trên GPU và kiểm tra điều
đang nhìn thấy bằng phép đo.

Bản Atomic Playground đã hoàn tất nghiệm thu. Các kiểm tra tự động gồm CPU/GPU,
build Debug/Release, source trong ZIP và tương tác web; phần thao tác native còn
lại được người dùng kiểm tay và xác nhận đạt yêu cầu ngày 15/11/2026.
Các thư mục starter/checkpoints/final và CMakeLists.txt được sinh từ source-template
khi đóng gói; không build trực tiếp source-template.

## Sản phẩm và giới hạn mô hình

Ứng dụng C++20/SDL 3.4.8/OpenGL 4.3 có catalog 1s, 2s, real 2p theo ba hướng,
3d và 4f. Compute shader đọc CDF nhỏ rồi tự sinh vị trí vào SSBO; renderer đọc
thẳng buffer ấy. CPU không tạo sẵn một triệu positions để upload.

Mỗi điểm là một **mẫu vị trí**, không phải một electron riêng. Bộ hàm mô tả
hydrogen một electron, với a₀=1. Không có lực hút–đẩy giữa các mẫu, quỹ đạo cổ
điển, mô phỏng phản ứng hoặc solver lượng tử nhiều hạt. Công thức và nguồn xem
[REFERENCES.md](REFERENCES.md).

## Đường học

11 bài đi từ nối field vào khung 3D, trọng số thể tích, CDF/seed, lấy mẫu GPU,
batch/cancel, point splat, camera/mặt cắt, phép đo, comparison, lưu cấu hình tới
kiểm chứng sản phẩm. Window, GL loader, camera và một phần khung trình bày được
cung cấp; phần hướng dẫn phân biệt rõ khung có sẵn với đoạn cần viết hoặc đổi.

Trong ZIP, `starter/` là bản để bạn sửa. `checkpoints/01`…`11` là các đáp án chạy
được để đọc diff hoặc đối chiếu, `final/` là sản phẩm mẫu. `include/...` trong bài
là đường dẫn bên trong một snapshot, không phải thư mục include ở gốc ZIP.
Không đổi macro LAB_CHECKPOINT: các chỉ thị ấy đã được generator loại khỏi ZIP.

## Build bản ZIP

Chạy ở thư mục chứa CMakeLists.txt, cần CMake 3.24+, compiler C++20 và driver
OpenGL 4.3. CMake tải đúng SDL 3.4.8 bằng FetchContent và link SDL3::SDL3. Trên
Windows có Visual Studio 2022:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Release --parallel 1 --target project_45_final project_45_tests
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_45_final.exe
```

Mặc định chỉ build final. Muốn chạy một đáp án, build `project_45_checkpoint_3`;
muốn kiểm bản tự viết, build `project_45_starter`. CTest mặc định kiểm headers
của **final**, không tự công nhận mã bạn đang sửa trong starter. Bài cuối có
target student-tests riêng để đối chiếu đúng source của bài làm đã hoàn thiện.

Với Ninja/Makefiles, chọn CMAKE_BUILD_TYPE khi configure và bỏ phần Release trong
đường dẫn executable. Không chạy CTest Debug khi mới chỉ build Release.

## Thao tác

- `1`…`0`: chọn orbital; `Tab`: chọn pane cần sửa; `N`: đổi N; `S`: đổi seed.
- `Space`: pause/resume generation; `C`: cancel; `R`: dựng lại cùng cấu hình/seed.
- Kéo trái để orbit, phải/giữa để pan; wheel để đi gần, kể cả vào trong cloud.
  Arrow keys orbit, Shift+Arrow pan, F8/F9 zoom, Home đưa camera về vị trí đầu.
- F1 đổi khám phá/debug, F2 comparison, F3 cùng thang/auto-fit có nhãn; F2 reset
  góc nhìn để vừa hai pane. World unit vẫn là a₀ ở cả hai pane.
- F4 palette, `-`/`+` opacity, PageUp/PageDown point size, B bật density boost.
- F5 bật mặt cắt, X đổi trục, `[`/`]` dịch mặt cắt. P bật đặt vùng đo bằng click;
  `,`/`.` đổi bán kính. Wire sphere là vùng đo, không phải đường đi của electron.
- F6 lưu `atomic-playground.cfg`, F7 đọc lại; Escape/Q thoát.

Đổi camera, clip, palette, opacity hoặc size không sinh lại positions. Preset,
N, seed và sampling mode tạo candidate; cloud cũ còn nguyên nhãn last-good cho
đến khi candidate hợp lệ hoàn toàn. Một số controls được mở dần qua checkpoint.

## Đọc phép đo và benchmark

Radial/angular CDF là xấp xỉ midpoint theo r² dr dμ dφ, μ=cosθ. Tail ngoài Rmax
được công bố riêng; histogram/reference và Wilson CI không tự bao gồm sai số
bảng hoặc tail. Clipping không đổi mẫu số của xác suất toàn cloud đã giữ lại.
Sphere ở gốc có reference radial giải tích; sphere dịch khỏi gốc chỉ báo ước
lượng và CI, không đổi nhãn thành nghiệm chính xác.

Độ sáng là additive Gaussian splat, depth cue và tone mapping `1-exp(-exposure*L)`.
Boost cộng thêm một transfer function được nêu trong bài, không phải density
vật lý mới. N/opacity/size cũng ảnh hưởng ảnh; không đo xác suất từ brightness.

```powershell
.\build\Release\project_45_final.exe --hidden --verify --seconds 5
.\build\Release\project_45_final.exe --count 1000003 --seed 12345 --benchmark --seconds 10
```

Verifier có deadline tổng 30 giây. Mỗi batch/fence cũng có giới hạn; không có
rejection loop vô hạn hoặc chèn điểm trùng để giả đủ N. Benchmark bỏ 10 query
vẽ đầu sau publication, giữ tối đa 8192 kết quả GPU riêng biệt rồi báo median,
p95 và raw samples. Đổi camera, mặt cắt, kích thước viewport, cách hiển thị hoặc
cloud sẽ xóa mẫu đo và chạy warm-up lại; không trộn các workload vào một median.
`DRAW_WORKLOAD` ghi cấu hình vẽ thật để có thể đối chiếu. Đây không phải thời
gian toàn frame. Table CPU, sample GPU,
draw GPU và probe GPU được báo riêng. Log còn ghi máy/build/seed/Rmax/bảng,
thời gian CPU cấp phát/submit upload, và wall time của cả job generation. Wall
time gồm shader setup, upload, kiểm tra/readback nhỏ, nhịp batch của UI và cả
khoảng pause nếu có; không gọi nó là kernel time. Bài 11 thêm pass evaluate GPU:
đọc record, đánh giá density/sign, so sánh với dữ liệu đã sinh và đếm sai lệch.
Timer đó gồm cả SSBO read/compare/atomics, không phải chi phí ALU thuần. Sample
vẫn đã đánh giá density khi sinh record, nên không cộng evaluate vào sample để
tạo một tổng frame. Fixture cố ý sửa một density chứng minh pass này tìm được lỗi.
Probe chỉ báo timing khi đã đo đủ cloud và đúng generation/revision; lúc còn
chạy, log ghi pending thay vì gắn thời gian cũ cho cấu hình mới. Verify/benchmark
kết thúc mà probe chưa hoàn tất sẽ báo lỗi, không nhận kết quả đo chưa đủ.

CPU tests còn đối chiếu CDF float đang dùng với reference giải tích trên một
bộ vị trí cố định, kiểm riêng histogram/vùng đo và thay đổi độ phân giải bảng.
Maximum đo được của fixture hữu hạn không phải một error bound cho mọi field,
mọi bán kính hoặc mọi cấu hình; tolerance bảng, tail và uncertainty vẫn tách riêng.

Mốc bắt buộc là một triệu mẫu hợp lệ. Năm triệu là lựa chọn mở rộng, không phải
claim đã được kiểm. Budget tổng 512 MiB và giới hạn SSBO của driver được xét
trước cấp phát; comparison còn phải chứa các cloud active/candidate đồng thời.

Kết quả và giới hạn của từng phép kiểm được ghi riêng trong hồ sơ nghiệm thu
Project 45 của repository. Mốc một triệu mẫu đã được kiểm trên GPU thật; không
suy kết quả đó thành bảo đảm hiệu năng trên mọi máy hoặc mốc năm triệu mẫu.
