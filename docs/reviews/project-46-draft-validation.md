# Project 46 — kiểm chứng nguồn mới, giai đoạn native

Ngày 15/11/2026 (Asia/Bangkok). Nguồn chuẩn: Project 46, hợp đồng 0.9–0.10 và [kế hoạch xây lại](project-46-rebuild-plan.md).

**Đang xây dựng, chưa nghiệm thu toàn bộ học phần.** Nguồn mới nằm trong `examples/drafts/falling-sand-workshop`; catalog, bài học và Canvas đang phát hành chưa bị thay. Không dùng các kết quả native dưới đây để công nhận ZIP hoặc giao diện web mới chưa tích hợp.

## Trạng thái khi lưu bản nháp vào Git

Theo yêu cầu commit/push ngày 15/11/2026, lưu lại source C++, mô hình TypeScript, Canvas và đủ chín bài MDX đang soạn. Các phần mới chưa nối vào catalog, route hoặc ZIP; website tiếp tục dùng bản đang phát hành.

Kiểm tra lại trước commit:

- 16/16 tests của mô hình mới đạt, gồm fixture trùng checksum native, lưới 512×320 trong 120 tick, clock, stroke và lifecycle.
- TypeScript toàn repository, ESLint và Prettier cho 13 file web/test mới đều đạt.
- Cả chín bài MDX qua compiler thật; đủ bảy vai trò giảng dạy, đúng Canvas mode, One Dark và thụt C++ bốn dấu cách. Chưa đối chiếu snippet với snapshot chính thức hoặc kiểm rendered route.
- Canvas mới đã dùng luật vacancy bên dưới, nhưng chưa tích hợp vào entry đang phát hành và chưa kiểm tương tác trình duyệt.

**Bằng chứng native ở các mục tiếp theo là của phiên bản có digest được ghi rõ, không phải toàn bộ bytes đang commit.** Sau lượt đó, source có thêm giới hạn nhánh theo checkpoint, từ chối CLI chưa được hỗ trợ ở mốc sớm và giới hạn hướng dẫn phím trong console. Chưa build lại các chỉnh sửa này. Không dùng kết quả build cũ để tuyên bố bản nháp hiện tại hoặc ZIP mới đã nghiệm thu.

## Nguồn và sản phẩm đang có

Ứng dụng C++20/SDL 3.4.8, default final 512×320; các mốc 0–6 còn dùng 96×64. Cát/tường/nước giả/tẩy, brush liên tục, điều khiển bằng phím, run/pause/step/speed, preset/reset/clear/seed/order, inspector, clean/flat view và các lệnh chạy/chụp/benchmark hữu hạn đã có trong nguồn mới.

Code thuần tách khỏi SDL, đặc biệt `commands.hpp` cho chuột/phím gọi cùng lệnh và unit test không cần window. Starter được cung cấp khung tài nguyên SDL; core được thêm theo các mốc. Checkpoint là preprocessor stage của **bản nháp**, chưa phải snapshot đã giải nén từ ZIP.

Source digest của C++/header dùng trong lượt cuối:

```text
5a0ee0292e9394254561999a2ee6f4c9cd6f5beeee4398b86cdd95fd812b4753
```

Runner tính digest từ path+bytes, so lại khi kết thúc để không gắn kết quả build với nguồn bị sửa giữa chừng. Evidence máy đọc: `.validation/p46-native-evidence.json`; log `.validation/p46-native-current.log`.

## Quyết định về luật sau khi quan sát ảnh

Ảnh nháp ban đầu xuất hiện nhiều dải ngang. Nguyên nhân là moved mask giữ chỗ cả ô Empty sau khi hạt đi khỏi, khiến hạt phía trên không thể dùng chỗ vừa trống. Luật mới vẫn đánh dấu hai đầu swap nhưng **không dùng cờ ở đích Empty để từ chối lần đi vào**. Nếu đích là Water, vẫn phải kiểm cờ để không di chuyển hạt nước lần thứ hai.

Vì vậy một vacancy có thể truyền ngược lên nhiều hàng trong cùng tick, trong khi **mỗi hạt chỉ đi một ô**. Đây là thay đổi luật so với bản đang phát hành, cần được giải thích và port sang Canvas trước khi tích hợp. Không chỉ đổi shader/màu để che dải ngang.

Các fixture một bước có vị trí biết trước kiểm cát rơi, đáy đóng, nước đi ngang, đổi chỗ và hai hạt trong một cột cùng đi xuống đúng một hàng. Có ví dụ cụ thể cho hai hạt tranh một ô trống và bottom-up/top-down cho kết quả khác.

Oracle kiểm chéo lưu **ID riêng đi cùng từng vật liệu**, dùng tập ID đã di chuyển, không dùng mask theo tọa độ hoặc gọi `tryMove`. Mảng vật liệu 8×8 khớp oracle ở từng tick trong 50 tick, đủ bốn order. Kết quả cuối của fixture ấy:

