# Project 42 — Biến hình một triệu hạt

Ngày kiểm: 11/11/2026. Nguồn chuẩn: mục Project 42 trong Product Specification v4 complete. Slug mới: `particle-morph-studio`; revision nội dung: 2.

## Sản phẩm và giáo trình

Thay hộp Molecular Dynamics cũ bằng Particle Morph Studio độc lập C++20/SDL 3.4.8/OpenGL 4.3. Ba mesh có sẵn là cầu, xuyến và torus knot. Không cần gói Project 41 hoặc particle engine. Chương trình không giả lập lực hay va chạm.

Mười bài đi từ một nhóm điểm chạy trên CPU tới area CDF, sqrt barycentric, ID/seed và histogram, hai correspondence, model time, SSBO, compute, candidate theo batch, inspector/timings và một triệu hạt. Mỗi bài có vấn đề, trực giác/công thức, code có đường dẫn file, cách ghép/build, lỗi cố ý, checklist và bài tập. Các helper camera/OpenGL/UI được nêu là khung được cấp, không xem như người học tự nhiên đã biết chúng.

34 đoạn C++/GLSL khớp token liên tiếp từ đúng checkpoint. Mười MDX đã được compile và render, gồm đủ section, Canvas mode, source viewer và điều hướng. Bản web production riêng cho Project 42 build thành công; 7/7 kiểm tra catalog, tiến độ, snippet, feature introduction, GPU wiring, regression kết thúc checkpoint đầu và route đã đạt.

## Đối chiếu yêu cầu

| Yêu cầu | Triển khai và bằng chứng |
| --- | --- |
| Lấy mẫu theo diện tích | Diện tích tam giác, CDF, loại mặt suy biến, sqrt barycentric. Fixture hai tam giác 1:4 qua tám seed, centroid và bounds; CTest và 10/10 kiểm toán Canvas đạt. |
| Ghép ổn định, A/B thật | Hai permutation trên cùng hai bộ mẫu. Random shuffle và stable Morton counting order 32³ cell; so độ dài nối thẳng trung bình, subset đường đi. Không gọi spatial order là optimal transport. |
| Mật độ đọc được | 16 nhóm tam giác theo Y của tâm mặt; expected là tổng diện tích nhóm, observed là số mẫu nhận. Có chế độ uniform triangle cố ý thiên lệch và heatmap. Không gọi nhóm là lát cắt liên tục chính xác. |
| Timeline | Linear/smoothstep; Thẳng/Vòng cung để đối chiếu, Flow mặc định có nhịp và độ lệch riêng theo ID. Nhánh endpoint sao chép chính xác; Pause, scrub, reverse, loop. Nhiều chuỗi dt có cùng tổng thời gian được kiểm. |
| Compute/draw thật | Compute ghi CURRENT, vertex shader đọc cùng SSBO, barrier đúng consumer và DrawArrays dùng N thật. Không upload vị trí tính CPU mỗi frame của final. |
| N lẻ và giữ ID | `N=1.000.003`, local size 256, 189 lanes dư. Đọc toàn state theo chunk hữu hạn, kiểm xyz và float ID; canary ngoài N nguyên vẹn. |
| Last-good | STAGED → CPU candidate → upload candidate → ACTIVE. Batch giới hạn, cancel/invalid giữ generation cũ; không đổi nhãn trước khi đủ dữ liệu. Camera không tạo lại mẫu. |
| Giới hạn bộ nhớ | Source/target/path: 16N byte mỗi buffer; CURRENT: 16(N+1); mapping: 8N. Preflight capability, peak ACTIVE+candidate và budget CPU/GPU riêng; từ chối không hạ N ngầm. |
| Chi phí | Báo setup, sampling, matching, preparation wall, CPU submit upload, delayed GPU last-update/draw và frame. Camera/Pause không được coi là workload update mới. Không cam kết FPS cho mọi máy. |
| Gói học | Starter, 10 checkpoint, final, shader, tests và README. ZIP đã tạo và đối chiếu toàn bộ entry với nguồn sinh trong fixture. |

## Kết quả native đã quan sát

VS2022 x64, CMake; dùng package SDL 3.4.8 đã build trước đó, không đưa SDL hay output vào Git. Toàn bộ starter/checkpoint/final build Debug và Release với `--parallel 2`; CTest đạt ở cả hai cấu hình. Starter chạy smoke một giây; mỗi checkpoint chạy ba frame READY với N=127 trên context OpenGL thật. Kiểm này đã tìm và sửa lỗi phase kết thúc ở checkpoint 1–3.

Trên NVIDIA GeForce RTX 3050 Laptop GPU, OpenGL 4.3, driver 546.30:

```text
GPU MORPH PASS N=1000003 compared=48000144 combinations=48 tail=INTACT
NATIVE EVENT PASS: scrub, camera/no rebuild, A/B, cancel, invalid/last-good, focus cleanup (not manual OS input)
ACTIVE N=1000003 GEN=1 source=SPHERE target=KNOT drawn=1000003
sourceBytes=16000048 targetBytes=16000048 currentBytes=16000064
pathBytes=16000048 mappingBytes=8000024
```

