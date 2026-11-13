# Project 43 — Khám phá fractal Mandelbulb

Một phép lặp tạo ra cả khối hình học: đổi power để thấy các nếp phân nhánh thay hình, tiến camera để nhìn vào các hõm, rồi bật heatmap để tìm vùng khiến renderer phải tính nhiều hơn. Ứng dụng dùng OpenGL compute để tính ảnh thật từ field 3D; không có mesh fractal, texture zoom hay fractal engine được giấu bên dưới.

Đầu vào là vị trí camera, power, số vòng lặp, bailout và các giới hạn chất lượng. Đầu ra là ảnh Mandelbulb có ánh sáng, ảnh debug và các bộ đếm công việc. Đây là đồ họa từ phép lặp, không phải mô phỏng nhiệt độ, lực hoặc năng lượng.

## Thử tự xây trước khi đọc lời giải

Hãy dựng một cửa sổ có ảnh Mandelbulb, cho người dùng đổi power 6/8, orbit/pan/dolly và xem ray-step heatmap. Khi camera đang di chuyển có thể dùng preview thấp hơn, nhưng phải ghi đúng chất lượng; khi dừng, tính đủ một ảnh ít nhất 960×540. Thay camera hoặc power giữa chừng không được ghép ảnh mới với các tile cũ. Space dừng refinement, không khóa input; X hủy lượt tính nhưng giữ bản đang xem.

Phần bắt buộc tự viết: spherical-power mapping, escape iteration, DE, march loop, normals và quality controller. Đừng bắt đầu bằng cả chương lý thuyết fractal: hiện một mặt cắt nhỏ trước, rồi dùng lỗi hình để đặt câu hỏi cần giải quyết.

## Các mốc phát triển

| Mốc | Chương trình có thêm gì? |
| --- | --- |
| Starter | Cửa sổ SDL3/OpenGL, loader, fullscreen presentation và panel; chưa tính fractal. |
| 01 | Phép lặp 3D và mặt cắt Y cố định; đổi power thấy hình thay đổi. Đây chưa phải sản phẩm 3D cuối. |
| 02 | Camera tạo ray; dò vùng bounded bằng các bước đều trong bounding sphere. |
| 03 | Đạo hàm vô hướng, DE, safety, epsilon và quy tắc dừng hữu hạn. |
| 04 | Central differences để lấy normal; ánh sáng làm hiện chiều sâu. |
| 05 | Orbit/pan/dolly bằng chuột và bàn phím, preset, nhả capture khi mất focus. |
| 06 | Heatmap, counters, evaluator CPU độc lập và probe cùng GLSL trên GPU. |
| 07 | Preview 120×68, sau đó tile 32×16 để hoàn thiện ảnh 960×540; generation và cancel. |
| 08 | Orbit-trap palette, AO, shadow và tùy chọn bốn mẫu mỗi pixel. |
| 09 / final | Kiểm toàn ảnh, đối chiếu ray với oracle chậm và xuất BMP đủ ảnh. |

Khung SDL3, GL loader, font bitmap và hình học panel được cấp, phát triển từ source trong repository. Chúng không thay phần fractal/ray/quality mà người học viết. Mỗi checkpoint là một chương trình độc lập, không cần ghép ZIP của Project 36 hoặc Project 42.

## Build và chạy gói độc lập

Cần C++20, CMake 3.24+ và driver OpenGL **4.3 Core**. Windows dùng Visual Studio 2022 với Desktop development with C++. SDL **3.4.8** được tải bằng FetchContent với checksum cố định và link `SDL3::SDL3`; người học không cần Node.js để build ZIP.

```powershell
cmake -S . -B build -DBUILD_TESTING=ON -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2 --target project_43_final project_43_tests
ctest --test-dir build -C Release --output-on-failure --timeout 15
.\build\Release\project_43_final.exe --seconds 120
```

