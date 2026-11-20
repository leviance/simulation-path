# Project 72 — Lập trình hành vi của bàn Boids

Dừng đàn rồi kéo cùng một thanh Radius tới điểm giữa. Với flight.tiny, nó đặt bán kính 80 px. Với close-study.tiny, handler nhận đúng mẫu đó nhưng đặt 50 px để khảo sát gần. Vòng quanh chim vàng thay đổi thật; HTML, CSS, executable và solver không đổi.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2
.\build\Release\project_72_final.exe --assets assets
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Chạy tại thư mục có CMakeLists.txt; không chỉ định --assets thì F5 đọc assets cạnh executable. Ninja/Make thêm -DCMAKE_BUILD_TYPE=Release và chạy ./build/project_72_final. CMake ≥3.24, C++20, SDL 3.4.8. ZIP chứa starter, bảy checkpoint, final, năm script, HTML/CSS và tests.

**Tự thử.** Phím 1/2 chọn script thường/khảo sát, F5 reload script đang chọn, L bật bảng runtime. 3 thử lỗi cú pháp, 4 thử lỗi host, 5 thử đệ quy (4/5 cần bấm Pause để gọi handler). F9 luôn dừng/chạy bằng C++ ngay cả khi handler hỏng. F4 nạp lại HTML và kết nối lại registry. Cây + đồng hồ không bị dựng lại khi bạn chỉ sửa script. Hai slider và checkbox vẫn nhận chuột/Tab qua dispatcher Project 71; E cho xem đường event.

**Bảy bài:** file thật và hợp đồng host → token có vị trí → cây biểu thức/câu lệnh → scope, if và function → nối event với host → ngân sách và rollback → hai hành vi trong cùng executable.

**Ngôn ngữ.** Ở top level có let tên = biểu_thức; và function tên(tham_số) { ... }. Trong function có let, gán, if/else, gọi hàm và return biểu_thức;. Khối con có thể che biến ngoài. Function chỉ thấy params/locals và globals, không thấy locals nơi gọi. Không return thì kết quả số 0. Hai kiểu number/boolean, không ép kiểu ngầm. Thứ tự toán tử: ! và trừ đơn; * /; + -; so thứ tự; == !=; &&; ||. &&/|| đoản mạch; lấy đối số từ trái sang phải. Comment // đến hết dòng. Không vòng lặp, class, chuỗi hay module. Số literal giới hạn một triệu, kết quả tính hữu hạn trong ±1e9. File UTF-8 tối đa 16 KiB / 4.096 token / 64 function / 8 tham số, syntax nesting 48, expression depth 64, call depth 16, 1.024 bước cho mỗi handler hoặc lần khởi tạo. Đếm cả call, statement và expression.

**Host hữu hạn.** Đọc paused(), getRadius(), getSeparation(), showLinks(). Ghi bằng pause(), resume(), reset(), radius(n:20..140), separate(n:0..5), links(bool). Handler gồm onPause(), onReset(), onObserve(), onRadius(value), onSeparation(value); tên và số tham số được kiểm trước khi thay script. Không cấp API truy cập file, mạng hay hệ điều hành. Không ghi host ở phần khởi tạo top level. Reload hợp lệ tạo globals mới, không reset đàn; lỗi cú pháp giữ phiên script tốt. Mỗi event chạy với biến và lệnh host tạm: chỉ khi toàn handler thành công mới chuyển kết quả vào model. Vì vậy pause(); radius(200); không để lại trạng thái Pause nửa chừng.

Kiểm Debug và Release: precedence, scope/che biến, kiểu, early return, chia cho 0, arity, ngân sách thao tác và giới hạn đệ quy là những ca **khác nhau**. Hai file thật phải cho 80 và 50 từ cùng một cú kéo. Sau một lỗi, thử ngay Reset/F9 và tiếp tục dùng cửa sổ. Đây là nơi kết thúc lộ trình chính 01–72; các project 73–78 là nhánh bổ sung, không phải điều kiện hoàn thành.