48 tổ hợp gồm hai mapping × hai easing × ba path × bốn thời điểm (0, .27, .73, 1). Các điểm giữa có tolerance 8e-5; xyz ở hai đầu phải bằng chính xác record nguồn/đích. Scripted SDL events là kiểm handler, **không phải thao tác chuột/bàn phím OS thủ công**. Ảnh native A/B tại t=.65 đã được xem: spatial giữ vùng cấu trúc rõ hơn random trên cùng nguồn/đích. Chưa lấy mốc năm triệu làm điều kiện nghiệm thu bắt buộc.

## Kiểm trình duyệt, ZIP và cửa sổ thật

Bảy ca Playwright đã đạt trên production fixture, một worker: challenge/10 lesson/tiến độ sau reload; barycentric bằng mouse/keyboard với DPR=2 và reduced motion; A/B không dựng lại; Play/Pause/reverse/endpoints; cancel/invalid/last-good; toàn bộ 10 Canvas mode không lỗi runtime hoặc tràn ngang; Flow mặc định, A/B path không dựng lại và endpoints không đổi. Ca tiến độ ban đầu bị lỗi dữ liệu thử (`schemaVersion` thay cho `version`); đã sửa đúng schema lưu trữ và kiểm lại, giữ được `p41-l09` trong khi làm mới bài P42 cũ. Không thay logic migration để làm test qua.

ZIP được giải nén vào thư mục mới, configure bằng VS2022 x64, build final/tests và CTest đạt. Digest nguồn đóng gói của checkout và fixture đã được đối chiếu lại sau thay đổi Flow; hash ZIP có thể khác do timestamp.

Lượt kiểm OS trước khi thêm Flow: cửa sổ C++ chạy **từ ZIP giải nén**, N=1.000.003: đã dùng input OS thật để kéo orbit, wheel zoom, Play/Pause bằng Space, click timeline và đổi matching bằng M. Hình thay đổi đúng; N/generation giữ nguyên. Chế độ spatial giữ các vùng cấu trúc, random thành khối trộn trên cùng bộ mẫu. Thoát bằng Q, tiến trình kết thúc exit 0. Đây là kiểm chuột/bàn phím thật, tách biệt với `NATIVE EVENT PASS` tổng hợp ở trên.

TypeScript và ESLint phạm vi Project 42 đã đạt với heap giới hạn 320 MB; định dạng các file mới đã được kiểm/chỉnh bằng Prettier. Typecheck toàn repo chưa được tính là đạt. Các lượt đầu gặp timeout khi máy chỉ còn 2–4 MB RAM trống trên tổng khoảng 6 GB; đã dừng job, chờ bộ nhớ hồi phục và chạy tuần tự. Không tính các lượt hết thời gian trước đó là pass và không quét lại toàn site để thay cho kiểm Project 42.

## Hiệu chỉnh chuyển động theo phản hồi

Morton order và cùng một easing/offset khiến các vùng đi thành từng mảng; build/test trước đó không đánh giá thay được cảm giác chuyển động này. Giữ Thẳng/Vòng cung làm đối chứng, thêm Flow mặc định từ checkpoint 5 và cho Canvas phần hoàn chỉnh.

Flow bẻ nhẹ nhịp theo hash của ID, tản trong quả cầu thay vì hộp, xoay độ lệch quanh Y và nhân sin²(pi s). Không lấy random theo frame. Cùng một t luôn cho cùng vị trí, mỗi hạt có quỹ đạo riêng, endpoints và thời lượng chung vẫn nguyên. Graph Canvas minh họa ba nhịp ID; bài 5 có mã hoàn chỉnh của các helper và giải thích đây không phải lực/chất lỏng.

Sau sửa: 10/10 fixture toán, 7/7 source/route và 7/7 Playwright đạt; scoped TypeScript/ESLint đạt. CTest và smoke Flow trên checkpoint 5 (CPU), 6 (CPU→SSBO), 7 (compute) đạt Debug/Release. Final GPU kiểm 48.000.144 record ở N=1.000.003, canary nguyên. Đã xem ảnh native cùng thời điểm: Flow tản từng hạt, Arc còn các mảng; chưa coi đây là xác nhận thẩm mỹ từ người học. ZIP mới giải nén/build/CTest đạt. Không chạy lại toàn site hoặc sửa project khác cho đợt hiệu chỉnh này.

## Tương thích và vệ sinh repository

Catalog, roadmap, search, glossary và progress dùng sản phẩm mới; `/roadmap/42` chuyển tới học phần mới. Migration chỉ bỏ tiến độ P42 cũ, giữ project khác. Bản cũ nằm tại `.validation/retired-project-42-molecular-dynamics-cpu-20261111`; nguồn tracked còn khôi phục được từ Git. Các phiên bản Molecular Dynamics cũ 43–45 được ghi rõ, không đòi người học học Project 42 mới như một bài vật lý.

Canvas chỉ minh họa CPU tối đa 4.096 mẫu; bảng byte ở N=1.000.003 ghi rõ là layout C++, không phải heap JavaScript hay bằng chứng GPU trình duyệt. Registry, checkpoints, payload, ZIP, build và ảnh QA là output ngoài Git. Không stage, commit, push hoặc publish trong đợt này.