Final là target mặc định; `BUILD_CHECKPOINTS=ON` thêm `project_43_starter` và `project_43_checkpoint_1` đến `project_43_checkpoint_9`. Khi học mốc nào, build đúng target đó. Với generator một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` lúc configure và chạy executable ngay trong `build`. Đổi sang Debug bằng `--config Debug` ở build/CTest/executable.

Trong repository, pipeline sinh CMake và starter/checkpoints/final từ `source-template`; không sửa output. Shader của từng target có fallback riêng tại `shaders/<target-name>` cạnh executable, tránh checkpoint này chép đè shader checkpoint khác. ZIP cuối chứa CMake và toàn bộ snapshot đã sinh.

macOS OpenGL 4.1 không hỗ trợ nhánh compute này. Ứng dụng phải báo không hỗ trợ, không tự giảm ảnh hoặc chuyển CPU rồi gọi đó là kết quả GPU. Preflight kiểm version, SSBO block/binding, kích thước workgroup, group count và byte cấp phát thực tế.

## Điều khiển native

| Thao tác | Kết quả |
| --- | --- |
| Chuột trái / phải hoặc giữa / wheel | Orbit / pan / dolly, từ checkpoint 05. |
| I J K L / Page Up, Page Down | Orbit / dolly bằng bàn phím. |
| Tab rồi Left/Right | Chọn hàng và giảm/tăng power, bailout, iteration, steps, epsilon, normal H, samples, palette hoặc safety. |
| Click nửa trái/phải của hàng | Giảm/tăng giá trị; tạo yêu cầu ảnh mới. |
| 1 / 2 / 3 | Overview power 8 / power 6 / góc nhìn gần với chất lượng cao hơn. |
| R / Home | Reset đúng preset đang chọn / chỉ đặt lại camera. |
| Space / X / Enter | Pause refinement / Cancel / Restart yêu cầu hiện tại. |
| H / F / S | Đổi Beauty–Steps–Orbit work–States–Normals / ẩn hiện panel / bật mặt cắt debug. |
| Q hoặc Esc | Đóng cửa sổ. |

Panel native dùng chữ ASCII vì font bitmap được cấp chỉ có bộ ký tự này. Tài liệu và Canvas giải thích các nhãn bằng tiếng Việt. Mất focus sẽ nhả capture và Pause. Nếu hệ điều hành không cấp capture, vẫn có các phím camera; không giữ trạng thái kéo sau mouse-up/focus loss.

`ACTIVE` là snapshot thực sự đang được xem; `REQUEST` có thể mới hơn. Preview cũ được giữ đúng nhãn cho đến khi preview mới hoàn chỉnh. Khi công bố generation mới, pixel final chưa tính dùng preview **cùng generation**, không dùng tile final cũ. Cancel không ngắt một dispatch đã gửi; nó ngăn batch tiếp theo và ngăn preview lỗi thời được công bố.

## Phép lặp và mặt được render

Trục cực là Z. Từ `z₀=0`, dùng `zₙ₊₁=sphericalPower(zₙ,power)+c`. Mapping nhân góc cực và phương vị với power, nâng bán kính lên power. Ở r=0 trả vector 0; ở trục Z không gọi atan2(0,0). CPU minh họa công thức `acos(clamp(z/r,-1,1))`; GPU dùng góc tương đương `atan(length(z.xy),z.z)` để tránh khuếch đại sai số ở miền acos. Không được đổi một trong hai quy ước trục mà giữ nguyên quy ước còn lại.

Với `dr₀=1`, cập nhật `drₙ₊₁=power·r⁽ᵖᵒʷᵉʳ⁻¹⁾·drₙ+1`. Khi orbit thoát bailout, DE là `0.5·log(r)·r/dr`. Công thức và spherical-power mapping tham khảo [McGraw & Herring, Shape Modeling with Fractals](https://web.ics.purdue.edu/~tmcgraw/papers/mcgraw_fractal_2014). Bài này không triển khai RBF warping của bài báo.

**DE không phải SDF chính xác.** “Hit” của renderer là mặt hữu hạn `DE < epsilon` hoặc vùng chưa thoát trong iteration cap, không phải chứng minh c thuộc tập Mandelbulb vô hạn. March dùng `clamp(safety·DE, epsilon·0.1, 0.12)`. Nếu bước chạm vùng bounded, tám bước chia đôi giữ điểm phía ngoài để lấy normal. Không ép điểm shading vào vùng DE=0 rồi trông chờ gradient ở đó còn ổn định.

Đối chiếu ray dùng evaluator long double độc lập, dựng mapping bằng nhân số phức nhiều lần thay vì acos/atan2. Oracle đi **bước đều 0,0005** rồi chia đôi, nhắm cùng mặt epsilon trong sphere R=2. Các ray đã chọn có ngưỡng sai số tuyệt đối t **0,006 world units**. Phép so hữu hạn này phát hiện overshoot/false hit ở các fixture, không chứng minh DE là lower bound toàn cục. Một feature hẹp hơn bước tham chiếu vẫn có thể bị bỏ qua. Hàm tham chiếu còn có chế độ dò vùng bounded để thấy vì sao hai định nghĩa mặt không đồng nhất.

`bounded` chỉ nghĩa chưa thoát trong số vòng đã chọn. Camera nằm trong vùng này cho trạng thái **inside**, không tạo hit t=0 giả. Bounding sphere R=2, far bound 32 và mặt epsilon là chính sách clipping/độ phân giải được công bố; không hứa zoom vô hạn. Dùng float32 trong shader, double cho camera/CPU và long double cho oracle độc lập; trên MSVC long double vẫn có 53 bit mantissa như double. Oracle độc lập về cách tính, không mặc nhiên là precision cao hơn trên mọi compiler. Chất lượng ở sát biên vẫn phụ thuộc precision và driver.

## Chất lượng, work và bộ nhớ

| Đại lượng | Giới hạn |
| --- | --- |
| Power / bailout | 2–12 / 2–16. |
| Orbit iterations / primary ray steps | 4–24 / 32–256. |
| Epsilon / normal difference H | 0,00001–0,01 / 0,00002–0,02 world units. |
| Safety / camera distance | 0,2–1 / 0,04–18; pan mỗi trục ±2,5; pitch ±1,48 radian. |
| Preview | 120×68, tối đa 8 orbit iterations, 40 ray steps, epsilon ít nhất 0,003; chỉ một sample. |
| Final | 960×540, mỗi batch tối đa 32×16 pixel, 1 sample cho mỗi pixel được xử lý trong batch. |
| Anti-aliasing | 1 sample tại tâm hoặc 4 sample ở các tọa độ ¼,¾ trong pixel. Mỗi sample được tính thật. |
| Điều phối | Chờ input yên 160 ms trước refinement; chỉ một dispatch đang chờ; fence/query không đọc chặn khi chưa sẵn sàng. |

Mỗi ray có tối đa 256 field calls chính, một kiểm camera, tám bước chia đôi, sáu probe normal, bốn AO và 16 shadow. Ở cấu hình tối đa, một tile cần không quá **512×(256+1+8+6+4+16)×24 = 3.575.808 orbit bodies**, dưới ngân sách bốn triệu mỗi dispatch. Preview có cận 3.590.400. Cận bảo thủ này khác counters công việc thực sự đã chạy; orbit work tính cả normal/AO/shadow, không chỉ bước ray chính.

`Pixel` có 48 byte: `vec4 color` lưu tổng RGB và số mẫu; `uvec4 work` lưu tổng ray steps, tổng orbit bodies, bit trạng thái, generation; `vec4 surface` lưu t và normal mẫu cuối. Final có 518.400 record + canary; hai preview ping-pong có 8.160 record + canary mỗi buffer; stats 48 byte. Tổng payload renderer **25.666.752 byte**; không gồm driver, cửa sổ, shader/program, buffer UI hoặc buffer probe nhỏ trong verification. Cấp phát kiểm `GL_BUFFER_SIZE`; lỗi cấp phát không làm hạ độ phân giải ngầm.

Ray-step heatmap đếm vòng march chính; orbit-work heatmap đếm số vòng recurrence ở **tất cả** evaluator calls. Stop counters chia số sample thành hit/miss/budget/inside/invalid. Với AA, mỗi pixel giữ OR các stop bits qua bốn sample; không suy ngược số hit từ OR mask. Orbit trap là minimum radius đã đi qua sau phép cập nhật, chỉ để chọn màu đồ họa.

`LAST KERNEL` là elapsed GPU query bao quanh dispatch và barrier, sau fence/query-ready. `SUBMIT CPU` là thời gian phía CPU gửi lệnh; `IMAGE GPU SUM` cộng các batch final thuộc ACTIVE. Không gọi hai đại lượng này là FPS hoặc thời gian toàn ứng dụng. Đây chưa phải benchmark speedup với warm-up/median qua nhiều lượt.

## Chạy kiểm hữu hạn

```powershell
.\build\Release\project_43_final.exe --hidden --verify-field
.\build\Release\project_43_final.exe --hidden --verify --samples 1
.\build\Release\project_43_final.exe --hidden --verify --power 6 --samples 1
.\build\Release\project_43_final.exe --hidden --verify --detail --samples 1
.\build\Release\project_43_final.exe --hidden --verify --distance 0.1 --samples 1
.\build\Release\project_43_final.exe --hidden --verify --samples 4 --export mandelbulb-aa.bmp
```

Field probes chạy đúng `evaluate`/`sphericalPower` trong shader render với N=19, năm power và ba bailout; so orbit ổn định với oracle độc lập, kiểm mapping của trục và NaN/Inf. Các orbit unit-axis có thể nằm đúng biên bailout nên chỉ kiểm one-step mapping, không đòi float và long double có cùng quỹ đạo dài ở điểm nhạy này. DE dùng sai số tuyệt đối 3×10⁻⁵ cộng tương đối 2×10⁻⁴; đây là tolerance số học của fixture, không phải sai số hình học.

`--verify` đọc toàn bộ 518.400 pixel theo chunk tối đa 4.096, kiểm generation/sample count/finite color/normal/canary và đối chiếu tổng work với GPU atomics. Với samples=1, chín ray/silhouette được kiểm thêm bằng uniform scanner. Với samples=4, kiểm toàn dữ liệu/bộ đếm vẫn chạy, nhưng ray center fixture được báo **SKIPPED**; chạy lượt samples=1 riêng. Nếu camera inside, kiểm cả ảnh dừng inside và so camera với CPU oracle, không gọi đó là ảnh ngoại cảnh đã render.

Export chỉ nhận ảnh ACTIVE đã hoàn chỉnh, 3D, đúng generation và đủ samples; không xuất ảnh mặt cắt hoặc ghi đè đường dẫn có sẵn. BMP luôn là ảnh fractal 960×540, không phải screenshot cửa sổ bị kéo giãn. `--capture` cùng `--frames 1` chụp cả window/panel riêng khi cần kiểm UI.

Hidden run có giới hạn nội bộ 120 giây, probe GPU ba giây, image verification mười giây và export năm giây. Shader loop/batch đều hữu hạn. Một API driver vẫn có thể bị lỗi phần cứng; khi kiểm tự động phải có process supervisor/watchdog bên ngoài, không coi deadline trong vòng poll là khả năng cưỡng bức ngắt kernel. Repository giới hạn hai build/test worker; không chạy đồng thời build, site build và GPU validation trên máy ít RAM.

Canvas chỉ là công cụ học JavaScript/Canvas 2D 32×18 → 96×54, tối đa 12 orbit iterations và 96 ray steps, có pause/reset/cancel và chữ giải thích. Nó không chứng minh quy mô hoặc tốc độ GPU của ứng dụng native.

## Phạm vi đã kiểm tra

Ngày 13/11/2026, trên Windows/Visual Studio 2022, SDL 3.4.8 và NVIDIA GeForce RTX 3050 Laptop GPU, driver 546.30, context OpenGL 4.3:

- Starter, chín checkpoint, final và tests build ở Debug/Release. CTest kiểm orbit, ray, camera và controller; pan có fixture tọa độ biết trước, không chỉ gọi cùng một công thức hai lần để so.
- Field probe kiểm nhiều power/bailout, gốc và gần trục. Các ảnh mặc định, power 6, camera gần và iteration cap 4 được đọc lại toàn bộ, rồi so các ray đã chọn với oracle độc lập.
- Ảnh bốn mẫu/pixel có đủ 2.073.600 mẫu thật. Camera inside được kiểm riêng; không tính ảnh inside là một ảnh bề mặt fractal thành công.
- Đã thử trực tiếp chuột orbit/wheel, Pause, preset, Cancel/Restart, heatmap, Showcase và Reset trong cửa sổ C++. Kiểm trình duyệt, source trong bài và gói ZIP được thực hiện riêng.

Đây là kết quả correctness và smoke hữu hạn trên một cấu hình, không phải benchmark FPS, cam kết tương thích mọi driver hay chứng minh DE không overshoot ở mọi vùng. Chưa kiểm chạy trên Linux; macOS OpenGL 4.1 không đáp ứng yêu cầu compute của bản này.
