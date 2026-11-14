# Project 46 — Hộp cát số (nguồn đang xây lại)

Thư mục này chưa thay học phần `falling-sand` đang phát hành. Nó giữ nguồn mới để
xây và kiểm ứng dụng trước khi đồng bộ giáo trình, Canvas và catalog. Chưa phải
ZIP đã nghiệm thu; không build trực tiếp `source-template` như một project CMake.

## Ta đang làm gì?

Thay vì theo dõi vị trí/vận tốc của từng hạt, ta lưu một vật liệu trong mỗi ô.
Vài phép đổi chỗ cục bộ tạo ra đống cát, dòng cát qua phễu và nước giả lan trong
bể. Tường và chính các vật liệu là dữ liệu để người dùng vẽ, phá, xóa rồi thử lại.

Bản cuối đặt mục tiêu **512×320 = 163.840 ô**, xử lý và vẽ toàn lưới. Các bài đầu
dùng 96×64 để nhìn từng lần di chuyển; không dùng mốc nhỏ đó thay sản phẩm cuối.
Không cần OpenGL hoặc học xong Project 45. Code tải về sẽ dùng C++20, CMake 3.24+
và SDL 3.4.8 qua FetchContent/SDL3::SDL3 như các project khác trong repository.

## Luật và giới hạn

- Biên ngoài đóng. Sand/Water là ô vật liệu, không là hạt có khối lượng/vận tốc.
- Mỗi tick xóa moved mask. Duyệt từ dưới lên, đổi chiều ngang qua từng tick.
- Cát thử xuống rồi chéo; nước thử thêm hai ô ngang khi các đích rơi bị chặn.
- Cát được đổi chỗ với nước. Hai đầu swap đều được đánh dấu, nhưng cờ ở ô Empty
  không giữ chỗ trống: ô đó có thể được hạt khác đi vào. Khi đích chứa nước, cờ
  của nó vẫn được kiểm để hạt nước không bị di chuyển lần thứ hai trong tick.
- Có thể đổi scan order để xem cùng luật cục bộ cho kết quả khác; không hứa đối
  xứng tuyệt đối. Preferred diagonal dùng parity x+y+tick, không gọi RNG mỗi tick.
- Seed chỉ thay cách xếp vật liệu ở preset Mixture. Các cảnh hình học còn lại cố
  định. Reset cùng preset/seed/order tái tạo đúng trạng thái ban đầu.
- Đây không phải nghiệm Navier–Stokes: không có áp suất, độ nhớt hoặc bảo toàn
  động lượng. Nước có thể dao động ngang mãi dù các bộ đếm đều đúng.

## Trình tự học dự kiến

9 bài: vẽ lưới → brush → rơi thẳng → trượt/thứ tự → nước/swap → fixed tick/speed
→ streaming texture/lưới lớn → hoàn thiện thao tác → kiểm chứng và đo hữu hạn.

`grid`, `rules`, `timing`, `presets`, `layout`, `pixels`, `commands` là code thuần
không cần window. `view`, `panel`, `input`, `sdl_resources` nối các phần ấy với SDL.
Khung SDL/cleanup được cung cấp từ starter; thuật toán được thêm theo checkpoint.

## Thao tác bản native đang kiểm

- Chuột trái vẽ; chuột phải tẩy. Giữ chuột để rót theo tick từ Bài 8, không theo FPS.
- `1` cát, `2` tường, `3` nước, `4` tẩy; `[`/`]` đổi bán kính trong 0–24 ô.
- Mũi tên chọn ô, Shift+mũi tên đi 16 ô, Enter tô tại vị trí chọn.
- Space chạy/dừng; N tiến một tick và trở về pause. `=` đổi speed 0.25/0.5/1/2/4.
- R reset; K xóa nhưng giữ preset để R khôi phục; P đổi cảnh; B đổi seed; O đổi scan.
- F1 xem sạch, F2 đổi cách tô màu, V kiểm fixture nhỏ trên một lưới riêng, Esc thoát.

Pause không tích nợ. Mất focus tạm dừng/kết thúc nét; resize không làm lại lưới.
Phần bù bị chặn ở 4 tick/frame; dropped time là giây mô hình, đã tính speed.

## Đo gì và không đo gì?

Benchmark CPU (`--benchmark --preset 3 --seed 46 --steps 120 --repeats 7`) không mở
window. Nó warm-up 32 tick, reset về cùng input ở mỗi repeat rồi ghi từng thời
gian update; median/p95 được tính trên các tick đã đo. Không tính allocation,
copy input, kiểm đếm, RGBA, upload hoặc render. Có budget số ô và deadline 30 giây.

Viewer có `--hidden --run --seconds 5 --capture frame.bmp` để chạy/chụp hữu hạn.
Capture đọc frame đúng một lần trước present, không nằm trong draw timing. UI
báo update, encode/upload CPU và draw-submission CPU riêng; **không** gọi các số
CPU ấy là GPU time hoặc tổng thời gian frame. Native/ZIP/browser được kiểm riêng.

## Trạng thái

Đã có chín bài nháp trong `content/`, source native và mô hình/Canvas mới ở thư mục
riêng của repository. Chúng chưa nối vào học phần đang phát hành. Hồ sơ tại
`docs/reviews/project-46-draft-validation.md` phân biệt kết quả đã kiểm với phần
chưa kiểm; không lấy build hoặc CTest xanh làm căn cứ chốt toàn bộ học phần.
Metadata, snapshot/ZIP, URL cũ và nghiệm thu trực tiếp vẫn phải hoàn tất trước
khi thay bản đang phát hành.