| Order | Checksum sau 50 tick |
| --- | --- |
| Alternating bottom-up | 3694149450 |
| Left-to-right bottom-up | 380760090 |
| Right-to-left bottom-up | 1912800860 |
| Alternating top-down | 3694149450 |

Hai order cùng checksum ở fixture này không chứng minh chúng tương đương với mọi input. Những số này cũng **chưa** được gọi là C++/Canvas parity: Canvas cũ chưa dùng luật vacancy mới.

## Build và CPU

- Windows, Visual Studio 2022/MSVC 19.33; find_package SDL 3.4.8 EXACT từ bản local đã có, link SDL3::SDL3. CMake phát hành vẫn sẽ do generator chuẩn tạo với FetchContent và checksum khóa phiên bản.
- Đã build tuần tự **10 target stage 0–9 và một target tests ở mỗi cấu hình Debug/Release**, không có compiler warning trong lượt cuối. Đây không phải tuyên bố đã build 12 target ZIP chính thức.
- CTest hiện tại: Debug 1/1, 0,98 giây; Release 1/1, 0,19 giây. Lượt verbose độc lập Release 0,18 giây ghi rõ bốn checksum oracle ở trên. Test không dựa vào assert bị tắt trong Release.
- Fixture gồm bounds/index/dimensions, brush, padding canary cho RGBA/pitch, viewport/letterbox, swap/material/wall, thứ tự, clock/speed/NaN/stall, parser hữu hạn và các lệnh reset/clear/run/step/seed.
- Có ca **512×320 trong 120 tick**, kiểm đủ 163.840 visits mỗi tick, bảo toàn từng loại và vị trí tường. Kiểm đếm chỉ áp dụng khi không có paint/erase/reset.
- Lượt configure đầu bị sandbox từ chối đọc registry SDK; đã dùng quyền thích hợp để chạy MSBuild, không đổi toolchain hoặc bỏ kiểm tra. Cảnh báo `getenv` ở bản đầu được sửa bằng API phù hợp của MSVC; không tắt warning.

## Quy mô, benchmark và hình ảnh thật

Benchmark Release: Mixture, seed 46, alternating bottom-up, 512×320, warm-up 32 tick; 7 repeat, mỗi repeat khôi phục cùng input rồi đo 120 tick. Tổng 840 mẫu, 137.625.600 cell visits, 28.080.115 swaps. Median update **0,57185 ms**, p95 **0,8122 ms**; runner tính lại từ raw samples và so số báo. Máy có 12 logical cores, PROCESSOR_IDENTIFIER `AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD`.

Grid+mask chiếm 327.680 byte; đây không phải tổng RAM hoặc VRAM. Phép đo update loại allocation/copy/reset, kiểm đếm, encode/upload/render/present. Các repeat là cùng chuỗi trạng thái, không được diễn giải thành các mẫu ngẫu nhiên độc lập. Không suy ra FPS hoặc speedup chung.

Viewer SDL/direct3d11 chạy hidden có deadline 5 giây, vẽ đủ 163.840 ô bằng texture, thực hiện 150 tick, last visited 163.840, dropped model seconds bằng 0. 9.472 ô cát, 14.976 ô nước và 2.649 ô tường. Capture thật đã mở và quan sát: `.validation/p46-terraces-1794687776726.bmp`. Đã bỏ thông báo PAUSED cũ khi scene đang chạy và phân biệt nội dung EMPTY với công cụ ERASE.

Lượt cuối stage 0–8 cũng smoke-run hidden hữu hạn 0,1 giây mỗi mốc. Không coi smoke-run này là kiểm tương tác chuột/phím. Không có tiến trình test hoặc window còn cần chờ từ lượt đó.

## Giáo trình và phần còn phải làm

Bài 01 mới đã soạn trong thư mục draft, phân biệt rõ khung được cung cấp với phần người học thêm. Bài ấy qua compiler MDX thật, đủ bảy vai trò giảng dạy, One Dark, công thức và thụt C++ bốn dấu cách. Đây **chỉ là compile**, chưa là rendered route/browser hoặc đối chiếu snippet với snapshot chính thức.

Các bước tiếp theo:

1. Review cả chín bài nháp và tạo metadata tương ứng; đối chiếu snippet liên tiếp với snapshot thật. Các nhánh checkpoint/CLI và thông báo console mới cần được build lại.
2. Tích hợp Canvas mới đã có lưới lớn/đổi order, trạng thái lưới ngoài React và kiểm tương tác trực tiếp; các tests mô hình không thay kiểm trình duyệt.
3. Đồng bộ catalog/content revision 2/source chính thức, xử lý URL bài cuối cũ; chỉ thay bản khi lesson/source/Canvas khớp nhau.
4. Sinh và kiểm ZIP, build từ chính ZIP, kiểm website/Canvas trực tiếp trên server người dùng mở, native input và các kiểm liên quan. Không tự bật server.

Mỗi stage build/test qua process supervisor, hard timeout, một worker; native hidden/capture có thời lượng và benchmark có deadline/budget riêng. Chỉ commit/push khi người dùng yêu cầu; không thêm output sinh hoặc thư viện vào Git.
